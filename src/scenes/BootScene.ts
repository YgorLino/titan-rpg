// src/scenes/BootScene.ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x080810);
    const title = this.add.text(w / 2, h / 2 - 40, 'TITAN RPG', {
      fontSize: '36px', color: '#CC2200', fontStyle: 'bold', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5, 0.5);
    const loading = this.add.text(w / 2, h / 2 + 60, 'Carregando Assets...', {
      fontSize: '14px', color: '#666666', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    this.tweens.add({ targets: loading, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    // Load New LPC PNG Assets
    this.load.image('grass', 'assets/tiles/grass.png');
    this.load.image('town_floor', 'assets/tiles/town_floor.png');
    this.load.image('wall', 'assets/tiles/wall.png');
    this.load.image('roof', 'assets/tiles/roof.png');
    this.load.image('house', 'assets/tiles/house.png');
    
    this.load.image('tree', 'assets/objects/tree.png');
    this.load.image('bush', 'assets/objects/bush.png');
    this.load.image('rocks', 'assets/objects/rocks.png');

    // Load Characters (spritesheets - LPC standard is 832x1344 with 64x64 frames)
    this.load.spritesheet('player', 'assets/characters/player.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc', 'assets/characters/npc.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('titan_base', 'assets/characters/titan_base.png', { frameWidth: 64, frameHeight: 64 });
  }

  create(): void {
    this.time.delayedCall(800, () => {
      this.scene.start('AssetPreviewScene');
    });
  }
}
