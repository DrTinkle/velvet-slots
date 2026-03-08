// ============================================================
//  PayCalculator.js
//  Pure logic — calculates win amounts from clusters.
// ============================================================

import { PAY_SYMBOL_MAP, isMultiplierWild } from '../config/SymbolConfig.js';

// ── Calculate payout for one cascade step ────────────────────
// clusters      — from Cluster.detectClusters()
// grid          — Grid instance (to look up multiplier wild values)
// bet           — current bet amount
// chainMult     — bonus game chain multiplier (1 in base game)
//
// Returns { totalWin, breakdown: [{symbolId, size, baseWin, multiplier, win}] }
export function calculatePayout(clusters, grid, bet, chainMult = 1) {
  let totalWin = 0;
  const breakdown = [];

  for (const cluster of clusters) {
    const symDef = PAY_SYMBOL_MAP[cluster.symbolId];
    if (!symDef) continue;

    // Find pay for this cluster size (cap at max table entry)
    const tableKeys = Object.keys(symDef.payTable)
      .map(Number)
      .sort((a, b) => a - b);
    const sizeKey = Math.min(cluster.size, Math.max(...tableKeys));
    const closestKey = tableKeys.reduce(
      (prev, curr) => (curr <= sizeKey ? curr : prev),
      tableKeys[0]
    );
    const baseMultiplier = symDef.payTable[closestKey] ?? 0;

    // Sum multiplier wilds in this cluster
    let wildMult = 0;
    for (const { row, col } of cluster.wilds) {
      const cell = grid.getCell(row, col);
      if (cell && isMultiplierWild(cell.id) && cell.multiplier) {
        wildMult += cell.multiplier;
      }
    }

    // Total multiplier: (wildMult || 1) × chainMult
    const effectiveMult = (wildMult > 0 ? wildMult : 1) * chainMult;
    const win = parseFloat((bet * baseMultiplier * effectiveMult).toFixed(2));

    totalWin += win;
    breakdown.push({
      symbolId: cluster.symbolId,
      size: cluster.size,
      baseWin: parseFloat((bet * baseMultiplier).toFixed(2)),
      wildMult,
      chainMult,
      effectiveMult,
      win,
    });
  }

  return { totalWin: parseFloat(totalWin.toFixed(2)), breakdown };
}
