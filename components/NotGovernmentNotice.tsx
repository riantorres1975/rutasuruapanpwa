type Props = {
  /** "compact" para footer/landing chico, "full" para página de privacidad */
  variant?: "compact" | "full";
};

export default function NotGovernmentNotice({ variant = "compact" }: Props) {
  if (variant === "compact") {
    return (
      <div
        role="note"
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold"
        style={{
          borderColor: "rgba(140,200,80,0.12)",
          background: "rgba(106,171,72,0.05)",
          color: "rgba(232,242,216,0.6)",
        }}
      >
        <span aria-hidden="true">⚠️</span>
        <span>
          <span className="font-bold" style={{ color: "#e8f2d8" }}>Sitio independiente.</span>{" "}
          No pertenece al gobierno municipal ni estatal.
        </span>
      </div>
    );
  }

  return (
    <aside
      role="note"
      aria-label="Aviso sobre la naturaleza independiente del proyecto"
      className="rounded-2xl border p-5"
      style={{
        borderColor: "rgba(184,232,64,0.2)",
        background: "rgba(184,232,64,0.04)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-base"
          style={{ background: "rgba(106,171,72,0.12)" }}
        >
          🛈
        </span>
        <div>
          <p className="font-serif text-lg font-black" style={{ color: "#e8f2d8" }}>
            Este sitio <span className="italic" style={{ color: "#b8e840" }}>no es oficial</span>.
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: "rgba(232,242,216,0.65)" }}>
            VoyUruapan es un proyecto <strong style={{ color: "#e8f2d8" }}>independiente y sin fines de lucro</strong> hecho por un vecino de Uruapan como una herramienta para todas las personas — habitantes, estudiantes y turistas — que necesitan moverse en transporte público por la ciudad.
          </p>
          <p className="mt-3 text-sm leading-7" style={{ color: "rgba(232,242,216,0.65)" }}>
            <strong style={{ color: "#e8f2d8" }}>No pertenece al Gobierno de Uruapan</strong>, al Gobierno del Estado de Michoacán, al SITU, al COCOTRA ni a ninguna empresa concesionaria. La información se basa en datos públicos y observación de campo. Para trámites o cambios oficiales, consulta los canales oficiales del transporte de Uruapan.
          </p>
        </div>
      </div>
    </aside>
  );
}
