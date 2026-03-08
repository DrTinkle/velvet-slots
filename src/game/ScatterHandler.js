// ============================================================
//  ScatterHandler.js
//  Handles scatter detection and free spin count resolution.
// ============================================================

import { FREE_SPIN_OUTCOMES } from '../config/GameConfig.js';

export class ScatterHandler {
  // ── Roll free spin count for scatter trigger ──────────────
  // scatterCount: 3, 4, or 5
  // Returns { scatterCount, freeSpins, outcomes }
  rollFreeSpins(scatterCount) {
    const count  = Math.min(Math.max(scatterCount, 3), 5);
    const pool   = FREE_SPIN_OUTCOMES[count];
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    return {
      scatterCount: count,
      freeSpins:    chosen,
      outcomes:     pool,   // full pool so UI can show all possibilities on wheel
    };
  }

  // ── Roll additional spins for retrigger ───────────────────
  rollRetrigger(scatterCount) {
    return this.rollFreeSpins(scatterCount);
  }
}
