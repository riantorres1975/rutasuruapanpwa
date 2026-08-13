import { FARES_2026 } from "@/lib/mobility-config";

const STATS = [
  { value: "40", label: "rutas de camión", color: "var(--lima)" },
  { value: "6", label: "estaciones Teleférico", color: "var(--ink)" },
  { value: FARES_2026.urbanBus.price.replace(".00", ""), label: "tarifa base 2026 MXN", color: "var(--ink)" },
  { value: "0", label: "anuncios ni cuentas", color: "var(--ink)" },
] as const;

export default function StatsAnimados() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--ov-border)] bg-[rgba(20,28,16,0.5)] sm:grid-cols-4">
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className="px-6 py-7 lg:px-8 lg:py-9"
            style={{ borderRight: index < 3 ? "1px solid var(--ov-border)" : "none" }}
          >
            <div className="font-serif text-4xl font-black leading-none lg:text-5xl" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="mt-1.5 text-xs leading-snug text-[var(--muted)]">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
