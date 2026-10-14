import { Employee, type Series } from "@msm/core";
import type { SesameSnapshot } from "./client";

/**
 * Sésame → modelo de «Personal» (función pura, sin red). Reglas, todas sin inventar:
 * - Estado de hoy, por prioridad:
 *   1. trabajando: fichaje activo AHORA (online/remoto/en pausa). Va primero porque una ausencia parcial
 *      (p. ej. 2 horas de médico) no impide estar trabajando el resto del día.
 *   2. vacaciones: día de vacaciones.
 *   3. baja: día de ausencia cuyo tipo tiene la categoría documentada `sick_leave`.
 *   4. ausente: cualquier otra ausencia.
 *   5. sin_fichar: nada de lo anterior (no se supone que «libra»).
 * - Puesto y departamento: los de Sésame; si no hay, se dice («Sin … en Sésame»), no se rellena. Si una persona
 *   tiene varios departamentos se muestra el primero que devuelve Sésame.
 * - Horas del mes: informe de horas trabajadas de Sésame; si una persona no aparece, `hoursMonth` es null («sin dato»).
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
  const sickTypes = new Set(snap.absenceTypes.filter((t) => t.category === "sick_leave").map((t) => t.id));
  const onVacation = new Set(snap.vacations.filter((v) => v.date === snap.date).map((v) => v.employee.id));
  const todayAbsences = snap.absences.filter((v) => v.date === snap.date);
  const sick = new Set(todayAbsences.filter((a) => a.calendar?.absenceType && sickTypes.has(a.calendar.absenceType.id)).map((a) => a.employee.id));
  const absent = new Set(todayAbsences.map((a) => a.employee.id));
  const seconds = new Map(snap.workedHoursMonth.map((w) => [w.employeeId, w.secondsWorked]));

  const entriesBy = new Map<string, SesameSnapshot["workEntries"]>();
  for (const e of snap.workEntries) entriesBy.set(e.employee.id, [...(entriesBy.get(e.employee.id) ?? []), e]);

  const missingHours: string[] = [];
  const employees = snap.employees.filter((e) => e.status === "active").map((e) => {
    const entries = (entriesBy.get(e.id) ?? [])
      .filter((x) => x.workEntryIn?.date)
      .sort((a, b) => Date.parse(a.workEntryIn!.date) - Date.parse(b.workEntryIn!.date));
    const first = entries[0]?.workEntryIn;
    const last = entries.at(-1)?.workEntryIn;
    const active = e.workStatus === "online" || e.workStatus === "remote" || e.workStatus === "paused";
    const today: Employee["today"] = active
      ? "trabajando"
      : onVacation.has(e.id)
        ? "vacaciones"
        : sick.has(e.id)
          ? "baja"
          : absent.has(e.id)
            ? "ausente"
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
      hoursMonth: secs === undefined ? null : Math.round((secs / 3600) * 10) / 10,
    });
  });

  // Solo se suman horas conocidas: un departamento sin ningún dato no aparece (no se pinta un 0 inventado).
  const byDept = new Map<string, number>();
  for (const e of employees) if (e.hoursMonth !== null) byDept.set(e.department, (byDept.get(e.department) ?? 0) + e.hoursMonth);
  const hoursByDept = [...byDept].map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value);

  return { employees, hoursByDept, missingHours, fetchedAt: snap.fetchedAt };
}
