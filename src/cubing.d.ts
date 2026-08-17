declare module 'cubing/twisty' {
  export class TwistyPlayer extends HTMLElement {
    alg: string;
    experimentalSetupAlg: string;
    controlPanel: string;
    background: string;
    experimentalStickering: string;
    experimentalStickeringMaskOrbits: string | null;
    timeline: any;
    experimentalModel: any;
  }
}

declare module 'cubing/puzzles' {
  export const cube3x3x3: any;
  export const cube2x2x2: any;
}

declare module 'cubing/alg' {
  export const Alg: any;
}

declare module 'cubing' {
  export * from 'cubing/twisty';
}

declare module 'sr-visualizer' {
  export const cubeSVG: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    'twisty-player': any;
  }
}
