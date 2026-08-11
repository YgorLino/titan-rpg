// src/ui/HUD.ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ClassData } from '../data/classes';
import { SkillSystem } from '../systems/SkillSystem';
import { QuestSystem } from '../systems/QuestSystem';

export class HUD {
  private scene: Phaser.Scene;
  private player!: Player;
  private classData!: ClassData;
  private skillSystem!: SkillSystem;
  private questSystem!: QuestSystem;

  // Main bars
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private resourceBarBg!: Phaser.GameObjects.Rectangle;
  private resourceBarFill!: Phaser.GameObjects.Rectangle;
  private resourceText!: Phaser.GameObjects.Text;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private classLabel!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;

  // Skill bar
  private skillSlots: Phaser.GameObjects.Container[] = [];
  private skillBgs: Phaser.GameObjects.Image[] = [];
  private skillIcons: Phaser.GameObjects.Image[] = [];
  private skillCooldownOverlays: Phaser.GameObjects.Rectangle[] = [];
  private skillCooldownTexts: Phaser.GameObjects.Text[] = [];
  private skillKeyLabels: Phaser.GameObjects.Text[] = [];
  private skillNameLabels: Phaser.GameObjects.Text[] = [];

  // Target frame
  private targetFrame!: Phaser.GameObjects.Container;
  private targetNameText!: Phaser.GameObjects.Text;
  private targetHpBg!: Phaser.GameObjects.Rectangle;
  private targetHpFill!: Phaser.GameObjects.Rectangle;
  private targetHpText!: Phaser.GameObjects.Text;

  // Quest panel
  private questPanel!: Phaser.GameObjects.Container;
  private questTitle!: Phaser.GameObjects.Text;
  private questObjectiveText!: Phaser.GameObjects.Text;

  // Transform timer
  private transformTimerText!: Phaser.GameObjects.Text;

  // Death screen
  private deathScreen!: Phaser.GameObjects.Container;

  // Level up text
  private levelUpText!: Phaser.GameObjects.Text;

  // Message log
  private messageLog: Phaser.GameObjects.Text[] = [];

