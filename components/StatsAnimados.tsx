import { FARES_2026 } from "@/lib/mobility-config";

const BASE_FARE_MXN = Number(FARES_2026.urbanBus.price.replace(/[^0-9.]/g, "")).toLocaleString("es-MX");

const STATS = [
  { value: "40", label: "rutas de camión", color: "var(--lima)" },
  { value: "6", label: "estaciones Teleférico", color: "var(--ink)" },
  { value: BASE_FARE_MXN, prefix: "$", label: "tarifa base 2026 MXN", color: "var(--ink)" },
  { value: "0", label: "anuncios ni cuentas", color: "var(--ink)" },
] as const;

const CELL_BORDERS = [
  "border-b border-r sm:border-b-0",
  "border-b sm:border-b-0 sm:border-r",
  "border-r sm:border-l-0",
  "",
] as const;

export default function StatsAnimados() {
  return (
    <div className="border-y border-white/10 bg-[#10160d]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-2 px-5 sm:grid-cols-4 sm:px-8">
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className={`border-white/10 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${CELL_BORDERS[index]}`}
          >
            <div className="font-serif text-3xl font-black leading-none lg:text-4xl" style={{ color: stat.color }}>
              {"prefix" in stat ? <span className="font-sans font-bold">{stat.prefix}</span> : null}
              {stat.value}
            </div>
            <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] leading-snug text-[var(--muted)]">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
