import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";

export const FPS = 30;

type DemoFormat = "wide" | "vertical";

const scenes = [
  { clip: "landing", seconds: 8 },
  { clip: "routes", seconds: 8 },
  { clip: "planner", seconds: 8 },
  { clip: "transfer", seconds: 8 },
  { clip: "trip", seconds: 11 },
  { clip: "teleferico", seconds: 11 },
  { clip: "explore", seconds: 9 },
] as const;

export const DEMO_DURATION_IN_FRAMES = scenes.reduce(
  (total, scene) => total + scene.seconds * FPS,
  0,
);

const sceneStartFrames = scenes.map((_, index) => (
  scenes.slice(0, index).reduce((total, scene) => total + scene.seconds, 0) * FPS
));

function AppScene({ format, clip }: { format: DemoFormat; clip: string }) {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#0c110a" }}>
      <Video
        src={staticFile(`clips/${format}-${clip}.webm`)}
        muted
        objectFit="cover"
        style={{ width, height }}
      />
    </AbsoluteFill>
  );
}

export function UruGoDemo({ format }: { format: DemoFormat }) {
  return (
    <AbsoluteFill style={{ background: "#0c110a" }}>
      {scenes.map((scene, index) => (
        <Sequence
          key={scene.clip}
          from={sceneStartFrames[index]}
          durationInFrames={scene.seconds * FPS}
          premountFor={FPS}
        >
          <AppScene format={format} clip={scene.clip} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
