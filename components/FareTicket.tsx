type Props = {
  label: string;
  price: string;
  payment: string;
  /** Etiqueta corta arriba a la izquierda (ej. "BOLETO 01") */
  serial: string;
  /** Modo: urbano, teleférico, tarjeta */
  variant: "urban" | "teleferico" | "card";
};

const VARIANT_META: Record<Props["variant"], { kicker: string; icon: string }> = {
  urban: { kicker: "Camión urbano", icon: "🚌" },
  teleferico: { kicker: "Teleférico", icon: "🚠" },
  card: { kicker: "Movilidad", icon: "💳" }
};

export default function FareTicket({ label, price, payment, serial, variant }: Props) {
  const meta = VARIANT_META[variant];

  return (
    <article className="ticket card-lift flex flex-col gap-4">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-avocado-700">
            {serial}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-avocado-900/70">
            {meta.kicker}
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-avocado-700/10 text-lg">
          {meta.icon}
        </span>
      </header>

      <div>
        <p className="text-sm font-bold text-ink-900/80">{label}</p>
        <p className="mt-1 font-serif-display text-4xl font-black leading-none text-ink-900">
          {price}
        </p>
      </div>

      {/* La línea perforada está en ::before (de .ticket). Spacer aquí. */}
      <div className="h-1" />

      <footer className="flex items-end justify-between gap-3">
        <p className="max-w-[18ch] text-[11px] leading-snug text-ink-900/70">
          {payment}
        </p>
        <div className="flex flex-col items-end gap-1">
          <div className="ticket-barcode w-20 text-ink-900" aria-hidden="true" />
          <span className="text-[9px] font-bold tracking-[0.18em] text-ink-900/50">
            URP · 2026
          </span>
        </div>
      </footer>
    </article>
  );
}
