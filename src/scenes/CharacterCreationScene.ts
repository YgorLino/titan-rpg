import Phaser from 'phaser';
import { CLASSES, ClassId } from '../data/classes';

const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

const SPLASHES: Record<ClassId, string> = {
  titan_shifter: 'splash_titan_shifter',
  scout: 'splash_scout',
  priest: 'splash_priest',
  gunner: 'splash_gunner',
  engineer: 'splash_engineer'
};

export class CharacterCreationScene extends Phaser.Scene {
  private selectedClass: ClassId = 'titan_shifter';
  private splash!: Phaser.GameObjects.Image;
  private classTabs = new Map<ClassId, Phaser.GameObjects.Container>();
  private classIndexText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private roleText!: Phaser.GameObjects.Text;
  private descriptionText!: Phaser.GameObjects.Text;
  private statTexts: Phaser.GameObjects.Text[] = [];
  private skillTexts: Phaser.GameObjects.Text[] = [];
  private confirmBtn!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'CharacterCreationScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#080a0b');
    this.splash = this.add.image(W / 2, H / 2, SPLASHES[this.selectedClass])
      .setDisplaySize(H * (16 / 9), H);

    this.add.rectangle(W / 2, H / 2, W, H, 0x07090b, 0.18);
    this.add.rectangle(0, 0, 438, H, 0x06090d, 0.88).setOrigin(0, 0);
    this.add.rectangle(438, 0, 150, H, 0x06090d, 0.34).setOrigin(0, 0);
    this.add.rectangle(W / 2, 0, W, 74, 0x050607, 0.68).setOrigin(0.5, 0);
    this.add.rectangle(W / 2, H - 98, W, 98, 0x050607, 0.92).setOrigin(0.5, 0);
    this.add.rectangle(0, 0, 5, H, 0xa51f16).setOrigin(0, 0);

    this.add.text(28, 24, 'TITAN RPG', {
      fontSize: '13px', color: '#d7492e', fontStyle: 'bold', letterSpacing: 3,
      stroke: '#000000', strokeThickness: 3
    });
    this.add.text(28, 47, 'ESCOLHA SUA VOCAÇÃO', {
      fontSize: '10px', color: '#c5b69d', letterSpacing: 2,
      stroke: '#000000', strokeThickness: 2
    });

    this.classIndexText = this.add.text(28, 94, '', {
      fontSize: '10px', color: '#a7967d', fontStyle: 'bold', letterSpacing: 2
    });
    this.nameText = this.add.text(28, 119, '', {
      fontSize: '31px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5, wordWrap: { width: 388 }
    });
    this.roleText = this.add.text(28, 161, '', {
      fontSize: '12px', color: '#eabf87', fontStyle: 'bold', letterSpacing: 1,
      stroke: '#000000', strokeThickness: 3
    });
    this.descriptionText = this.add.text(28, 194, '', {
      fontSize: '11px', color: '#ded7cc', lineSpacing: 5,
      stroke: '#000000', strokeThickness: 2, wordWrap: { width: 370 }
    });

    this.add.text(28, 286, 'ATRIBUTOS', {
      fontSize: '9px', color: '#8c8172', fontStyle: 'bold', letterSpacing: 2
    });
    for (let i = 0; i < 4; i++) {
      this.statTexts.push(this.add.text(28 + (i % 2) * 174, 310 + Math.floor(i / 2) * 28, '', {
        fontSize: '11px', color: '#f2e8d8', fontStyle: 'bold',
        backgroundColor: '#111820', padding: { x: 9, y: 6 }
      }));
    }

    this.add.text(28, 381, 'HABILIDADES INICIAIS', {
      fontSize: '9px', color: '#8c8172', fontStyle: 'bold', letterSpacing: 2
    });
    for (let i = 0; i < 3; i++) {
      this.skillTexts.push(this.add.text(28, 405 + i * 31, '', {
        fontSize: '10px', color: '#e8dfd2', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2
      }));
    }

    this.createClassTabs();
    this.confirmBtn = this.createConfirmButton();
    this.selectClass(this.selectedClass, false);

    this.input.keyboard?.on('keydown-LEFT', () => this.stepClass(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.stepClass(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirmSelection());
  }

  private createClassTabs(): void {
    const tabW = 132;
    const gap = 7;
    const startX = 18;
    const y = this.scale.height - 75;

    CLASS_IDS.forEach((id, index) => {
      const data = CLASSES[id];
      const x = startX + index * (tabW + gap);
      const tab = this.add.container(x, y);
      const border = this.add.rectangle(0, 0, tabW, 58, 0x3c4147).setOrigin(0, 0);
      const bg = this.add.rectangle(2, 2, tabW - 4, 54, 0x10151a, 0.96).setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      const accent = this.add.rectangle(2, 2, 5, 54, data.color).setOrigin(0, 0);
      const number = this.add.text(13, 8, `0${index + 1}`, {
        fontSize: '9px', color: '#7f8790', fontStyle: 'bold'
      });
      const name = this.add.text(13, 23, data.name.toUpperCase(), {
        fontSize: '8px', color: '#d8d5cf', fontStyle: 'bold',
        wordWrap: { width: tabW - 22 }, lineSpacing: 2
      });
      bg.on('pointerdown', () => this.selectClass(id));
      bg.on('pointerover', () => bg.setFillStyle(0x202931));
      bg.on('pointerout', () => bg.setFillStyle(id === this.selectedClass ? 0x232c34 : 0x10151a, 0.96));
      tab.add([border, bg, accent, number, name]);
      this.classTabs.set(id, tab);
    });
  }

  private selectClass(classId: ClassId, animate = true): void {
    this.selectedClass = classId;
    const data = CLASSES[classId];
    const index = CLASS_IDS.indexOf(classId);

    if (animate) {
      this.splash.setAlpha(0.2).setTexture(SPLASHES[classId]);
      this.tweens.add({ targets: this.splash, alpha: 1, duration: 260, ease: 'Sine.easeOut' });
    } else {
      this.splash.setTexture(SPLASHES[classId]).setAlpha(1);
    }

    this.classIndexText.setText(`VOCAÇÃO 0${index + 1}  /  0${CLASS_IDS.length}`);
    this.nameText.setText(data.name.toUpperCase());
    this.roleText.setText(`${data.role.toUpperCase()}  •  ${data.resource.name.toUpperCase()}`)
      .setColor(`#${data.color.toString(16).padStart(6, '0')}`);
    this.descriptionText.setText(data.description);

    const stats = [
      `VIDA   ${data.baseStats.hp}`,
      `ATAQUE ${data.baseStats.attack}`,
      `DEFESA ${data.baseStats.defense}`,
      `VEL.   ${data.baseStats.speed}`
    ];
    this.statTexts.forEach((text, i) => text.setText(stats[i]));
    this.skillTexts.forEach((text, i) => text.setText(`[${i + 1}]  ${data.skills[i].name}`));

    this.classTabs.forEach((tab, id) => {
      const border = tab.list[0] as Phaser.GameObjects.Rectangle;
      const bg = tab.list[1] as Phaser.GameObjects.Rectangle;
      border.setFillStyle(id === classId ? CLASSES[id].color : 0x3c4147);
      bg.setFillStyle(id === classId ? 0x232c34 : 0x10151a, 0.96);
    });

    const confirmBg = this.confirmBtn.list[0] as Phaser.GameObjects.Rectangle;
    const confirmText = this.confirmBtn.list[1] as Phaser.GameObjects.Text;
    confirmBg.setFillStyle(data.color);
    confirmText.setText('ENTRAR NO MUNDO  ▶');
  }

  private createConfirmButton(): Phaser.GameObjects.Container {
    const x = this.scale.width - 129;
    const y = this.scale.height - 46;
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 232, 58, 0x8b1d16).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, 'ENTRAR NO MUNDO  ▶', {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 1,
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    bg.on('pointerover', () => container.setScale(1.025));
    bg.on('pointerout', () => container.setScale(1));
    bg.on('pointerdown', () => this.confirmSelection());
    container.add([bg, text]);
    return container;
  }

  private stepClass(direction: number): void {
    const current = CLASS_IDS.indexOf(this.selectedClass);
    this.selectClass(CLASS_IDS[Phaser.Math.Wrap(current + direction, 0, CLASS_IDS.length)]);
  }

  private confirmSelection(): void {
    this.cameras.main.flash(260, 180, 55, 35);
    this.time.delayedCall(320, () => this.scene.start('WorldScene', { classId: this.selectedClass }));
  }
}
