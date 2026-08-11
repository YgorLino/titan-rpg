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

    const single = 'assets/single/';
    this.load.image('grass', `${single}grass_single.png`);
    this.load.image('dirt', `${single}dirt_single.png`);
    this.load.image('town_floor', `${single}town_single.png`);
    this.load.image('wall', `${single}wall_single.png`);
    this.load.image('house', `${single}house_single.png`);
    this.load.image('tree', `${single}tree_single.png`);
    this.load.image('bush', `${single}bush_single.png`);
    this.load.image('rock', `${single}rock_single.png`);

    // The generated LPC sheets contain four directions with eight frames each.
    this.load.spritesheet('player', 'assets/characters/player.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc', 'assets/characters/npc.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('titan_base', 'assets/characters/titan_base.png', { frameWidth: 64, frameHeight: 64 });

    this.load.image('ui_frame', 'assets/ui/frame.svg');
    this.load.image('icon_fury', 'assets/ui/icon_fury.svg');
    this.load.image('icon_gun', 'assets/ui/icon_gun.svg');
    this.load.image('icon_heal', 'assets/ui/icon_heal.svg');
    this.load.image('icon_hook', 'assets/ui/icon_hook.svg');
    this.load.image('icon_shield', 'assets/ui/icon_shield.svg');
    this.load.image('icon_sword', 'assets/ui/icon_sword.svg');
  }

  create(): void {
    this.createUtilityTextures();
    this.createAnimations();
    this.time.delayedCall(350, () => this.scene.start('TitleScene'));
  }

  private createUtilityTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0x6b4a2d, 1);
    graphics.fillRect(0, 0, 8, 8);
    graphics.lineStyle(1, 0x3d2818, 1);
    graphics.strokeRect(0, 0, 8, 8);
    graphics.generateTexture('particle', 8, 8);
    graphics.clear();

    graphics.fillStyle(0xa88b65, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(1, 0x8f7454, 0.9);
    graphics.lineBetween(0, 8, 32, 8);
    graphics.lineBetween(0, 24, 32, 24);
    graphics.lineBetween(8, 0, 8, 32);
    graphics.lineBetween(24, 0, 24, 32);
    graphics.generateTexture('stone_floor', 32, 32);
    graphics.destroy();
  }

  private createAnimations(): void {
    const directions = [
      { name: 'down', start: 0 },
      { name: 'left', start: 8 },
      { name: 'up', start: 16 },
      { name: 'right', start: 24 }
    ];

    ['player', 'npc', 'titan_base'].forEach(texture => {
      directions.forEach(({ name, start }) => {
        const key = `${texture}_${name}`;
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(texture, { start, end: start + 7 }),
            frameRate: texture === 'titan_base' ? 7 : 10,
            repeat: -1
          });
        }
      });
    });
  }
}
