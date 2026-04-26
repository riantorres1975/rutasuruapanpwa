"use client";

export default function HeroMapAnimado() {
  return (
    <div
      className="relative h-[480px] overflow-hidden rounded-3xl lg:h-[540px]"
      style={{
        background: "var(--card, #141c10)",
        border: "1px solid var(--ov-border)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
      }}
    >
      {/* Grid de fondo */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(106,171,72,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(106,171,72,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Blobs de color */}
      <div className="absolute -right-10 -top-16 h-56 w-72 rounded-full"
        style={{ background: "rgba(106,171,72,0.10)", filter: "blur(60px)" }} />
      <div className="absolute bottom-8 left-2 h-44 w-44 rounded-full"
        style={{ background: "rgba(72,168,120,0.08)", filter: "blur(55px)" }} />

      {/* Viñeta */}
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(12,17,10,0.7) 100%)" }} />

      {/* SVG de rutas animadas */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 480 520"
        preserveAspectRatio="xMidYMid slice"
        style={{ zIndex: 1 }}
      >
        <defs>
          <filter id="hm-glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="hm-glow2">
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <style>{`
            @keyframes hm-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
            @keyframes hm-pop  {
              0%   { opacity: 0 }
              60%  { opacity: 1; r: 9 }
              100% { opacity: 1; r: 7 }
            }
          `}</style>
        </defs>

        {/* Calles secundarias */}
        <path d="M30,310 Q130,295 240,305 Q340,312 450,295"
          fill="none" stroke="rgba(106,171,72,0.12)" strokeWidth="1.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "hm-draw 2s 1.8s ease forwards", strokeDashoffset: 1 }} />
        <path d="M160,60 Q170,160 165,260 Q160,360 170,460"
          fill="none" stroke="rgba(72,168,120,0.10)" strokeWidth="1.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "hm-draw 2s 2.2s ease forwards", strokeDashoffset: 1 }} />
        <path d="M320,80 Q330,180 325,280 Q320,370 330,460"
          fill="none" stroke="rgba(72,168,120,0.08)" strokeWidth="1.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "hm-draw 2s 2.4s ease forwards", strokeDashoffset: 1 }} />

        {/* Ruta urbana principal */}
        <path id="hm-r1" d="M30,200 Q120,185 220,198 Q310,210 430,192"
          fill="none" stroke="rgba(106,171,72,0.45)" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "hm-draw 2.2s 0.9s ease forwards", strokeDashoffset: 1 }} />

        {/* Segunda ruta */}
        <path id="hm-r2" d="M60,360 Q160,330 255,310 Q340,292 440,330"
          fill="none" stroke="rgba(72,168,120,0.35)" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "hm-draw 2s 1.3s ease forwards", strokeDashoffset: 1 }} />

        {/* Teleférico — línea lima destacada */}
        <path id="hm-tel" d="M28,262 L110,257 L200,261 L285,255 L370,259 L452,253"
          fill="none" stroke="rgba(184,232,64,0.9)" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1" filter="url(#hm-glow)"
          style={{ animation: "hm-draw 2.5s 0.4s ease forwards", strokeDashoffset: 1 }} />

        {/* Cable guía del Teleférico */}
        <line x1="28" y1="262" x2="452" y2="253"
          stroke="rgba(184,232,64,0.12)" strokeWidth="1" strokeDasharray="4 8" />

        {/* Estaciones del Teleférico */}
        {([
          [28, 262], [110, 257], [200, 261], [285, 255], [370, 259], [452, 253]
        ] as [number, number][]).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy}
            r="7" fill="#b8e840" stroke="#0c110a" strokeWidth="2.5" filter="url(#hm-glow2)"
            style={{
              opacity: 0,
              animation: `hm-pop 0.4s ${2.8 + i * 0.2}s ease forwards`,
            }}
          />
        ))}

        {/* Camión moviéndose en ruta 1 */}
        <circle r="5.5" fill="#6aab48" opacity="0.95" filter="url(#hm-glow2)">
          <animateMotion dur="9s" repeatCount="indefinite" begin="2.8s">
            <mpath href="#hm-r1" />
          </animateMotion>
        </circle>

        {/* Camión en ruta 2, dirección inversa */}
        <circle r="4.5" fill="#48a878" opacity="0.8">
          <animateMotion dur="12s" repeatCount="indefinite" begin="3.5s"
            keyPoints="1;0" keyTimes="0;1" calcMode="linear">
            <mpath href="#hm-r2" />
          </animateMotion>
        </circle>

        {/* Góndola del Teleférico ida */}
        <rect width="14" height="9" rx="3" fill="#b8e840" opacity="0.95" filter="url(#hm-glow2)">
          <animateMotion dur="7s" repeatCount="indefinite" begin="4s">
            <mpath href="#hm-tel" />
          </animateMotion>
        </rect>

        {/* Góndola vuelta */}
        <rect width="11" height="7" rx="2" fill="rgba(184,232,64,0.5)">
          <animateMotion dur="7s" repeatCount="indefinite" begin="7.5s"
            keyPoints="1;0" keyTimes="0;1" calcMode="linear">
            <mpath href="#hm-tel" />
          </animateMotion>
        </rect>
      </svg>

      {/* Label EN VIVO */}
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl px-3 py-2"
        style={{
          background: "rgba(12,17,10,0.85)",
          border: "1px solid rgba(140,200,80,0.2)",
          backdropFilter: "blur(10px)",
        }}
      >
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ background: "var(--lima)" }}
        />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink2)" }}>
          EN VIVO · URUAPAN
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>41 rutas</span>
      </div>

      {/* Marcador Parque Nacional */}
      <div
        className="absolute right-[20%] top-[26%] z-10 flex flex-col items-center gap-1"
        style={{ animation: "hm-bob 3s ease-in-out infinite" }}
      >
        <style>{`@keyframes hm-bob { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-5px) } }`}</style>
        <span className="text-2xl">🌲</span>
        <div
          className="rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
          style={{
            background: "rgba(12,17,10,0.88)",
            border: "1px solid rgba(140,200,80,0.2)",
            color: "var(--agua)",
          }}
        >
          Parque Nacional
        </div>
      </div>

      {/* Ping de ubicación */}
      <div className="absolute left-[42%] top-[44%] z-10">
        <div
          className="h-4 w-4 rounded-full"
          style={{
            background: "var(--lima)",
            animation: "hm-ping 2.2s infinite",
          }}
        >
          <style>{`@keyframes hm-ping { 0% { box-shadow: 0 0 0 0 rgba(184,232,64,0.5) } 70% { box-shadow: 0 0 0 14px rgba(184,232,64,0) } 100% { box-shadow: 0 0 0 0 rgba(184,232,64,0) } }`}</style>
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>

      {/* Card flotante inferior */}
      <div
        className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between rounded-2xl px-4 py-3"
        style={{
          background: "rgba(12,17,10,0.9)",
          border: "1px solid rgba(140,200,80,0.2)",
          backdropFilter: "blur(14px)",
          animation: "hm-float 5s ease-in-out infinite",
        }}
      >
        <style>{`@keyframes hm-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }`}</style>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lima)" }}>
            🚡 Teleférico activo
          </p>
          <p className="font-serif text-base font-bold" style={{ color: "var(--ink)" }}>
            Ruta 11 · Centro
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>La más consultada · ~14 min</p>
        </div>
        <div
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap"
          style={{
            background: "var(--verde-l)",
            border: "1px solid rgba(140,200,80,0.2)",
            color: "var(--verde)",
          }}
        >
          🥑 Uruapan
        </div>
      </div>
    </div>
  );
}
