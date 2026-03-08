// ============================================================
//  SymbolConfig.js
//  Defines every symbol in the game: pay symbols + specials.
//  Weights control how often each appears in the spawn pool.
// ============================================================

// ── Symbol type constants ────────────────────────────────────
export const SYM = {
  // Pay symbols (low → high value)
  LOW_A: 'low_a',
  LOW_B: 'low_b',
  MID_A: 'mid_a',
  MID_B: 'mid_b',
  HIGH_A: 'high_a',
  HIGH_B: 'high_b',
  // Extra symbols available when symbolCountInPool > 6
  EXTRA_A: 'extra_a',
  EXTRA_B: 'extra_b',

  // Special symbols
  WILD: 'wild',
  WILD_EXPANDING: 'wild_expanding',
  WILD_STICKY: 'wild_sticky',
  WILD_MULTIPLIER: 'wild_multiplier',
  WILD_STICKY_MULT: 'wild_sticky_mult', // rarest — sticky + multiplier
  SCATTER: 'scatter',
};

// ── Pay symbol definitions ───────────────────────────────────
// payTable: maps cluster size → payout multiplier (× bet)
// Sizes below MIN_CLUSTER (3) never pay — listed for reference only.
export const PAY_SYMBOLS = [
  {
    id: SYM.LOW_A,
    label: 'Low A',
    color: 0x6c8ebf, // soft blue  (used for placeholder graphics)
    weight: 28,
    payTable: { 3: 0.05, 4: 0.1, 5: 0.25, 6: 0.5 },
  },
  {
    id: SYM.LOW_B,
    label: 'Low B',
    color: 0x82b366, // soft green
    weight: 26,
    payTable: { 3: 0.05, 4: 0.2, 5: 0.4, 6: 0.75 },
  },
  {
    id: SYM.MID_A,
    label: 'Mid A',
    color: 0xd79b00, // amber
    weight: 18,
    payTable: { 3: 0.1, 4: 0.3, 5: 0.65, 6: 1.25 },
  },
  {
    id: SYM.MID_B,
    label: 'Mid B',
    color: 0xae4132, // brick red
    weight: 16,
    payTable: { 3: 0.2, 4: 0.5, 5: 1.0, 6: 2.0 },
  },
  {
    id: SYM.HIGH_A,
    label: 'High A',
    color: 0x9673a6, // purple
    weight: 8,
    payTable: { 3: 0.4, 4: 1.0, 5: 2.0, 6: 4.0 },
  },
  {
    id: SYM.HIGH_B,
    label: 'High B',
    color: 0xe6c84a, // gold
    weight: 6,
    payTable: { 3: 0.75, 4: 2.0, 5: 5.0, 6: 12.5 },
  },
  {
    id: SYM.EXTRA_A,
    label: 'Extra A',
    color: 0x4fc3f7, // cyan
    weight: 10,
    payTable: { 3: 0.1, 4: 0.25, 5: 0.5, 6: 1.0 },
  },
  {
    id: SYM.EXTRA_B,
    label: 'Extra B',
    color: 0xf06292, // pink
    weight: 9,
    payTable: { 3: 0.1, 4: 0.3, 5: 0.65, 6: 1.25 },
  },
];

// Quick lookup map by id
export const PAY_SYMBOL_MAP = Object.fromEntries(PAY_SYMBOLS.map((s) => [s.id, s]));

// ── Special symbol definitions ───────────────────────────────
export const SPECIAL_SYMBOLS = {
  [SYM.WILD]: {
    id: SYM.WILD,
    label: 'Wild',
    color: 0xffffff,
    description: 'Substitutes for any pay symbol',
  },
  [SYM.WILD_EXPANDING]: {
    id: SYM.WILD_EXPANDING,
    label: 'Expanding Wild',
    color: 0x00e5ff,
    description: 'Instantly fills entire column on landing',
  },
  [SYM.WILD_STICKY]: {
    id: SYM.WILD_STICKY,
    label: 'Sticky Wild',
    color: 0x69f0ae,
    description: 'Locks in place through cascades and entire bonus round',
  },
  [SYM.WILD_MULTIPLIER]: {
    id: SYM.WILD_MULTIPLIER,
    label: 'Multiplier Wild',
    color: 0xffab40,
    description: 'Substitutes and adds its multiplier value to cluster win',
  },
  [SYM.WILD_STICKY_MULT]: {
    id: SYM.WILD_STICKY_MULT,
    label: 'Sticky ×Mult Wild',
    color: 0xea80fc,
    description: 'Sticky + multiplier — rarest wild',
  },
  [SYM.SCATTER]: {
    id: SYM.SCATTER,
    label: 'Scatter',
    color: 0xff1744,
    description: '3+ anywhere triggers free spins bonus',
  },
};

// ── Helper: is this id a wild of any kind? ───────────────────
export function isWild(id) {
  return [
    SYM.WILD,
    SYM.WILD_EXPANDING,
    SYM.WILD_STICKY,
    SYM.WILD_MULTIPLIER,
    SYM.WILD_STICKY_MULT,
  ].includes(id);
}

export function isSticky(id) {
  return id === SYM.WILD_STICKY || id === SYM.WILD_STICKY_MULT;
}

export function isMultiplierWild(id) {
  return id === SYM.WILD_MULTIPLIER || id === SYM.WILD_STICKY_MULT;
}

export function isExpandingWild(id) {
  return id === SYM.WILD_EXPANDING;
}

export function isScatter(id) {
  return id === SYM.SCATTER;
}
