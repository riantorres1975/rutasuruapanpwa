# 🥑 VoyUruapan — Guía de Rediseño Completo
> Instrucciones para Claude Code / VS Code

---

## RESUMEN

Rediseñar completamente la identidad visual de VoyUruapan usando:
- **Paleta**: Verde profundo del aguacate + lima eléctrico como acento
- **Tipografía**: Playfair Display (display/headings) + DM Sans (body) — reemplaza Plus Jakarta Sans + Fraunces
- **Logo nuevo**: Pin de mapa con forma de aguacate + góndola del Teleférico cruzando
- **Fondo**: Verde muy oscuro (`#0c110a`) — NO negro puro, NO blanco
- **Estilo**: Oscuro, elegante, con identidad de Michoacán/Parque Nacional

---

## 1. TOKENS DE COLOR — reemplazar en `tailwind.config.ts` y `globals.css`

### Paleta nueva completa

```
--bg:      #0c110a   (fondo principal — verde muy oscuro)
--bg2:     #111a0d   (fondo secundario)
--bg3:     #172012   (fondo terciario / hover)
--card:    #141c10   (tarjetas)
--borde:   rgba(140,200,80,0.10)
--borde2:  rgba(140,200,80,0.20)
--ink:     #e8f2d8   (texto principal)
--ink2:    #a8c888   (texto secundario)
--muted:   #5a7848   (texto muted)
--verde:   #6aab48   (acento principal — verde aguacate)
--verde-d: #3d6828   (verde oscuro — hover)
--verde-l: rgba(106,171,72,0.12)  (verde translúcido)
--lima:    #b8e840   (acento lima — Teleférico, highlights)
--lima-l:  rgba(184,232,64,0.10)
--agua:    #48a878   (acento verde-agua)
--agua-l:  rgba(72,168,120,0.12)
--crema:   #e8f2d8   (texto sobre fondo verde)
```

### `tailwind.config.ts` — sección `colors` a reemplazar:

```ts
colors: {
  bg: {
    DEFAULT: '#0c110a',
    2: '#111a0d',
    3: '#172012',
  },
  card: '#141c10',
  ink: {
    DEFAULT: '#e8f2d8',
    2: '#a8c888',
    muted: '#5a7848',
  },
  verde: {
    DEFAULT: '#6aab48',
    d: '#3d6828',
    l: 'rgba(106,171,72,0.12)',
  },
  lima: {
    DEFAULT: '#b8e840',
    l: 'rgba(184,232,64,0.10)',
  },
  agua: {
    DEFAULT: '#48a878',
    l: 'rgba(72,168,120,0.12)',
  },
  // Mantener compatibilidad con código existente:
  avocado: {
    50:  '#e8f2d8',
    100: '#a8c888',
    400: '#6aab48',
    600: '#3d6828',
    700: '#172012',
    900: '#0c110a',
  },
  terracota: {
    50:  '#fde8d4',
    400: '#b8e840',  // redirigido a lima
    500: '#6aab48',
    600: '#3d6828',
  },
  cream: {
    50:  '#e8f2d8',
    100: '#a8c888',
    200: '#5a7848',
  },
  ink: {
    900: '#0c110a',
    800: '#111a0d',
    700: '#172012',
  },
},
```

---

## 2. TIPOGRAFÍA — reemplazar en `layout.tsx`

Cambiar de `Plus_Jakarta_Sans + Fraunces` a `DM_Sans + Playfair_Display`:

```tsx
// app/layout.tsx
import { DM_Sans, Playfair_Display } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

// En el body:
// className={`${dmSans.variable} ${playfair.variable} ...`}
```

```ts
// tailwind.config.ts — fontFamily
fontFamily: {
  sans:    ["var(--font-dm-sans)", "sans-serif"],
  display: ["var(--font-playfair)", "Georgia", "serif"],
  serif:   ["var(--font-playfair)", "Georgia", "serif"],
  "serif-display": ["var(--font-playfair)", "Georgia", "serif"],
},
```

---

## 3. LOGO SVG — componente nuevo

Crear `components/Logo.tsx`:

