// ============================================================
//  WildHandler.js
//  Resolves wild behaviors in the correct order:
//  1. Expanding Wilds (fill column first)
//  2. Standard / Sticky / Multiplier Wilds (participate in clusters)
//  Sticky wilds lock themselves after resolution.
// ============================================================

import { SYM, isExpandingWild, isSticky } from '../config/SymbolConfig.js';

export class WildHandler {
  // ── Step 1: Expand any expanding wilds ────────────────────
  // Call this BEFORE cluster detection.
  // Returns list of {col, expandedCells} for animation.
  resolveExpandingWilds(grid) {
    const expansions = [];

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(r, c);
        if (cell && isExpandingWild(cell.id)) {
          const expandedCells = grid.expandColumn(c);
          if (expandedCells.length > 0) {
            expansions.push({ col: c, expandedCells });
          }
          break; // only one expanding wild per column needed
        }
      }
    }

    return expansions;
  }

  // ── Step 2: Lock sticky wilds after a cascade ─────────────
  // Called after cluster detection + removal so sticky wilds
  // that survived stay locked in place.
  lockStickyWilds(grid) {
    const locked = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(r, c);
        if (cell && isSticky(cell.id) && !cell.locked) {
          cell.locked = true;
          locked.push({ row: r, col: c });
        }
      }
    }
    return locked;
  }

  // ── Step 3: Unlock sticky wilds (called on new base spin) ─
  unlockStickyWilds(grid) {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(r, c);
        if (cell && isSticky(cell.id)) {
          cell.locked = false;
        }
      }
    }
  }

  // ── Collect all active multiplier wilds on grid ───────────
  getActiveMultiplierWilds(grid) {
    const wilds = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(r, c);
        if (cell && cell.multiplier !== null) {
          wilds.push({ row: r, col: c, multiplier: cell.multiplier, id: cell.id });
        }
      }
    }
    return wilds;
  }
}
