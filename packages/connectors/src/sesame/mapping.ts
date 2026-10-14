import { Employee, type Series } from "@msm/core";
import type { SesameSnapshot } from "./client";

/**
 * Sésame → modelo de «Personal» (función pura, sin red). Reglas, todas sin inventar:
 * - Estado de hoy: vacaciones (día de vacaciones) > ausente (día de ausencia) > trabajando (online/remoto/en pausa)
 *   > `sin_fichar`. «Baja» NO se deduce: Sésame no la distingue en este endpoint de otras ausencias (se verá en M1
 *   con los tipos de ausencia reales de MANSERA).
 * - Puesto y departamento: los de Sésame; si no hay, se dice («Sin … en Sésame»), no se rellena.
 * - Horas del mes: informe de horas trabajadas de Sésame; si una persona no aparece, se informa en `missingHours`.
 * Hora de entrada en hora peninsular española.
 */
export type PeopleFromSesame = {
  employees: Employee[];
  hoursByDept: Series[];
  missingHours: string[];
  fetchedAt: string;
};

const TZ = "Europe/Madrid";
const hhmm = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

export function mapPeople(snap: SesameSnapshot): PeopleFromSesame {
  const deptOf = new Map<string, string>();
  for (const a of snap.departments) if (!deptOf.has(a.employee.id)) deptOf.set(a.employee.id, a.department.name);
  const officeName = new Map(snap.offices.map((o) => [o.id, o.name]));
  const onVacation = new Set(snap.vacations.filter((v) => v.date === snap.date).map((v) => v.employee.id));
  const absent = new Set(snap.absences.filter((v) => v.date === snap.date).map((v) => v.employee.id));
  const seconds = new Map(snap.workedHoursMonth.map((w) => [w.employeeId, w.secondsWorked]));

  const entriesBy = new Map<string, SesameSnapshot["workEntries"]>();
  for (const e of snap.workEntries) entriesBy.set(e.employee.id, [...(entriesBy.get(e.employee.id) ?? []), e]);

  const missingHours: string[] = [];
  const employees = snap.employees.filter((e) => e.status === "active").map((e) => {
    const entries = (entriesBy.get(e.id) ?? []).filter((x) => x.workEntryIn?.date).sort((a, b) => a.workEntryIn!.date.localeCompare(b.workEntryIn!.date));
    const first = entries[0]?.workEntryIn;
    const last = entries.at(-1)?.workEntryIn;
    const today: Employee["today"] = onVacation.has(e.id)
      ? "vacaciones"
      : absent.has(e.id)
        ? "ausente"
        : e.workStatus === "online" || e.workStatus === "remote" || e.workStatus === "paused"
          ? "trabajando"
          : "sin_fichar";
    const secs = seconds.get(e.id);
    if (secs === undefined) missingHours.push(e.id);
    return Employee.parse({
      id: e.id,
      name: [e.firstName, e.lastName].filter(Boolean).join(" ").trim(),
      position: e.jobChargeName?.trim() || "Sin puesto en Sésame",
      department: deptOf.get(e.id) ?? "Sin departamento en Sésame",
      today,
      clockIn: first ? hhmm(first.date) : null,
      site: last?.officeId ? (officeName.get(last.officeId) ?? null) : null,
      hoursMonth: secs === undefined ? 0 : Math.round((secs / 3600) * 10) / 10,
    });
  });

  const byDept = new Map<string, number>();
  for (const e of employees) byDept.set(e.department, (byDept.get(e.department) ?? 0) + e.hoursMonth);
  const hoursByDept = [...byDept].map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value);

  return { employees, hoursByDept, missingHours, fetchedAt: snap.fetchedAt };
}
