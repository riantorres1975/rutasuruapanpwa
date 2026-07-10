type Props = {
  /** Small italic label for category or language. */
  kicker?: string;
  /** Small uppercase category label. */
  eyebrow?: string;
  /** Main heading. */
  title: React.ReactNode;
  /** Supporting paragraph. */
  intro?: React.ReactNode;
};

export default function PageHeader({ kicker, eyebrow, title, intro }: Props) {
  return (
    <div>
      <header className="max-w-3xl">
        {kicker && <p className="text-purepecha text-sm">{kicker}</p>}
        {eyebrow && (
          <p
            className="text-[11px] font-bold uppercase tracking-[0.24em]"
            style={{ color: "#b8e840" }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="mt-3 font-serif text-4xl font-black leading-[1.05] tracking-tight md:text-5xl lg:text-6xl"
          style={{ color: "#e8f2d8" }}
        >
          {title}
        </h1>
        {intro && (
          <p
            className="mt-5 text-base leading-7 md:text-lg"
            style={{ color: "rgba(232,242,216,0.65)" }}
          >
            {intro}
          </p>
        )}
      </header>
    </div>
  );
}
