export const ROWS = 6;
export const COLS = 7;

export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Board = Cell[][]; // board[row][col], row 0 = top

export type Winner = {
  player: Player;
  cells: [number, number][];
};

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

/** Returns the row where a piece dropped in `col` would land, or -1 if the column is full. */
export function getDropRow(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

export function dropPiece(board: Board, col: number, player: Player) {
  const row = getDropRow(board, col);
  if (row === -1) return null;
  const next = board.map((r) => [...r]);
  next[row][col] = player;
  return { board: next, row };
}

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function findWinner(board: Board): Winner | null {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const player = board[row][col];
      if (player === 0) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const cells: [number, number][] = [[row, col]];
        for (let i = 1; i < 4; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
          cells.push([r, c]);
        }
        if (cells.length === 4) return { player, cells };
      }
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board[0].every((cell) => cell !== 0);
}
