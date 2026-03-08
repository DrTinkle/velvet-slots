// ============================================================
//  GameScene.js  —  clean rewrite
//
//  Grid layout (7 rows x 6 cols), always fully on screen.
//  Single source of truth for positioning:
//    cellX(col)  = originX + col * STEP + HALF
//    cellY(row)  = originY + row * STEP + HALF
//  originX/Y = top-left of the 7-row grid area
// ============================================================

import { CascadeManager } from '../game/CascadeManager.js';
import { ScatterHandler } from '../game/ScatterHandler.js';
import { GRID, ANIM } from '../config/GameConfig.js';
import { BLOCKER_ID } from '../game/Grid.js';
import { SYM, isSticky, isMultiplierWild } from '../config/SymbolConfig.js';

const CELL = GRID.CELL_SIZE; // 80
const PAD = GRID.PADDING; // 6
const STEP = CELL + PAD; // 86
const HALF = CELL / 2; // 40
const HUD = 126; // px reserved at bottom for HUD

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cascade = new CascadeManager();
    this.scatter = new ScatterHandler();
    this.spinning = false;
    this.bet = 10;
    this.sprites = {}; // keyed "r,c"

    this._calcOrigin();
    this._drawBackground();
    this._drawFullGrid();

    this.game.events.on('spin', this._onSpin, this);
    this.game.events.on('betChanged', (v) => {
      this.bet = v;
    });

    // Debug mode — press D to toggle texture key labels
    this._debugMode = false;
    this.input.keyboard.on('keydown-D', () => {
      this._debugMode = !this._debugMode;
      console.log(`[DEBUG] mode ${this._debugMode ? 'ON' : 'OFF'}`);
      this._drawFullGrid(); // redraw to show/hide labels
    });

    // Log all registered textures on boot
    this.time.delayedCall(500, () => {
      const keys = this.textures.getTextureKeys();
      const wildKeys = keys.filter((k) => k.includes('wild') || k.includes('mult'));
      console.log('[TEX REGISTRY] wild/mult textures:', wildKeys);
    });
  }

  // ── Origin: top-left corner of the 7-row grid ─────────────
  _calcOrigin() {
    const { width, height } = this.scale;
    const gridW = GRID.COLS * STEP - PAD;
    const gridH = GRID.ROWS_TOTAL * STEP - PAD;
    const availH = height - HUD;
    this.originX = Math.round((width - gridW) / 2);
    this.originY = Math.round((availH - gridH) / 2);
  }

  cellX(col) {
    return this.originX + col * STEP + HALF;
  }
  cellY(row) {
    return this.originY + row * STEP + HALF;
  }

  // ── Background ─────────────────────────────────────────────
  _drawBackground() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x081f16);

    // Grid panel — exactly fits the 7×6 grid
    const gridW = GRID.COLS * STEP - PAD;
    const gridH = GRID.ROWS_TOTAL * STEP - PAD;
    this.add
      .rectangle(
        this.originX + gridW / 2,
        this.originY + gridH / 2,
        gridW + 16,
        gridH + 16,
        0x0a0a0a,
        0.75
      )
      .setStrokeStyle(1, 0x1e1e1e);

    // Divider lines showing base row boundaries
    const y1 = this.originY + GRID.BASE_ROW_START * STEP - PAD / 2 - 2;
    const y2 = this.originY + (GRID.BASE_ROW_END + 1) * STEP - PAD / 2 - 2;
    const x1 = this.originX - 4;
    const x2 = this.originX + gridW + 4;
    this.add.rectangle((x1 + x2) / 2, y1, x2 - x1, 2, 0xc9a84c, 0.25);
    this.add.rectangle((x1 + x2) / 2, y2, x2 - x1, 2, 0xc9a84c, 0.25);
  }

  // ── Draw every cell from current grid state ────────────────
  _drawFullGrid() {
    // Deep destroy — clears sprites AND any orphaned children
    for (const key of Object.keys(this.sprites)) {
      this._destroySprite(key);
    }
    this.sprites = {};

    // Belt-and-suspenders: destroy any lingering badge/ring text objects
    // that might have lost their parent sprite reference
    this.children.list.filter((o) => o._isSlotBadge || o._isSlotRing).forEach((o) => o.destroy());

    const grid = this.cascade.grid;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(r, c);
        if (cell) this._createSprite(cell);
      }
    }
  }

  // ── Create one sprite ──────────────────────────────────────
  _createSprite(cell) {
    const key = `${cell.row},${cell.col}`;
    const x = this.cellX(cell.col);
    const y = this.cellY(cell.row);

    // Use per-value texture for multiplier wilds
    let texKey = cell.id;
    if (cell.id === 'wild_multiplier' && cell.multiplier) {
      texKey = `wild_multiplier_${cell.multiplier}`;
    }

    // Debug: warn if texture missing
    if (!this.textures.exists(texKey)) {
      console.warn(
        `[TEX MISSING] key="${texKey}" cell.id="${cell.id}" mult=${cell.multiplier} row=${cell.row} col=${cell.col}`
      );
      texKey = '__MISSING'; // let Phaser show its default missing texture visibly
    }

    const sprite = this.add.image(x, y, texKey).setDisplaySize(CELL - 4, CELL - 4);
    sprite._isSlotSymbol = true;

    // Debug label — shows texture key on each cell (toggle with D key)
    if (this._debugMode) {
      const dbg = this.add
        .text(x, y - HALF + 8, texKey.replace('wild_multiplier', 'wm'), {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#00ff00',
          stroke: '#000',
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0)
        .setDepth(50);
      dbg._isSlotBadge = true;
      sprite._badge = dbg;
    }

    // Sticky ring
    if (isSticky(cell.id)) {
      const ring = this.add
        .circle(x, y, HALF - 2, 0x69f0ae, 0)
        .setStrokeStyle(2, 0x69f0ae, 0.8)
        .setDepth(9);
      ring._isSlotRing = true;
      sprite._ring = ring;
    }

    this.sprites[key] = sprite;
    return sprite;
  }

  _destroySprite(key) {
    const s = this.sprites[key];
    if (!s) return;
    s._ring?.destroy();
    s.destroy();
    delete this.sprites[key];
  }

  _getSprite(r, c) {
    return this.sprites[`${r},${c}`] ?? null;
  }

  // ── Main spin handler ──────────────────────────────────────
  async _onSpin() {
    if (this.spinning) return;
    this.spinning = true;
    this._stopWildPulse();
    this.game.events.emit('spinStart');

    // 1. Compute the full result first (pure logic, instant)
    const result = this.cascade.startSpin(this.bet, this.cascade.isBonus);

    // 2. Clear ALL existing sprites immediately — clean slate
    for (const key of Object.keys(this.sprites)) {
      this._destroySprite(key);
    }
    this.sprites = {};

    // Belt-and-suspenders: destroy any Phaser image/text objects
    // that might have lost their sprites[] reference
    this.children.list
      .filter((o) => o._isSlotSymbol || o._isSlotBadge || o._isSlotRing)
      .forEach((o) => o.destroy());

    // 3. Drop-in: shows original pre-expansion state
    await this._animateInitialDrop(result.initialSnapshot);

    // 4. If expanding wilds landed, animate the column flood NOW
    if (result.expansions?.length > 0) {
      await this._animateExpansionFromTo(
        result.initialSnapshot,
        result.expandedSnapshot,
        result.expansions
      );
    }

    // 5. If no wins, we're done
    if (result.steps.length === 0) {
      this._checkBonus(result);
      this.spinning = false;
      this.game.events.emit('spinEnd', { totalWin: 0, steps: [] });
      return;
    }

    // 5. Animate each cascade step
    let totalWin = 0;
    for (const step of result.steps) {
      await this._animateStep(step);
      totalWin += step.stepWin;
      this.game.events.emit('stepWin', { win: step.stepWin, total: totalWin });
    }

    // 6. Final sync
    this._drawFullGrid();
    this._bigWinEffect(totalWin);
    this._startWildPulse();
    this._checkBonus(result);
    this.spinning = false;
    this.game.events.emit('spinEnd', { totalWin, steps: result.steps });
  }

  // ── Animate the initial symbol drop-in after a spin ───────
  // Shows all symbols falling into place from above, column by column
  _animateInitialDrop(snapshot) {
    return new Promise((resolve) => {
      const cells = [];
      for (let r = 0; r < snapshot.length; r++) {
        for (let c = 0; c < snapshot[r].length; c++) {
          const cell = snapshot[r][c];
          if (cell) cells.push(cell);
        }
      }

      if (cells.length === 0) {
        resolve();
        return;
      }

      let count = cells.length;

      cells.forEach((cell) => {
        const x = this.cellX(cell.col);
        const targetY = this.cellY(cell.row);

        // Blockers just appear in place — no drop animation
        if (cell.blocker) {
          this._destroySprite(`${cell.row},${cell.col}`);
          const s = this.add
            .image(x, targetY, cell.id)
            .setDisplaySize(CELL - 4, CELL - 4)
            .setAlpha(0);
          s._isSlotSymbol = true;
          this.sprites[`${cell.row},${cell.col}`] = s;
          this.tweens.add({
            targets: s,
            alpha: 1,
            duration: 150,
            delay: cell.col * 20,
            onComplete: () => {
              if (--count === 0) resolve();
            },
          });
          return;
        }

        // Play symbols drop from above
        const startY = this.originY - CELL * (cell.row + 1);
        this._destroySprite(`${cell.row},${cell.col}`);
        const dropKey =
          cell.id === 'wild_multiplier' && cell.multiplier
            ? `wild_multiplier_${cell.multiplier}`
            : cell.id;
        const s = this.add
          .image(x, startY, dropKey)
          .setDisplaySize(CELL - 4, CELL - 4)
          .setAlpha(1);
        s._isSlotSymbol = true;

        this.sprites[`${cell.row},${cell.col}`] = s;

        // Stagger by column, then by row within column
        const delay = cell.col * ANIM.SYMBOL_DROP_STAGGER + (snapshot.length - cell.row) * 20;

        this.tweens.add({
          targets: s,
          y: targetY,
          duration: ANIM.SYMBOL_DROP_DURATION,
          ease: 'Bounce.easeOut',
          delay,
          onComplete: () => {
            if (--count === 0) resolve();
          },
        });
      });
    });
  }

  // ── Animate one cascade step ───────────────────────────────
  async _animateStep(step) {
    // 1. Flash winning cells
    await this._flashCells(step.winCells);

    // 3. Break blocker tiles
    if (step.blockersBroken?.length > 0) {
      await this._animateBlockerBreak(step.blockersBroken);
    }

    // 4. Destroy winning cells
    await this._animateDestroy(step.removed);

    // 5. Drop existing symbols
    await this._animateDrops(step.moves);

    // 6. Spawn new symbols
    await this._animateSpawns(step.spawned);

    await this._wait(ANIM.CASCADE_PAUSE);
  }

  // ── Flash winning cells with golden glow ─────────────────
  _flashCells(cells) {
    return new Promise((resolve) => {
      cells.forEach(({ row, col }) => {
        const s = this._getSprite(row, col);
        if (!s) return;

        // Golden tint pulse
        this.tweens.add({
          targets: s,
          scaleX: 1.15,
          scaleY: 1.15,
          yoyo: true,
          repeat: 2,
          duration: ANIM.CLUSTER_FLASH_DURATION / 6,
          ease: 'Sine.easeInOut',
        });

        // Draw a glowing border rect behind the sprite
        const x = this.cellX(col);
        const y = this.cellY(row);
        const glow = this.add
          .rectangle(x, y, CELL, CELL, 0xf0d060, 0)
          .setStrokeStyle(3, 0xf0d060, 1)
          .setDepth(5);
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.8, to: 0 },
          scaleX: 1.2,
          scaleY: 1.2,
          duration: ANIM.CLUSTER_FLASH_DURATION,
          ease: 'Sine.easeOut',
          onComplete: () => glow.destroy(),
        });
      });
      this.time.delayedCall(ANIM.CLUSTER_FLASH_DURATION, resolve);
    });
  }

  // ── Blocker break — red flash then shatter ───────────────
  _animateBlockerBreak(blockers) {
    return new Promise((resolve) => {
      let count = blockers.length;
      if (count === 0) {
        resolve();
        return;
      }

      blockers.forEach(({ row, col }) => {
        const key = `${row},${col}`;
        const s = this._getSprite(row, col);
        if (!s) {
          if (--count === 0) resolve();
          return;
        }

        const x = this.cellX(col);
        const y = this.cellY(row);

        // Red flash overlay
        const flash = this.add.rectangle(x, y, CELL, CELL, 0xff3333, 0.7).setDepth(8);
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: ANIM.BLOCKER_BREAK_DURATION * 0.4,
          onComplete: () => flash.destroy(),
        });

        // Shatter: 4 corner fragments fly outward
        const offsets = [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ];
        offsets.forEach(([dx, dy]) => {
          const frag = this.add
            .rectangle(x + dx * CELL * 0.2, y + dy * CELL * 0.2, CELL * 0.45, CELL * 0.45, 0x444444)
            .setDepth(7);
          this.tweens.add({
            targets: frag,
            x: frag.x + dx * CELL * 0.8,
            y: frag.y + dy * CELL * 0.8,
            alpha: 0,
            angle: dx * dy * 120,
            duration: ANIM.BLOCKER_BREAK_DURATION,
            ease: 'Power2',
            onComplete: () => frag.destroy(),
          });
        });

        // Destroy actual sprite slightly after flash
        this.time.delayedCall(ANIM.BLOCKER_BREAK_DURATION * 0.3, () => {
          this._destroySprite(key);
          if (--count === 0) resolve();
        });
      });
    });
  }

  // ── Destroy winning symbol tiles ───────────────────────────
  _animateDestroy(removed) {
    return new Promise((resolve) => {
      let count = removed.length;
      if (count === 0) {
        resolve();
        return;
      }

      removed.forEach(({ row, col }) => {
        const key = `${row},${col}`;
        const s = this._getSprite(row, col);
        if (!s) {
          if (--count === 0) resolve();
          return;
        }

        this.tweens.add({
          targets: s,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: ANIM.DESTROY_DURATION,
          ease: 'Back.easeIn',
          onComplete: () => {
            this._destroySprite(key);
            if (--count === 0) resolve();
          },
        });
      });
    });
  }

  // ── Drop existing symbols to new positions ─────────────────
  _animateDrops(moves) {
    return new Promise((resolve) => {
      let count = moves.length;
      if (count === 0) {
        resolve();
        return;
      }

      moves.forEach((move) => {
        const s = this._getSprite(move.from.r, move.from.c);
        if (!s) {
          if (--count === 0) resolve();
          return;
        }

        const oldKey = `${move.from.r},${move.from.c}`;
        const newKey = `${move.to.r},${move.to.c}`;
        const targetY = this.cellY(move.to.r);

        delete this.sprites[oldKey];
        this.sprites[newKey] = s;

        this.tweens.add({
          targets: s,
          y: targetY,
          duration: ANIM.SYMBOL_DROP_DURATION,
          ease: 'Bounce.easeOut',
          delay: move.from.c * ANIM.SYMBOL_DROP_STAGGER,
          onComplete: () => {
            s._ring?.setY(targetY);
            if (--count === 0) resolve();
          },
        });
      });
    });
  }

  // ── Spawn new symbols dropping from above ──────────────────
  _animateSpawns(spawned) {
    return new Promise((resolve) => {
      let count = spawned.length;
      if (count === 0) {
        resolve();
        return;
      }

      spawned.forEach((cell) => {
        const targetY = this.cellY(cell.row);
        const startY = this.originY - CELL * 2;

        // Debug: log every spawned cell
        console.log(
          `[SPAWN] id=${cell.id} mult=${cell.multiplier} row=${cell.row} col=${cell.col}`
        );

        // Use _createSprite so badges/rings are attached correctly
        const s = this._createSprite(cell);
        s.setY(startY).setAlpha(0);

        this.tweens.add({
          targets: s,
          y: targetY,
          alpha: 1,
          duration: ANIM.SYMBOL_DROP_DURATION,
          ease: 'Bounce.easeOut',
          delay: cell.col * ANIM.SYMBOL_DROP_STAGGER,
          onComplete: () => {
            if (--count === 0) resolve();
          },
        });
      });
    });
  }

  // ── Expanding wild column fill ─────────────────────────────
  _animateExpansionFromTo(before, after, expansions) {
    return new Promise((resolve) => {
      let count = 0;

      expansions.forEach(({ col }) => {
        for (let r = 0; r < after.length; r++) {
          const afterCell = after[r]?.[col];
          const beforeCell = before[r]?.[col];

          if (!afterCell || afterCell.id !== SYM.WILD_EXPANDING) continue;
          if (beforeCell && beforeCell.id === SYM.WILD_EXPANDING) continue;

          count++;
          const key = `${r},${col}`;
          const x = this.cellX(col);
          const y = this.cellY(r);

          this._destroySprite(key);
          const s = this.add
            .image(x, y, SYM.WILD_EXPANDING)
            .setDisplaySize(CELL - 4, CELL - 4)
            .setAlpha(0)
            .setScale(0.2);
          s._isSlotSymbol = true;
          this.sprites[key] = s;

          this.tweens.add({
            targets: s,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: ANIM.EXPAND_DURATION,
            ease: 'Back.easeOut',
            delay: r * 50,
            onComplete: () => {
              if (--count === 0) resolve();
            },
          });
        }
      });

      if (count === 0) resolve();
    });
  }

  // ── Floating win amount text ──────────────────────────────
  _floatWinText(cells, amount) {
    if (cells.length === 0) return;
    // Find center of winning cells
    const cx = cells.reduce((s, c) => s + this.cellX(c.col), 0) / cells.length;
    const cy = cells.reduce((s, c) => s + this.cellY(c.row), 0) / cells.length;

    const text = this.add
      .text(cx, cy, `$${amount.toFixed(2)}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#f0d060',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      y: cy - 60,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Power2',
      delay: 200,
      onComplete: () => text.destroy(),
    });
  }

  // ── Wild idle pulse ────────────────────────────────────────
  _startWildPulse() {
    // Kill any existing pulses
    this._stopWildPulse();
    this._wildPulseTimer = this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        Object.entries(this.sprites).forEach(([key, s]) => {
          if (!s || !s.active) return;
          const [r, c] = key.split(',').map(Number);
          const cell = this.cascade.grid.getCell(r, c);
          if (!cell || !cell.id.includes('wild')) return;
          this.tweens.add({
            targets: s,
            scaleX: 1.12,
            scaleY: 1.12,
            yoyo: true,
            duration: 400,
            ease: 'Sine.easeInOut',
          });
        });
      },
    });
  }

  _stopWildPulse() {
    this._wildPulseTimer?.remove();
    this._wildPulseTimer = null;
  }

  // ── Big win effect (>= 10x bet) ───────────────────────────
  _bigWinEffect(totalWin) {
    if (totalWin < this.bet * 10) return;

    const { width, height } = this.scale;

    // Screen shake
    this.cameras.main.shake(400, 0.012);

    // Big win text
    const label =
      totalWin >= this.bet * 50
        ? 'MEGA WIN!'
        : totalWin >= this.bet * 20
          ? 'BIG WIN!'
          : 'NICE WIN!';

    const text = this.add
      .text(width / 2, height / 2 - 40, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#f0d060',
        stroke: '#000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0)
      .setScale(0.3);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: text,
            alpha: 0,
            y: text.y - 40,
            duration: 400,
            onComplete: () => text.destroy(),
          });
        });
      },
    });
  }

  // ── Bonus trigger check ────────────────────────────────────
  _checkBonus(result) {
    if (result.triggeredBonus) {
      const { freeSpins, scatterCount } = this.scatter.rollFreeSpins(result.scatters);
      this.game.events.emit('bonusTriggered', { freeSpins, scatterCount });
    }
  }

  _wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
