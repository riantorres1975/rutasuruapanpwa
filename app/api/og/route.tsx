import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0c110a",
          color: "#e8f2d8",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          padding: "0",
          position: "relative",
          width: "100%"
        }}
      >
        {/* Fondo radial verde izquierda */}
        <div
          style={{
            background: "radial-gradient(circle, rgba(106,171,72,0.18), rgba(106,171,72,0) 65%)",
            height: 800,
            left: -200,
            position: "absolute",
            top: -200,
            width: 800
          }}
        />
        {/* Fondo radial lima derecha */}
        <div
          style={{
            background: "radial-gradient(circle, rgba(184,232,64,0.10), rgba(184,232,64,0) 65%)",
            bottom: -300,
            height: 800,
            position: "absolute",
            right: -200,
            width: 800
          }}
        />

        {/* Borde superior lima */}
        <div
          style={{
            background: "linear-gradient(90deg, #6aab48, #b8e840, #6aab48)",
            height: 4,
            left: 0,
            position: "absolute",
            top: 0,
            width: "100%"
          }}
        />

        {/* Contenido principal */}
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            padding: "72px 80px",
            position: "relative"
          }}
        >
          {/* Badge ciudad */}
          <div
            style={{
              alignItems: "center",
              background: "rgba(106,171,72,0.12)",
              border: "1px solid rgba(140,200,80,0.25)",
              borderRadius: 100,
              color: "#b8e840",
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              gap: 8,
              letterSpacing: 3,
              marginBottom: 32,
              padding: "8px 20px",
              textTransform: "uppercase"
            }}
          >
            {/* Dot animado */}
            <div
              style={{
                background: "#b8e840",
                borderRadius: "50%",
                height: 8,
                width: 8
              }}
            />
            Uruapan, Michoacán
          </div>

          {/* Logo + nombre */}
          <div style={{ alignItems: "center", display: "flex", gap: 28, marginBottom: 28 }}>
            {/* Ícono aguacate-pin */}
            <div
              style={{
                alignItems: "center",
                background: "rgba(106,171,72,0.15)",
                border: "2px solid rgba(184,232,64,0.3)",
                borderRadius: 24,
                display: "flex",
                height: 96,
                justifyContent: "center",
                width: 96
              }}
            >
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C8.5 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3.5-7-7-7Z"
                  fill="rgba(106,171,72,0.3)"
                  stroke="#b8e840"
                  strokeWidth="1.5"
                />
                <line x1="2" y1="9" x2="22" y2="9" stroke="#b8e840" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="8" y="8" width="8" height="5" rx="1.5" fill="#b8e840" />
              </svg>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  color: "#e8f2d8",
                  fontSize: 88,
                  fontWeight: 900,
                  letterSpacing: -3,
                  lineHeight: 1
                }}
              >
                Uru<span style={{ color: "#b8e840" }}>Go</span>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div
            style={{
              color: "rgba(232,242,216,0.65)",
              fontSize: 32,
              fontWeight: 500,
              lineHeight: 1.4,
              marginBottom: 48,
              maxWidth: 700
            }}
          >
            Rutas de camiones y Teleférico en Uruapan, Michoacán
          </div>

          {/* Stats pills */}
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Rutas", value: "40" },
              { label: "Teleférico", value: "6 est." },
              { label: "Tarifa", value: "$11 MXN" }
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  alignItems: "center",
                  background: "rgba(20,28,16,0.8)",
                  border: "1px solid rgba(140,200,80,0.15)",
                  borderRadius: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "14px 28px"
                }}
              >
                <div style={{ color: "#b8e840", fontSize: 28, fontWeight: 900 }}>{s.value}</div>
                <div style={{ color: "rgba(232,242,216,0.4)", fontSize: 14, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer — developed by */}
        <div
          style={{
            alignItems: "center",
            borderTop: "1px solid rgba(140,200,80,0.08)",
            bottom: 0,
            color: "rgba(232,242,216,0.25)",
            display: "flex",
            fontSize: 16,
            fontWeight: 600,
            justifyContent: "space-between",
            left: 0,
            padding: "18px 80px",
            position: "absolute",
            right: 0
          }}
        >
          <span>urugo.app</span>
          <span>Developed by Wh0Code</span>
        </div>
      </div>
    ),
    {
      height: 630,
      width: 1200
    }
  );
}