```tsx
// components/Logo.tsx
import Link from "next/link";

interface LogoProps {
  size?: number;        // altura del icono en px (default: 28)
  showName?: boolean;   // mostrar "VoyUruapan" (default: true)
  showSub?: boolean;    // mostrar subtítulo (default: false)
  href?: string;
}

export default function Logo({
  size = 28,
  showName = true,
  showSub = false,
  href = "/",
}: LogoProps) {
  // Mantiene proporción 48:62
  const w = Math.round(size * 48 / 62);

  const icon = (
    <svg
      width={w}
      height={size}
      viewBox="0 0 48 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="logo-sk" cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#7aba54" />
          <stop offset="100%" stopColor="#3a6425" />
        </radialGradient>
        <radialGradient id="logo-pu" cx="42%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#518c3a" />
          <stop offset="100%" stopColor="#243d18" />
        </radialGradient>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="logo-sh">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Cáscara exterior del aguacate (forma de pin) */}
      <path
        d="M24 2C14.5 2 6 10 6 20C6 31 24 60 24 60C24 60 42 31 42 20C42 10 33.5 2 24 2Z"
        fill="url(#logo-sk)"
        filter="url(#logo-sh)"
      />

      {/* Pulpa interior */}
      <path
        d="M24 7C16.5 7 10 13.5 10 20C10 30 24 54 24 54C24 54 38 30 38 20C38 13.5 31.5 7 24 7Z"
        fill="url(#logo-pu)"
      />

      {/* Highlight lateral sutil */}
      <path
        d="M14 10C11.5 13 10 16.5 10 20C10 24 11 29 13 34C11 28 10 23 11 18C12 14 13 11.5 14 10Z"
        fill="#fff"
        opacity="0.07"
      />

      {/* Cable del Teleférico — cruza todo el pin */}
      <line
        x1="-2" y1="19.5" x2="50" y2="19.5"
        stroke="#b8e840"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#logo-glow)"
      />

      {/* Pequeños postes en los bordes */}
      <line x1="7.5" y1="19.5" x2="7.5" y2="24"
        stroke="#b8e840" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="40.5" y1="19.5" x2="40.5" y2="24"
        stroke="#b8e840" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

      {/* Góndola del Teleférico */}
      <rect x="15" y="19.5" width="18" height="11" rx="3" fill="#b8e840" />

      {/* Gancho de la góndola */}
      <rect x="22.5" y="16" width="3" height="4.5" rx="1.2" fill="#b8e840" />

      {/* Ventanas de la góndola */}
      <rect x="17" y="21.5" width="4.5" height="3.5" rx="1" fill="#1c3612" opacity="0.4" />
      <rect x="24" y="21.5" width="4.5" height="3.5" rx="1" fill="#1c3612" opacity="0.4" />

      {/* Brillo inferior góndola */}
      <rect x="15" y="29" width="18" height="1.2" rx="0.6" fill="#fff" opacity="0.1" />
    </svg>
  );

  const content = (
    <span className="inline-flex items-center gap-2.5">
      {icon}
      {showName && (
        <span className="flex flex-col">
          <span
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 900,
              fontSize: "1.05rem",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              color: "var(--ov-text, #e8f2d8)",
            }}
          >
            VoyUruapan
          </span>
          {showSub && (
            <span
              style={{
                fontSize: "0.57rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#5a7848",
                marginTop: "2px",
              }}
            >
              Uruapan, Mich.
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
```

---

## 4. `globals.css` — reemplazar variables CSS

Reemplazar el bloque `:root` y `[data-theme="light"]` existente con:

```css
:root {
  /* Paleta aguacate oscura (default dark) */
  --background:      #0c110a;
  --foreground:      #e8f2d8;
  --surface:         #111a0d;
  --surface-strong:  #172012;

  /* Tokens de acento */
  --verde:    #6aab48;
  --verde-d:  #3d6828;
  --verde-l:  rgba(106,171,72,0.12);
  --lima:     #b8e840;
  --agua:     #48a878;

  /* Texto */
  --ink:      #e8f2d8;
  --ink2:     #a8c888;
  --muted:    #5a7848;

  /* Overlay tokens — modo oscuro (default) */
  --ov-bg:         rgba(12,17,10,0.97);
  --ov-bg-soft:    rgba(20,28,16,0.96);
  --ov-border:     rgba(140,200,80,0.10);
  --ov-text:       #e8f2d8;
  --ov-text-muted: rgba(168,200,136,0.65);
  --ov-pill-bg:    rgba(106,171,72,0.08);

  /* Compatibilidad con variables antiguas */
  --terracota-400: #b8e840;
  --terracota-500: #6aab48;
  --cream-50:  #e8f2d8;
  --cream-100: #a8c888;
  --ink-900:   #0c110a;
  --ink-800:   #111a0d;
  --avocado-400: #6aab48;
  --avocado-600: #3d6828;
  --avocado-900: #0c110a;
}

/* Modo claro (si AdaptiveTheme lo activa) */
[data-theme="light"] {
  --background:    #f0ece0;
  --foreground:    #1a2e12;
  --surface:       #e4dfd0;
  --surface-strong:#d8d2c0;
  --ov-bg:         rgba(240,236,224,0.98);
  --ov-bg-soft:    rgba(228,223,208,0.98);
  --ov-border:     rgba(74,120,52,0.15);
  --ov-text:       #1a2e12;
  --ov-text-muted: rgba(26,46,18,0.60);
  --ov-pill-bg:    rgba(74,120,52,0.07);
}

body {
  background: var(--background);
  color: var(--foreground);
}

/* Fondo animado: quitar greca existente, poner gradiente radial verde */
.greca-bg {
  background:
    radial-gradient(ellipse 55% 45% at 75% 15%, rgba(106,171,72,0.10), transparent 65%),
    radial-gradient(ellipse 40% 50% at 10% 80%, rgba(72,168,120,0.07), transparent 65%),
    var(--background);
}

/* Grid sutil de fondo */
.grid-bg::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(140,200,80,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(140,200,80,0.025) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  z-index: 0;
}
```

