import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ClassData } from '../data/classes';
import { SkillSystem } from '../systems/SkillSystem';
import { QuestSystem } from '../systems/QuestSystem';

export class HUD {
  private player!: Player;
  private classData!: ClassData;
  private skillSystem!: SkillSystem;
  private questSystem!: QuestSystem;

  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private resourceBarFill!: Phaser.GameObjects.Rectangle;
  private resourceText!: Phaser.GameObjects.Text;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private bladeText!: Phaser.GameObjects.Text;

  private skillIcons: Phaser.GameObjects.Image[] = [];
  private skillCooldownOverlays: Phaser.GameObjects.Rectangle[] = [];
  private skillCooldownTexts: Phaser.GameObjects.Text[] = [];
  private skillNameLabels: Phaser.GameObjects.Text[] = [];

  private targetFrame!: Phaser.GameObjects.Container;
  private targetNameText!: Phaser.GameObjects.Text;
  private targetHpFill!: Phaser.GameObjects.Rectangle;
  private targetHpText!: Phaser.GameObjects.Text;

  private questPanel!: Phaser.GameObjects.Container;
  private questTitle!: Phaser.GameObjects.Text;
  private questObjectiveText!: Phaser.GameObjects.Text;
  private questCountText!: Phaser.GameObjects.Text;
  private transformTimerText!: Phaser.GameObjects.Text;
  private deathScreen!: Phaser.GameObjects.Container;
  private levelUpText!: Phaser.GameObjects.Text;
  private messageLog: Phaser.GameObjects.Text[] = [];

  private readonly W: number;
  private readonly H: number;
  private readonly barWidth = 176;

  constructor(private scene: Phaser.Scene) {
    this.W = scene.scale.width;
    this.H = scene.scale.height;
  }

  create(player: Player, skillSystem: SkillSystem, questSystem: QuestSystem): void {
    this.player = player;
    this.classData = player.classData;
    this.skillSystem = skillSystem;
    this.questSystem = questSystem;

    this.createPlayerPanel();
    this.createSkillBar();
    this.createTargetFrame();
    this.createQuestPanel();
    this.createTransformTimer();
    this.createDeathScreen();
  }

  private pin<T extends Phaser.GameObjects.GameObject & { setDepth(depth: number): T; setScrollFactor(x: number, y?: number): T }>(object: T, depth = 151): T {
    return object.setDepth(depth).setScrollFactor(0);
  }

