// ============================================================
//  Cluster.js  —  path-based win detection
//
//  A "row" (winning line) is any rightward path of 3+ matching
//  symbols starting from column 0, using directions:
//    right [0,+1], top-right [-1,+1], bottom-right [+1,+1]
//
//  A symbol can belong to multiple paths simultaneously.
//  Wilds match any pay symbol.
//  Blockers and scatters are invisible.
//  Each unique path scores independently.
// ============================================================

import { CLUSTER } from '../config/GameConfig.js';
import { isWild, isScatter } from '../config/SymbolConfig.js';

const DIRS = [
  [0, 1], // right
  [-1, 1], // top-right
  [1, 1], // bottom-right
];

// ── Main export ───────────────────────────────────────────────
// Returns array of winning paths, each:
// {
//   symbolId: string,
//   cells:    [{row, col}, ...],   — pay symbol cells
//   wilds:    [{row, col}, ...],   — wild cells in path
//   size:     number,
// }
export function detectClusters(grid) {
  const winningPaths = [];

  // Seed from every cell in column 0 that is a pay symbol or wild
  for (let r = 0; r < grid.rows; r++) {
    const cell = grid.getCell(r, 0);
    if (!cell || cell.blocker || isScatter(cell.id)) continue;

    // Find all paths starting from this cell
    const paths = findPaths(grid, r, 0, cell);
    winningPaths.push(...paths);
  }

  return winningPaths;
}

// ── Find all winning paths starting from (startR, startC) ───
function findPaths(grid, startR, startC, startCell) {
  const results = [];

  // Determine the target symbol — if start is wild we don't know
  // the symbol yet, so we try all possible pay symbols
  if (isWild(startCell.id)) {
    // Try each possible symbol as target, seeding from col 0 wild
    const tried = new Set();
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 1; c < grid.cols; c++) {
        const nb = grid.getCell(r, c);
        if (!nb || nb.blocker || isWild(nb.id) || isScatter(nb.id)) continue;
        if (tried.has(nb.id)) continue;
        tried.add(nb.id);
        dfs(grid, startR, startC, nb.id, [{ row: startR, col: startC, isWild: true }], results);
      }
    }
  } else {
    dfs(grid, startR, startC, startCell.id, [{ row: startR, col: startC, isWild: false }], results);
  }

  return results;
}

// ── DFS: extend path rightward, record only MAXIMAL paths ───
// A path is maximal if it cannot be extended further.
// This prevents sub-paths of longer wins from double-scoring.
function dfs(grid, r, c, targetId, path, results) {
  // Try to extend in each rightward direction
  let extended = false;

  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;

    const nb = grid.getCell(nr, nc);
    if (!nb || nb.blocker || isScatter(nb.id)) continue;

    const nbIsWild = isWild(nb.id);
    const nbIsTarget = nb.id === targetId;

    if (!nbIsWild && !nbIsTarget) continue;

    // Avoid revisiting a cell already in this path
    if (path.some((p) => p.row === nr && p.col === nc)) continue;

    extended = true;
    dfs(grid, nr, nc, targetId, [...path, { row: nr, col: nc, isWild: nbIsWild }], results);
  }

  // Only record this path if it cannot be extended (maximal)
  // AND it meets minimum length
  if (!extended && path.length >= CLUSTER.MIN_SIZE) {
    results.push(buildResult(targetId, path));
  }
}

// ── Build a result object from a completed path ───────────────
function buildResult(symbolId, path) {
  const cells = [];
  const wilds = [];
  for (const p of path) {
    if (p.isWild) wilds.push({ row: p.row, col: p.col });
    else cells.push({ row: p.row, col: p.col });
  }
  return { symbolId, cells, wilds, size: path.length };
}

// ── Count scatters ────────────────────────────────────────────
export function countScatters(grid) {
  let count = 0;
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.getCell(r, c);
      if (cell && isScatter(cell.id)) count++;
    }
  return count;
}

// ── Get all cells to destroy from winning paths ───────────────
// Locked sticky wilds contribute but are NOT destroyed
export function getWinningCells(paths, grid) {
  const all = new Set();
  for (const path of paths) {
    for (const { row, col } of path.cells) {
      all.add(`${row},${col}`);
    }
    for (const { row, col } of path.wilds) {
      const cell = grid.getCell(row, col);
      if (cell && cell.locked) continue;
      all.add(`${row},${col}`);
    }
  }
  return [...all].map((key) => {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
  });
}