---

## 5. NAVEGACIÓN — componente nav en `page.tsx` y páginas internas

Reemplazar el nav existente con este patrón:

```tsx
{/* NAV */}
<nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
  style={{
    background: "rgba(12,17,10,0.88)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(140,200,80,0.08)",
  }}
>
  <Logo size={28} showName showSub />

  <Link
    href="/mapa"
    className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.03]"
    style={{ background: "var(--verde)" }}
  >
    <MapPinIcon className="h-3.5 w-3.5" />
    Abrir mapa
  </Link>
</nav>
```

---

## 6. `page.tsx` — LANDING PAGE COMPLETA

Reemplazar el contenido del `<main>` con esta estructura:

```tsx
<main
  className="greca-bg grid-bg min-h-dvh overflow-hidden"
  style={{ color: "var(--ink)" }}
>
  {/* NAV */}
  {/* ... (ver sección 5) */}

  {/* ═══════════════════════════════
      HERO — layout de 2 columnas
  ═══════════════════════════════ */}
  <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-5 pb-12 pt-28 lg:grid-cols-2 lg:gap-12">

    {/* Columna izquierda: texto */}
    <div className="relative z-10">

      {/* Eyebrow tag */}
      <div
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest"
        style={{
          background: "var(--verde-l)",
          border: "1px solid rgba(140,200,80,0.2)",
          color: "var(--verde)",
        }}
      >
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ background: "var(--lima)" }}
        />
        Uruapan, Michoacán
      </div>

      {/* H1 */}
      <h1
        className="font-serif text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
        style={{ letterSpacing: "-0.025em" }}
      >
        Moverse por{" "}
        <em style={{ fontStyle: "italic", color: "var(--verde)" }}>
          Uruapan,
        </em>
        <br />
        tan fácil<br />
        <span style={{ color: "var(--lima)" }}>como respirar.</span>
      </h1>

      {/* Subtítulo */}
      <p className="mt-5 max-w-sm text-base leading-relaxed" style={{ color: "var(--ink2)" }}>
        Camiones urbanos y el único Teleférico de Michoacán en un mapa
        hecho aquí, para Uruapan. Sin cuentas, sin anuncios.
      </p>

      {/* Badge Parque Nacional */}
      <div
        className="mt-4 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium"
        style={{
          background: "var(--agua-l)",
          border: "1px solid rgba(72,168,120,0.25)",
          color: "var(--agua)",
        }}
      >
        🌲 Cerca del Parque Nacional Eduardo Ruiz
      </div>

      {/* CTAs */}
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/mapa"
          className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(106,171,72,0.35)]"
          style={{ background: "var(--verde)" }}
        >
          <MapPinIcon className="h-4 w-4" />
          Ver el mapa
        </Link>
        <a
          href="#como-funciona"
          className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-medium transition-all hover:border-[--lima] hover:text-[--lima]"
          style={{
            border: "1px solid rgba(140,200,80,0.2)",
            color: "var(--ink2)",
          }}
        >
          Cómo funciona
        </a>
      </div>
    </div>

    {/* Columna derecha: HeroMap animado (componente existente) */}
    <div className="relative">
      <HeroMapAnimado />  {/* ver sección 7 */}
    </div>
  </section>

  {/* ═══════════════════════════════
      STATS
  ═══════════════════════════════ */}
  <div
    className="grid grid-cols-2 sm:grid-cols-4"
    style={{ borderTop: "1px solid var(--ov-border)", borderBottom: "1px solid var(--ov-border)" }}
  >
    {[
      { n: "41", label: "rutas urbanas", color: "var(--lima)" },
      { n: "6",  label: "estaciones Teleférico", color: "var(--ink)" },
      { n: "$11",label: "tarifa base 2026", color: "var(--ink)" },
      { n: "0",  label: "anuncios ni cuentas", color: "var(--ink)" },
    ].map((s, i) => (
      <div
        key={i}
        className="px-6 py-7"
        style={{ borderRight: i < 3 ? "1px solid var(--ov-border)" : "none" }}
      >
        <div
          className="font-serif text-4xl font-black leading-none tracking-tight"
          style={{ color: s.color }}
        >
          {s.n}
        </div>
        <div className="mt-1.5 text-xs leading-snug" style={{ color: "var(--muted)" }}>
          {s.label}
        </div>
      </div>
    ))}
  </div>

  {/* ═══════════════════════════════
      TRANSPORTE
  ═══════════════════════════════ */}
  <section id="como-funciona" className="mx-auto max-w-[1200px] px-5 py-16">
    <div
      className="mb-8 flex items-baseline justify-between border-b pb-4"
      style={{ borderColor: "var(--ov-border)" }}
    >
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Cómo moverte
        </p>
        <h2 className="font-serif text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Dos formas de cruzar{" "}
          <em style={{ fontStyle: "italic", color: "var(--lima)" }}>la ciudad.</em>
        </h2>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Card Camión */}
      <div
        className="group rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
        style={{
          background: "var(--card)",
          border: "1px solid var(--ov-border)",
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
            style={{ background: "var(--verde-l)" }}
          >🚌</div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "var(--bg3)", color: "var(--muted)", border: "1px solid var(--ov-border)" }}
          >Efectivo</span>
        </div>
        <div className="font-serif text-5xl font-black leading-none tracking-tight" style={{ color: "var(--ink)" }}>
          $11 <span className="text-base font-sans font-normal" style={{ color: "var(--muted)" }}>MXN</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--ink2)" }}>Camión urbano</p>
        <p className="mt-2.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          41 rutas para moverte por toda la ciudad. La mayoría se pagan en efectivo al subir.
        </p>
      </div>

      {/* Card Teleférico */}
      <div
        className="group rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
        style={{
          background: "var(--card)",
          border: "1px solid var(--ov-border)",
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
            style={{ background: "var(--agua-l)" }}
          >🚡</div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "var(--bg3)", color: "var(--muted)", border: "1px solid var(--ov-border)" }}
          >Tarjeta movilidad</span>
        </div>
        <div className="font-serif text-5xl font-black leading-none tracking-tight" style={{ color: "var(--ink)" }}>
          $11 <span className="text-base font-sans font-normal" style={{ color: "var(--muted)" }}>MXN</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--ink2)" }}>Teleférico Uruapan</p>
        <p className="mt-2.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          Único en Michoacán. Conecta oriente-poniente con 6 estaciones. Opera 05:00–23:00.
        </p>
      </div>
    </div>
  </section>

  {/* ═══════════════════════════════
      ESTACIONES TELEFÉRICO
      (usar componente TelefericoSection existente con nuevos estilos)
  ═══════════════════════════════ */}

  {/* ═══════════════════════════════
      4 PASOS
  ═══════════════════════════════ */}
  <section className="mx-auto max-w-[1200px] px-5 pb-16">
    <div
      className="mb-8 border-b pb-4"
      style={{ borderColor: "var(--ov-border)" }}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        Cómo se usa
      </p>
      <h2 className="font-serif text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em" }}>
        Cuatro pasos.{" "}
        <em style={{ fontStyle: "italic", color: "var(--lima)" }}>Sin más.</em>
      </h2>
    </div>

    <div
      className="grid grid-cols-2 overflow-hidden rounded-2xl lg:grid-cols-4"
      style={{ background: "var(--card)", border: "1px solid var(--ov-border)" }}
    >
      {[
        { n: "01", title: "Abre el mapa", desc: "Todas las rutas ya cargadas, sin instalación ni cuenta." },
        { n: "02", title: "Marca tu origen", desc: "Toca el mapa o usa tu ubicación automática." },
        { n: "03", title: "Marca tu destino", desc: "El mapa detecta las rutas más cercanas." },
        { n: "04", title: "Compara opciones", desc: "Ve la ruta recomendada, tiempo y alternativas." },
      ].map((step, i) => (
        <div
          key={i}
          className="p-6 transition-colors hover:bg-[--bg3]"
          style={{ borderRight: i < 3 ? "1px solid var(--ov-border)" : "none" }}
        >
          <div
            className="mb-4 font-serif text-3xl font-bold leading-none"
            style={{ color: "var(--lima)", opacity: 0.3 }}
          >{step.n}</div>
          <p className="mb-1.5 text-sm font-semibold" style={{ color: "var(--ink)" }}>{step.title}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{step.desc}</p>
        </div>
      ))}
    </div>
  </section>

  {/* ═══════════════════════════════
      FAQ (usar LANDING_FAQS existente)
  ═══════════════════════════════ */}

  {/* ═══════════════════════════════
      CTA FINAL
  ═══════════════════════════════ */}
  <div className="mx-5 mb-12 overflow-hidden rounded-3xl px-8 py-20 text-center"
    style={{
      background: "linear-gradient(135deg, var(--verde-d) 0%, #2a4a1a 50%, #1a3a28 100%)",
      border: "1px solid rgba(106,171,72,0.2)",
    }}
  >
    <h2 className="font-serif text-5xl font-black tracking-tight" style={{ color: "var(--crema)", letterSpacing: "-0.025em" }}>
      ¿A dónde vas<br />
      <em style={{ fontStyle: "italic", color: "var(--lima)", opacity: 0.8 }}>hoy?</em>
    </h2>
    <p className="mx-auto mt-4 max-w-xs text-sm" style={{ color: "rgba(232,242,216,0.55)" }}>
      Abre el mapa ahora mismo. Sin registro, sin pago, sin anuncios.
    </p>
    <Link
      href="/mapa"
      className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold transition-all hover:scale-[1.04]"
      style={{
        background: "var(--lima)",
        color: "#0c110a",
        boxShadow: "0 0 0 0 rgba(184,232,64,0.4)",
      }}
    >
      <MapPinIcon className="h-4 w-4" />
      Abrir mapa gratis
    </Link>
  </div>

  {/* NotGovernmentNotice + MadeByFooter existentes */}
  <NotGovernmentNotice />
  <MadeByFooter />
</main>
```

