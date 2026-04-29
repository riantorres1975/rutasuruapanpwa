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
          position: "relative",
          width: "100%"
        }}
      >
        {/* Glow verde izquierda */}
        <div
          style={{
            background: "radial-gradient(circle, rgba(106,171,72,0.2), transparent 65%)",
            height: 800,
            left: -200,
            position: "absolute",
            top: -200,
            width: 800
          }}
        />
        {/* Glow lima derecha */}
        <div
          style={{
            background: "radial-gradient(circle, rgba(184,232,64,0.12), transparent 65%)",
            bottom: -300,
            height: 800,
            position: "absolute",
            right: -200,
            width: 800
          }}
        />
        {/* Borde superior */}
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

        {/* Contenido */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            padding: "72px 80px",
            position: "relative"
          }}
        >
          {/* Badge */}
          <div
            style={{
              background: "rgba(106,171,72,0.12)",
              border: "1px solid rgba(140,200,80,0.25)",
              borderRadius: 100,
              color: "#b8e840",
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 3,
              marginBottom: 36,
              padding: "8px 20px",
              textTransform: "uppercase",
              width: "fit-content"
            }}
          >
            Uruapan, Michoacán
          </div>

          {/* Nombre */}
          <div
            style={{
              display: "flex",
              fontSize: 100,
              fontWeight: 900,
              letterSpacing: -4,
              lineHeight: 1,
              marginBottom: 24
            }}
          >
            <span style={{ color: "#e8f2d8" }}>Uru</span>
            <span style={{ color: "#b8e840" }}>Go</span>
          </div>

          {/* Descripción */}
          <div
            style={{
              color: "rgba(232,242,216,0.6)",
              fontSize: 32,
              fontWeight: 500,
              lineHeight: 1.4,
              marginBottom: 52,
              maxWidth: 680
            }}
          >
            Rutas de camiones y Teleférico en Uruapan, Michoacán
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 16 }}>
            <div
              style={{
                background: "rgba(20,28,16,0.8)",
                border: "1px solid rgba(140,200,80,0.15)",
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "14px 28px"
              }}
            >
              <div style={{ color: "#b8e840", fontSize: 28, fontWeight: 900 }}>40</div>
              <div style={{ color: "rgba(232,242,216,0.4)", fontSize: 14, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Rutas</div>
            </div>
            <div
              style={{
                background: "rgba(20,28,16,0.8)",
                border: "1px solid rgba(140,200,80,0.15)",
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "14px 28px"
              }}
            >
              <div style={{ color: "#b8e840", fontSize: 28, fontWeight: 900 }}>6 est.</div>
              <div style={{ color: "rgba(232,242,216,0.4)", fontSize: 14, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Teleférico</div>
            </div>
            <div
              style={{
                background: "rgba(20,28,16,0.8)",
                border: "1px solid rgba(140,200,80,0.15)",
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "14px 28px"
              }}
            >
              <div style={{ color: "#b8e840", fontSize: 28, fontWeight: 900 }}>$11 MXN</div>
              <div style={{ color: "rgba(232,242,216,0.4)", fontSize: 14, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Tarifa</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid rgba(140,200,80,0.08)",
            color: "rgba(232,242,216,0.25)",
            display: "flex",
            fontSize: 16,
            fontWeight: 600,
            justifyContent: "space-between",
            padding: "18px 80px"
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
