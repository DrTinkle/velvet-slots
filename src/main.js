// ============================================================
//  main.js
//  Phaser game bootstrap.
// ============================================================

import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { PaytableScene } from './scenes/PaytableScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1600,
  height: 1000,
  backgroundColor: '#081f16',
  parent: 'game-container',
  resolution: window.devicePixelRatio || 1,
  scene: [BootScene, GameScene, UIScene, PaytableScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1600,
    height: 1000,
  },
};

const game = new window.Phaser.Game(config);
