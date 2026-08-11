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

    this.load.image('titan_normal_art', 'assets/titans/normal.png');
    this.load.image('titan_aberrant_art', 'assets/titans/aberrant.png');
    this.load.image('titan_colossal_art', 'assets/titans/colossal.png');
    this.load.image('player_titan_art', 'assets/titans/player-assault.png');
    this.load.spritesheet('titan_normal_walk', 'assets/titans/normal-walk-v2.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('titan_aberrant_walk', 'assets/titans/aberrant-walk-v2.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('titan_colossal_walk', 'assets/titans/colossal-walk-v2.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('player_titan_walk', 'assets/titans/player-assault-walk-v2.png', { frameWidth: 256, frameHeight: 256 });

    this.load.image('splash_titan_shifter', 'assets/splashes/titan-shifter.webp');
    this.load.image('splash_scout', 'assets/splashes/scout.webp');
    this.load.image('splash_priest', 'assets/splashes/priest.webp');
    this.load.image('splash_gunner', 'assets/splashes/gunner.webp');
    this.load.image('splash_engineer', 'assets/splashes/engineer.webp');

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

    this.paintGroundTexture(graphics, 'stone_floor', 0xa9906c, 0x967c5c, 0xc2a982, [
      [4, 7], [23, 5], [13, 19], [30, 27]
    ]);
    this.paintGroundTexture(graphics, 'field_ground', 0x3f642f, 0x315126, 0x557a3a, [
      [5, 9], [21, 4], [12, 26], [29, 17], [38, 30], [54, 10]
    ]);
    this.paintGroundTexture(graphics, 'forest_ground', 0x203d29, 0x172e20, 0x31563a, [
      [7, 11], [26, 5], [15, 29], [43, 19], [57, 37]
    ]);
    this.paintGroundTexture(graphics, 'path_ground', 0x73583f, 0x5f4734, 0x8a6b4b, [
      [8, 6], [25, 13], [13, 33], [39, 26], [55, 8]
    ]);
    graphics.destroy();
  }

  private paintGroundTexture(
    graphics: Phaser.GameObjects.Graphics,
    key: string,
    base: number,
    shade: number,
    highlight: number,
    details: number[][]
  ): void {
    graphics.clear();
    graphics.fillStyle(base, 1).fillRect(0, 0, 64, 64);
    graphics.fillStyle(shade, 0.32).fillRect(0, 31, 64, 2);
    graphics.fillStyle(highlight, 0.34).fillRect(0, 0, 64, 1);
    details.forEach(([x, y], index) => {
      graphics.fillStyle(index % 2 ? shade : highlight, index % 2 ? 0.54 : 0.5);
      graphics.fillRect(x, y, index % 3 === 0 ? 5 : 3, 2);
      if (key.includes('ground') && !key.includes('path')) graphics.fillRect(x + 1, y - 3, 1, 4);
    });
    graphics.generateTexture(key, 64, 64);
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

    const titanWalkCycles = [
      { texture: 'titan_normal_walk', key: 'titan_normal_walking', frameRate: 6 },
      { texture: 'titan_aberrant_walk', key: 'titan_aberrant_walking', frameRate: 10 },
      { texture: 'titan_colossal_walk', key: 'titan_colossal_walking', frameRate: 4 },
      { texture: 'player_titan_walk', key: 'player_titan_running', frameRate: 10 }
    ];

    titanWalkCycles.forEach(({ texture, key, frameRate }) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
        frameRate,
        repeat: -1
      });
    });
  }
}
