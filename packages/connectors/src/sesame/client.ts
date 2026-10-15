import { z } from "zod";
import { ConnectorError } from "../errors";
import { getJson, type FetchLike } from "../http";
import { withRetry, type CallPolicy } from "../policy";

/**
 * Cliente de SOLO LECTURA de la API pública de Sésame HR (especificación OpenAPI oficial «Sesame Public API 3.0.0»,
 * https://apidocs.sesametime.com/openapi.json, consultada el 2026-10-14).
 * - Autenticación: `Authorization: Bearer <token>` (documentado). Base: https://api-{región}.sesametime.com (región por defecto: eu1).
 * - Límite: 600 peticiones/minuto por EMPRESA, compartido entre todos los tokens (confirmado por Sésame a MANSERA el
 *   2026-10-15; su documentación web decía 1.000). Cupo propio: 400/min.
 * - El token de Sésame NO puede limitarse a lectura (confirmado por Sésame): este cliente solo hace GET (probado).
 * - Paginación documentada: `page` + `limit`, respuesta con `meta.currentPage/lastPage/total/perPage`.
 * - Comprobado en real (2026-10-14): una región inexistente responde 200 con HTML → se exige JSON.
 *
 * MINIMIZACIÓN (RGPD): la ficha de empleado de Sésame (que llega también DENTRO de cada fichaje y ausencia) incluye DNI,
 * nº de la Seguridad Social, cuenta bancaria, salario, fecha de nacimiento, dirección… Los esquemas de abajo solo declaran
 * los campos que la plataforma usa; Zod descarta el resto AL RECIBIR la respuesta, así que esos datos nunca llegan al
 * resto del código, a la caché ni a la IA.
 *
 * ESTADO: según la especificación oficial y probado con datos de ejemplo inventados. Sin verificar con la cuenta de MANSERA.
 */
export type SesameCredentials = { region: string; token: string };

export const SESAME_REGION_RE = /^[a-z0-9]([a-z0-9-]{0,18}[a-z0-9])?$/;
const TOKEN_RE = /^[\x21-\x7e]{20,600}$/; // sin espacios ni saltos de línea: va en una cabecera
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 100; // el máximo admitido no está documentado (S-17)
const MAX_PAGES = 50;

const Meta = z.object({ currentPage: z.number().int(), lastPage: z.number().int() });
const Ref = z.object({ id: z.string(), name: z.string() });
const DateTime = z.iso.datetime({ offset: true });

/** Solo lo necesario. NO añadir campos personales sin justificarlo (docs/06-seguridad-rgpd.md). */
export const SesameEmployee = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable().optional(),
  jobChargeName: z.string().nullable().optional(),
  /** Estado de fichaje AHORA (no del día consultado). */
  // Un valor nuevo de Sésame no debe tumbar toda la lectura: desconocido = sin dato.
  workStatus: z.enum(["online", "offline", "paused", "remote"]).nullable().optional().catch(null),
  status: z.enum(["active", "inactive"]).catch("active"), // se piden solo activos (status=active)
});
export type SesameEmployee = z.infer<typeof SesameEmployee>;
const EmployeeRef = z.object({ id: z.string() });

export const SesameDepartmentAssignation = z.object({ employee: EmployeeRef, department: Ref });
export const SesameDayOff = z.object({ date: z.string().regex(DATE), seconds: z.number().nullable().optional(), employee: EmployeeRef });
export const SesameAbsenceDayOff = SesameDayOff.extend({
  calendar: z.object({ absenceType: z.object({ id: z.string(), name: z.string() }).nullable().optional() }).nullable().optional(),
});
/** `category` documentada: sick_leave (baja) | permission (permiso). `pickMode`: by_days | by_time_range. */
export const SesameAbsenceType = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
  pickMode: z.string().nullable().optional(),
});
export const SesameWorkEntry = z.object({
  employee: EmployeeRef,
  workEntryIn: z.object({ date: DateTime, officeId: z.string().nullable().optional() }).nullable().optional(),
  workEntryOut: z.object({ date: DateTime }).nullable().optional(),
});
export const SesameWorkedHours = z.object({ employeeId: z.string(), secondsWorked: z.number() });
export const SesameOffice = Ref;
export const SesameTokenInfo = z.object({ data: z.object({ company: z.object({ id: z.string(), name: z.string() }) }) });

export type SesameSnapshot = {
  date: string;
  employees: SesameEmployee[];
  departments: z.infer<typeof SesameDepartmentAssignation>[];
  absences: z.infer<typeof SesameAbsenceDayOff>[];
  absenceTypes: z.infer<typeof SesameAbsenceType>[];
  vacations: z.infer<typeof SesameDayOff>[];
  workEntries: z.infer<typeof SesameWorkEntry>[];
  offices: z.infer<typeof SesameOffice>[];
  workedHoursMonth: z.infer<typeof SesameWorkedHours>[];
  fetchedAt: string;
};

