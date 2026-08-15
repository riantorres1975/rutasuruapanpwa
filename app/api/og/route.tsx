import { ImageResponse } from "next/og";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { FARES_2026 } from "@/lib/mobility-config";

export async function GET(request: Request) {
  // Endpoint de cómputo (renderiza imágenes): máx 30 por IP/min para evitar abuso.
  const ip = getClientIp(request);
  if (!(await rateLimit(`og:${ip}`, 30, 60_000))) {
    return new Response("Demasiadas solicitudes", { status: 429 });
  }
  if (!(await rateLimit("og:global", 240, 60_000))) {
    return new Response("Servicio temporalmente ocupado", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const { searchParams } = new URL(request.url);
  const rawTitle = searchParams.get("title");
  const rawSubtitle = searchParams.get("subtitle");
  // Acota la longitud del texto renderizado para que nadie genere imágenes gigantes.
  const title = rawTitle?.slice(0, 120) ?? null;
  const subtitle = (rawSubtitle ?? "Uruapan, Michoacán").slice(0, 80);

  if (title) {
    return new ImageResponse(
      (
        <div style={{
          background: "#0c110a",
          color: "#e8f2d8",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "48px 80px",
          width: "100%"
        }}>
          <div style={{ background: "#6aab48", height: 4, width: "100%" }} />
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
            <div style={{
              background: "rgba(106,171,72,0.12)",
              border: "1px solid rgba(140,200,80,0.25)",
              borderRadius: 100,
              color: "#b8e840",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 3,
              marginBottom: 28,
              padding: "7px 18px",
              width: "auto",
              display: "flex"
            }}>
              {subtitle}
            </div>
            <div style={{
              color: "#e8f2d8",
              fontSize: title.length > 50 ? 52 : 64,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1.1,
              marginBottom: 32,
              maxWidth: 960
            }}>
              {title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                background: "#6aab48",
                borderRadius: 100,
                color: "#fff",
                fontSize: 18,
                fontWeight: 900,
                padding: "10px 24px",
                display: "flex"
              }}>
                UruGo
              </div>
              <div style={{ color: "rgba(232,242,216,0.45)", fontSize: 18, fontWeight: 600 }}>
                urugo.app/blog
              </div>
            </div>
          </div>
          <div style={{
            borderTop: "1px solid rgba(140,200,80,0.15)",
            color: "rgba(232,242,216,0.45)",
            display: "flex",
            fontSize: 18,
            fontWeight: 700,
            justifyContent: "space-between",
            paddingTop: 20
          }}>
            <span>Transporte público en Uruapan</span>
            <span>urugo.app</span>
          </div>
        </div>
      ),
      { height: 630, width: 1200 }
    );
  }

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
            width: "auto",
            display: "flex"
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
              <div style={{ color: "#b8e840", fontSize: 28, fontWeight: 900 }}>{FARES_2026.urbanBus.price.replace(/\.00$/, "")}</div>
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
