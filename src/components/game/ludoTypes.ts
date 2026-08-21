export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Token {
  id: number; // 0, 1, 2, 3
  color: PlayerColor;
  status: 'base' | 'track' | 'home';
  step: number; // -1 for base, 0-50 for track, 51-55 home runway, 56 finished
}

export interface PlayerState {
  color: PlayerColor;
  name: string;
  isAI: boolean;
  tokens: Token[];
  score: number;
  sixStreak: number;
  rank?: number;
}

export interface CellCoord {
  r: number;
  c: number;
}

// 52-step standard perimeter path coordinate mapping [row, col] on 15x15 board
export const MAIN_PATH_COORDS: CellCoord[] = [
  // 0 - 4: Red Start moving right along row 6
  { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 },
  // 5 - 10: Going UP col 6 towards Green Top
  { r: 5, c: 6 }, { r: 4, c: 6 }, { r: 3, c: 6 }, { r: 2, c: 6 }, { r: 1, c: 6 }, { r: 0, c: 6 },
  // 11 - 12: Top turn
  { r: 0, c: 7 }, { r: 0, c: 8 },
  // 13 - 17: Green Start going DOWN col 8
  { r: 1, c: 8 }, { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 },
  // 18 - 23: Going RIGHT row 6 towards Yellow Right
  { r: 6, c: 9 }, { r: 6, c: 10 }, { r: 6, c: 11 }, { r: 6, c: 12 }, { r: 6, c: 13 }, { r: 6, c: 14 },
  // 24 - 25: Right turn
  { r: 7, c: 14 }, { r: 8, c: 14 },
  // 26 - 30: Yellow Start going LEFT row 8
  { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }, { r: 8, c: 9 },
  // 31 - 36: Going DOWN col 8 towards Blue Bottom
  { r: 9, c: 8 }, { r: 10, c: 8 }, { r: 11, c: 8 }, { r: 12, c: 8 }, { r: 13, c: 8 }, { r: 14, c: 8 },
  // 37 - 38: Bottom turn
  { r: 14, c: 7 }, { r: 14, c: 6 },
  // 39 - 43: Blue Start going UP col 6
  { r: 13, c: 6 }, { r: 12, c: 6 }, { r: 11, c: 6 }, { r: 10, c: 6 }, { r: 9, c: 6 },
  // 44 - 49: Going LEFT row 8 towards Red Base
  { r: 8, c: 5 }, { r: 8, c: 4 }, { r: 8, c: 3 }, { r: 8, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 0 },
  // 50 - 51: Left turn
  { r: 7, c: 0 }, { r: 6, c: 0 },
];

// Home runways for each color leading to center finish (row, col)
export const HOME_RUNWAYS: Record<PlayerColor, CellCoord[]> = {
  red: [
    { r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 }, { r: 7, c: 6 }
  ],
  green: [
    { r: 1, c: 7 }, { r: 2, c: 7 }, { r: 3, c: 7 }, { r: 4, c: 7 }, { r: 5, c: 7 }, { r: 6, c: 7 }
  ],
  yellow: [
    { r: 7, c: 13 }, { r: 7, c: 12 }, { r: 7, c: 11 }, { r: 7, c: 10 }, { r: 7, c: 9 }, { r: 7, c: 8 }
  ],
  blue: [
    { r: 13, c: 7 }, { r: 12, c: 7 }, { r: 11, c: 7 }, { r: 10, c: 7 }, { r: 9, c: 7 }, { r: 8, c: 7 }
  ],
};

// Starting index on MAIN_PATH_COORDS for each color
export const COLOR_START_INDICES: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// 8 Safe spots on the 52-step track (4 colored start stars + 4 intermediate safe stars)
export const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Base Token Home slots coordinates for 6x6 home bases
export const BASE_SLOT_COORDS: Record<PlayerColor, CellCoord[]> = {
  green: [
    { r: 1.8, c: 1.8 }, { r: 1.8, c: 3.8 }, { r: 3.8, c: 1.8 }, { r: 3.8, c: 3.8 }
  ],
  yellow: [
    { r: 1.8, c: 10.8 }, { r: 1.8, c: 12.8 }, { r: 3.8, c: 10.8 }, { r: 3.8, c: 12.8 }
  ],
  red: [
    { r: 10.8, c: 1.8 }, { r: 10.8, c: 3.8 }, { r: 12.8, c: 1.8 }, { r: 12.8, c: 3.8 }
  ],
  blue: [
    { r: 10.8, c: 10.8 }, { r: 10.8, c: 12.8 }, { r: 12.8, c: 10.8 }, { r: 12.8, c: 12.8 }
  ],
};
