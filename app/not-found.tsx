import Link from "next/link";
import Logo from "@/components/Logo";
import ForceDark from "@/components/ForceDark";

export default function NotFound() {
  return (
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <ForceDark />
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
        style={{
          background: "rgba(12,17,10,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(140,200,80,0.08)",
        }}
      >
        <Logo size={28} showName showSub />
        <Link
          href="/mapa"
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#6aab48" }}
        >
          Abrir mapa
        </Link>
      </nav>

      <section className="grid min-h-dvh place-items-center px-5 pt-20 pb-12 sm:px-8">
        <div className="w-full max-w-lg text-center">
          <div
            className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[1.75rem] border shadow-[0_20px_70px_rgba(184,232,64,0.12)]"
            style={{
              borderColor: "rgba(184,232,64,0.25)",
              background: "rgba(184,232,64,0.1)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" style={{ color: "#b8e840" }} aria-hidden="true">
              <path
                d="M4 16V7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5V16M4 16h12M4 16l-1 3M16 16l1 3M7 19h.01M13 19h.01M7 8h6M7 11h6M18 9h1.5A1.5 1.5 0 0 1 21 10.5V16h-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p
            className="font-serif text-7xl font-black leading-none tracking-tight sm:text-8xl"
            style={{ color: "#b8e840" }}
          >
            404
          </p>
          <h1
            className="mt-5 font-serif text-3xl font-black tracking-tight sm:text-4xl"
            style={{ color: "#e8f2d8" }}
          >
            Esta página no existe
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 sm:text-base" style={{ color: "#5a7848" }}>
            Puede que la ruta haya cambiado o el enlace esté roto.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/mapa"
              className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white transition hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#6aab48" }}
            >
              Ir al mapa
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold transition active:scale-[0.98]"
              style={{
                borderColor: "rgba(140,200,80,0.15)",
                background: "rgba(106,171,72,0.06)",
                color: "#e8f2d8",
              }}
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
