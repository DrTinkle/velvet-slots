// ============================================================
//  BootScene.js
// ============================================================

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 400, 12, 0x222222);
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 12, 0xc9a84c).setOrigin(0, 0.5);
    this.loadingLabel = this.add
      .text(width / 2, height / 2 - 30, 'LOADING...', {
        fontFamily: 'serif',
        fontSize: '18px',
        color: '#c9a84c',
        letterSpacing: 6,
      })
      .setOrigin(0.5);
    this.load.on('progress', (v) => {
      bar.width = 400 * v;
    });
  }

  _generateTextures() {
    const S = 112; // must match GRID.CELL_SIZE

    // ── Pay symbols ──────────────────────────────────────────
    const paySymbols = [
      // id, primary color, dark bg tint, shape, tier label
      { id: 'low_a', color: 0x6c9ed4, dark: 0x0d1f35, shape: 'diamond', tier: 'LOW' },
      { id: 'low_b', color: 0x7ec87e, dark: 0x0d2010, shape: 'circle', tier: 'LOW' },
      { id: 'mid_a', color: 0xf0b030, dark: 0x2a1a00, shape: 'square', tier: 'MID' },
      { id: 'mid_b', color: 0xd05040, dark: 0x2a0a08, shape: 'triangle', tier: 'MID' },
      { id: 'high_a', color: 0xb088cc, dark: 0x1a0828, shape: 'hexagon', tier: 'HIGH' },
      { id: 'high_b', color: 0xf0d040, dark: 0x281e00, shape: 'star', tier: 'HIGH' },
      { id: 'extra_a', color: 0x40d8f8, dark: 0x001828, shape: 'circle', tier: 'XTRA' },
      { id: 'extra_b', color: 0xf060a0, dark: 0x280018, shape: 'hexagon', tier: 'XTRA' },
    ];

    for (const sym of paySymbols) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      this._drawPaySymbol(g, S, sym);
      g.generateTexture(sym.id, S, S);
      g.destroy();
    }

    // ── Wild symbols ─────────────────────────────────────────
    const wilds = [
      { id: 'wild', color: 0xffffff, dark: 0x1a1a2a, glow: 0xaaaaff, shape: 'star' },
      { id: 'wild_expanding', color: 0x00e5ff, dark: 0x001a28, glow: 0x00e5ff, shape: 'diamond' },
      { id: 'wild_sticky', color: 0x69f0ae, dark: 0x001a10, glow: 0x69f0ae, shape: 'circle' },
      { id: 'wild_sticky_mult', color: 0xea80fc, dark: 0x180028, glow: 0xea80fc, shape: 'star' },
    ];

    for (const w of wilds) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      this._drawWild(g, S, w);
      g.generateTexture(w.id, S, S);
      g.destroy();
      this._stampText(w.id, S, 'WILD', `#${w.glow.toString(16).padStart(6, '0')}`, S / 2, S - 13);
    }

    // ── Multiplier wilds — one texture per value ──────────────
    for (const val of [2, 3, 5, 10]) {
      const id = `wild_multiplier_${val}`;
      this._drawMultiplierWildCanvas(id, S, val);
    }

    // ── Scatter ───────────────────────────────────────────────
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      this._drawScatter(g, S);
      g.generateTexture('scatter', S, S);
      g.destroy();
      this._stampText('scatter', S, 'SCATTER', '#ff6688', S / 2, S - 13);
    }

    // ── Blocker ───────────────────────────────────────────────
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      this._drawBlocker(g, S);
      g.generateTexture('blocker', S, S);
      g.destroy();
    }
  }

  // ── Pay symbol: dark bg + inner shadow + bright shape + tier label
  _drawPaySymbol(g, S, sym) {
    const cx = S / 2,
      cy = S / 2;

    // Dark rounded background
    g.fillStyle(sym.dark, 1);
    g.fillRoundedRect(1, 1, S - 2, S - 2, 10);

    // Subtle inner border
    g.lineStyle(1, sym.color, 0.15);
    g.strokeRoundedRect(2, 2, S - 4, S - 4, 9);

    // Shape shadow (offset slightly, darker)
    g.fillStyle(0x000000, 0.4);
    this._drawShape(g, sym.shape, S, cx + 2, cy + 3, S * 0.29);

    // Main shape
    g.fillStyle(sym.color, 1);
    this._drawShape(g, sym.shape, S, cx, cy, S * 0.29);

    // Shape highlight (top-left inner shine)
    g.fillStyle(0xffffff, 0.18);
    this._drawShape(g, sym.shape, S, cx - 2, cy - 3, S * 0.17);

    // Outer glow border
    g.lineStyle(2, sym.color, 0.35);
    g.strokeRoundedRect(2, 2, S - 4, S - 4, 9);
  }

  // ── Wild symbol: glowing border + shape + "WILD" text baked in
  _drawWild(g, S, w) {
    const cx = S / 2,
      cy = S / 2;

    // Dark bg
    g.fillStyle(w.dark, 1);
    g.fillRoundedRect(1, 1, S - 2, S - 2, 10);

    // Multi-layer glow border
    g.lineStyle(4, w.glow, 0.15);
    g.strokeRoundedRect(3, 3, S - 6, S - 6, 9);
    g.lineStyle(2, w.glow, 0.6);
    g.strokeRoundedRect(2, 2, S - 4, S - 4, 9);
    g.lineStyle(1, 0xffffff, 0.4);
    g.strokeRoundedRect(4, 4, S - 8, S - 8, 7);

    // Shape (smaller, centered higher to leave room for text)
    const shapeCY = cy - 6;
    g.fillStyle(0x000000, 0.3);
    this._drawShape(g, w.shape, S, cx + 1, shapeCY + 2, S * 0.24);
    g.fillStyle(w.color, 1);
    this._drawShape(g, w.shape, S, cx, shapeCY, S * 0.24);
    g.fillStyle(0xffffff, 0.25);
    this._drawShape(g, w.shape, S, cx - 1, shapeCY - 2, S * 0.13);

    // "WILD" text band at bottom
    g.fillStyle(w.glow, 0.2);
    g.fillRoundedRect(6, S - 22, S - 12, 16, 4);
    g.lineStyle(1, w.glow, 0.5);
    g.strokeRoundedRect(6, S - 22, S - 12, 16, 4);
  }

  // ── Scatter: red starburst
  _drawScatter(g, S) {
    const cx = S / 2,
      cy = S / 2;

    g.fillStyle(0x200005, 1);
    g.fillRoundedRect(1, 1, S - 2, S - 2, 10);

    // Outer starburst ring
    g.lineStyle(2, 0xff1744, 0.5);
    g.strokeRoundedRect(2, 2, S - 4, S - 4, 9);

    // Shadow star
    g.fillStyle(0x000000, 0.4);
    this._drawShape(g, 'star', S, cx + 2, cy - 2, S * 0.28);

    // Main star
    g.fillStyle(0xff1744, 1);
    this._drawShape(g, 'star', S, cx, cy - 4, S * 0.28);

    // Shine
    g.fillStyle(0xffffff, 0.2);
    this._drawShape(g, 'star', S, cx - 1, cy - 6, S * 0.15);

    // "SCATTER" band
    g.fillStyle(0xff1744, 0.2);
    g.fillRoundedRect(4, S - 22, S - 8, 16, 4);
    g.lineStyle(1, 0xff1744, 0.6);
    g.strokeRoundedRect(4, S - 22, S - 8, 16, 4);
  }

  // ── Blocker: dark grid tile with crosshatch texture
  _drawBlocker(g, S) {
    // Dark base
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(1, 1, S - 2, S - 2, 8);

    // Subtle inner bevel
    g.lineStyle(1, 0x333333, 1);
    g.strokeRoundedRect(3, 3, S - 6, S - 6, 6);

    // Crosshatch lines
    g.lineStyle(1, 0x252525, 1);
    for (let i = 8; i < S; i += 10) {
      g.lineBetween(i, 4, 4, i); // top-left diagonals
      g.lineBetween(i, S - 4, S - 4, i); // bottom-right diagonals
    }

    // Outer border
    g.lineStyle(1, 0x2a2a2a, 1);
    g.strokeRoundedRect(1, 1, S - 2, S - 2, 8);
  }

  // ── Shared shape drawer ───────────────────────────────────
  _drawShape(g, shape, S, cx, cy, r) {
    switch (shape) {
      case 'circle':
        g.fillCircle(cx, cy, r);
        break;
      case 'square':
        g.fillRect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
        break;
      case 'diamond': {
        g.fillPoints(
          [
            { x: cx, y: cy - r * 1.3 },
            { x: cx + r, y: cy },
            { x: cx, y: cy + r * 1.3 },
            { x: cx - r, y: cy },
          ],
          true
        );
        break;
      }
      case 'triangle': {
        g.fillPoints(
          [
            { x: cx, y: cy - r * 1.2 },
            { x: cx + r * 1.1, y: cy + r * 0.85 },
            { x: cx - r * 1.1, y: cy + r * 0.85 },
          ],
          true
        );
        break;
      }
      case 'hexagon': {
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
        }
        g.fillPoints(pts, true);
        break;
      }
      case 'star': {
        const pts = [];
        const inner = r * 0.42;
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const rad = i % 2 === 0 ? r : inner;
          pts.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) });
        }
        g.fillPoints(pts, true);
        break;
      }
    }
  }

  // ── Stamp a large multiplier number into the centre of a tile ─
  // ── Draw multiplier wild entirely on a canvas (no generateTexture roundtrip) ─
  _drawMultiplierWildCanvas(key, S, val) {
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const r = S * 0.1;

    // Dark background
    ctx.fillStyle = '#1a1000';
    this._roundRect(ctx, 1, 1, S - 2, S - 2, r);
    ctx.fill();

    // Multi-layer glow border
    ctx.strokeStyle = 'rgba(255,171,64,0.15)';
    ctx.lineWidth = 4;
    this._roundRect(ctx, 3, 3, S - 6, S - 6, r);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,171,64,0.6)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, 2, 2, S - 4, S - 4, r);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, 5, 5, S - 10, S - 10, r * 0.7);
    ctx.stroke();

    // Hexagon shape (shadow then fill)
    const cx = S / 2,
      shapeCY = S / 2 - 6;
    const hr = S * 0.22;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this._hexPath(ctx, cx + 1, shapeCY + 2, hr);
    ctx.fill();

    ctx.fillStyle = '#ffab40';
    this._hexPath(ctx, cx, shapeCY, hr);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    this._hexPath(ctx, cx - 1, shapeCY - 2, hr * 0.55);
    ctx.fill();

    // Large multiplier number
    const label = `×${val}`;
    ctx.font = `bold ${Math.round(S * 0.32)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = S * 0.07;
    ctx.strokeText(label, cx, shapeCY);

    const grad = ctx.createLinearGradient(cx, shapeCY - S * 0.15, cx, shapeCY + S * 0.15);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ffe080');
    grad.addColorStop(1, '#ff8800');
    ctx.fillStyle = grad;
    ctx.fillText(label, cx, shapeCY);
    ctx.shadowBlur = 0;

    // "WILD" band at bottom
    ctx.fillStyle = 'rgba(255,171,64,0.2)';
    this._roundRect(ctx, 6, S - 22, S - 12, 16, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,171,64,0.5)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, 6, S - 22, S - 12, 16, 4);
    ctx.stroke();

    ctx.font = `bold ${Math.round(S * 0.1)}px sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText('WILD', cx, S - 14);
    ctx.fillStyle = '#ffcc88';
    ctx.fillText('WILD', cx, S - 14);

    const tex1 = this.textures.createCanvas(key, S, S);
    tex1.context.drawImage(canvas, 0, 0);
    tex1.refresh();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  _hexPath(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  _stampMultiplier(textureKey, S, val) {
    const frame = this.textures.get(textureKey).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(frame, 0, 0);

    const label = `×${val}`;
    const cx = S / 2;
    const cy = S / 2 - 4; // slightly above centre

    // Large number — bold, centred
    ctx.font = `bold ${S * 0.36}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer glow
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = S * 0.08;
    ctx.strokeText(label, cx, cy);

    // Gradient fill — warm gold to white
    const grad = ctx.createLinearGradient(cx, cy - S * 0.18, cx, cy + S * 0.18);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ffe080');
    grad.addColorStop(1, '#ff8800');
    ctx.fillStyle = grad;
    ctx.fillText(label, cx, cy);
    ctx.shadowBlur = 0;

    // "WILD" small label at bottom
    ctx.font = `bold ${S * 0.11}px sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText('WILD', cx, S - 13);
    ctx.fillStyle = '#ffcc88';
    ctx.fillText('WILD', cx, S - 13);

    this.textures.remove(textureKey);
    this.textures.remove(textureKey);
    const tex2 = this.textures.createCanvas(textureKey, S, S);
    tex2.context.drawImage(canvas, 0, 0);
    tex2.refresh();
  }

  // ── Stamp text directly onto an existing texture canvas ───
  // This avoids RenderTexture issues by writing to the raw canvas
  _stampText(textureKey, S, text, color, x, y) {
    const frame = this.textures.get(textureKey).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(frame, 0, 0);

    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Stroke for legibility
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);

    // Fill
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    // Replace texture with updated canvas
    this.textures.remove(textureKey);
    this.textures.addCanvas(textureKey, canvas);
  }

  create() {
    // Generate all textures synchronously here — guaranteed ready before GameScene.create()
    this._generateTextures();
    this.loadingLabel?.setText('READY');

    this.scene.start('GameScene');
    this.scene.launch('UIScene');
    this.scene.launch('PaytableScene');
  }
}