  private readonly W: number;
  private readonly H: number;
  private readonly SKILL_SIZE = 44;
  private readonly SKILL_PAD = 6;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.W = scene.scale.width;
    this.H = scene.scale.height;
  }

  create(player: Player, skillSystem: SkillSystem, questSystem: QuestSystem): void {
    this.player = player;
    this.classData = player.classData;
    this.skillSystem = skillSystem;
    this.questSystem = questSystem;

    this.createBottomPanel();
    this.createSkillBar();
    this.createTargetFrame();
    this.createQuestPanel();
    this.createTransformTimer();
    this.createDeathScreen();
  }

  private createBottomPanel(): void {
    const panelH = 70;
    const y = this.H - panelH;

    // Panel background (Bottom Left)
    const panelBg = this.scene.add.rectangle(0, y, 220, panelH, 0x1a1a24, 0.95).setOrigin(0, 0)
      .setDepth(50).setScrollFactor(0);
    // Border
    this.scene.add.rectangle(0, y, 220, 2, 0x555577).setOrigin(0, 0).setDepth(50).setScrollFactor(0);

    // Portrait Box
    const px = 10, py = y + 10;
    this.scene.add.rectangle(px, py, 48, 48, 0x333344).setOrigin(0, 0).setDepth(51).setScrollFactor(0);
    this.scene.add.rectangle(px+2, py+2, 44, 44, 0x111111).setOrigin(0, 0).setDepth(51).setScrollFactor(0);
    const portrait = this.scene.add.image(px + 24, py + 24, `player_${this.classData.id}`).setDepth(52).setScrollFactor(0).setDisplaySize(32, 48);

    // Class and Level Label
    this.classLabel = this.scene.add.text(px + 56, py, `LV 1 ${this.classData.name.toUpperCase()}`, {
      fontSize: '10px',
      color: '#' + this.classData.color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(51).setScrollFactor(0);

    this.levelText = this.classLabel; // reusing reference for updates

    // HP Bar
    const barX = px + 56;
    const barY = py + 14;
    const barW = 140;
    const barH = 10;

    this.hpBarBg = this.scene.add.rectangle(barX, barY, barW, barH, 0x330000).setOrigin(0, 0).setDepth(51).setScrollFactor(0);
    this.hpBarFill = this.scene.add.rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0xCC0000).setOrigin(0, 0).setDepth(52).setScrollFactor(0);
    this.hpText = this.scene.add.text(barX + barW / 2, barY + barH / 2, '', {
      fontSize: '8px', color: '#FFFFFF', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5, 0.5).setDepth(53).setScrollFactor(0);

    // Resource Bar
    const resY = barY + 12;
    const resColor = this.classData.resource.color;
    const resBgColor = Phaser.Display.Color.IntegerToColor(resColor).darken(50).color;

    this.resourceBarBg = this.scene.add.rectangle(barX, resY, barW, barH, resBgColor).setOrigin(0, 0).setDepth(51).setScrollFactor(0);
    this.resourceBarFill = this.scene.add.rectangle(barX + 1, resY + 1, barW - 2, barH - 2, resColor).setOrigin(0, 0).setDepth(52).setScrollFactor(0);
    this.resourceText = this.scene.add.text(barX + barW / 2, resY + barH / 2, '', {
      fontSize: '8px', color: '#FFFFFF', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5, 0.5).setDepth(53).setScrollFactor(0);

    // XP Bar (thin)
    const xpY = resY + 12;
    this.xpBarBg = this.scene.add.rectangle(barX, xpY, barW, 4, 0x222200).setOrigin(0, 0).setDepth(51).setScrollFactor(0);
    this.xpBarFill = this.scene.add.rectangle(barX + 1, xpY + 1, 0, 2, 0xCCAA00).setOrigin(0, 0).setDepth(52).setScrollFactor(0);

    // Gold
    this.goldText = this.scene.add.text(px + 56, xpY + 6, '💰 0', {
      fontSize: '10px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(51).setScrollFactor(0);

    // Level up text
    this.levelUpText = this.scene.add.text(this.W / 2, this.H / 2 - 60, '⬆ LEVEL UP! ⬆', {
      fontSize: '28px',
      color: '#FFDD44',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5).setDepth(200).setScrollFactor(0).setVisible(false);
  }

  private createSkillBar(): void {
    const skills = this.classData.skills.slice(0, 3);
    const keys = ['1', '2', '3'];
    const totalW = skills.length * (this.SKILL_SIZE + this.SKILL_PAD) - this.SKILL_PAD;
    const startX = this.W / 2 - totalW / 2;
    const y = this.H - 76;

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const x = startX + i * (this.SKILL_SIZE + this.SKILL_PAD);

      // Background Frame
      const bg = this.scene.add.image(x + this.SKILL_SIZE / 2, y + this.SKILL_SIZE / 2, 'ui_frame')
        .setDisplaySize(this.SKILL_SIZE + 4, this.SKILL_SIZE + 4)
        .setDepth(51).setScrollFactor(0);
      this.skillBgs.push(bg);

      // Icon
      const icon = this.scene.add.image(x + this.SKILL_SIZE / 2, y + this.SKILL_SIZE / 2, skill.icon)
        .setDisplaySize(28, 28)
        .setDepth(52).setScrollFactor(0);
      this.skillIcons.push(icon);

      // Cooldown overlay
      const cdOverlay = this.scene.add.rectangle(x + 1, y + 1, this.SKILL_SIZE - 2, this.SKILL_SIZE - 2, 0x000000, 0)
        .setOrigin(0, 0).setDepth(53).setScrollFactor(0);
      this.skillCooldownOverlays.push(cdOverlay);

      // Cooldown text
      const cdText = this.scene.add.text(x + this.SKILL_SIZE / 2, y + this.SKILL_SIZE / 2, '', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5, 0.5).setDepth(54).setScrollFactor(0);
      this.skillCooldownTexts.push(cdText);

      // Key label
      const keyLabel = this.scene.add.text(x + 4, y + 3, keys[i], {
        fontSize: '9px',
        color: '#AAAAFF',
        stroke: '#000000',
        strokeThickness: 2
      }).setDepth(55).setScrollFactor(0);
      this.skillKeyLabels.push(keyLabel);

      // Skill name below slot
      const nameLabel = this.scene.add.text(x + this.SKILL_SIZE / 2, y + this.SKILL_SIZE + 3, skill.name, {
        fontSize: '7px',
        color: '#AAAACC',
        stroke: '#000000',
        strokeThickness: 1,
        align: 'center',
        wordWrap: { width: this.SKILL_SIZE + 10 }
      }).setOrigin(0.5, 0).setDepth(51).setScrollFactor(0);
      this.skillNameLabels.push(nameLabel);
    }
  }

  updateSkillBarForTransform(transformed: boolean): void {
    const skills = transformed
      ? this.player.classData.skills.slice(3, 6) // titan skills
      : this.player.classData.skills.slice(0, 3); // human skills

    for (let i = 0; i < Math.min(skills.length, this.skillIcons.length); i++) {
      const skill = skills[i];
      this.skillIcons[i].setTexture(skill.icon);
      this.skillNameLabels[i].setText(skill.name);
    }
  }

  private createTargetFrame(): void {
    this.targetFrame = this.scene.add.container(this.W - 220, 10)
      .setDepth(55).setScrollFactor(0).setVisible(false);

    const bg = this.scene.add.image(100, 24, 'ui_frame').setDisplaySize(200, 48);
    this.targetFrame.add([bg]);

    const label = this.scene.add.text(6, 4, 'ALVO', {
      fontSize: '8px', color: '#CC4444', fontStyle: 'bold'
    });
    this.targetNameText = this.scene.add.text(6, 14, '', {
      fontSize: '11px', color: '#FFDDDD', fontStyle: 'bold'
    });
    this.targetHpBg = this.scene.add.rectangle(6, 30, 188, 12, 0x440000).setOrigin(0, 0);
    this.targetHpFill = this.scene.add.rectangle(7, 31, 186, 10, 0xCC2222).setOrigin(0, 0);
    this.targetHpText = this.scene.add.text(100, 36, '', {
      fontSize: '8px', color: '#FFFFFF', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    this.targetFrame.add([label, this.targetNameText, this.targetHpBg, this.targetHpFill, this.targetHpText]);
  }

  private createQuestPanel(): void {
    this.questPanel = this.scene.add.container(10, 10)
      .setDepth(55).setScrollFactor(0).setVisible(false);

    const bg = this.scene.add.image(100, 60, 'ui_frame').setDisplaySize(200, 120);
    this.questPanel.add([bg]);

    const label = this.scene.add.text(6, 4, 'MISSÕES ATIVAS', {
      fontSize: '9px', color: '#FFAA00', fontStyle: 'bold'
    });
    this.questTitle = this.scene.add.text(6, 18, '', {
      fontSize: '9px', color: '#FFDD88', fontStyle: 'bold'
    });
    this.questObjectiveText = this.scene.add.text(6, 32, '', {
      fontSize: '9px', color: '#CCCCCC',
      wordWrap: { width: 188 }
    });

    this.questPanel.add([label, this.questTitle, this.questObjectiveText]);
  }

  private createTransformTimer(): void {
    this.transformTimerText = this.scene.add.text(this.W / 2, 14, '', {
      fontSize: '14px',
      color: '#FF4400',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5, 0).setDepth(60).setScrollFactor(0).setVisible(false);
  }

  private createDeathScreen(): void {
    this.deathScreen = this.scene.add.container(this.W / 2, this.H / 2)
      .setDepth(300).setScrollFactor(0).setVisible(false);

    const overlay = this.scene.add.rectangle(0, 0, this.W, this.H, 0x000000, 0.7);
    const title = this.scene.add.text(0, -30, 'VOCÊ MORREU', {
      fontSize: '42px',
      color: '#CC0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5, 0.5);

    const sub = this.scene.add.text(0, 30, 'Renascendo na cidade...', {
      fontSize: '16px',
      color: '#AAAAAA',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);

    this.deathScreen.add([overlay, title, sub]);
  }

  showDeathScreen(): void {
    this.deathScreen.setVisible(true);
    this.scene.time.delayedCall(3000, () => {
      this.deathScreen.setVisible(false);
    });
  }

  showLevelUp(level: number): void {
    this.levelUpText.setText(`⬆ LEVEL ${level}! ⬆`).setVisible(true).setAlpha(1);
    this.scene.tweens.add({
      targets: this.levelUpText,
      y: this.H / 2 - 100,
      alpha: 0,
      duration: 2500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.levelUpText.setVisible(false).setY(this.H / 2 - 60);
      }
    });
  }

  setTarget(titan: { name: string; hp: number; maxHp: number } | null): void {
    if (!titan) {
      this.targetFrame.setVisible(false);
      return;
    }
    this.targetFrame.setVisible(true);
    this.targetNameText.setText(titan.name);
    const pct = Math.max(0, titan.hp / titan.maxHp);
    const maxW = 186;
    this.targetHpFill.setSize(Math.max(0, maxW * pct), 10);
    this.targetHpText.setText(`${Math.ceil(titan.hp)} / ${titan.maxHp}`);
  }

  addMessage(text: string, color: string = '#FFFFFF'): void {
    const y = this.H - 120 - this.messageLog.length * 16;
    const msg = this.scene.add.text(12, y, text, {
      fontSize: '10px',
      color,
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(60).setScrollFactor(0).setAlpha(1);

    this.messageLog.push(msg);
    if (this.messageLog.length > 5) {
      const old = this.messageLog.shift();
      old?.destroy();
    }

    this.scene.time.delayedCall(4000, () => {
      this.scene.tweens.add({
        targets: msg,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          msg.destroy();
          const idx = this.messageLog.indexOf(msg);
          if (idx >= 0) this.messageLog.splice(idx, 1);
        }
      });
    });
  }

  update(): void {
    const s = this.player.stats;

    // HP bar
    const hpPct = s.hp / s.maxHp;
    const barW = 138; // 140 - 2
    this.hpBarFill.setSize(Math.max(0, barW * hpPct), 8);
    const hpColor = hpPct > 0.5 ? 0xCC0000 : hpPct > 0.25 ? 0xFF6600 : 0xFF0000;
    this.hpBarFill.setFillStyle(hpColor);
    this.hpText.setText(`HP: ${Math.ceil(s.hp)} / ${s.maxHp}`);

    // Resource bar
    const resPct = s.resource / s.maxResource;
    this.resourceBarFill.setSize(Math.max(0, barW * resPct), 8);
    const resName = this.player.classData.resource.name;
    const resVal = this.player.classData.id === 'titan_shifter'
      ? `${resName}: ${Math.floor(s.resource)}%`
      : `${resName}: ${Math.floor(s.resource)} / ${s.maxResource}`;
    this.resourceText.setText(resVal);

    // XP bar
    const xpPct = s.level >= 10 ? 1 : s.xp / s.xpToNext;
    this.xpBarFill.setSize(Math.max(0, barW * xpPct), 2);

    // Level
    this.levelText.setText(`LV ${s.level} ${this.classData.name.toUpperCase()}`);

    // Gold
    this.goldText.setText(`💰 ${s.gold}`);

    // Skill cooldowns
    const activatedSkills = this.player.isTransformed
      ? this.player.classData.skills.slice(3, 6)
      : this.player.classData.skills.slice(0, 3);

    for (let i = 0; i < Math.min(activatedSkills.length, this.skillCooldownOverlays.length); i++) {
      const skill = activatedSkills[i];
      const cd = this.skillSystem.getCooldown(skill.id);
      const maxCd = skill.cooldown;

      if (cd > 0 && maxCd > 0) {
        const pct = cd / maxCd;
        this.skillCooldownOverlays[i].setFillStyle(0x000000, 0.65 * pct);
        this.skillCooldownTexts[i].setText(cd < 10 ? cd.toFixed(1) : Math.ceil(cd).toString());
      } else {
        this.skillCooldownOverlays[i].setFillStyle(0x000000, 0);
        this.skillCooldownTexts[i].setText('');
      }
    }

    // Transform timer
    if (this.player.isTransformed) {
      this.transformTimerText.setVisible(true);
      this.transformTimerText.setText(`⚡ FORMA TITÃ: ${Math.ceil(this.player.transformTimer)}s ⚡`);
    } else {
      this.transformTimerText.setVisible(false);
    }

    // Quest panel
    const activeQuests = this.questSystem.getActiveQuests();
    if (activeQuests.length > 0) {
      this.questPanel.setVisible(true);
      let titles = '';
      let objectives = '';
      activeQuests.forEach((q, idx) => {
        titles += `▶ ${q.data.name}\n\n\n`; // spacing for objectives
        objectives += `\n${this.questSystem.getObjectiveText(q.data.id)}\n\n`;
      });
      this.questTitle.setText(titles);
      this.questObjectiveText.setText(objectives);
    } else {
      this.questPanel.setVisible(false);
    }
  }
}
