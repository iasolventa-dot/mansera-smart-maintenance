import { clsx, type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

/** Formato es-ES con cifras listas para `tabular-nums`. */
export const fmt = (value: number, decimals = 0): string =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
