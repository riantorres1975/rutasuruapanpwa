export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        background: "#0c110a",
        color: "#e8f2d8",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "40px 80px",
        width: "100%"
      }}>
        <div style={{
          background: "#6aab48",
          height: 4,
          width: "100%"
        }} />
        <div style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center"
        }}>
          <div style={{
            background: "rgba(106,171,72,0.12)",
            border: "1px solid rgba(140,200,80,0.25)",
            borderRadius: 100,
            color: "#b8e840",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 3,
            marginBottom: 20,
            padding: "8px 20px",
            width: "auto"
          }}>
            Uruapan, Michoacán
          </div>
          <div style={{
            display: "flex",
            fontSize: 100,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
            marginBottom: 16
          }}>
            <span style={{ color: "#e8f2d8" }}>Uru</span>
            <span style={{ color: "#b8e840" }}>Go</span>
          </div>
          <div style={{
            color: "rgba(232,242,216,0.6)",
            fontSize: 32,
            fontWeight: 500,
            lineHeight: 1.4,
            marginBottom: 28,
            maxWidth: 680
          }}>
            Rutas de camiones y Teleférico en Uruapan
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{
              background: "rgba(20,28,16,0.8)",
              border: "1px solid rgba(140,200,80,0.15)",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "14px 28px"
            }}>
              <div style={{ color: "#b8e840", fontSize: 28, fontWeight: 900 }}>40</div>
              <div style={{ color: "rgba(232,242,216,0.4)", fontSize: 14, fontWeight: 600 }}>Rutas</div>
            </div>
            <div style={{
              background: "rgba(20,28,16,0.8)",
              border: "1px solid rgba(140,200,80,0.15)",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "14px 28px"
            }}>
              <div style={{ color: "#b8e840", fontSize: 28, fontWeight: 900 }}>6</div>
              <div style={{ color: "rgba(232,242,216,0.4)", fontSize: 14, fontWeight: 600 }}>Teleférico</div>
            </div>
            <div style={{
              background: "rgba(20,28,16,0.8)",
              border: "1px solid rgba(140,200,80,0.15)",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "14px 28px"
            }}>
              <div style={{ color: "#b8e840", fontSize: 28, fontWeight: 900 }}>$11</div>
              <div style={{ color: "rgba(232,242,216,0.4)", fontSize: 14, fontWeight: 600 }}>MXN</div>
            </div>
          </div>
        </div>
        <div style={{
          borderTop: "1px solid rgba(140,200,80,0.15)",
          color: "rgba(232,242,216,0.55)",
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          justifyContent: "space-between"
        }}>
          <span>urugo.app</span>
          <span>Wh0Code</span>
        </div>
      </div>
    ),
    { height: 630, width: 1200 }
  );
}