  private createPlayerPanel(): void {
    const x = 12;
    const y = 12;
    const panelW = 286;
    const panelH = 76;

    this.pin(this.scene.add.rectangle(x, y, panelW, panelH, 0x0c1218, 0.94).setOrigin(0, 0)
      .setStrokeStyle(2, 0x72634f));
    this.pin(this.scene.add.rectangle(x + 2, y + 2, 5, panelH - 4, this.classData.color).setOrigin(0, 0), 152);
    this.pin(this.scene.add.rectangle(x + 14, y + 13, 50, 50, 0x161d24).setOrigin(0, 0)
      .setStrokeStyle(1, 0x94826a), 152);
    this.pin(this.scene.add.image(x + 39, y + 38, 'player', 0).setDisplaySize(46, 46), 153);

    this.levelText = this.pin(this.scene.add.text(x + 74, y + 8, '', {
      fontSize: '10px', color: `#${this.classData.color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
    }), 153);
    this.goldText = this.pin(this.scene.add.text(x + panelW - 12, y + 8, '', {
      fontSize: '9px', color: '#e7c36a', stroke: '#000000', strokeThickness: 2
    }).setOrigin(1, 0), 153);

    const barX = x + 74;
    const hpY = y + 25;
    const resourceY = y + 43;
    this.pin(this.scene.add.rectangle(barX, hpY, this.barWidth, 13, 0x260d0d).setOrigin(0, 0), 152);
    this.hpBarFill = this.pin(this.scene.add.rectangle(barX + 1, hpY + 1, this.barWidth - 2, 11, 0xb62922).setOrigin(0, 0), 153);
    this.hpText = this.pin(this.scene.add.text(barX + this.barWidth / 2, hpY + 6, '', {
      fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5), 154);

    const resourceColor = this.classData.resource.color;
    const resourceBg = Phaser.Display.Color.IntegerToColor(resourceColor).darken(70).color;
    this.pin(this.scene.add.rectangle(barX, resourceY, this.barWidth, 13, resourceBg).setOrigin(0, 0), 152);
    this.resourceBarFill = this.pin(this.scene.add.rectangle(barX + 1, resourceY + 1, this.barWidth - 2, 11, resourceColor).setOrigin(0, 0), 153);
    this.resourceText = this.pin(this.scene.add.text(barX + this.barWidth / 2, resourceY + 6, '', {
      fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5), 154);

    this.pin(this.scene.add.rectangle(barX, y + 62, this.barWidth, 4, 0x24210e).setOrigin(0, 0), 152);
    this.xpBarFill = this.pin(this.scene.add.rectangle(barX, y + 62, 0, 4, 0xd4af37).setOrigin(0, 0), 153);
    this.bladeText = this.pin(this.scene.add.text(x + panelW - 12, y + 65, '', {
      fontSize: '8px', color: '#cceafa', stroke: '#000000', strokeThickness: 2
    }).setOrigin(1, 1), 154);

    this.levelUpText = this.pin(this.scene.add.text(this.W / 2, this.H / 2 - 60, '', {
      fontSize: '28px', color: '#ffdd44', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setVisible(false), 250);
  }

  private createSkillBar(): void {
    const skills = this.classData.skills.slice(0, 3);
    const slotSize = 52;
    const gap = 10;
    const totalW = skills.length * slotSize + (skills.length - 1) * gap;
    const startX = this.W / 2 - totalW / 2;
    const y = this.H - 76;

    this.pin(this.scene.add.rectangle(this.W / 2, this.H - 43, totalW + 34, 78, 0x080d12, 0.9)
      .setStrokeStyle(2, 0x675d52), 149);
    this.pin(this.scene.add.text(this.W / 2, this.H - 88, 'HABILIDADES', {
      fontSize: '8px', color: '#9c9181', letterSpacing: 2, stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5), 151);

    skills.forEach((skill, i) => {
      const x = startX + i * (slotSize + gap);
      this.pin(this.scene.add.image(x + slotSize / 2, y + slotSize / 2, 'ui_frame')
        .setDisplaySize(slotSize + 4, slotSize + 4), 151);
      const icon = this.pin(this.scene.add.image(x + slotSize / 2, y + slotSize / 2, skill.icon)
        .setDisplaySize(33, 33), 152);
      this.skillIcons.push(icon);
      this.skillCooldownOverlays.push(this.pin(this.scene.add.rectangle(x + 2, y + 2, slotSize - 4, slotSize - 4, 0x000000, 0)
        .setOrigin(0, 0), 153));
      this.skillCooldownTexts.push(this.pin(this.scene.add.text(x + slotSize / 2, y + slotSize / 2, '', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5), 154));
      this.pin(this.scene.add.text(x + 5, y + 4, `${i + 1}`, {
        fontSize: '10px', color: '#b9c7e8', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
      }), 155);
      this.skillNameLabels.push(this.pin(this.scene.add.text(x + slotSize / 2, y + slotSize + 3, skill.name, {
        fontSize: '7px', color: '#e0d8cd', align: 'center',
        stroke: '#000000', strokeThickness: 2, wordWrap: { width: slotSize + 18 }
      }).setOrigin(0.5, 0), 155));
    });
  }

  updateSkillBarForTransform(transformed: boolean): void {
    const skills = transformed ? this.player.classData.skills.slice(3, 6) : this.player.classData.skills.slice(0, 3);
    skills.forEach((skill, i) => {
      this.skillIcons[i]?.setTexture(skill.icon);
      this.skillNameLabels[i]?.setText(skill.name);
    });
  }

  private createTargetFrame(): void {
    this.targetFrame = this.scene.add.container(this.W - 372, 12).setDepth(158).setScrollFactor(0).setVisible(false);
    const bg = this.scene.add.rectangle(0, 0, 218, 57, 0x0c1218, 0.94).setOrigin(0, 0).setStrokeStyle(2, 0x84473e);
    const label = this.scene.add.text(9, 7, 'ALVO', { fontSize: '8px', color: '#d65a4d', fontStyle: 'bold', letterSpacing: 2 });
    this.targetNameText = this.scene.add.text(9, 20, '', { fontSize: '10px', color: '#ffe5df', fontStyle: 'bold' });
    this.scene.add.rectangle(9, 39, 200, 10, 0x3a1010).setOrigin(0, 0);
    this.targetHpFill = this.scene.add.rectangle(10, 40, 198, 8, 0xc73228).setOrigin(0, 0);
    this.targetHpText = this.scene.add.text(109, 44, '', {
      fontSize: '7px', color: '#ffffff', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5);
    this.targetFrame.add([bg, label, this.targetNameText, this.targetHpFill, this.targetHpText]);
  }

  private createQuestPanel(): void {
    this.questPanel = this.scene.add.container(12, 98).setDepth(156).setScrollFactor(0).setVisible(false);
    const bg = this.scene.add.rectangle(0, 0, 286, 112, 0x0c1218, 0.92).setOrigin(0, 0).setStrokeStyle(2, 0x665943);
    const accent = this.scene.add.rectangle(0, 0, 5, 112, 0xc99838).setOrigin(0, 0);
    const label = this.scene.add.text(14, 10, 'MISSÃO RASTREADA', {
      fontSize: '8px', color: '#c69b49', fontStyle: 'bold', letterSpacing: 2
    });
    this.questCountText = this.scene.add.text(274, 10, '', { fontSize: '8px', color: '#8d8a84' }).setOrigin(1, 0);
    this.questTitle = this.scene.add.text(14, 31, '', {
      fontSize: '10px', color: '#ffe0a1', fontStyle: 'bold', wordWrap: { width: 255 }
    });
    this.questObjectiveText = this.scene.add.text(14, 55, '', {
      fontSize: '9px', color: '#d7d4ce', lineSpacing: 4, wordWrap: { width: 255 }
    });
    this.questPanel.add([bg, accent, label, this.questCountText, this.questTitle, this.questObjectiveText]);
  }

  private createTransformTimer(): void {
    this.transformTimerText = this.pin(this.scene.add.text(this.W / 2, 78, '', {
      fontSize: '12px', color: '#ff6946', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4, backgroundColor: '#180b08', padding: { x: 12, y: 6 }
    }).setOrigin(0.5, 0).setVisible(false), 160);
  }

  private createDeathScreen(): void {
    this.deathScreen = this.scene.add.container(this.W / 2, this.H / 2).setDepth(300).setScrollFactor(0).setVisible(false);
    const overlay = this.scene.add.rectangle(0, 0, this.W, this.H, 0x000000, 0.76);
    const title = this.scene.add.text(0, -30, 'VOCÊ MORREU', {
      fontSize: '42px', color: '#cc241d', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);
    const sub = this.scene.add.text(0, 30, 'Renascendo na cidade...', {
      fontSize: '14px', color: '#c7c1b7', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    this.deathScreen.add([overlay, title, sub]);
  }

  showDeathScreen(): void {
    this.deathScreen.setVisible(true);
    this.scene.time.delayedCall(3000, () => this.deathScreen.setVisible(false));
  }

  showLevelUp(level: number): void {
    this.levelUpText.setText(`⬆ LEVEL ${level}! ⬆`).setVisible(true).setAlpha(1);
    this.scene.tweens.add({
      targets: this.levelUpText, y: this.H / 2 - 100, alpha: 0, duration: 2500, ease: 'Cubic.easeOut',
      onComplete: () => this.levelUpText.setVisible(false).setY(this.H / 2 - 60)
    });
  }

  setTarget(titan: { name: string; hp: number; maxHp: number } | null): void {
    if (!titan) {
      this.targetFrame.setVisible(false);
      return;
    }
    this.targetFrame.setVisible(true);
    this.targetNameText.setText(titan.name);
    const pct = Phaser.Math.Clamp(titan.hp / titan.maxHp, 0, 1);
    this.targetHpFill.setSize(198 * pct, 8);
    this.targetHpText.setText(`${Math.ceil(titan.hp)} / ${titan.maxHp}`);
  }

  addMessage(text: string, color = '#ffffff'): void {
    const msg = this.pin(this.scene.add.text(14, this.H - 102 - this.messageLog.length * 16, text, {
      fontSize: '9px', color, stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#080d1299', padding: { x: 5, y: 2 }
    }), 160);
    this.messageLog.push(msg);
    if (this.messageLog.length > 4) this.messageLog.shift()?.destroy();
    this.scene.time.delayedCall(4000, () => this.scene.tweens.add({
      targets: msg, alpha: 0, duration: 800,
      onComplete: () => {
        msg.destroy();
        const index = this.messageLog.indexOf(msg);
        if (index >= 0) this.messageLog.splice(index, 1);
      }
    }));
  }

  update(): void {
    const stats = this.player.stats;
    const innerBarW = this.barWidth - 2;
    const hpPct = Phaser.Math.Clamp(stats.hp / stats.maxHp, 0, 1);
    const resourcePct = Phaser.Math.Clamp(stats.resource / stats.maxResource, 0, 1);
    const xpPct = stats.level >= 10 ? 1 : Phaser.Math.Clamp(stats.xp / stats.xpToNext, 0, 1);

    this.hpBarFill.setSize(innerBarW * hpPct, 11)
      .setFillStyle(hpPct > 0.5 ? 0xb62922 : hpPct > 0.25 ? 0xe16b25 : 0xe33128);
    this.hpText.setText(`VIDA  ${Math.ceil(stats.hp)} / ${stats.maxHp}`);
    this.resourceBarFill.setSize(innerBarW * resourcePct, 11);
    const resource = this.classData.resource.name.toUpperCase();
    this.resourceText.setText(`${resource}  ${Math.floor(stats.resource)}${this.classData.id === 'titan_shifter' ? '%' : ` / ${stats.maxResource}`}`);
    this.xpBarFill.setSize(this.barWidth * xpPct, 4);
    this.levelText.setText(`${this.player.rank.toUpperCase()}  •  LV ${stats.level}`);
    this.goldText.setText(`${stats.gold} MOEDAS`);
    this.bladeText.setText(this.classData.id === 'scout' ? `LÂMINAS ${Math.ceil(this.player.blades)}%` : '');

    const activeSkills = this.player.isTransformed ? this.classData.skills.slice(3, 6) : this.classData.skills.slice(0, 3);
    activeSkills.forEach((skill, i) => {
      const cooldown = this.skillSystem.getCooldown(skill.id);
      const pct = skill.cooldown > 0 ? cooldown / skill.cooldown : 0;
      this.skillCooldownOverlays[i]?.setFillStyle(0x000000, cooldown > 0 ? 0.78 * pct : 0);
      this.skillCooldownTexts[i]?.setText(cooldown > 0 ? (cooldown < 10 ? cooldown.toFixed(1) : Math.ceil(cooldown).toString()) : '');
    });

    this.transformTimerText.setVisible(this.player.isTransformed);
    if (this.player.isTransformed) this.transformTimerText.setText(`FORMA TITÃ  •  ${Math.ceil(this.player.transformTimer)}s`);

    const activeQuests = this.questSystem.getActiveQuests();
    this.questPanel.setVisible(activeQuests.length > 0);
    if (activeQuests.length > 0) {
      const tracked = activeQuests[0];
      this.questTitle.setText(tracked.data.name);
      this.questObjectiveText.setText(this.questSystem.getObjectiveText(tracked.data.id));
      this.questCountText.setText(activeQuests.length > 1 ? `+${activeQuests.length - 1}` : '');
    }
  }
}
