import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at 22% 28%, rgba(232,93,47,0.28), rgba(232,93,47,0) 42%), radial-gradient(circle at 78% 72%, rgba(123,160,91,0.22), rgba(123,160,91,0) 44%), linear-gradient(140deg, #161B0E 0%, #0E1208 55%, #0A0E07 100%)",
          color: "#FBF5E8",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "72px 80px",
          position: "relative",
          width: "100%"
        }}
      >
        {/* greca purépecha decorativa superior */}
        <svg
          width="1200"
          height="60"
          viewBox="0 0 1200 60"
          style={{ position: "absolute", top: 0, left: 0, opacity: 0.18 }}
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <path
              key={i}
              d={`M ${i * 40} 30 h 14 v -14 h 14 v 14 h 12`}
              stroke="#E85D2F"
              strokeWidth="2"
              fill="none"
            />
          ))}
        </svg>
        <svg
          width="1200"
          height="60"
          viewBox="0 0 1200 60"
          style={{ position: "absolute", bottom: 0, left: 0, opacity: 0.18 }}
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <path
              key={i}
              d={`M ${i * 40} 30 h 14 v 14 h 14 v -14 h 12`}
              stroke="#7BA05B"
              strokeWidth="2"
              fill="none"
            />
          ))}
        </svg>

        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              alignItems: "center",
              background: "rgba(232,93,47,0.12)",
              border: "2px solid rgba(232,93,47,0.55)",
              borderRadius: 999,
              display: "flex",
              height: 56,
              justifyContent: "center",
              paddingLeft: 18,
              paddingRight: 22
            }}
          >
            <div
              style={{
                background: "#E85D2F",
                borderRadius: 999,
                boxShadow: "0 0 24px rgba(232,93,47,0.9)",
                height: 14,
                marginRight: 12,
                width: 14
              }}
            />
            <div
              style={{
                color: "#FBF5E8",
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: -0.5
              }}
            >
              VoyUruapan
            </div>
          </div>
        </div>

        {/* Headline + sub */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              color: "#E85D2F",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 6,
              textTransform: "uppercase"
            }}
          >
            Transporte en Uruapan, Michoacán
          </div>
          <div
            style={{
              color: "#FBF5E8",
              fontSize: 108,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 0.95,
              maxWidth: 1040
            }}
          >
            Moverse por <span style={{ color: "#E85D2F", fontStyle: "italic" }}>Uruapan</span>,
            <br />
            tan fácil como respirar.
          </div>
          <div
            style={{
              color: "rgba(244,235,217,0.78)",
              display: "flex",
              fontSize: 30,
              fontWeight: 600,
              gap: 24,
              lineHeight: 1.3
            }}
          >
            <span>40 rutas urbanas</span>
            <span style={{ color: "rgba(244,235,217,0.35)" }}>·</span>
            <span>Teleférico Uruapan</span>
            <span style={{ color: "rgba(244,235,217,0.35)" }}>·</span>
            <span>Tarifa $11 MXN</span>
          </div>
        </div>

        {/* Footer pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              alignItems: "center",
              background: "rgba(123,160,91,0.18)",
              border: "1px solid rgba(123,160,91,0.45)",
              borderRadius: 999,
              color: "#DCE7CC",
              display: "flex",
              fontSize: 22,
              fontWeight: 800,
              padding: "10px 20px"
            }}
          >
            rutasuruapanpwa.vercel.app
          </div>
          <div
            style={{
              alignItems: "center",
              color: "rgba(244,235,217,0.55)",
              display: "flex",
              fontSize: 20,
              fontWeight: 600
            }}
          >
            Hecho aquí · sin cuentas · sin anuncios
          </div>
        </div>
      </div>
    ),
    {
      height: 630,
      width: 1200
    }
  );
}
