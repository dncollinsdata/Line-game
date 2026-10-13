/** Pixel geometry shared by the board layers. */
export interface BoardLayout {
  size: number;
  /** Board width and height in px. */
  boardPx: number;
  /** One cell's width in px. */
  cellPx: number;
}

export function makeLayout(size: number, boardPx: number): BoardLayout {
  return { size, boardPx, cellPx: boardPx / size };
}

export function cellCenter(layout: BoardLayout, cell: number): { x: number; y: number } {
  const row = Math.floor(cell / layout.size);
  const col = cell % layout.size;
  return { x: (col + 0.5) * layout.cellPx, y: (row + 0.5) * layout.cellPx };
}

/**
 * Cell under a touch point, or null if the point is outside the board or in a
 * cell's outer margin. Only the central `HIT_FRACTION` of each cell counts,
 * so a finger sliding past a corner does not clip a neighbouring cell by
 * accident.
 */
const HIT_FRACTION = 0.8;

export function cellAtPoint(layout: BoardLayout, x: number, y: number): number | null {
  const { size, cellPx, boardPx } = layout;
  if (x < 0 || y < 0 || x >= boardPx || y >= boardPx) return null;
  const col = Math.floor(x / cellPx);
  const row = Math.floor(y / cellPx);
  const dx = Math.abs(x - (col + 0.5) * cellPx) / cellPx;
  const dy = Math.abs(y - (row + 0.5) * cellPx) / cellPx;
  if (dx > HIT_FRACTION / 2 || dy > HIT_FRACTION / 2) return null;
  return row * size + col;
}
