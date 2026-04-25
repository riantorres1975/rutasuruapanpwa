type Props = {
  /** "compact" para footer/landing chico, "full" para página de privacidad */
  variant?: "compact" | "full";
};

export default function NotGovernmentNotice({ variant = "compact" }: Props) {
  if (variant === "compact") {
    return (
      <div
        role="note"
        className="inline-flex items-center gap-2 rounded-full border border-cream-100/15 bg-cream-100/5 px-3 py-1.5 text-[11px] font-semibold text-cream-100/75"
      >
        <span aria-hidden="true">⚠️</span>
        <span>
          <span className="font-bold text-cream-50">Sitio independiente.</span>{" "}
          No pertenece al gobierno municipal ni estatal.
        </span>
      </div>
    );
  }

  return (
    <aside
      role="note"
      aria-label="Aviso sobre la naturaleza independiente del proyecto"
      className="rounded-2xl border border-terracota-400/30 bg-terracota-400/5 p-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-terracota-400/15 text-base"
        >
          🛈
        </span>
        <div>
          <p className="font-serif-display text-lg font-black text-cream-50">
            Este sitio <span className="italic text-terracota-400">no es oficial</span>.
          </p>
          <p className="mt-2 text-sm leading-7 text-cream-100/80">
            VoyUruapan es un proyecto <strong className="text-cream-50">independiente y sin fines de lucro</strong> hecho por un vecino de Uruapan como una herramienta para todas las personas — habitantes, estudiantes y turistas — que necesitan moverse en transporte público por la ciudad.
          </p>
          <p className="mt-3 text-sm leading-7 text-cream-100/80">
            <strong className="text-cream-50">No pertenece al Gobierno de Uruapan</strong>, al Gobierno del Estado de Michoacán, al SITU, al COCOTRA ni a ninguna empresa concesionaria. La información se basa en datos públicos y observación de campo. Para trámites o cambios oficiales, consulta los canales oficiales del transporte de Uruapan.
          </p>
        </div>
      </div>
    </aside>
  );
}
