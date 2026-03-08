// ============================================================
//  Grid.js  —  clean rewrite with blocker row system
//
//  Full grid is always 7 rows x 6 cols (ROWS_TOTAL x COLS).
//  Row indices (0 = top):
//    0,1       -> upper blocker rows
//    2,3,4     -> base play rows  (BASE_ROW_START ... BASE_ROW_END)
//    5,6       -> lower blocker rows
// ============================================================

import { GRID, getPreset, MULTIPLIER_WILD_VALUES } from '../config/GameConfig.js';
import { SYM, PAY_SYMBOLS, isSticky } from '../config/SymbolConfig.js';

export const BLOCKER_ID = 'blocker';

export class Grid {
  constructor() {
    this.cols = GRID.COLS;
    this.rows = GRID.ROWS_TOTAL;
    this.baseStart = GRID.BASE_ROW_START;
    this.baseEnd = GRID.BASE_ROW_END;
    this.cells = [];
    this.init();
  }

  init() {
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(this._makeCell(r, c));
      }
      this.cells.push(row);
    }
  }

  reset(keepSticky = false) {
    const sticky = keepSticky ? this._extractSticky() : {};
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(this._makeCell(r, c));
      }
      this.cells.push(row);
    }
    if (keepSticky) {
      for (const [key, cell] of Object.entries(sticky)) {
        const [r, c] = key.split(',').map(Number);
        this.cells[r][c] = { ...cell, row: r, col: c };
      }
    }
  }

  _makeCell(r, c, bonusMode = false) {
    if (this._isBlockerRow(r)) {
      return {
        id: BLOCKER_ID,
        row: r,
        col: c,
        multiplier: null,
        sticky: false,
        locked: false,
        blocker: true,
      };
    }
    return this._randomPlayCell(r, c, bonusMode);
  }

  _isBlockerRow(r) {
    return r < this.baseStart || r > this.baseEnd;
  }

  // bonusMode flag: set true during free spins to allow sticky wilds
  _randomPlayCell(r, c, bonusMode = false) {
    const preset = getPreset();
    const rand = Math.random();
    let acc = 0;

    // Sticky wilds only spawn in bonus mode
    if (bonusMode) {
      acc += preset.stickyMultiplierFrequency;
      if (rand < acc) return this._specialCell(r, c, SYM.WILD_STICKY_MULT, true, true);
    }

    acc += preset.expandingWildFrequency;
    if (rand < acc) return this._specialCell(r, c, SYM.WILD_EXPANDING);

    // Sticky (non-multiplier) also bonus only
    if (bonusMode) {
      acc += preset.stickyWildFrequency;
      if (rand < acc) return this._specialCell(r, c, SYM.WILD_STICKY, true);
    }

    acc += preset.multiplierWildFrequency;
    if (rand < acc) return this._specialCell(r, c, SYM.WILD_MULTIPLIER, false, true);
    acc += preset.wildFrequency;
    if (rand < acc) return this._specialCell(r, c, SYM.WILD);
    acc += preset.scatterFrequency;
    if (rand < acc)
      return {
        id: SYM.SCATTER,
        row: r,
        col: c,
        multiplier: null,
        sticky: false,
        locked: false,
        blocker: false,
      };

    return {
      id: this._randomPayId(),
      row: r,
      col: c,
      multiplier: null,
      sticky: false,
      locked: false,
      blocker: false,
    };
  }

  _specialCell(r, c, id, sticky = false, hasMultiplier = false) {
    return {
      id,
      row: r,
      col: c,
      multiplier: hasMultiplier ? this._rollMultiplier() : null,
      sticky,
      locked: sticky,
      blocker: false,
    };
  }

  _rollMultiplier() {
    const pool = MULTIPLIER_WILD_VALUES;
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const e of pool) {
      r -= e.weight;
      if (r <= 0) return e.value;
    }
    return pool[0].value;
  }

  _randomPayId() {
    const preset = getPreset();
    const available = PAY_SYMBOLS.slice(0, preset.symbolCountInPool);
    const total = available.reduce((s, sym) => s + sym.weight, 0);
    let r = Math.random() * total;
    for (const sym of available) {
      r -= sym.weight;
      if (r <= 0) return sym.id;
    }
    return available[0].id;
  }

  getCell(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    return this.cells[r]?.[c] ?? null;
  }

  // Destroy blocker tiles adjacent to winning cluster cells.
  // Only cells in the row immediately bordering a blocker row can
  // reach blockers — and only in the direction toward that blocker.
  //
  //   Row 2 cells  → can destroy row 1 blockers (upward + diag-up)
  //   Row 4 cells  → can destroy row 5 blockers (downward + diag-down)
  //   Row 1 cells  → can destroy row 0 blockers (upward + diag-up)
  //   Row 5 cells  → can destroy row 6 blockers (downward + diag-down)
  //
  // Col adjacency: same col, col-1, col+1 in the blocker row.
  destroyAdjacentBlockers(positions) {
    const destroyed = [];
    const checked = new Set();

    // Map: cluster cell row -> blocker row it can reach
    const blockerRowMap = {
      [this.baseStart]: this.baseStart - 1, // row 2 -> row 1
      [this.baseEnd]: this.baseEnd + 1, // row 4 -> row 5
      [this.baseStart - 1]: this.baseStart - 2, // row 1 -> row 0 (if already open)
      [this.baseEnd + 1]: this.baseEnd + 2, // row 5 -> row 6 (if already open)
    };

    for (const { row, col } of positions) {
      const blockerRow = blockerRowMap[row];
      if (blockerRow === undefined) continue; // this row touches no blockers

      // Check same col and immediate left/right in the blocker row
      for (const dc of [-1, 0, 1]) {
        const nc = col + dc;
        const key = `${blockerRow},${nc}`;
        if (checked.has(key)) continue;
        checked.add(key);

        const cell = this.getCell(blockerRow, nc);
        if (cell && cell.blocker) {
          this.cells[blockerRow][nc] = null;
          destroyed.push({ row: blockerRow, col: nc });
        }
      }
    }
    return destroyed;
  }

  removeCells(positions) {
    const removed = [];
    for (const { row, col } of positions) {
      const cell = this.getCell(row, col);
      if (!cell || cell.blocker || cell.locked) continue;
      this.cells[row][col] = null;
      removed.push({ row, col });
    }
    return removed;
  }

  // Gravity: symbols fall down within segments between blockers
  applyGravity() {
    const moves = [];
    for (let c = 0; c < this.cols; c++) {
      const segments = this._getColumnSegments(c);
      for (const seg of segments) {
        moves.push(...this._gravitySegment(c, seg));
      }
    }
    return moves;
  }

  _getColumnSegments(c) {
    const segs = [];
    let start = null;
    for (let r = 0; r < this.rows; r++) {
      const cell = this.cells[r][c];
      const isBlocked = cell && cell.blocker;
      if (!isBlocked && start === null) {
        start = r;
      } else if (isBlocked && start !== null) {
        segs.push({ start, end: r - 1 });
        start = null;
      }
    }
    if (start !== null) segs.push({ start, end: this.rows - 1 });
    return segs;
  }

  _gravitySegment(c, { start, end }) {
    const moves = [];
    // Collect non-null cells in this segment
    const stack = [];
    for (let r = end; r >= start; r--) {
      const cell = this.cells[r][c];
      if (cell !== null) stack.push(cell);
    }
    // Place back from bottom up
    for (let r = end; r >= start; r--) {
      const cell = stack.shift() ?? null;
      if (cell && cell.row !== r) {
        moves.push({ id: cell.id, from: { r: cell.row, c }, to: { r, c } });
      }
      if (cell) cell.row = r;
      this.cells[r][c] = cell;
    }
    return moves;
  }

  fillEmpty(bonusMode = false) {
    const spawned = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c] === null) {
          const cell = this._randomPlayCell(r, c, bonusMode);
          this.cells[r][c] = cell;
          spawned.push({ ...cell });
        }
      }
    }
    return spawned;
  }

  expandColumn(c) {
    const expanded = [];
    for (let r = this.baseStart; r <= this.baseEnd; r++) {
      if (!this.cells[r][c] || this.cells[r][c].id !== SYM.WILD_EXPANDING) {
        this.cells[r][c] = {
          id: SYM.WILD_EXPANDING,
          row: r,
          col: c,
          multiplier: null,
          sticky: false,
          locked: false,
          blocker: false,
        };
        expanded.push({ row: r, col: c });
      }
    }
    return expanded;
  }

  lockStickyWilds() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell && isSticky(cell.id)) cell.locked = true;
      }
  }

  unlockStickyWilds() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell && isSticky(cell.id)) cell.locked = false;
      }
  }

  _extractSticky() {
    const out = {};
    for (let r = this.baseStart; r <= this.baseEnd; r++)
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell && isSticky(cell.id)) out[`${r},${c}`] = { ...cell };
      }
    return out;
  }

  debug() {
    console.table(
      this.cells.map((row) => row.map((c) => (c ? (c.blocker ? '███' : c.id.slice(0, 5)) : '···')))
    );
  }
}
