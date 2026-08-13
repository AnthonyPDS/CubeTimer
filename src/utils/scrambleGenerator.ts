import type { CubeState, FaceColor } from '../types';

const FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
type Face = typeof FACES[number];

const MODIFIERS = ['', "'", '2'] as const;

// Opposite faces mapping
const OPPOSITES: Record<Face, Face> = {
  U: 'D',
  D: 'U',
  L: 'R',
  R: 'L',
  F: 'B',
  B: 'F',
};

// Generate a random WCA 3x3 Scramble (20 to 25 moves)
export function generateScramble(length: number = 21): string {
  const scrambleMoves: string[] = [];
  let lastFace: Face | null = null;
  let secondLastFace: Face | null = null;

  for (let i = 0; i < length; i++) {
    let face: Face;
    do {
      face = FACES[Math.floor(Math.random() * FACES.length)];
    } while (
      face === lastFace ||
      (secondLastFace && face === secondLastFace && OPPOSITES[face] === lastFace)
    );

    secondLastFace = lastFace;
    lastFace = face;

    const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scrambleMoves.push(`${face}${modifier}`);
  }

  return scrambleMoves.join(' ');
}

// Initial Solved State
export function getInitialCubeState(): CubeState {
  return {
    U: Array(9).fill('W'),
    D: Array(9).fill('Y'),
    F: Array(9).fill('G'),
    B: Array(9).fill('B'),
    L: Array(9).fill('O'),
    R: Array(9).fill('R'),
  };
}

// Helper: rotate 90 deg clockwise array of 9 stickers
function rotateFaceCW(face: FaceColor[]): FaceColor[] {
  return [
    face[6], face[3], face[0],
    face[7], face[4], face[1],
    face[8], face[5], face[2],
  ];
}

export function rotateFaceCCW(face: FaceColor[]): FaceColor[] {
  return [
    face[2], face[5], face[8],
    face[1], face[4], face[7],
    face[0], face[3], face[6],
  ];
}

export function rotateFace180(face: FaceColor[]): FaceColor[] {
  return rotateFaceCW(rotateFaceCW(face));
}

// Apply single move to CubeState
export function applyMove(state: CubeState, move: string): CubeState {
  const face = move[0] as Face;
  const modifier = move.slice(1);

  let newState = JSON.parse(JSON.stringify(state)) as CubeState;

  const turns = modifier === '2' ? 2 : modifier === "'" ? 3 : 1;

  for (let t = 0; t < turns; t++) {
    newState = singleClockwiseMove(newState, face);
  }

  return newState;
}

function singleClockwiseMove(s: CubeState, f: Face): CubeState {
  const next = JSON.parse(JSON.stringify(s)) as CubeState;

  // Rotate main face CW
  next[f] = rotateFaceCW(s[f]);

  // Rotate adjacent faces edges
  if (f === 'U') {
    // B top -> R top -> F top -> L top -> B top
    next.R[0] = s.B[0]; next.R[1] = s.B[1]; next.R[2] = s.B[2];
    next.F[0] = s.R[0]; next.F[1] = s.R[1]; next.F[2] = s.R[2];
    next.L[0] = s.F[0]; next.L[1] = s.F[1]; next.L[2] = s.F[2];
    next.B[0] = s.L[0]; next.B[1] = s.L[1]; next.B[2] = s.L[2];
  } else if (f === 'D') {
    // F bot -> R bot -> B bot -> L bot -> F bot
    next.R[6] = s.F[6]; next.R[7] = s.F[7]; next.R[8] = s.F[8];
    next.B[6] = s.R[6]; next.B[7] = s.R[7]; next.B[8] = s.R[8];
    next.L[6] = s.B[6]; next.L[7] = s.B[7]; next.L[8] = s.B[8];
    next.F[6] = s.L[6]; next.F[7] = s.L[7]; next.F[8] = s.L[8];
  } else if (f === 'F') {
    // U bot (6,7,8) -> R left (0,3,6) -> D top (2,1,0) -> L right (8,5,2) -> U bot
    next.R[0] = s.U[6]; next.R[3] = s.U[7]; next.R[6] = s.U[8];
    next.D[2] = s.R[0]; next.D[1] = s.R[3]; next.D[0] = s.R[6];
    next.L[8] = s.D[2]; next.L[5] = s.D[1]; next.L[2] = s.D[0];
    next.U[6] = s.L[8]; next.U[7] = s.L[5]; next.U[8] = s.L[2];
  } else if (f === 'B') {
    // U top (2,1,0) -> L left (0,3,6) -> D bot (6,7,8) -> R right (8,5,2) -> U top
    next.L[0] = s.U[2]; next.L[3] = s.U[1]; next.L[6] = s.U[0];
    next.D[6] = s.L[0]; next.D[7] = s.L[3]; next.D[8] = s.L[6];
    next.R[8] = s.D[6]; next.R[5] = s.D[7]; next.R[2] = s.D[8];
    next.U[2] = s.R[8]; next.U[1] = s.R[5]; next.U[0] = s.R[2];
  } else if (f === 'R') {
    // U right (2,5,8) -> B left (6,3,0) -> D right (2,5,8) -> F right (2,5,8) -> U right
    next.B[6] = s.U[2]; next.B[3] = s.U[5]; next.B[0] = s.U[8];
    next.D[2] = s.B[6]; next.D[5] = s.B[3]; next.D[8] = s.B[0];
    next.F[2] = s.D[2]; next.F[5] = s.D[5]; next.F[8] = s.D[8];
    next.U[2] = s.F[2]; next.U[5] = s.F[5]; next.U[8] = s.F[8];
  } else if (f === 'L') {
    // U left (0,3,6) -> F left (0,3,6) -> D left (0,3,6) -> B right (8,5,2) -> U left
    next.F[0] = s.U[0]; next.F[3] = s.U[3]; next.F[6] = s.U[6];
    next.D[0] = s.F[0]; next.D[3] = s.F[3]; next.D[6] = s.F[6];
    next.B[8] = s.D[0]; next.B[5] = s.D[3]; next.B[2] = s.D[6];
    next.U[0] = s.B[8]; next.U[3] = s.B[5]; next.U[6] = s.B[2];
  }

  return next;
}

// Compute full state from scramble string
export function getCubeStateFromScramble(scrambleStr: string): CubeState {
  let state = getInitialCubeState();
  if (!scrambleStr.trim()) return state;

  const moves = scrambleStr.trim().split(/\s+/);
  for (const move of moves) {
    if (move) {
      state = applyMove(state, move);
    }
  }

  return state;
}

// Map color letter to CSS color
export const COLOR_MAP: Record<FaceColor, string> = {
  W: '#FFFFFF', // White
  Y: '#FFD700', // Yellow
  G: '#00E676', // Green
  B: '#29B6F6', // Blue
  O: '#FF9100', // Orange
  R: '#FF5252', // Red
};
