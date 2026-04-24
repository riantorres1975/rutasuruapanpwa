import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#080C18",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          padding: "64px",
          position: "relative",
          width: "100%"
        }}
      >
        <div
          style={{
            background: "radial-gradient(circle, rgba(0,212,170,0.22), rgba(0,212,170,0) 64%)",
            height: 720,
            left: -180,
            position: "absolute",
            top: -220,
            width: 720
          }}
        />
        <div
          style={{
            background: "radial-gradient(circle, rgba(100,210,255,0.14), rgba(100,210,255,0) 66%)",
            bottom: -260,
            height: 760,
            position: "absolute",
            right: -220,
            width: 760
          }}
        />

        <div
          style={{
            alignItems: "center",
            background: "rgba(0,212,170,0.10)",
            border: "2px solid rgba(0,212,170,0.28)",
            borderRadius: 42,
            display: "flex",
            height: 132,
            justifyContent: "center",
            marginBottom: 36,
            width: 132
          }}
        >
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 16V7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5V16M4 16h12M4 16l-1 3M16 16l1 3M7 19h.01M13 19h.01M7 8h6M7 11h6M18 9h1.5A1.5 1.5 0 0 1 21 10.5V16h-5"
              stroke="#00D4AA"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div
          style={{
            color: "#00D4AA",
            fontSize: 94,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
            marginBottom: 24,
            textAlign: "center"
          }}
        >
          VoyUruapan
        </div>
        <div
          style={{
            color: "#E2E8F0",
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.25,
            maxWidth: 900,
            textAlign: "center"
          }}
        >
          Rutas de camiones y Teleférico en Uruapan, Michoacán
        </div>
      </div>
    ),
    {
      height: 630,
      width: 1200
    }
  );
}
