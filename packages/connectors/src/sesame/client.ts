import { z } from "zod";
import { ConnectorError, errorFromStatus } from "../errors";

/**
 * Cliente de SOLO LECTURA de la API pública de Sésame HR (especificación OpenAPI oficial «Sesame Public API 3.0.0»,
 * https://apidocs.sesametime.com/openapi.json, consultada el 2026-10-14).
 * - Autenticación: `Authorization: Bearer <token>` (documentado). Base: https://api-{región}.sesametime.com (región por defecto: eu1).
 * - Límite documentado: 1.000 peticiones/minuto por EMPRESA, compartido entre todos los tokens.
 * - Paginación documentada: `page` + `limit`, respuesta con `meta.currentPage/lastPage/total/perPage`.
 *
 * MINIMIZACIÓN (RGPD): la ficha de empleado de Sésame incluye DNI, nº de la Seguridad Social, cuenta bancaria, salario,
 * fecha de nacimiento, dirección… Los esquemas de abajo solo declaran los campos que la plataforma usa; Zod descarta
 * el resto AL RECIBIR la respuesta, así que esos datos nunca llegan al resto del código, a la caché ni a la IA.
 *
 * ESTADO: según la especificación oficial y probado con datos de ejemplo inventados. Sin verificar con la cuenta de MANSERA.
 */
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type SesameCredentials = { region: string; token: string };

const REGION = /^[a-z0-9]([a-z0-9-]{0,18}[a-z0-9])?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 100; // el máximo admitido no está documentado (S-17)
const MAX_PAGES = 50;
const TIMEOUT_MS = 15_000;

const Meta = z.object({ currentPage: z.number().int(), lastPage: z.number().int() });
const Ref = z.object({ id: z.string(), name: z.string() });

/** Solo lo necesario. NO añadir campos personales sin justificarlo (docs/06-seguridad-rgpd.md). */
export const SesameEmployee = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable().optional(),
  jobChargeName: z.string().nullable().optional(),
  workStatus: z.enum(["online", "offline", "paused", "remote"]).nullable().optional(),
  status: z.enum(["active", "inactive"]),
});
export type SesameEmployee = z.infer<typeof SesameEmployee>;
const EmployeeRef = z.object({ id: z.string() });

export const SesameDepartmentAssignation = z.object({ employee: EmployeeRef, department: Ref });
export const SesameDayOff = z.object({ date: z.string().regex(DATE), employee: EmployeeRef });
export const SesameAbsenceDayOff = SesameDayOff.extend({
  calendar: z.object({ absenceType: z.object({ name: z.string() }).nullable().optional() }).nullable().optional(),
});
export const SesameWorkEntry = z.object({
  employee: EmployeeRef,
  workEntryIn: z.object({ date: z.string(), officeId: z.string().nullable().optional() }).nullable().optional(),
  workEntryOut: z.object({ date: z.string() }).nullable().optional(),
});
export const SesameWorkedHours = z.object({ employeeId: z.string(), secondsWorked: z.number() });
export const SesameOffice = Ref;
export const SesameTokenInfo = z.object({ data: z.object({ company: z.object({ id: z.string(), name: z.string() }) }) });

export type SesameSnapshot = {
  date: string;
  employees: SesameEmployee[];
  departments: z.infer<typeof SesameDepartmentAssignation>[];
  absences: z.infer<typeof SesameAbsenceDayOff>[];
  vacations: z.infer<typeof SesameDayOff>[];
  workEntries: z.infer<typeof SesameWorkEntry>[];
  offices: z.infer<typeof SesameOffice>[];
  workedHoursMonth: z.infer<typeof SesameWorkedHours>[];
  fetchedAt: string;
};

export function createSesameClient(creds: SesameCredentials, fetchImpl: FetchLike = fetch) {
  // La región forma parte del nombre de host: se valida para que nunca pueda salirse de sesametime.com.
  if (!REGION.test(creds.region)) throw new ConnectorError("validation", "La región de Sésame no es válida.");
  const base = `https://api-${creds.region}.sesametime.com`;

  async function raw(path: string): Promise<unknown> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchImpl(`${base}${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${creds.token}`, Accept: "application/json", "Content-Type": "application/json" },
        redirect: "error",
        cache: "no-store",
        signal: ctrl.signal,
      });
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      throw new ConnectorError("transient", aborted ? "Sésame HR tardó demasiado en responder." : "No se pudo contactar con Sésame HR.");
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw errorFromStatus("Sésame HR", res.status, res.headers.get("retry-after"));
    return res.json().catch(() => undefined);
  }

  /** Recorre todas las páginas (con tope) y valida cada elemento. */
  async function all<T>(path: string, item: z.ZodType<T>): Promise<T[]> {
    const out: T[] = [];
    const schema = z.object({ data: z.array(item), meta: Meta });
    for (let page = 1; page <= MAX_PAGES; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const parsed = schema.safeParse(await raw(`${path}${sep}limit=${PAGE_SIZE}&page=${page}`));
      if (!parsed.success) throw new ConnectorError("validation", "Sésame HR devolvió datos con un formato inesperado (¿cambio de versión de la API?).");
      out.push(...parsed.data.data);
      if (page >= parsed.data.meta.lastPage) return out;
    }
    throw new ConnectorError("validation", `Sésame HR devolvió más de ${MAX_PAGES} páginas; se detiene la lectura por seguridad.`);
  }

  const day = (d: string) => {
    if (!DATE.test(d)) throw new ConnectorError("validation", "Fecha no válida (AAAA-MM-DD).");
    return d;
  };

  return {
    /** Comprobación de solo lectura: devuelve el nombre de la empresa a la que pertenece el token. */
    async info() {
      const parsed = SesameTokenInfo.safeParse(await raw("/core/v3/info"));
      if (!parsed.success) throw new ConnectorError("validation", "Sésame HR devolvió datos con un formato inesperado.");
      return parsed.data.data.company;
    },
    /** Todo lo que necesita la sección Personal para un día (`date`) y el mes en curso hasta ese día. */
    async snapshot(date: string): Promise<SesameSnapshot> {
      const d = day(date);
      const monthStart = `${d.slice(0, 8)}01`;
      const [employees, departments, absences, vacations, workEntries, offices, workedHoursMonth] = await Promise.all([
        all("/core/v3/employees?status=active", SesameEmployee),
        all("/core/v3/employee-department-assignations", SesameDepartmentAssignation),
        all(`/schedule/v1/absence-day-off?from=${d}&to=${d}`, SesameAbsenceDayOff),
        all(`/schedule/v1/vacation-day-off?from=${d}&to=${d}`, SesameDayOff),
        all(`/schedule/v1/work-entries?from=${d}&to=${d}&onlyReturn=not_deleted`, SesameWorkEntry),
        all("/core/v3/offices", SesameOffice),
        all(`/schedule/v1/reports/worked-hours?from=${monthStart}&to=${d}`, SesameWorkedHours),
      ]);
      return { date: d, employees, departments, absences, vacations, workEntries, offices, workedHoursMonth, fetchedAt: new Date().toISOString() };
    },
  };
}
