export type Penalty = 'none' | '+2' | 'dnf';

export interface SolveSplits {
  cross: number; // Split duration of Cross step in ms
  f2l: number;   // Split duration of F2L step in ms
  oll: number;   // Split duration of OLL step in ms
  pll: number;   // Split duration of PLL step in ms
}

export interface Solve {
  id: string;
  time: number; // Final time in milliseconds (includes +2 penalty if applicable)
  rawTime: number; // Base time without penalty
  scramble: string;
  timestamp: number;
  penalty: Penalty;
  sessionId: string;
  notes?: string;
  splits?: SolveSplits;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
}

export interface StatsSummary {
  count: number;
  bestSingle: number | null;
  worstSingle: number | null;
  mean: number | null;
  currentMo3: number | null;
  bestMo3: number | null;
  currentAo5: number | null;
  bestAo5: number | null;
  currentAo12: number | null;
  bestAo12: number | null;
  currentAo100: number | null;
  bestAo100: number | null;
}

// 6 faces of a standard Rubik's Cube: U (Up), D (Down), F (Front), B (Back), L (Left), R (Right)
export type FaceColor = 'W' | 'Y' | 'G' | 'B' | 'O' | 'R'; // White, Yellow, Green, Blue, Orange, Red

export interface CubeState {
  U: FaceColor[]; // 9 stickers
  D: FaceColor[];
  F: FaceColor[];
  B: FaceColor[];
  L: FaceColor[];
  R: FaceColor[];
}
