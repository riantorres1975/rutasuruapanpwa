import Link from "next/link";
import Logo from "@/components/Logo";
import ForceDark from "@/components/ForceDark";

export default function NotFound() {
  return (
    <main
      className="relative overflow-hidden"
      style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}
    >
      <ForceDark />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 18%, rgba(184,232,64,0.12), transparent 28%), radial-gradient(circle at 82% 76%, rgba(106,171,72,0.16), transparent 34%), linear-gradient(135deg, rgba(20,28,16,0.95), rgba(12,17,10,1))",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(232,242,216,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(232,242,216,0.4) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
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

      <section className="relative z-10 grid min-h-dvh place-items-center px-5 pt-24 pb-12 sm:px-8">
        <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p
              className="inline-flex rounded-full border px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.22em]"
              style={{
                borderColor: "rgba(184,232,64,0.22)",
                background: "rgba(184,232,64,0.08)",
                color: "#b8e840",
              }}
            >
              Ruta no encontrada
            </p>

            <h1
              className="mt-6 font-serif text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ color: "#e8f2d8" }}
            >
              Esta parada ya no está en el mapa.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 sm:text-lg" style={{ color: "rgba(232,242,216,0.68)" }}>
              El enlace pudo cambiar, la página fue movida o la ruta que buscabas todavía no está disponible en UruGo.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/mapa"
                className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white shadow-[0_14px_38px_rgba(106,171,72,0.32)] transition hover:opacity-90 active:scale-[0.98]"
                style={{ background: "#6aab48" }}
              >
                Abrir mapa
              </Link>
              <Link
                href="/rutas"
                className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold transition active:scale-[0.98]"
                style={{
                  borderColor: "rgba(140,200,80,0.18)",
                  background: "rgba(106,171,72,0.07)",
                  color: "#e8f2d8",
                }}
              >
                Ver rutas
              </Link>
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold transition hover:bg-white/5 active:scale-[0.98]"
                style={{ color: "rgba(232,242,216,0.78)" }}
              >
                Inicio
              </Link>
            </div>
          </div>

          <div
            className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[2.25rem] border p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl"
            style={{
              borderColor: "rgba(184,232,64,0.18)",
              background: "linear-gradient(145deg, rgba(20,28,16,0.86), rgba(7,10,6,0.96))",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]" style={{ background: "rgba(184,232,64,0.1)", color: "#b8e840" }}>
                Sin señal
              </span>
              <span className="text-xs font-bold" style={{ color: "rgba(232,242,216,0.45)" }}>
                Uruapan
              </span>
            </div>

            <svg viewBox="0 0 360 360" fill="none" className="mt-4 aspect-square w-full" aria-hidden="true">
              <defs>
                <radialGradient id="nf-pin" cx="35%" cy="24%" r="76%">
                  <stop offset="0%" stopColor="#7aba54" />
                  <stop offset="100%" stopColor="#3a6425" />
                </radialGradient>
                <radialGradient id="nf-pin-inner" cx="42%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#518c3a" />
                  <stop offset="100%" stopColor="#1c3612" />
                </radialGradient>
              </defs>
              <rect width="360" height="360" rx="32" fill="rgba(232,242,216,0.03)" />
              <path d="M34 262C86 220 130 218 178 246C229 276 260 260 320 210" stroke="#e8f2d8" strokeWidth="18" strokeLinecap="round" opacity="0.12" />
              <path d="M42 112C92 138 130 132 170 92C210 52 260 55 318 86" stroke="#b8e840" strokeWidth="10" strokeLinecap="round" strokeDasharray="4 18" opacity="0.5" />
              <circle cx="44" cy="262" r="10" fill="#b8e840" />
              <circle cx="320" cy="210" r="10" fill="#b8e840" />

              <g filter="drop-shadow(0 18px 28px rgba(0,0,0,0.45))">
                <path d="M180 64C118 64 76 107 76 160C76 224 180 326 180 326C180 326 284 224 284 160C284 107 242 64 180 64Z" fill="url(#nf-pin)" />
                <path d="M180 91C134 91 103 122 103 161C103 209 180 286 180 286C180 286 257 209 257 161C257 122 226 91 180 91Z" fill="url(#nf-pin-inner)" />
                <line x1="82" y1="160" x2="278" y2="160" stroke="#b8e840" strokeWidth="12" strokeLinecap="round" />
                <rect x="136" y="161" width="88" height="52" rx="18" fill="#b8e840" />
                <rect x="169" y="139" width="22" height="28" rx="8" fill="#b8e840" />
                <rect x="150" y="176" width="22" height="18" rx="6" fill="#1c3612" opacity="0.5" />
                <rect x="188" y="176" width="22" height="18" rx="6" fill="#1c3612" opacity="0.5" />
              </g>
              <text x="180" y="344" textAnchor="middle" fill="#b8e840" fontSize="56" fontWeight="900" fontFamily="Arial, sans-serif">
                404
              </text>
            </svg>

            <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: "rgba(140,200,80,0.14)", background: "rgba(106,171,72,0.06)" }}>
              <p className="text-sm font-bold" style={{ color: "#e8f2d8" }}>
                Sugerencia rápida
              </p>
              <p className="mt-1 text-xs leading-6" style={{ color: "rgba(232,242,216,0.56)" }}>
                Vuelve al mapa para buscar por destino, colonia, ruta o estación del Teleférico.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
