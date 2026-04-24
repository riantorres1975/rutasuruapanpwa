import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#080C18] px-5 py-12 text-white sm:px-8">
      <section className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[1.75rem] border border-[#00D4AA]/25 bg-[#00D4AA]/10 shadow-[0_20px_70px_rgba(0,212,170,0.18)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-[#00D4AA]" aria-hidden="true">
            <path
              d="M4 16V7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5V16M4 16h12M4 16l-1 3M16 16l1 3M7 19h.01M13 19h.01M7 8h6M7 11h6M18 9h1.5A1.5 1.5 0 0 1 21 10.5V16h-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="font-display text-7xl font-black leading-none tracking-tight text-[#00D4AA] sm:text-8xl">
          404
        </p>
        <h1 className="mt-5 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          Esta página no existe
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-slate-300 sm:text-base">
          Puede que la ruta haya cambiado o el enlace esté roto.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/mapa"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#00D4AA] px-6 text-sm font-black text-gray-950 transition hover:bg-[#12e7bd] active:scale-[0.98]"
          >
            Ir al mapa
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-bold text-slate-100 transition hover:border-[#00D4AA]/40 hover:text-[#00D4AA] active:scale-[0.98]"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
