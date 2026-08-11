// src/main.ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CharacterCreationScene } from './scenes/CharacterCreationScene';
import { WorldScene } from './scenes/WorldScene';
import { VisualTestScene } from './scenes/VisualTestScene';
import { AssetPreviewScene } from './scenes/AssetPreviewScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#080810',
  pixelArt: true,
  antialias: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, AssetPreviewScene, VisualTestScene, CharacterCreationScene, WorldScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 640,
      height: 420
    },
    max: {
      width: 1280,
      height: 854
    }
  }
};

new Phaser.Game(config);
