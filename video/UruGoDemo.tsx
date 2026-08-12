import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const FPS = 30;

type DemoFormat = "wide" | "vertical";

type DemoScene = {
  clip: string;
  eyebrow: string;
  title: string;
  description: string;
  seconds: number;
};

const INTRO_SECONDS = 4;
const OUTRO_SECONDS = 5;

const scenes: DemoScene[] = [
  {
    clip: "landing",
    eyebrow: "Empieza en segundos",
    title: "Busca a dónde quieres llegar",
    description: "Escribe un destino conocido y UruGo te lleva directo al mapa.",
    seconds: 8,
  },
  {
    clip: "routes",
    eyebrow: "40 rutas y Teleférico",
    title: "Encuentra rutas por lugares reales",
    description: "Busca colonias, números o referencias locales como el Tec Uruapan.",
    seconds: 8,
  },
  {
    clip: "planner",
    eyebrow: "Planea tu recorrido",
    title: "Compara la mejor opción",
    description: "Revisa abordaje, bajada, caminata estimada, tarifa y alternativas.",
    seconds: 8,
  },
  {
    clip: "transfer",
    eyebrow: "Cuando una ruta no basta",
    title: "Viaja con transbordo",
    description: "UruGo conecta dos rutas y conserva el recorrido que elegiste.",
    seconds: 8,
  },
  {
    clip: "trip",
    eyebrow: "Modo viaje",
    title: "Sigue tu avance en el mapa",
    description: "El camión se mueve y gira con tu GPS mientras avanza la barra del viaje.",
    seconds: 11,
  },
  {
    clip: "teleferico",
    eyebrow: "Teleférico Uruapan",
    title: "Sube y baja solo en estaciones",
    description: "La app calcula el acceso a la estación y después te guía a pie.",
    seconds: 11,
  },
  {
    clip: "explore",
    eyebrow: "Todo en un mismo lugar",
    title: "Consulta horarios y aprende a usar la app",
    description: "Encuentra información actualizada y una guía visual para cada función.",
    seconds: 9,
  },
];

const CONTENT_SECONDS = scenes.reduce((total, scene) => total + scene.seconds, 0);
export const DEMO_DURATION_IN_FRAMES = (INTRO_SECONDS + CONTENT_SECONDS + OUTRO_SECONDS) * FPS;
const sceneStartFrames = scenes.map((_, index) => (
  (INTRO_SECONDS + scenes.slice(0, index).reduce((total, scene) => total + scene.seconds, 0)) * FPS
));
const OUTRO_START_FRAME = (INTRO_SECONDS + CONTENT_SECONDS) * FPS;

const palette = {
  background: "#0c110a",
  surface: "#141c10",
  ink: "#eef7df",
  muted: "#b8cfa0",
  green: "#6aab48",
  lime: "#b8e840",
  aqua: "#49c5a5",
};

function fadeForScene(frame: number, durationInFrames: number) {
  const fadeFrames = 14;
  return Math.min(
    interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [1, 0], {
      extrapolateLeft: "clamp",
    }),
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 18 }}>
      <span
        style={{
          width: compact ? 14 : 20,
          height: compact ? 14 : 20,
          borderRadius: 999,
          background: palette.lime,
          boxShadow: `0 0 0 ${compact ? 6 : 9}px rgba(184, 232, 64, 0.13)`,
        }}
      />
      <span
        style={{
          color: palette.ink,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: compact ? 36 : 72,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        UruGo
      </span>
    </div>
  );
}

