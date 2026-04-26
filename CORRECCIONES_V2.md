# 🔧 VoyUruapan — Correcciones específicas v2
> Lo que falta aplicar después del primer rediseño

---

## DIAGNÓSTICO (basado en capturas)

✅ Ya funciona: fondo verde oscuro, tipografía Playfair, mapa animado, estaciones, pasos, FAQ, CTA  
❌ Falta corregir: logo sin góndola visible, boletos con color incorrecto, badge Parque Nacional, CTAs del hero, stats sin animación

---

## CORRECCIÓN 1 — Logo: reemplazar SVG completo

El logo actual no muestra la góndola del Teleférico con claridad. Reemplazar el SVG en `components/Logo.tsx`:

```tsx
// Reemplazar el SVG interno por este (viewBox="0 0 48 62"):
<svg width={w} height={size} viewBox="0 0 48 62" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="logo-sh">
      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
    </filter>
  </defs>

  {/* Cáscara exterior — forma de pin de mapa */}
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

  {/* Highlight lateral */}
  <path
    d="M14 10C11.5 13 10 16.5 10 20C10 24 11 29 13 34C11 28 10 23 11 18C12 14 13 11.5 14 10Z"
    fill="#fff" opacity="0.07"
  />

  {/* Cable del Teleférico — línea lima que cruza el pin de lado a lado */}
  <line x1="-2" y1="20" x2="50" y2="20"
    stroke="#b8e840" strokeWidth="2.2" strokeLinecap="round"
    filter="url(#logo-glow)"
  />

  {/* Postes del cable */}
  <line x1="8" y1="20" x2="8" y2="25" stroke="#b8e840" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
  <line x1="40" y1="20" x2="40" y2="25" stroke="#b8e840" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

  {/* Góndola del Teleférico — cuerpo */}
  <rect x="15" y="20" width="18" height="11" rx="3" fill="#b8e840" />

  {/* Gancho que conecta góndola al cable */}
  <rect x="22.5" y="16.5" width="3" height="4.5" rx="1.2" fill="#b8e840" />

  {/* Ventanas de la góndola */}
  <rect x="17" y="22" width="4.5" height="3.5" rx="1" fill="#1c3612" opacity="0.45" />
  <rect x="24" y="22" width="4.5" height="3.5" rx="1" fill="#1c3612" opacity="0.45" />

  {/* Brillo inferior góndola */}
  <rect x="15" y="29.5" width="18" height="1.2" rx="0.6" fill="#fff" opacity="0.1" />
</svg>
```

**Importante:** En el `<nav>`, usar `<Logo size={30} showName showSub />` para que se vea a buen tamaño.

---

## CORRECCIÓN 2 — Hero: agregar badge + botones CTA

En `app/page.tsx`, dentro de la columna izquierda del hero, agregar DESPUÉS del párrafo de subtítulo y ANTES del buscador de ruta existente:

```tsx
{/* Badge Parque Nacional — agregar después del subtítulo */}
<div
  className="mt-4 mb-2 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium"
  style={{
    background: "rgba(72,168,120,0.12)",
    border: "1px solid rgba(72,168,120,0.25)",
    color: "#48a878",
  }}
>
  🌲 Cerca del Parque Nacional Eduardo Ruiz
</div>
```

Si el hero YA tiene el buscador de ruta (`¿A dónde vas?`), mantenerlo. Solo agregar el badge arriba de él.

Los botones "Ver el mapa" y "Cómo funciona" deben aparecer DEBAJO del buscador:

```tsx
{/* CTAs — agregar debajo del buscador */}
<div className="mt-4 flex flex-wrap gap-3">
  <Link
    href="/mapa"
    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
    style={{ background: "#6aab48" }}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z"/>
      <circle cx="12" cy="10" r="2" fill="currentColor" stroke="none"/>
    </svg>
    Ver el mapa
  </Link>
  <a
    href="#como-funciona"
    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all"
    style={{
      border: "1px solid rgba(140,200,80,0.2)",
      color: "#a8c888",
    }}
  >
    Cómo funciona
  </a>
</div>
```

---

## CORRECCIÓN 3 — Boletos/Tarifas: cambiar color de fondo

Los `FareTicket` se ven en verde lima claro (#d4e8c2), lo cual no está bien. Deben ser oscuros.

En `components/FareTicket.tsx`, buscar los estilos de fondo y cambiar:

```tsx
// ANTES (probable):
background: "#d4e8c2"  o  className="bg-avocado-50" o similar color claro

// DESPUÉS:
background: "#141c10"   // var(--card) — oscuro
border: "1px solid rgba(140,200,80,0.12)"
color: "#e8f2d8"

// El precio grande debe ser color lima:
color: "#b8e840"  // var(--lima)

// El código de barras y texto secundario:
color: "#5a7848"  // var(--muted)
```

Si FareTicket usa Tailwind classes, reemplazar:
```
bg-cream-50 / bg-avocado-50 / bg-white  →  bg-[#141c10]
text-ink-900  →  text-[#e8f2d8]
border-cream-200  →  border-[rgba(140,200,80,0.12)]
```

---

## CORRECCIÓN 4 — Stats: animación de conteo + colores

En `app/page.tsx`, la sección de stats (41, 6, $11, 0) necesita:

**a) El "41" debe ser color lima (#b8e840), el resto en --ink (#e8f2d8)**

**b) Agregar animación de conteo con este script al final del componente:**