---

## 7. HERO MAP ANIMADO — nuevo componente

Crear `components/HeroMapAnimado.tsx`:

```tsx
"use client";
// components/HeroMapAnimado.tsx
// Mapa SVG animado para el hero — rutas que se dibujan, góndola que se mueve

export default function HeroMapAnimado() {
  return (
    <div
      className="relative h-[480px] overflow-hidden rounded-3xl lg:h-[540px]"
      style={{
        background: "var(--card)",
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
            @keyframes draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
            @keyframes pop  {
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
          style={{ animation: "draw 2s 1.8s ease forwards", strokeDashoffset: 1 }} />
        <path d="M160,60 Q170,160 165,260 Q160,360 170,460"
          fill="none" stroke="rgba(72,168,120,0.10)" strokeWidth="1.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "draw 2s 2.2s ease forwards", strokeDashoffset: 1 }} />
        <path d="M320,80 Q330,180 325,280 Q320,370 330,460"
          fill="none" stroke="rgba(72,168,120,0.08)" strokeWidth="1.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "draw 2s 2.4s ease forwards", strokeDashoffset: 1 }} />

        {/* Ruta urbana principal */}
        <path id="hm-r1" d="M30,200 Q120,185 220,198 Q310,210 430,192"
          fill="none" stroke="rgba(106,171,72,0.45)" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "draw 2.2s 0.9s ease forwards", strokeDashoffset: 1 }} />

        {/* Segunda ruta */}
        <path id="hm-r2" d="M60,360 Q160,330 255,310 Q340,292 440,330"
          fill="none" stroke="rgba(72,168,120,0.35)" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="1" pathLength="1"
          style={{ animation: "draw 2s 1.3s ease forwards", strokeDashoffset: 1 }} />

        {/* Teleférico — línea lima destacada */}
        <path id="hm-tel" d="M28,262 L110,257 L200,261 L285,255 L370,259 L452,253"
          fill="none" stroke="rgba(184,232,64,0.9)" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray="1" pathLength="1" filter="url(#hm-glow)"
          style={{ animation: "draw 2.5s 0.4s ease forwards", strokeDashoffset: 1 }} />

        {/* Cable guía del Teleférico */}
        <line x1="28" y1="262" x2="452" y2="253"
          stroke="rgba(184,232,64,0.12)" strokeWidth="1" strokeDasharray="4 8" />

        {/* Estaciones del Teleférico — aparecen una a una */}
        {[28, 110, 200, 285, 370, 452].map((cx, i) => (
          <circle key={i} cx={cx} cy={i === 0 ? 262 : i === 1 ? 257 : i === 2 ? 261 : i === 3 ? 255 : i === 4 ? 259 : 253}
            r="7" fill="#b8e840" stroke="#0c110a" strokeWidth="2.5" filter="url(#hm-glow2)"
            style={{
              opacity: 0,
              animation: `pop 0.4s ${2.8 + i * 0.2}s ease forwards`,
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
        style={{ animation: "bob 3s ease-in-out infinite" }}
      >
        <style>{`@keyframes bob { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-5px) } }`}</style>
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
            boxShadow: "0 0 0 0 rgba(184,232,64,0.5)",
            animation: "ping-anim 2.2s infinite",
          }}
        >
          <style>{`@keyframes ping-anim { 0% { box-shadow: 0 0 0 0 rgba(184,232,64,0.5) } 70% { box-shadow: 0 0 0 14px rgba(184,232,64,0) } 100% { box-shadow: 0 0 0 0 rgba(184,232,64,0) } }`}</style>
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
          animation: "float 5s ease-in-out infinite",
        }}
      >
        <style>{`@keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }`}</style>
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
```

