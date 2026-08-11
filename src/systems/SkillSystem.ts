// src/systems/SkillSystem.ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Titan } from '../entities/Titan';
import { CombatSystem } from './CombatSystem';
import { ClassId } from '../data/classes';

export interface SkillCooldowns {
  [skillId: string]: number;
}

// Engineer placed objects
export interface PlacedObject {
  type: 'supply_box' | 'cannon' | 'barricade';
  gameObject: Phaser.GameObjects.Rectangle;
  body?: Phaser.Physics.Arcade.StaticBody;
  timer: number;
  x: number;
  y: number;
}

export class SkillSystem {
  private scene: Phaser.Scene;
  private combat: CombatSystem;
  cooldowns: SkillCooldowns = {};
  placedObjects: PlacedObject[] = [];

  // Grapple state
  isGrappling: boolean = false;
  grappleTarget: { x: number; y: number } | null = null;

  // Blessing buff
  blessingActive: boolean = false;
  blessingTimer: number = 0;

  // Holy ground objects
  holyGroundObjects: Array<{ circle: Phaser.GameObjects.Ellipse; timer: number; x: number; y: number }> = [];

  // Net effects on titans
  nettedTitans: Map<Titan, number> = new Map();

  constructor(scene: Phaser.Scene, combat: CombatSystem) {
    this.scene = scene;
    this.combat = combat;
  }

  getCooldown(skillId: string): number {
    return this.cooldowns[skillId] ?? 0;
  }

  isReady(skillId: string): boolean {
    return (this.cooldowns[skillId] ?? 0) <= 0;
  }

  setCooldown(skillId: string, seconds: number): void {
    this.cooldowns[skillId] = seconds;
  }

  useSkill(
    skillIndex: number,
    player: Player,
    titans: Titan[],
    selectedTitan: Titan | null
  ): boolean {
    if (player.isDead) return false;

    const classId = player.classData.id;
    const skills = player.isTransformed
      ? this.getTransformSkills(skillIndex)
      : player.classData.skills.slice(0, 3);

    const skill = skills[skillIndex];
    if (!skill) return false;

    if (!this.isReady(skill.id)) {
      this.combat.showText(player.x, player.y - 30, 'Recarga...', '#AAAAAA', '10px');
      return false;
    }
    if (!player.spendResource(skill.manaCost)) {
      this.combat.showText(player.x, player.y - 30, 'Sem Recurso!', '#FF4444', '10px');
      return false;
    }

    let success = false;
    const target = selectedTitan;

    switch (classId) {
      case 'titan_shifter':
        success = this.useTitanShifterSkill(skill.id, player, target, titans);
        break;
      case 'scout':
        success = this.useScoutSkill(skill.id, player, target, titans);
        break;
      case 'priest':
        success = this.usePriestSkill(skill.id, player, target, titans);
        break;
      case 'gunner':
        success = this.useGunnerSkill(skill.id, player, target, titans);
        break;
      case 'engineer':
        success = this.useEngineerSkill(skill.id, player, target, titans);
        break;
    }

    if (success) {
      this.setCooldown(skill.id, skill.cooldown);
    } else {
      // Refund resource if skill failed
      player.gainResource(skill.manaCost);
    }

    return success;
  }

  private getTransformSkills(index: number) {
    const titanSkills = [
      { id: 'titan_punch', name: 'Soco', cooldown: 2, manaCost: 0 },
      { id: 'titan_stomp', name: 'Pisão', cooldown: 5, manaCost: 0 },
      { id: 'titan_harden', name: 'Endurecimento', cooldown: 12, manaCost: 0 }
    ];
    return titanSkills;
  }

