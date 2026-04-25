export default function HeroMap() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-cream-100/12 bg-ink-900 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-cream-100/10 bg-ink-800/80 px-3 py-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-cream-50">
          <span className="h-2.5 w-2.5 rounded-full bg-terracota-400 shadow-[0_0_12px_rgba(232,93,47,0.7)]" />
          VoyUruapan
        </span>
        <span className="rounded-full bg-cream-100/5 px-2 py-0.5 text-[11px] text-cream-100/70">
          41 rutas
        </span>
      </div>

      <div className="relative h-[430px] overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(232,93,47,0.15),transparent_22%),linear-gradient(135deg,#161B0E,#0E1208)]">
        <div className="map-grid-drift absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(244,235,217,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(244,235,217,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />

        <svg viewBox="0 0 320 430" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {/* Ruta principal animada (terracota) */}
          <path
            className="route-flow"
            d="M-20 250 C60 190 95 260 160 215 C225 170 250 230 340 180"
            fill="none"
            stroke="#E85D2F"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="18 12"
          />
          {/* Rutas decorativas */}
          <path
            d="M20 85 C105 115 120 190 185 170 C250 150 270 95 330 120"
            fill="none"
            stroke="#7BA05B"
            strokeWidth="3"
            opacity="0.7"
          />
          <path
            d="M25 360 C70 280 95 250 135 245 C210 235 220 290 295 260"
            fill="none"
            stroke="#F4EBD9"
            strokeWidth="3"
            opacity="0.5"
          />
          <path
            d="M70 15 C60 100 100 160 80 230 C65 290 70 350 35 430"
            fill="none"
            stroke="#7BA05B"
            strokeWidth="2.5"
            opacity="0.4"
          />

          {/* Estaciones pulsantes */}
          {[42, 95, 150, 205, 260, 305].map((x, index) => (
            <circle
              key={x}
              className="station-pulse"
              style={{ animationDelay: `${index * 180}ms` }}
              cx={x}
              cy={index < 2 ? 228 - index * 20 : 212 - index * 7}
              r="7"
              fill="#E85D2F"
              stroke="#FBF5E8"
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* Top tabs */}
        <div className="absolute left-4 right-4 top-4 rounded-2xl border border-cream-100/10 bg-ink-900/95 p-2 backdrop-blur-xl">
          <div className="flex gap-2">
            <span className="flex-1 rounded-xl border border-terracota-400/40 bg-terracota-400/10 py-2 text-center text-[11px] font-bold text-terracota-400">
              A marcado
            </span>
            <span className="flex-1 rounded-xl border border-cream-100/10 bg-cream-100/5 py-2 text-center text-[11px] font-bold text-cream-100/45">
              Destino
            </span>
          </div>
        </div>

        {/* Bottom card */}
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-terracota-400/25 bg-ink-900/90 p-4 backdrop-blur-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-terracota-400">
            Ruta sugerida
          </p>
          <p className="mt-1 font-serif-display text-xl font-black text-cream-50">
            Camión + Teleférico
          </p>
          <p className="mt-2 text-xs text-cream-100/70">
            Costo estimado por abordaje: $11.00 MXN
          </p>
        </div>
      </div>
    </div>
  );
}
