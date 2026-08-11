import Phaser from 'phaser';

const SAVE_KEY = 'titan-rpg-save-v1';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#08090d');
    this.add.rectangle(W / 2, H / 2, W, H, 0x08090d);

    // Distant wall silhouette and a colossal threat beyond it.
    this.add.rectangle(W / 2, H * 0.64, W, 170, 0x171a20);
    for (let x = 0; x < W; x += 38) {
      this.add.rectangle(x + 19, H * 0.54, 34, 28, 0x242830);
    }
    this.add.circle(W * 0.78, H * 0.37, 66, 0x3b1714, 0.75);
    this.add.rectangle(W * 0.78, H * 0.58, 110, 250, 0x2b1110, 0.75);
    this.add.rectangle(W * 0.78 - 22, H * 0.35, 9, 3, 0xff6b4a, 0.8);
    this.add.rectangle(W * 0.78 + 22, H * 0.35, 9, 3, 0xff6b4a, 0.8);
    this.add.rectangle(W / 2, H * 0.54, W, 4, 0x8f271c);

    this.add.text(70, 82, 'TITAN', {
      fontSize: '72px', color: '#e7ded0', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8
    });
    this.add.text(74, 150, 'BEYOND THE WALLS', {
      fontSize: '27px', color: '#c4432d', fontStyle: 'bold',
      letterSpacing: 4, stroke: '#000000', strokeThickness: 5
    });
    this.add.text(76, 198, 'Um RPG 2D de sobrevivência, patentes e expedições', {
      fontSize: '13px', color: '#9b958b'
    });

    const hasSave = Boolean(localStorage.getItem(SAVE_KEY));
    const startY = 292;
    if (hasSave) {
      this.createButton(76, startY, 'CONTINUAR EXPEDIÇÃO', 0x8f271c, () => {
        this.scene.start('WorldScene', { continueSave: true });
      });
      this.createButton(76, startY + 58, 'NOVO RECRUTA', 0x2d323c, () => {
        this.scene.start('CharacterCreationScene');
      });
    } else {
      this.createButton(76, startY, 'INICIAR EXPEDIÇÃO', 0x8f271c, () => {
        this.scene.start('CharacterCreationScene');
      });
    }

    this.add.text(76, H - 74,
      'WASD / SETAS  mover     ESPAÇO  atacar     1–3  habilidades\nF  interagir     R  reabastecer     H  ajuda / pausa', {
        fontSize: '11px', color: '#aaa59b', lineSpacing: 8
      });
    this.add.text(W - 18, H - 16, 'PROTÓTIPO JOGÁVEL • v0.2', {
      fontSize: '9px', color: '#555962'
    }).setOrigin(1, 1);
  }

  private createButton(x: number, y: number, label: string, color: number, action: () => void): void {
    const bg = this.add.rectangle(x, y, 310, 42, color).setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xd4c7b2, 0.45).setInteractive({ useHandCursor: true });
    const text = this.add.text(x + 18, y, label, {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    bg.on('pointerover', () => {
      bg.setScale(1.02, 1.05);
      text.setColor('#ffe0b4');
    });
    bg.on('pointerout', () => {
      bg.setScale(1);
      text.setColor('#ffffff');
    });
    bg.on('pointerdown', action);
  }
}