---

## 8. PÁGINAS INTERNAS — estilos compartidos

### `components/PageHeader.tsx` — reemplazar estilos:

```tsx
// El PageHeader existente, solo cambiar colores:
// - background: var(--bg2) / var(--card)
// - border: var(--ov-border)
// - texto: var(--ink) / var(--ink2) / var(--muted)
// - acento: var(--verde) / var(--lima)
```

### Páginas que necesitan el mismo tratamiento:
- `app/blog/` → mismo nav + fondo dark verde
- `app/privacidad/` → mismo nav + fondo dark verde
- `app/teleferico-uruapan-horario/` → mismo nav + acento lima para Teleférico
- `app/ruta/[slug]/` → mismo nav
- `app/not-found.tsx` → mismo nav + fondo dark verde

**Patrón de página interna:**
```tsx
<main style={{ background: "var(--background)", color: "var(--ink)", minHeight: "100dvh" }}>
  {/* Nav con Logo nuevo */}
  <nav ...><Logo size={26} showName showSub /></nav>

  {/* Contenido de la página */}
  <div className="mx-auto max-w-4xl px-5 pb-16 pt-28">
    ...
  </div>

  <MadeByFooter />
</main>
```

---

## 9. `components/MadeByFooter.tsx` — estilos actualizados

