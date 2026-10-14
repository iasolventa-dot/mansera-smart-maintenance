import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        <p className="text-[56px] font-extrabold text-primary">404</p>
        <h1 className="text-[22px] font-extrabold">Esta página no existe</h1>
        <p className="text-[16px] text-muted">Puede que el enlace esté mal escrito o que la sección ya no exista.</p>
        <Link href="/" className="inline-flex min-h-12 items-center rounded-[10px] bg-primary px-5 text-[15px] font-bold text-white hover:bg-primary-hover">Volver al inicio</Link>
      </div>
    </main>
  );
}
