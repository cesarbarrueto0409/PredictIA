import React from "react";
import { Composition, Sequence } from "remotion";
import { Accuracy, Architecture, Forecast, Impact, Intro, Order, Training, Upload, UserCase } from "./scenes";

// [component, duration in frames @30fps]
const SCENES: [React.FC<{ dur: number }>, number][] = [
  [Intro, 150],
  [UserCase, 330],
  [Architecture, 420],
  [Upload, 270],
  [Training, 420],
  [Forecast, 390],
  [Accuracy, 300],
  [Order, 330],
  [Impact, 270],
];
export const TOTAL = SCENES.reduce((s, [, d]) => s + d, 0);

const Walkthrough: React.FC = () => {
  let from = 0;
  return (
    <>
      {SCENES.map(([Scene, dur], i) => {
        const seq = (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Scene dur={dur} />
          </Sequence>
        );
        from += dur;
        return seq;
      })}
    </>
  );
};

export const Root: React.FC = () => (
  <Composition id="Walkthrough" component={Walkthrough} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
);