El footer ya existe, solo actualizar colores:
```
background:  var(--card)
border-top:  1px solid var(--ov-border)
texto:       var(--muted)
logo:        <Logo size={22} showName />
```

---

## 10. ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **`globals.css`** — variables CSS (paso más importante, afecta todo)
2. **`tailwind.config.ts`** — tokens de color y tipografía
3. **`layout.tsx`** — cambiar fuentes DM Sans + Playfair Display
4. **`components/Logo.tsx`** — crear componente nuevo
5. **`components/HeroMapAnimado.tsx`** — crear componente nuevo
6. **`app/page.tsx`** — rediseño de landing
7. **Páginas internas** — blog, privacidad, teleférico, ruta, not-found
8. **`components/MadeByFooter.tsx`** y **`components/PageHeader.tsx`** — ajustes de color

---

## NOTAS PARA CLAUDE CODE

- **No tocar** la lógica del mapa en `components/Map.tsx` ni los datos en `/Rutas`
- **No tocar** `components/OnboardingOverlay.tsx`, `BottomSheet.tsx` ni la lógica PWA
- El componente `HeroMap.tsx` existente puede **coexistir** con `HeroMapAnimado.tsx` — el nuevo solo se usa en la landing
- Los **tokens CSS** (variables `--verde`, `--lima`, etc.) son la fuente de verdad — Tailwind los consume vía `var()`
- El logo SVG **no necesita imagen externa** — es SVG inline puro
- Fuentes de Google: `DM_Sans` y `Playfair_Display` están disponibles en `next/font/google`
