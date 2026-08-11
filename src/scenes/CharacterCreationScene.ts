// src/scenes/CharacterCreationScene.ts
import Phaser from 'phaser';
import { CLASSES, ClassData, ClassId } from '../data/classes';

export class CharacterCreationScene extends Phaser.Scene {
  private selectedClass: ClassId | null = null;
  private classCards: Map<ClassId, Phaser.GameObjects.Container> = new Map();
  private confirmBtn!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'CharacterCreationScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Dark background with subtle texture
    this.add.rectangle(W / 2, H / 2, W, H, 0x080810);

    // Top border decoration
    this.add.rectangle(W / 2, 0, W, 4, 0x880000);

    // Title
    this.add.text(W / 2, 28, 'ESCOLHA SUA CLASSE', {
      fontSize: '28px',
      color: '#CC2200',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5, 0.5);

    this.add.text(W / 2, 58, 'Cada classe possui habilidades únicas e papel diferente no combate', {
      fontSize: '11px',
      color: '#887766',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    // Create class cards
    const classIds = Object.keys(CLASSES) as ClassId[];
    const cardW = 148;
    const cardH = 310;
    const padding = 16;
    const totalW = classIds.length * (cardW + padding) - padding;
    const startX = (W - totalW) / 2;
    const cardY = H / 2 - 20;

    classIds.forEach((classId, index) => {
      const classData = CLASSES[classId];
      const x = startX + index * (cardW + padding) + cardW / 2;
      const card = this.createClassCard(x, cardY, cardW, cardH, classData);
      this.classCards.set(classId, card);
    });

    // Confirm button
    this.confirmBtn = this.createConfirmButton(W / 2, H - 40);

    // Instructions
    this.add.text(W / 2, H - 18, 'Clique em uma classe para selecionar, depois clique em Confirmar', {
      fontSize: '9px',
      color: '#555566',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5, 0.5);

    // Auto-select first class
    this.selectClass('titan_shifter');
  }

  private createClassCard(
    x: number,
    y: number,
    w: number,
    h: number,
    classData: ClassData
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Border (selected state)
    const border = this.add.rectangle(0, 0, w + 4, h + 4, 0x333344).setOrigin(0.5, 0.5);

    // Background
    const bg = this.add.rectangle(0, 0, w, h, 0x141420, 1).setOrigin(0.5, 0.5);

    // Class color stripe at top
    const stripe = this.add.rectangle(0, -h / 2 + 4, w, 8, classData.color).setOrigin(0.5, 0);

    // Avatar placeholder
    const avatarBg = this.add.circle(0, -h / 2 + 50, 32, 0x222233);
    const avatarBody = this.add.rectangle(0, -h / 2 + 55, 22, 28, classData.color);
    const avatarHead = this.add.circle(0, -h / 2 + 38, 10, 0xFFCC99);

    // Class name
    const nameText = this.add.text(0, -h / 2 + 90, classData.name, {
      fontSize: '11px',
      color: '#' + classData.color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: w - 16 }
    }).setOrigin(0.5, 0);

    // Role badge
    const roleText = this.add.text(0, -h / 2 + 116, classData.role, {
      fontSize: '8px',
      color: '#AAAACC',
      stroke: '#000000',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5, 0);

    // Divider
    this.add.rectangle(0, -h / 2 + 136, w - 16, 1, 0x333344);

    // Description
    const descText = this.add.text(0, -h / 2 + 144, classData.description, {
      fontSize: '8px',
      color: '#999999',
      align: 'center',
      wordWrap: { width: w - 16 }
    }).setOrigin(0.5, 0);

    // Stats section
    const statsY = -h / 2 + 206;
    const stats = classData.baseStats;

    const statLines = [
      { label: 'HP', value: stats.hp, color: '#CC2222' },
      { label: 'ATK', value: stats.attack, color: '#CC8800' },
      { label: 'DEF', value: stats.defense, color: '#2288CC' },
      { label: 'VEL', value: stats.speed, color: '#22CC66' }
    ];

    const statMaxValues = { HP: 200, ATK: 30, DEF: 20, VEL: 190 };
    const statBarW = w - 24;

    statLines.forEach((stat, i) => {
      const sy = statsY + i * 22;
      this.add.text(-w / 2 + 8, sy, stat.label, {
        fontSize: '8px', color: '#AAAAAA'
      });
      const maxV = statMaxValues[stat.label as keyof typeof statMaxValues] || 200;
      const pct = Math.min(1, stat.value / maxV);

      this.add.rectangle(-w / 2 + 8, sy + 12, statBarW, 6, 0x222233).setOrigin(0, 0);
      this.add.rectangle(-w / 2 + 8, sy + 12, Math.floor(statBarW * pct), 6, Phaser.Display.Color.HexStringToColor(stat.color.replace('#', '')).color).setOrigin(0, 0);
    });

    // Resource label
    const resText = this.add.text(0, h / 2 - 22, `Recurso: ${classData.resource.name}`, {
      fontSize: '7px',
      color: '#' + classData.resource.color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5, 1);

    container.add([border, bg, stripe, avatarBg, avatarBody, avatarHead,
      nameText, roleText, descText, resText]);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.selectClass(classData.id));
    bg.on('pointerover', () => {
      if (this.selectedClass !== classData.id) {
        bg.setFillStyle(0x1E1E2C);
      }
    });
    bg.on('pointerout', () => {
      if (this.selectedClass !== classData.id) {
        bg.setFillStyle(0x141420);
      }
    });

    return container;
  }

  private selectClass(classId: ClassId): void {
    this.selectedClass = classId;

    // Update card visuals
    this.classCards.forEach((card, id) => {
      const border = card.list[0] as Phaser.GameObjects.Rectangle;
      const bg = card.list[1] as Phaser.GameObjects.Rectangle;
      if (id === classId) {
        border.setFillStyle(CLASSES[id].color);
        bg.setFillStyle(0x1A1A2A);
      } else {
        border.setFillStyle(0x222233);
        bg.setFillStyle(0x141420);
      }
    });

    // Update confirm button
    const btnBg = this.confirmBtn.list[0] as Phaser.GameObjects.Rectangle;
    btnBg.setFillStyle(CLASSES[classId].color);
    const btnText = this.confirmBtn.list[1] as Phaser.GameObjects.Text;
    btnText.setText(`▶ Jogar como ${CLASSES[classId].name}`);
  }

  private createConfirmButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 320, 32, 0x440000).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, '▶ Selecione uma classe', {
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x660000));
    bg.on('pointerout', () => {
      bg.setFillStyle(this.selectedClass ? CLASSES[this.selectedClass].color : 0x440000);
    });
    bg.on('pointerdown', () => this.confirmSelection());

    container.add([bg, text]);
    return container;
  }

  private confirmSelection(): void {
    if (!this.selectedClass) return;

    // Flash effect
    this.cameras.main.flash(300, 200, 50, 50);
    this.time.delayedCall(400, () => {
      this.scene.start('WorldScene', { classId: this.selectedClass });
    });
  }
}
