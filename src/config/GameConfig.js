// ============================================================
//  GameConfig.js
//  Central tuning knobs — change these to affect feel & RTP
// ============================================================

export const GRID = {
  COLS: 6,
  ROWS_BASE: 3, // active play rows (middle)
  ROWS_BLOCK: 2, // blocker rows above AND below
  ROWS_TOTAL: 7, // ROWS_BASE + ROWS_BLOCK*2  (3 + 2 + 2)
  CELL_SIZE: 112, // px
  PADDING: 8, // px gap between tiles

  // Row index helpers (0-based, top to bottom)
  // Blocker rows: 0,1 above  |  5,6 below
  // Base rows:    2,3,4
  BASE_ROW_START: 2,
  BASE_ROW_END: 4,
};

export const CLUSTER = {
  MIN_SIZE: 3,
  DIAGONALS: true,
};

// ── Volatility ──────────────────────────────────────────────
// VOL_LEVEL: 1 (low) → 10 (high)
// Each axis has its own curve so they don't all scale linearly.
//
//  symbolPool:  more symbols = rarer matches = higher variance
//  wilds:       fewer wilds  = drier spins   = higher variance
//  pays:        higher pays  = bigger hits   = higher variance (via pay table multiplier)
//
export const VOL_LEVEL = 8; // ← change this (1–10)

// Lerp helper
const lerp = (a, b, t) => a + (b - a) * t;

// Each axis maps VOL_LEVEL 1-10 to its own curve
function _buildPreset(level) {
  const t = (level - 1) / 9; // 0.0 → 1.0

  // Symbol pool: 5 at vol 1, 8 at vol 10 (integer)
  const symbolCountInPool = Math.round(lerp(5, 8, t));

  // Wilds drop off with a sqrt curve — they fall fast at first, then level off
  const wildScale = 1 - Math.sqrt(t) * 0.6;
  const wildFrequency = lerp(0.07, 0.025, t);
  const scatterFrequency = lerp(0.028, 0.01, t);
  const multiplierWildFrequency = lerp(0.025, 0.008, t) * wildScale;
  const expandingWildFrequency = lerp(0.012, 0.004, t) * wildScale;
  const stickyWildFrequency = lerp(0.018, 0.006, t) * wildScale;
  const stickyMultiplierFrequency = lerp(0.006, 0.002, t) * wildScale;

  return {
    symbolCountInPool,
    wildFrequency,
    scatterFrequency,
    multiplierWildFrequency,
    expandingWildFrequency,
    stickyWildFrequency,
    stickyMultiplierFrequency,
  };
}

export function getPreset() {
  return _buildPreset(VOL_LEVEL);
}

// ── Multiplier Wild values ───────────────────────────────────
export const MULTIPLIER_WILD_VALUES = [
  { value: 2, weight: 50 },
  { value: 3, weight: 30 },
  { value: 5, weight: 15 },
  { value: 10, weight: 5 },
];

// ── Free spin outcomes ───────────────────────────────────────
export const FREE_SPIN_OUTCOMES = {
  3: [5, 6, 7, 8, 9, 10],
  4: [8, 9, 10, 12, 14, 16],
  5: [10, 12, 15, 18, 20, 25, 30],
};

// ── Betting ──────────────────────────────────────────────────
export const BET = {
  MIN: 0.2,
  MAX: 20,
  DEFAULT: 0.2,
  STEPS: [0.2, 0.5, 1, 2, 5, 10, 20],
};

// ── Animation timings (ms) ───────────────────────────────────
// ANIM_SCALE: 1.0 = normal, 2.0 = twice as slow, 0.5 = twice as fast
export const ANIM_SCALE = 1.5;

const T = (ms) => Math.round(ms * ANIM_SCALE);

export const ANIM = {
  SYMBOL_DROP_DURATION: T(350),
  SYMBOL_DROP_STAGGER: T(30),
  CLUSTER_FLASH_DURATION: T(500),
  DESTROY_DURATION: T(200),
  CASCADE_PAUSE: T(150),
  EXPAND_DURATION: T(250),
  BLOCKER_BREAK_DURATION: T(300),
};