/** Hoy en hora peninsular española (AAAA-MM-DD). */
export const madridToday = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);

/** Fecha real de calendario (rechaza 2026-13-45, 2026-02-30…). */
function realDate(d: string): boolean {
  if (!DATE.test(d)) return false;
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, day));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === day;
}

export function createSesameClient(creds: SesameCredentials, fetchImpl: FetchLike = fetch, policy: CallPolicy = {}) {
  // La región forma parte del nombre de host: se valida para que nunca pueda salirse de sesametime.com.
  if (!SESAME_REGION_RE.test(creds.region)) throw new ConnectorError("validation", "La región de Sésame no es válida.");
  if (!TOKEN_RE.test(creds.token)) throw new ConnectorError("validation", "El token de Sésame no tiene un formato válido.");
  const base = `https://api-${creds.region}.sesametime.com`;
  const headers = { Authorization: `Bearer ${creds.token}`, Accept: "application/json", "Content-Type": "application/json" };
  const raw = (path: string) => withRetry(async () => {
    await policy.limiter?.take();
    return getJson(fetchImpl, `${base}${path}`, { app: "Sésame HR", headers, requireJson: true, notJsonMessage: "Sésame HR no devolvió datos: revisa la región (aparece en el panel de tokens de Sésame) o si el servicio está en mantenimiento." })
  }, { retries: 0, ...policy.retry });

  /** Recorre todas las páginas (con tope), comprobando que la API respeta `page`, y valida cada elemento. */
  async function all<T>(path: string, item: z.ZodType<T>): Promise<T[]> {
    const out: T[] = [];
    const schema = z.object({ data: z.array(item), meta: Meta });
    for (let page = 1; page <= MAX_PAGES; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const parsed = schema.safeParse(await raw(`${path}${sep}limit=${PAGE_SIZE}&page=${page}`));
      if (!parsed.success) throw new ConnectorError("validation", "Sésame HR devolvió datos con un formato inesperado (¿cambio de versión de la API?).");
      if (parsed.data.meta.currentPage !== page) throw new ConnectorError("validation", "Sésame HR no respetó la paginación; se detiene la lectura para no duplicar datos.");
      out.push(...parsed.data.data);
      if (page >= parsed.data.meta.lastPage) return out;
    }
    throw new ConnectorError("validation", `Sésame HR devolvió más de ${MAX_PAGES} páginas; se detiene la lectura por seguridad.`);
  }

  return {
    /** Comprobación de solo lectura: devuelve el nombre de la empresa a la que pertenece el token. */
    async info() {
      const parsed = SesameTokenInfo.safeParse(await raw("/core/v3/info"));
      if (!parsed.success) throw new ConnectorError("validation", "Sésame HR devolvió datos con un formato inesperado.");
      return parsed.data.data.company;
    },
    /** Tipos de ausencia configurados, con su categoría (baja/permiso). Sin datos personales. */
    absenceTypes: () => all("/schedule/v1/absence-types?status=active", SesameAbsenceType),
    /** Departamentos (sin personas). */
    departments: () => all("/core/v3/departments", Ref),
    /**
     * Lo que necesita la sección Personal para HOY en Madrid (`workStatus` siempre es el estado actual, así que no tiene
     * sentido pedir otro día) y el mes en curso. `date` solo existe para las pruebas.
     */
    async snapshot(date: string = madridToday()): Promise<SesameSnapshot> {
      if (!realDate(date)) throw new ConnectorError("validation", "Fecha no válida (AAAA-MM-DD).");
      const monthStart = `${date.slice(0, 8)}01`;
      const [employees, departments, absences, absenceTypes, vacations, workEntries, offices, workedHoursMonth] = await Promise.all([
        all("/core/v3/employees?status=active", SesameEmployee),
        all("/core/v3/employee-department-assignations", SesameDepartmentAssignation),
        all(`/schedule/v1/absence-day-off?from=${date}&to=${date}`, SesameAbsenceDayOff),
        all("/schedule/v1/absence-types", SesameAbsenceType),
        all(`/schedule/v1/vacation-day-off?from=${date}&to=${date}`, SesameDayOff),
        all(`/schedule/v1/work-entries?from=${date}&to=${date}&onlyReturn=not_deleted`, SesameWorkEntry),
        all("/core/v3/offices", SesameOffice),
        all(`/schedule/v1/reports/worked-hours?from=${monthStart}&to=${date}`, SesameWorkedHours),
      ]);
      return { date, employees, departments, absences, absenceTypes, vacations, workEntries, offices, workedHoursMonth, fetchedAt: new Date().toISOString() };
    },
  };
}