  private useTitanShifterSkill(id: string, player: Player, target: Titan | null, titans: Titan[]): boolean {
    switch (id) {
      case 'heavy_strike': {
        const nearby = this.findNearestTitan(player, titans, 70);
        if (!nearby) return false;
        this.combat.playerAttacksTitan(player, nearby, false, 1.8);
        player.addFury(15);
        this.shakeEffect(nearby);
        return true;
      }
      case 'roar': {
        // AOE taunt + fury
        this.combat.showText(player.x, player.y - 40, 'RUGIDO!', '#FF6600');
        player.addFury(20);
        titans.forEach(t => {
          if (t.state !== 'dead') {
            const d = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
            if (d < 300) {
              (t as any).tauntedTimer = 8;
              t.state = 'chase';
            }
          }
        });
        return true;
      }
      case 'transform': {
        player.setTransformed(true);
        this.scene.cameras.main.shake(400, 0.03);
        
        // Lightning effect
        const lightning = this.scene.add.rectangle(player.x, player.y, 40, 600, 0xFFFF00)
          .setOrigin(0.5, 1).setDepth(200);
        this.scene.tweens.add({
          targets: lightning,
          alpha: 0,
          scaleX: 2,
          duration: 300,
          onComplete: () => lightning.destroy()
        });

        // Smoke effect
        const smoke = this.scene.add.particles(player.x, player.y, 'particle', {
          speed: { min: 50, max: 200 },
          angle: { min: 0, max: 360 },
          scale: { start: 1, end: 0 },
          tint: 0x888888,
          lifespan: 800,
          quantity: 20,
          blendMode: 'NORMAL'
        }).setDepth(60);
        this.scene.time.delayedCall(800, () => smoke.destroy());

        this.combat.showText(player.x, player.y - 60, '⚡ FORMA TITÃ ⚡', '#FF0000', '18px');
        return true;
      }
      case 'titan_punch': {
        const nearby = this.findNearestTitan(player, titans, 100);
        if (!nearby) return false;
        this.combat.playerAttacksTitan(player, nearby, false, 2.5);
        this.scene.cameras.main.shake(200, 0.015);
        return true;
      }
      case 'titan_stomp': {
        // AOE
        this.combat.showText(player.x, player.y, 'PISÃO!', '#FF4400');
        let hit = false;
        titans.forEach(t => {
          if (t.state !== 'dead') {
            const d = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
            if (d < 130) {
              this.combat.playerAttacksTitan(player, t, false, 1.5);
              hit = true;
            }
          }
        });
        this.scene.cameras.main.shake(250, 0.02);
        // Show stomp circle
        const circle = this.scene.add.circle(player.x, player.y, 130, 0xFF4400, 0.3).setDepth(5);
        this.scene.time.delayedCall(400, () => circle.destroy());
        return true;
      }
      case 'titan_harden': {
        // Temporary defense boost
        const origDef = player.stats.defense;
        player.stats.defense += 50;
        this.combat.showText(player.x, player.y - 40, '🛡 ENDURECIMENTO', '#888888');
        this.scene.time.delayedCall(6000, () => {
          player.stats.defense = origDef;
        });
        return true;
      }
    }
    return false;
  }

  private useScoutSkill(id: string, player: Player, target: Titan | null, titans: Titan[]): boolean {
    switch (id) {
      case 'grapple': {
        // Dash towards selected titan or nearest one
        const goal = target ?? this.findNearestTitan(player, titans, 400);
        if (!goal || goal.state === 'dead') {
          // Dash in facing direction if no target
          const rad = Phaser.Math.DegToRad(player.facing);
          const dashX = player.x + Math.cos(rad) * 160;
          const dashY = player.y + Math.sin(rad) * 160;
          this.doGrappleDash(player, dashX, dashY);
          return true;
        }
        this.doGrappleDash(player, goal.x, goal.y);
        return true;
      }
      case 'spin_slash': {
        if (!player.useBlades(12)) {
          this.combat.showText(player.x, player.y - 30, 'Lâminas quebradas! [R]', '#ff6655');
          return false;
        }
        let hit = false;
        titans.forEach(t => {
          if (t.state !== 'dead') {
            const d = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
            if (d < 80) {
              this.combat.playerAttacksTitan(player, t, false, 1.2);
              hit = true;
            }
          }
        });
        // Visual
        const circle = this.scene.add.circle(player.x, player.y, 80, 0x00FF44, 0.25).setDepth(5);
        this.scene.tweens.add({
          targets: circle,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 400,
          onComplete: () => circle.destroy()
        });
        this.combat.showText(player.x, player.y - 30, 'CORTE GIRATÓRIO', '#00FF44');
        return true;
      }
      case 'nape_slash': {
        const nearby = target ?? this.findNearestTitan(player, titans, 100);
        if (!nearby || nearby.state === 'dead') return false;
        if (!player.useBlades(18)) {
          this.combat.showText(player.x, player.y - 30, 'Lâminas quebradas! [R]', '#ff6655');
          return false;
        }
        const fromBehind = nearby.isAttackedFromBehind(player.x, player.y);
        // Use combat system to handle damage + damage numbers properly
        this.combat.playerAttacksTitan(player, nearby, true, 2.5);
        if (fromBehind) {
          this.combat.showText(nearby.x, nearby.y - 55, '⚔ CORTE NA NUCA! ⚔', '#FFFF00');
          this.scene.cameras.main.shake(200, 0.018);
        } else {
          this.combat.showText(nearby.x, nearby.y - 40, 'Precisa ser pelas costas...', '#888888');
        }
        return true;
      }
    }
    return false;
  }