function RouteMotif({ frame, vertical }: { frame: number; vertical: boolean }) {
  const progress = interpolate(frame, [10, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const width = vertical ? 760 : 1120;
  return (
    <div
      style={{
        position: "absolute",
        left: vertical ? 120 : 400,
        bottom: vertical ? 370 : 180,
        width,
        height: 16,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ width: `${progress * 100}%`, height: "100%", background: palette.lime }} />
      {[0.08, 0.34, 0.62, 0.9].map((position) => (
        <span
          key={position}
          style={{
            position: "absolute",
            left: `${position * 100}%`,
            top: "50%",
            width: 34,
            height: 34,
            borderRadius: 999,
            border: `8px solid ${palette.background}`,
            background: progress >= position ? palette.aqua : "#42513b",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

function Intro({ format }: { format: DemoFormat }) {
  const frame = useCurrentFrame();
  const vertical = format === "vertical";
  const opacity = interpolate(frame, [0, 16, 100, 120], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lift = interpolate(frame, [0, 28], [50, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: palette.background, color: palette.ink, opacity }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(184,232,64,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(184,232,64,.16) 1px, transparent 1px)",
          backgroundSize: vertical ? "92px 92px" : "110px 110px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: vertical ? 90 : 180,
          right: vertical ? 90 : 180,
          top: vertical ? 340 : 270,
          transform: `translateY(${lift}px)`,
        }}
      >
        <Brand />
        <h1
          style={{
            maxWidth: vertical ? 860 : 1400,
            margin: vertical ? "82px 0 0" : "62px 0 0",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: vertical ? 116 : 112,
            lineHeight: 0.98,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          Muévete por Uruapan,
          <br />
          <span style={{ color: palette.lime, fontStyle: "italic" }}>sin preguntar.</span>
        </h1>
        <p
          style={{
            marginTop: 42,
            fontFamily: "Arial, sans-serif",
            fontSize: vertical ? 38 : 38,
            color: palette.muted,
          }}
        >
          Rutas, transbordos y Teleférico en un solo mapa.
        </p>
      </div>
      <RouteMotif frame={frame} vertical={vertical} />
    </AbsoluteFill>
  );
}

function ClipScene({ format, scene }: { format: DemoFormat; scene: DemoScene }) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const vertical = format === "vertical";
  const opacity = fadeForScene(frame, durationInFrames);
  const zoom = interpolate(frame, [0, durationInFrames], [1.015, 1.04], {
    extrapolateRight: "clamp",
  });
  const textLift = interpolate(frame, [7, 25], [32, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const textOpacity = interpolate(frame, [5, 20, 82, 112], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scrimOpacity = interpolate(frame, [75, 120], [1, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: palette.background, opacity, overflow: "hidden" }}>
      <Video
        src={staticFile(`clips/${format}-${scene.clip}.webm`)}
        muted
        objectFit="cover"
        style={{
          width,
          height,
          transform: `scale(${zoom})`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: scrimOpacity,
          background: vertical
            ? "linear-gradient(to bottom, rgba(5,9,4,.86) 0%, rgba(5,9,4,.18) 25%, transparent 48%, rgba(5,9,4,.34) 100%)"
            : "linear-gradient(90deg, rgba(5,9,4,.92) 0%, rgba(5,9,4,.62) 34%, rgba(5,9,4,.06) 66%, rgba(5,9,4,.16) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: vertical ? 58 : 72,
          top: vertical ? 52 : 46,
          opacity: 0.94,
        }}
      >
        <Brand compact />
      </div>
      <div
        style={{
          position: "absolute",
          left: vertical ? 58 : 82,
          right: vertical ? 58 : "auto",
          top: vertical ? 250 : 280,
          width: vertical ? "auto" : 620,
          transform: `translateY(${textLift}px)`,
          opacity: textOpacity,
        }}
      >
        <p
          style={{
            margin: 0,
            color: palette.lime,
            fontFamily: "Arial, sans-serif",
            fontSize: vertical ? 27 : 24,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0,
          }}
        >
          {scene.eyebrow}
        </p>
        <h2
          style={{
            margin: vertical ? "18px 0 0" : "14px 0 0",
            color: palette.ink,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: vertical ? 68 : 66,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: 0,
            textShadow: "0 4px 28px rgba(0,0,0,.55)",
          }}
        >
          {scene.title}
        </h2>
        <p
          style={{
            margin: vertical ? "24px 0 0" : "20px 0 0",
            maxWidth: vertical ? 840 : 580,
            color: palette.ink,
            fontFamily: "Arial, sans-serif",
            fontSize: vertical ? 31 : 28,
            lineHeight: 1.35,
            textShadow: "0 3px 18px rgba(0,0,0,.75)",
          }}
        >
          {scene.description}
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          left: vertical ? 58 : 82,
          right: vertical ? 58 : 82,
          bottom: vertical ? 48 : 44,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ height: 7, flex: 1, borderRadius: 999, background: "rgba(255,255,255,.18)" }}>
          <span
            style={{
              display: "block",
              width: `${Math.min(100, (frame / durationInFrames) * 100)}%`,
              height: "100%",
              borderRadius: 999,
              background: palette.lime,
            }}
          />
        </span>
        <span style={{ color: palette.ink, font: `${vertical ? 24 : 20}px Arial, sans-serif`, fontWeight: 700 }}>
          urugo.app
        </span>
      </div>
    </AbsoluteFill>
  );
}

function Outro({ format }: { format: DemoFormat }) {
  const frame = useCurrentFrame();
  const vertical = format === "vertical";
  const scale = interpolate(frame, [0, 35], [0.94, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.4)),
  });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: palette.background,
        color: palette.ink,
        opacity,
      }}
    >
      <div style={{ textAlign: "center", transform: `scale(${scale})`, padding: vertical ? 72 : 100 }}>
        <div style={{ display: "inline-flex" }}><Brand /></div>
        <h2
          style={{
            margin: vertical ? "78px 0 0" : "58px 0 0",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: vertical ? 105 : 102,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          Tu siguiente viaje
          <br />
          <span style={{ color: palette.lime, fontStyle: "italic" }}>empieza en el mapa.</span>
        </h2>
        <div
          style={{
            display: "inline-flex",
            marginTop: 64,
            border: `3px solid ${palette.green}`,
            borderRadius: 999,
            padding: vertical ? "24px 52px" : "20px 48px",
            background: palette.green,
            color: "#081006",
            font: `800 ${vertical ? 38 : 34}px Arial, sans-serif`,
          }}
        >
          Abre urugo.app
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function UruGoDemo({ format }: { format: DemoFormat }) {
  return (
    <AbsoluteFill style={{ background: palette.background }}>
      <Sequence durationInFrames={INTRO_SECONDS * FPS}>
        <Intro format={format} />
      </Sequence>
      {scenes.map((scene, index) => {
        const from = sceneStartFrames[index];
        const duration = scene.seconds * FPS;
        return (
          <Sequence key={scene.clip} from={from} durationInFrames={duration} premountFor={FPS}>
            <ClipScene format={format} scene={scene} />
          </Sequence>
        );
      })}
      <Sequence from={OUTRO_START_FRAME} durationInFrames={OUTRO_SECONDS * FPS}>
        <Outro format={format} />
      </Sequence>
    </AbsoluteFill>
  );
}
