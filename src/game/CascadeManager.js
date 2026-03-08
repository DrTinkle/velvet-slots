// ============================================================
//  CascadeManager.js
// ============================================================

import { Grid } from './Grid.js';
import { WildHandler } from './WildHandler.js';
import { detectClusters, countScatters, getWinningCells } from './Cluster.js';
import { calculatePayout } from './PayCalculator.js';

export class CascadeManager {
  constructor() {
    this.grid = new Grid();
    this.wildHandler = new WildHandler();
    this.isBonus = false;
    this.chainMult = 1;
  }

  startSpin(bet, keepSticky = false) {
    this.grid.reset(keepSticky);
    if (!keepSticky) this.chainMult = 1;

    // Snapshot BEFORE expansion — drop-in shows original single wild tile
    const initialSnapshot = this._snapshot();

    // Expand wilds in grid data — carried into _runChain
    const expansions = this.wildHandler.resolveExpandingWilds(this.grid);

    // Snapshot AFTER expansion — used to know final expanded positions
    const expandedSnapshot = this._snapshot();

    const result = this._runChain(bet, expansions);
    result.initialSnapshot = initialSnapshot;
    result.expansions = expansions;
    result.expandedSnapshot = expandedSnapshot;
    return result;
  }

  _runChain(bet, expansions = []) {
    const steps = [];
    let totalWin = 0;
    let safety = 0;

    while (true) {
      if (++safety > 50) {
        console.warn('CascadeManager: safety break');
        break;
      }

      const clusters = detectClusters(this.grid);
      if (clusters.length === 0) break;

      // Safety: if every cluster consists entirely of locked sticky wilds
      // with no pay symbols, we'd loop forever — break out
      const hasDestroyableWin = clusters.some((cl) => cl.cells.length > 0);
      if (!hasDestroyableWin) break;

      const { totalWin: stepWin, breakdown } = calculatePayout(
        clusters,
        this.grid,
        bet,
        this.isBonus ? this.chainMult : 1
      );

      totalWin += stepWin;

      const winCells = getWinningCells(clusters, this.grid);
      const blockersBroken = this.grid.destroyAdjacentBlockers(winCells);
      const removed = this.grid.removeCells(winCells);

      this.grid.lockStickyWilds();

      const moves = this.grid.applyGravity();
      const spawned = this.grid.fillEmpty(this.isBonus);

      if (this.isBonus) this.chainMult++;

      steps.push({
        clusters,
        breakdown,
        stepWin,
        winCells,
        blockersBroken,
        removed,
        moves,
        spawned,
        expansions: steps.length === 0 ? expansions : [],
        chainMult: this.chainMult,
      });
    }

    const scatters = countScatters(this.grid);
    return {
      steps,
      totalWin,
      scatters,
      triggeredBonus: scatters >= 3 && !this.isBonus,
      finalSnapshot: this._snapshot(),
    };
  }

  _snapshot() {
    return this.grid.cells.map((row) => row.map((c) => (c ? { ...c } : null)));
  }

  enterBonus() {
    this.isBonus = true;
    this.chainMult = 1;
  }
  exitBonus() {
    this.isBonus = false;
    this.chainMult = 1;
    this.grid.unlockStickyWilds();
  }
}