  private doGrappleDash(player: Player, targetX: number, targetY: number): void {
    this.isGrappling = true;
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);

    // Show grapple line
    const line = this.scene.add.line(
      0, 0,
      player.x, player.y,
      targetX, targetY,
      0x88DDFF, 0.8
    ).setLineWidth(2).setDepth(10).setOrigin(0, 0);

    // Gas burst effect
    const particles = this.scene.add.particles(player.x, player.y, 'particle', {
      speed: { min: 20, max: 100 },
      angle: { min: Phaser.Math.RadToDeg(angle + Math.PI) - 20, max: Phaser.Math.RadToDeg(angle + Math.PI) + 20 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xFFFFFF,
      lifespan: 300,
      quantity: 2
    }).setDepth(5);

    this.scene.tweens.add({
      targets: player,
      x: targetX + Math.cos(angle + Math.PI) * 60,
      y: targetY + Math.sin(angle + Math.PI) * 60,
      duration: 200,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        // Trail gas
        particles.setPosition(player.x, player.y);
        // Update line start
        line.setTo(player.x, player.y, targetX, targetY);
      },
      onComplete: () => {
        this.isGrappling = false;
        line.destroy();
        particles.destroy();
      }
    });
  }

  private usePriestSkill(id: string, player: Player, target: Titan | null, _titans: Titan[]): boolean {
    switch (id) {
      case 'heal': {
        const healAmount = 60 + player.stats.level * 10;
        player.heal(healAmount);
        this.combat.showHealNumber(player.x, player.y - 20, healAmount);
        // Heal effect
        const hCircle = this.scene.add.circle(player.x, player.y, 30, 0x00FF88, 0.4).setDepth(5);
        this.scene.tweens.add({
          targets: hCircle,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 600,
          onComplete: () => hCircle.destroy()
        });
        return true;
      }
      case 'blessing': {
        this.blessingActive = true;
        this.blessingTimer = 10;
        const origDef = player.stats.defense;
        player.stats.defense += 20;
        this.combat.showText(player.x, player.y - 35, '🛡 BÊNÇÃO', '#FFD700');
        this.scene.time.delayedCall(10000, () => {
          player.stats.defense = origDef;
          this.blessingActive = false;
        });
        return true;
      }
      case 'holy_ground': {
        const hg = {
          circle: this.scene.add.ellipse(player.x, player.y, 80, 50, 0xAAFFAA, 0.35).setDepth(3),
          timer: 8,
          x: player.x,
          y: player.y
        };
        this.holyGroundObjects.push(hg);
        this.combat.showText(player.x, player.y - 35, '✨ ORAÇÃO DE RESTAURAÇÃO', '#AAFFAA');
        return true;
      }
    }
    return false;
  }

  private useGunnerSkill(id: string, player: Player, target: Titan | null, titans: Titan[]): boolean {
    switch (id) {
      case 'shoot': {
        const t = target ?? this.findNearestTitan(player, titans, 280);
        if (!t || t.state === 'dead') return false;
        this.fireProjectile(player, t, 1.0, 0xFFDD88, 8);
        return true;
      }
      case 'precision_shot': {
        const t = target ?? this.findNearestTitan(player, titans, 360);
        if (!t || t.state === 'dead') return false;
        this.combat.showText(player.x, player.y - 30, 'MIRA...', '#FF8800');
        this.scene.time.delayedCall(600, () => {
          if (t.state !== 'dead') {
            this.fireProjectile(player, t, 2.8, 0xFF6600, 12);
          }
        });
        return true;
      }
      case 'net': {
        const t = target ?? this.findNearestTitan(player, titans, 300);
        if (!t || t.state === 'dead') return false;
        t.stun(4);
        this.combat.showText(t.x, t.y - 40, '🕸 REDE!', '#8888FF');
        // Slow net visual
        const netVisual = this.scene.add.ellipse(t.x, t.y, 60, 40, 0x4444FF, 0.4).setDepth(5);
        this.scene.time.delayedCall(4000, () => netVisual.destroy());
        return true;
      }
    }
    return false;
  }

  private fireProjectile(player: Player, target: Titan, dmgMult: number, color: number, size: number): void {
    const bullet = this.scene.add.circle(player.x, player.y, size / 2, color).setDepth(10);
    const angle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
    const speed = 380;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y);
    const duration = (dist / speed) * 1000;

    this.scene.tweens.add({
      targets: bullet,
      x: target.x,
      y: target.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        bullet.destroy();
        if (target.state !== 'dead') {
          this.combat.playerAttacksTitan(player, target, false, dmgMult);
        }
      }
    });
  }

  private useEngineerSkill(id: string, player: Player, _target: Titan | null, titans: Titan[]): boolean {
    switch (id) {
      case 'supply_box': {
        const box = this.scene.add.rectangle(player.x + 30, player.y, 20, 20, 0x88FF44).setDepth(5);
        this.placedObjects.push({
          type: 'supply_box',
          gameObject: box,
          timer: 60,
          x: player.x + 30,
          y: player.y
        });
        this.combat.showText(player.x, player.y - 35, 'SUPRIMENTOS DEPOSITADOS', '#88FF44');
        return true;
      }
      case 'auto_cannon': {
        const cannon = this.scene.add.rectangle(player.x, player.y - 30, 16, 16, 0xCC4400).setDepth(5);
        this.placedObjects.push({
          type: 'cannon',
          gameObject: cannon,
          timer: 15,
          x: player.x,
          y: player.y - 30
        });
        this.combat.showText(player.x, player.y - 35, 'CANHÃO INSTALADO!', '#FF4400');
        return true;
      }
      case 'barricade': {
        const barr = this.scene.add.rectangle(player.x, player.y - 25, 48, 12, 0xAA8844).setDepth(5);
        this.placedObjects.push({
          type: 'barricade',
          gameObject: barr,
          timer: 10,
          x: player.x,
          y: player.y - 25
        });
        this.combat.showText(player.x, player.y - 35, 'BARRICADA CRIADA', '#AA8844');
        return true;
      }
    }
    return false;
  }

  private findNearestTitan(player: Player, titans: Titan[], maxRange: number): Titan | null {
    let nearest: Titan | null = null;
    let nearestDist = maxRange;
    for (const t of titans) {
      if (t.state === 'dead' || !t.active) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = t;
      }
    }
    return nearest;
  }

  private shakeEffect(titan: Titan): void {
    this.scene.tweens.add({
      targets: titan,
      x: titan.x + 6,
      duration: 60,
      yoyo: true,
      repeat: 3
    });
  }

  update(delta: number, player: Player): void {
    const dt = delta / 1000;

    // Update cooldowns
    for (const key in this.cooldowns) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
      }
    }

    // Holy ground healing
    for (let i = this.holyGroundObjects.length - 1; i >= 0; i--) {
      const hg = this.holyGroundObjects[i];
      hg.timer -= dt;

      // Heal player if nearby
      const dist = Phaser.Math.Distance.Between(player.x, player.y, hg.x, hg.y);
      if (dist < 40 && !player.isDead) {
        player.heal(dt * 15); // 15 HP/sec while standing in it
      }

      if (hg.timer <= 0) {
        hg.circle.destroy();
        this.holyGroundObjects.splice(i, 1);
      }
    }

    // Placed objects
    for (let i = this.placedObjects.length - 1; i >= 0; i--) {
      const obj = this.placedObjects[i];
      obj.timer -= dt;

      if (obj.timer <= 0) {
        obj.gameObject.destroy();
        this.placedObjects.splice(i, 1);
      }
    }
  }

  checkSupplyBoxInteraction(player: Player): boolean {
    for (const obj of this.placedObjects) {
      if (obj.type === 'supply_box') {
        const d = Phaser.Math.Distance.Between(player.x, player.y, obj.x, obj.y);
        if (d < 40) {
          player.gainResource(50);
          this.combat.showText(player.x, player.y - 30, 'Suprimentos coletados!', '#88FF44');
          return true;
        }
      }
    }
    return false;
  }

  fireCannons(titans: Titan[], player: Player): void {
    for (const obj of this.placedObjects) {
      if (obj.type === 'cannon') {
        const nearest = this.findNearestTitan(
          { x: obj.x, y: obj.y, getAttackDamage: () => player.stats.attack * 0.6, classData: player.classData, isTransformed: false } as Player,
          titans,
          180
        );
        if (nearest && nearest.state !== 'dead') {
          // Fire every 2 seconds - handled externally
          nearest.takeDamage(Math.floor(player.stats.attack * 0.6), false, false);
        }
      }
    }
  }
}
