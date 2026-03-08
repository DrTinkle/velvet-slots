// ============================================================
//  UIScene.js  —  HUD running parallel to GameScene
// ============================================================

import { BET } from '../config/GameConfig.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.balance = 1000;
    this.bet = BET.DEFAULT;
    this.betStepIdx = BET.STEPS.indexOf(BET.DEFAULT);
    this.spinning = false;

    this._build();

    this.game.events.on('spinStart', () => {
      this.spinning = true;
      this.balance -= this.bet;
      this._updateBalance();
      this.winText.setText('$0');
      this.spinBg.setAlpha(0.5).disableInteractive();
    });

    this.game.events.on('stepWin', ({ total }) => {
      this.winText.setText(`$${total.toFixed(2)}`);
    });

    this.game.events.on('spinEnd', ({ totalWin, steps }) => {
      this.spinning = false;
      this.balance += totalWin;
      this._updateBalance();
      this.spinBg.setAlpha(1).setInteractive();
      if (steps && steps.length > 0) this._logWins(steps, totalWin);
    });

    this.game.events.on('bonusTriggered', ({ freeSpins, scatterCount }) => {
      this._showBonus(freeSpins, scatterCount);
    });

    this.game.events.on('overlayToggle', (open) => {
      if (open) {
        this.spinBg.disableInteractive();
      } else if (!this.spinning) {
        this.spinBg.setInteractive();
      }
    });
  }

  _build() {
    const { width, height } = this.scale;

    // HUD bar at very bottom
    const barY = height - 63;
    this.add.rectangle(width / 2, height - 63, width, 126, 0x050505, 0.95);
    this.add.rectangle(width / 2, height - 126, width, 1, 0x2a2a2a);

    const labelStyle = {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#7a6030',
      letterSpacing: 3,
    };
    const valueStyle = {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#f0d080',
      fontStyle: 'bold',
    };

    // Balance — left
    this.add.text(160, barY - 22, 'BALANCE', labelStyle).setOrigin(0.5);
    this.balanceText = this.add.text(160, barY + 12, `$${this.balance}`, valueStyle).setOrigin(0.5);

    // Win — centre-left
    this.add.text(width / 2 - 170, barY - 22, 'WIN', labelStyle).setOrigin(0.5);
    this.winText = this.add.text(width / 2 - 170, barY + 12, '$0', valueStyle).setOrigin(0.5);

    // Spin button — centre
    this.spinBg = this.add
      .rectangle(width / 2 + 85, barY, 185, 70, 0xc0392b)
      .setStrokeStyle(1, 0xff6b6b)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2 + 85, barY, 'SPIN', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#f5edd8',
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    this.spinBg.on('pointerdown', () => {
      if (!this.spinning && this.balance >= this.bet) {
        this.game.events.emit('spin');
      }
    });
    this.spinBg.on('pointerover', () => this.spinBg.setFillStyle(0xe74c3c));
    this.spinBg.on('pointerout', () => this.spinBg.setFillStyle(0xc0392b));

    // Bet — right
    this.add.text(width - 310, barY - 22, 'BET', labelStyle).setOrigin(0.5);
    this.betText = this.add.text(width - 310, barY + 12, `$${this.bet}`, valueStyle).setOrigin(0.5);

    const arrowStyle = {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#c9a84c',
    };
    this.add
      .text(width - 390, barY + 12, '◄', arrowStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._changeBet(-1));

    this.add
      .text(width - 230, barY + 12, '►', arrowStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._changeBet(1));
  }

  _changeBet(dir) {
    this.betStepIdx = Phaser.Math.Clamp(this.betStepIdx + dir, 0, BET.STEPS.length - 1);
    this.bet = BET.STEPS[this.betStepIdx];
    this.betText.setText(`$${this.bet}`);
    this.game.events.emit('betChanged', this.bet);
  }

  _updateBalance() {
    this.balanceText.setText(`$${this.balance.toLocaleString()}`);
  }

  _logWins(steps, totalWin) {
    console.group(
      `%c🎰 SPIN RESULT — Total Win: $${totalWin.toFixed(2)}`,
      'color:#f0d080; font-weight:bold; font-size:13px'
    );

    steps.forEach((step, i) => {
      if (step.stepWin === 0 && step.clusters.length === 0) return;

      console.group(
        `%c━━ Cascade #${i + 1}  +$${step.stepWin.toFixed(2)}`,
        'color:#c9a84c; font-weight:bold'
      );

      step.clusters.forEach((path, pi) => {
        if (path.size === 0) return;

        // Find matching breakdown entry
        const bd = step.breakdown?.[pi];
        const wildCount = path.wilds.length;
        const wildMult = bd?.wildMult ?? 0;
        const chainMult = step.chainMult ?? 1;
        const win = bd?.win?.toFixed(2) ?? '?';

        // Build path string: (col,row) → (col,row) → ...
        const allCells = [...path.cells, ...path.wilds].sort(
          (a, b) => a.col - b.col || a.row - b.row
        );
        const pathStr = allCells.map((p) => `(${p.col},${p.row})`).join(' → ');

        // Symbol label
        const label = path.symbolId.padEnd(8);

        const parts = [
          wildCount > 0 ? `🃏 ${wildCount} wild${wildCount > 1 ? 's' : ''}` : null,
          wildMult > 0 ? `×${wildMult} wild mult` : null,
          chainMult > 1 ? `×${chainMult} chain` : null,
        ].filter(Boolean);

        const suffix = parts.length > 0 ? `  [${parts.join(', ')}]` : '';

        console.log(
          `  %c${label}%c  len:${path.size}  $${win}${suffix}`,
          'color:#e0c060; font-weight:bold',
          'color:#aaa'
        );
        console.log(`  %c  ${pathStr}`, 'color:#666');
      });

      if (step.blockersBroken?.length > 0) {
        const coords = step.blockersBroken.map((b) => `(${b.col},${b.row})`).join(' ');
        console.log(
          `  %c🧱 Blockers broken: ${step.blockersBroken.length}  ${coords}`,
          'color:#777'
        );
      }

      console.groupEnd();
    });

    console.groupEnd();
  }

  _showBonus(freeSpins, scatterCount) {
    const { width, height } = this.scale;
    const panel = this.add
      .rectangle(width / 2, height / 2, 400, 160, 0x0a0505, 0.96)
      .setStrokeStyle(2, 0xc9a84c);
    const t1 = this.add
      .text(width / 2, height / 2 - 35, 'FREE SPINS!', {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#f0d080',
        letterSpacing: 6,
      })
      .setOrigin(0.5);
    const t2 = this.add
      .text(width / 2, height / 2 + 15, `${scatterCount} SCATTERS  →  ${freeSpins} FREE SPINS`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#c9a84c',
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.time.delayedCall(2500, () => [panel, t1, t2].forEach((o) => o.destroy()));
  }
}
