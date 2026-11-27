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

// ---------------------------------------------------------------------------
// Bot (minimax + élagage alpha-bêta)
// ---------------------------------------------------------------------------

const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6]; // du centre vers les bords
const WIN_SCORE = 1_000_000;

function scoreWindow(window: Cell[], bot: Player): number {
  const human: Player = bot === 1 ? 2 : 1;
  let b = 0;
  let h = 0;
  for (const cell of window) {
    if (cell === bot) b++;
    else if (cell === human) h++;
  }
  if (b > 0 && h > 0) return 0;
  if (b === 3) return 5;
  if (b === 2) return 2;
  if (h === 3) return -6;
  if (h === 2) return -2;
  return 0;
}

function evaluate(board: Board, bot: Player): number {
  let score = 0;
  for (let row = 0; row < ROWS; row++) {
    if (board[row][3] === bot) score += 3;
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dr, dc] of DIRECTIONS) {
        const endRow = row + dr * 3;
        const endCol = col + dc * 3;
        if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLS) continue;
        const window: Cell[] = [];
        for (let i = 0; i < 4; i++) window.push(board[row + dr * i][col + dc * i]);
        score += scoreWindow(window, bot);
      }
    }
  }
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  turn: Player,
  bot: Player,
): number {
  const winner = findWinner(board);
  if (winner) return winner.player === bot ? WIN_SCORE + depth : -WIN_SCORE - depth;
  if (isBoardFull(board)) return 0;
  if (depth === 0) return evaluate(board, bot);

  const next: Player = turn === 1 ? 2 : 1;
  const maximizing = turn === bot;
  let best = maximizing ? -Infinity : Infinity;

  for (const col of COLUMN_ORDER) {
    const result = dropPiece(board, col, turn);
    if (!result) continue;
    const value = minimax(result.board, depth - 1, alpha, beta, next, bot);
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  return best;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

const DEPTHS: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6 };

/** Choisit la colonne à jouer pour `bot`. Retourne -1 si le plateau est plein. */
export function getBotMove(board: Board, bot: Player, difficulty: Difficulty): number {
  const depth = DEPTHS[difficulty];
  const human: Player = bot === 1 ? 2 : 1;
  let bestScore = -Infinity;
  let bestCols: number[] = [];

  for (const col of COLUMN_ORDER) {
    const result = dropPiece(board, col, bot);
    if (!result) continue;
    const score = minimax(result.board, depth - 1, -Infinity, Infinity, human, bot);
    if (score > bestScore) {
      bestScore = score;
      bestCols = [col];
    } else if (score === bestScore) {
      bestCols.push(col);
    }
  }
  if (bestCols.length === 0) return -1;
  // Départage aléatoire pour ne pas jouer toujours pareil
  return difficulty === 'easy'
    ? bestCols[Math.floor(Math.random() * bestCols.length)]
    : bestCols[0];
}
