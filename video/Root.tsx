import { Composition } from "remotion";
import { DEMO_DURATION_IN_FRAMES, FPS, UruGoDemo } from "./UruGoDemo";

export function VideoRoot() {
  return (
    <>
      <Composition
        id="UruGoDemoWide"
        component={UruGoDemo}
        durationInFrames={DEMO_DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ format: "wide" as const }}
      />
      <Composition
        id="UruGoDemoVertical"
        component={UruGoDemo}
        durationInFrames={DEMO_DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ format: "vertical" as const }}
      />
    </>
  );
}