```tsx
// Agregar en un useEffect dentro del componente LandingPage:
// (convertir a "use client" o crear subcomponente client)

"use client";
import { useEffect, useRef } from "react";

function AnimatedStat({ target, prefix = "", className = "", style = {} }: {
  target: number;
  prefix?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const duration = 1400;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.round(ease * target);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, prefix]);

  return <span ref={ref} className={className} style={style}>{prefix}0</span>;
}

// Uso en los stats:
<AnimatedStat target={41} style={{ color: "#b8e840" }} />  {/* lima */}
<AnimatedStat target={6}  style={{ color: "#e8f2d8" }} />
<AnimatedStat target={11} prefix="$" style={{ color: "#e8f2d8" }} />
<AnimatedStat target={0}  style={{ color: "#e8f2d8" }} />
```

Si la página es Server Component, crear `components/StatsAnimados.tsx` como Client Component aparte e importarlo.

---

## CORRECCIÓN 5 — Sección "Rutas y conexiones populares"

Los pills/botones (Ruta 11 Uruapan, Ruta 1, etc.) deben verse así:

```tsx
// Cada pill:
<button
  style={{
    background: "rgba(106,171,72,0.08)",
    border: "1px solid rgba(140,200,80,0.15)",
    color: "#a8c888",
    borderRadius: "100px",
    padding: "0.4rem 1rem",
    fontSize: "0.82rem",
    fontWeight: 500,
    transition: "all 0.18s",
    cursor: "pointer",
  }}
  onMouseEnter={e => {
    (e.target as HTMLElement).style.background = "rgba(106,171,72,0.18)";
    (e.target as HTMLElement).style.color = "#b8e840";
  }}
  onMouseLeave={e => {
    (e.target as HTMLElement).style.background = "rgba(106,171,72,0.08)";
    (e.target as HTMLElement).style.color = "#a8c888";
  }}
>
  Ruta 11 Uruapan
</button>
```

---

## CORRECCIÓN 6 — Footer: logo con nombre

En `components/MadeByFooter.tsx`, el footer inferior dice solo "VoyUruapan" en texto plano. Reemplazar con el componente `<Logo>`:

```tsx
import Logo from "@/components/Logo";

// Donde dice "VoyUruapan" en texto:
<Logo size={22} showName />

// Y en la línea "Rutas de transporte en Uruapan, Michoacán":
// mantener el texto pero con color var(--muted) = #5a7848
```

---

## CORRECCIÓN 7 — Páginas internas (Blog, Privacidad, Teleférico)

Cada página interna debe tener el mismo nav. Buscar en cada `page.tsx` de las subcarpetas y asegurarse de que tengan:

```tsx
// Al inicio de cada página interna:
import Logo from "@/components/Logo";

// Nav:
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

// Fondo de la página:
<main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
```

Páginas a actualizar:
- `app/blog/page.tsx`
- `app/privacidad/page.tsx`  
- `app/teleferico-uruapan-horario/page.tsx`
- `app/not-found.tsx`
- `app/ruta/[slug]/page.tsx` (si aplica)

---

## CORRECCIÓN 8 — globals.css: themeColor del viewport

En `app/layout.tsx`, cambiar el themeColor:

```tsx
export const viewport: Viewport = {
  themeColor: "#0c110a",  // ya debería estar, verificar
};
```

---

## RESUMEN DE ARCHIVOS A TOCAR

| Archivo | Qué cambiar |
|---|---|
| `components/Logo.tsx` | SVG completo con góndola visible |
| `app/page.tsx` | Badge Parque Nacional + botones CTA |
| `components/FareTicket.tsx` | Colores oscuros en lugar de verde claro |
| `app/page.tsx` o nuevo `components/StatsAnimados.tsx` | Contador animado + color lima en "41" |
| `components/MadeByFooter.tsx` | Usar componente `<Logo>` |
| `app/blog/page.tsx` | Nav con Logo nuevo |
| `app/privacidad/page.tsx` | Nav con Logo nuevo |
| `app/teleferico-uruapan-horario/page.tsx` | Nav con Logo nuevo |
| `app/not-found.tsx` | Nav con Logo nuevo |

---

## NOTA FINAL

Lo que ya está bien y NO tocar:
- Fondo `#0c110a` ✅
- Tipografía Playfair Display ✅  
- Mapa hero animado ✅
- Sección de estaciones del Teleférico ✅
- Sección 4 pasos ✅
- FAQ accordion ✅
- CTA final verde ✅
- Aviso "no es oficial" ✅
