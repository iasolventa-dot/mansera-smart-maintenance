/** Mientras se leen los datos (algunas pantallas consultan Sésame o Trello). */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-4" aria-label="Cargando">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-border/60" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-border/50" />)}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-border/40" />
      <span className="sr-only">Cargando datos…</span>
    </div>
  );
}
