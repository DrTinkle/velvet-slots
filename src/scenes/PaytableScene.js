// ============================================================
//  PaytableScene.js
//  1. Right panel: scrollable last-spin win history
//  2. Toggleable pay table overlay
// ============================================================

import { PAY_SYMBOLS, PAY_SYMBOL_MAP } from '../config/SymbolConfig.js';

const PANEL_X = 1200;
const PANEL_W = 390;
const PAD = 18;
const HUD = 126;
const HEADER = 54; // height of "LAST SPIN" header area

export class PaytableScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PaytableScene' });
  }

  create() {
    const { width, height } = this.scale;
    const panelH = height - HUD;
    const scrollH = panelH - HEADER - 36; // leave room for PAYS button

    // ── Panel background ───────────────────────────────────
    this.add
      .rectangle(PANEL_X + PANEL_W / 2, panelH / 2, PANEL_W, panelH, 0x0a1a0e, 1)
      .setStrokeStyle(2, 0x2a4a2a);

    // Bottom separator
    this.add.rectangle(PANEL_X + PANEL_W / 2, panelH, PANEL_W, 2, 0x2a4a2a);

    // ── Header ─────────────────────────────────────────────
    this.add
      .text(PANEL_X + PANEL_W / 2, 14, 'LAST SPIN', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#7a6030',
        letterSpacing: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    this.add.rectangle(PANEL_X + PANEL_W / 2, HEADER, PANEL_W - 8, 1, 0x1e3a1e).setDepth(2);

    // ── Scroll container + mask ────────────────────────────
    // Container holds all content at absolute y positions;
    // we shift its y to scroll.
    this.scrollContainer = this.add.container(0, 0).setDepth(1);
    this._scrollY = 0;
    this._contentH = 0;
    this._scrollAreaY = HEADER;
    this._scrollAreaH = scrollH;

    // Geometry mask — clips content to the scroll area
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(PANEL_X, this._scrollAreaY, PANEL_W, scrollH);
    this.scrollContainer.setMask(maskShape.createGeometryMask());

    // Mouse wheel scrolling
    this.input.on('wheel', (ptr, objs, dx, dy) => {
      if (ptr.x < PANEL_X) return;
      this._scroll(dy * 0.5);
    });

    // Touch drag scrolling
    this._dragStartY = null;
    this._dragStartSY = null;
    this.input.on('pointerdown', (ptr) => {
      if (ptr.x < PANEL_X) return;
      this._dragStartY = ptr.y;
      this._dragStartSY = this._scrollY;
    });
    this.input.on('pointermove', (ptr) => {
      if (this._dragStartY === null || ptr.x < PANEL_X) return;
      const delta = this._dragStartY - ptr.y;
      this._setScroll(this._dragStartSY + delta);
    });
    this.input.on('pointerup', () => {
      this._dragStartY = null;
    });

    // ── PAYS button ────────────────────────────────────────
    const btnX = PANEL_X + PANEL_W / 2;
    const btnY = panelH - 18;
    const btn = this.add
      .rectangle(btnX, btnY, 100, 36, 0x1a2e1a)
      .setStrokeStyle(1, 0x3a5a3a)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);
    this.add
      .text(btnX, btnY, 'PAYS', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#7a9a7a',
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(4);
    btn.on('pointerover', () => btn.setFillStyle(0x2a4a2a));
    btn.on('pointerout', () => btn.setFillStyle(0x1a2e1a));
    btn.on('pointerdown', () => this._toggleOverlay());

    // ── Overlay ────────────────────────────────────────────
    this.overlayOpen = false;
    this.overlayObjs = [];
    this._buildOverlay(width, height);
    this._setOverlayVisible(false);

    // ── Content ────────────────────────────────────────────
    this._drawEmpty();

    this.game.events.on('spinEnd', ({ totalWin, steps }) => {
      this._clearHistory();
      if (!steps || steps.length === 0 || totalWin === 0) {
        this._drawEmpty();
      } else {
        this._drawSpin(steps, totalWin);
      }
    });
  }

  // ── Scroll helpers ─────────────────────────────────────────
  _scroll(delta) {
    this._setScroll(this._scrollY + delta);
  }

  _setScroll(val) {
    const maxScroll = Math.max(0, this._contentH - this._scrollAreaH);
    this._scrollY = Phaser.Math.Clamp(val, 0, maxScroll);
    this.scrollContainer.setY(-this._scrollY);
  }

  // ── Content helpers ────────────────────────────────────────
  _add(obj) {
    this.scrollContainer.add(obj);
    return obj;
  }

  _clearHistory() {
    this.scrollContainer.removeAll(true);
    this._setScroll(0);
    this._contentH = 0;
  }

  _drawEmpty() {
    this._add(
      this.add
        .text(PANEL_X + PANEL_W / 2, HEADER + 80, 'No wins yet', {
          fontFamily: 'sans-serif',
          fontSize: '11px',
          color: '#2a3a2a',
        })
        .setOrigin(0.5)
    );
    this._contentH = 160;
  }

  _drawSpin(steps, totalWin) {
    let y = HEADER + 8;

    // Total win
    this._add(
      this.add.text(PANEL_X + PAD, y, 'TOTAL WIN', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#7a6030',
        letterSpacing: 2,
      })
    );
    y += 15;
    this._add(
      this.add.text(PANEL_X + PAD, y, `$${totalWin.toFixed(2)}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#f0d060',
      })
    );
    y += 28;
    this._add(this.add.rectangle(PANEL_X + PANEL_W / 2, y, PANEL_W - 8, 1, 0x1e2e22));
    y += 10;

    steps.forEach((step, i) => {
      if (step.stepWin === 0) return;

      // Cascade header
      this._add(
        this.add.text(PANEL_X + PAD, y, `CASCADE ${i + 1}`, {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: '#556655',
          letterSpacing: 2,
        })
      );
      this._add(
        this.add
          .text(PANEL_X + PANEL_W - PAD, y, `+$${step.stepWin.toFixed(2)}`, {
            fontFamily: 'Georgia, serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#c9a84c',
          })
          .setOrigin(1, 0)
      );
      y += 16;

      // Group by symbol + size + wildMult (multiplied lines are always separate)
      const grouped = {};
      step.clusters?.forEach((path, pi) => {
        if (path.size === 0) return;
        const bd = step.breakdown?.[pi];
        const mult = bd?.wildMult ?? 0;
        const key = `${path.symbolId}:${path.size}:${mult}`;
        if (!grouped[key])
          grouped[key] = { id: path.symbolId, size: path.size, mult, count: 0, totalWin: 0 };
        grouped[key].count++;
        grouped[key].totalWin += bd?.win ?? 0;
      });

      const ICON = 20;
      const GAP = 22;
      Object.values(grouped).forEach((g) => {
        // Icons repeated by path length
        for (let n = 0; n < g.size; n++) {
          this._add(
            this.add
              .image(PANEL_X + PAD + n * GAP + ICON / 2, y + ICON / 2, g.id)
              .setDisplaySize(ICON, ICON)
          );
        }

        // ×count badge (grey)
        const afterIcons = PANEL_X + PAD + g.size * GAP + 2;
        if (g.count > 1) {
          this._add(
            this.add
              .text(afterIcons, y + ICON / 2, `×${g.count}`, {
                fontFamily: 'sans-serif',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#778877',
              })
              .setOrigin(0, 0.5)
          );
        }

        // Multiplier badge with box (sits in its own column, well left of payout)
        if (g.mult > 0) {
          const multX = PANEL_X + PANEL_W - PAD - 110;
          const multTxt = this.add
            .text(multX, y + ICON / 2, `×${g.mult}`, {
              fontFamily: 'Georgia, serif',
              fontSize: '15px',
              fontStyle: 'bold',
              color: '#ffab40',
            })
            .setOrigin(0.5, 0.5);
          const bounds = multTxt.getBounds();
          const box = this.add
            .rectangle(multX, y + ICON / 2, bounds.width + 10, ICON + 2, 0x000000, 0)
            .setStrokeStyle(1, 0xffab40);
          this._add(box);
          this._add(multTxt);
        }

        this._add(
          this.add
            .text(PANEL_X + PANEL_W - PAD, y + ICON / 2, `$${g.totalWin.toFixed(2)}`, {
              fontFamily: 'Georgia, serif',
              fontSize: '11px',
              color: g.mult > 0 ? '#ffcc66' : '#a08030',
            })
            .setOrigin(1, 0.5)
        );
        y += ICON + 6;
      });

      this._add(this.add.rectangle(PANEL_X + PANEL_W / 2, y + 2, PANEL_W - 16, 1, 0x142014));
      y += 10;
    });

    this._contentH = y - HEADER + 10;
  }

  // ──────────────────────────────────────────────────────────
  // PAY TABLE OVERLAY
  // ──────────────────────────────────────────────────────────

  _buildOverlay(width, height) {
    const OW = 500,
      OH = 460;
    const OX = (width - OW) / 2,
      OY = (height - OH) / 2;
    const D = 100;

    const backdrop = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setInteractive()
      .setDepth(D);
    this.overlayObjs.push(backdrop);

    this.overlayObjs.push(
      this.add
        .rectangle(OX + OW / 2, OY + OH / 2, OW, OH, 0x060e08)
        .setStrokeStyle(1, 0x2a4a2a)
        .setDepth(D + 1)
    );

    this.overlayObjs.push(
      this.add
        .text(OX + OW / 2, OY + 18, 'PAY TABLE', {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#c9a84c',
          letterSpacing: 5,
        })
        .setOrigin(0.5)
        .setDepth(D + 2)
    );

    const closeBtn = this.add
      .text(OX + OW - 16, OY + 16, '✕', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#556655',
      })
      .setOrigin(0.5)
      .setDepth(D + 2)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#aaffaa'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#556655'));
    closeBtn.on('pointerdown', () => this._toggleOverlay());
    this.overlayObjs.push(closeBtn);

    const hY = OY + 44;
    const cols = {
      sym: OX + 24,
      label: OX + 90,
      c3: OX + 220,
      c4: OX + 290,
      c5: OX + 360,
      c6: OX + 430,
    };
    const hStyle = {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#4a6a4a',
      letterSpacing: 2,
    };
    ['SYMBOL', 'NAME', '×3', '×4', '×5', '×6'].forEach((h, i) => {
      this.overlayObjs.push(
        this.add
          .text([cols.sym, cols.label, cols.c3, cols.c4, cols.c5, cols.c6][i], hY, h, hStyle)
          .setDepth(D + 2)
      );
    });
    this.overlayObjs.push(
      this.add.rectangle(OX + OW / 2, hY + 18, OW - 16, 1, 0x1e3a1e).setDepth(D + 2)
    );

    PAY_SYMBOLS.slice(0, 6).forEach((sym, idx) => {
      const rowY = hY + 28 + idx * 52;
      const hexColor = `#${sym.color.toString(16).padStart(6, '0')}`;
      if (idx % 2 === 0) {
        this.overlayObjs.push(
          this.add.rectangle(OX + OW / 2, rowY + 18, OW - 8, 50, 0x0a140a).setDepth(D + 1)
        );
      }
      this.overlayObjs.push(
        this.add
          .image(cols.sym + 16, rowY + 18, sym.id)
          .setDisplaySize(36, 36)
          .setDepth(D + 2)
      );
      this.overlayObjs.push(
        this.add
          .text(cols.label, rowY + 10, sym.label, {
            fontFamily: 'sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: hexColor,
          })
          .setDepth(D + 2)
      );
      this.overlayObjs.push(
        this.add
          .text(cols.label, rowY + 26, sym.id.replace('_', ' '), {
            fontFamily: 'sans-serif',
            fontSize: '9px',
            color: '#334433',
          })
          .setDepth(D + 2)
      );
      [3, 4, 5, 6].forEach((n, ni) => {
        const val = sym.payTable[n];
        this.overlayObjs.push(
          this.add
            .text(
              [cols.c3, cols.c4, cols.c5, cols.c6][ni],
              rowY + 18,
              val !== undefined ? `${val}×` : '—',
              {
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontStyle: 'bold',
                color: val ? '#c9a84c' : '#2a3a2a',
              }
            )
            .setOrigin(0, 0.5)
            .setDepth(D + 2)
        );
      });
    });

    const footerY = OY + OH - 60;
    this.overlayObjs.push(
      this.add.rectangle(OX + OW / 2, footerY, OW - 16, 1, 0x1e3a1e).setDepth(D + 2)
    );
    this.overlayObjs.push(
      this.add
        .text(
          OX + 16,
          footerY + 8,
          [
            'WILD — substitutes any symbol        EXP WILD — fills entire column',
            'MULT WILD — ×2 / ×3 / ×5 / ×10      SCATTER — 3+ triggers free spins',
          ].join('\n'),
          {
            fontFamily: 'sans-serif',
            fontSize: '10px',
            color: '#3a5a3a',
            wordWrap: { width: OW - 32 },
          }
        )
        .setDepth(D + 2)
    );
  }

  _setOverlayVisible(visible) {
    this.overlayObjs.forEach((o) => o.setVisible(visible));
  }

  _toggleOverlay() {
    this.overlayOpen = !this.overlayOpen;
    this._setOverlayVisible(this.overlayOpen);
    this.game.events.emit('overlayToggle', this.overlayOpen);
  }
}
