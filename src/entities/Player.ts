// src/entities/Player.ts
import Phaser from 'phaser';
import { ClassData } from '../data/classes';
import { getXpForNextLevel } from '../data/levels';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  xp: number;
  xpToNext: number;
  resource: number;
  maxResource: number;
  gold: number;
}

export class Player extends Phaser.GameObjects.Container {
  classData: ClassData;
  stats: PlayerStats;
  facing: number = 180; // angle in degrees
  isTransformed: boolean = false;
  transformTimer: number = 0;
  isDead: boolean = false;
  isInvulnerable: boolean = false;
  invulnerableTimer: number = 0;

  // Visual components
  private bodySprite!: Phaser.GameObjects.Image;
  private shadowSprite!: Phaser.GameObjects.Ellipse;

  // Physics body reference
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, classData: ClassData) {
    super(scene, x, y);
    this.classData = classData;

    const base = classData.baseStats;
    this.stats = {
      hp: base.hp,
      maxHp: base.hp,
      attack: base.attack,
      defense: base.defense,
      speed: base.speed,
      level: 1,
      xp: 0,
      xpToNext: getXpForNextLevel(1),
      resource: classData.resource.max,
      maxResource: classData.resource.max,
      gold: 0
    };

    this.createVisuals();
    scene.add.existing(this);
    scene.physics.add.existing(this);

    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setCollideWorldBounds(true);
      this.body.setSize(28, 28);
      this.body.setOffset(-14, -14);
    }
  }

  private createVisuals(): void {
    // Shadow
    this.shadowSprite = this.scene.add.ellipse(0, 12, 28, 10, 0x000000, 0.4);
    this.add(this.shadowSprite);

    // Body Sprite
    this.bodySprite = this.scene.add.image(0, 0, `player_${this.classData.id}`);
    this.bodySprite.setDisplaySize(24, 36);
    this.add(this.bodySprite);
  }

  setTransformed(transformed: boolean): void {
    this.isTransformed = transformed;
    if (transformed) {
      this.setScale(2.5);
      this.bodySprite.setTexture('titan_normal');
      this.bodySprite.setDisplaySize(48, 72);
      this.stats.maxHp = this.classData.baseStats.hp + 400;
      this.stats.hp = Math.min(this.stats.hp + 200, this.stats.maxHp);
      this.transformTimer = 30;
      // Slower in titan form
    } else {
      this.setScale(1);
      this.bodySprite.setTexture(`player_${this.classData.id}`);
      this.bodySprite.setDisplaySize(24, 36);
      this.stats.maxHp = this.classData.baseStats.hp;
      if (this.stats.hp > this.stats.maxHp) this.stats.hp = this.stats.maxHp;
    }
  }

  setFacing(angle: number): void {
    this.facing = angle;
    // We can flip the sprite based on angle if it's moving left/right
    if (angle > 90 && angle < 270) {
      this.bodySprite.setFlipX(true);
    } else {
      this.bodySprite.setFlipX(false);
    }
  }

  takeDamage(amount: number): number {
    if (this.isDead || this.isInvulnerable) return 0;
    const reduced = Math.max(1, amount - this.stats.defense);
    this.stats.hp = Math.max(0, this.stats.hp - reduced);

    // Flash red
    this.bodySprite.setTint(0xFF0000);
    this.scene.time.delayedCall(150, () => {
      if (!this.isDead) {
        this.bodySprite.clearTint();
      }
    });

    if (this.stats.hp <= 0) {
      this.die();
    }
    return reduced;
  }

  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  gainResource(amount: number): void {
    this.stats.resource = Math.min(this.stats.maxResource, this.stats.resource + amount);
  }

  spendResource(amount: number): boolean {
    if (this.stats.resource < amount) return false;
    this.stats.resource = Math.max(0, this.stats.resource - amount);
    return true;
  }

  gainXp(amount: number): boolean {
    if (this.stats.level >= 10) return false;
    this.stats.xp += amount;
    if (this.stats.xp >= this.stats.xpToNext) {
      this.levelUp();
      return true;
    }
    return false;
  }

  private levelUp(): void {
    this.stats.xp -= this.stats.xpToNext;
    this.stats.level++;
    const hpGain = 20 + this.stats.level * 5;
    this.stats.maxHp += hpGain;
    this.stats.hp = this.stats.maxHp;
    this.stats.attack += 3;
    this.stats.defense += 2;
    if (this.stats.level < 10) {
      this.stats.xpToNext = getXpForNextLevel(this.stats.level);
    } else {
      this.stats.xpToNext = 0;
    }
  }

  private die(): void {
    this.isDead = true;
    this.isTransformed = false;
    this.setScale(1);
    this.setAlpha(0.4);
    if (this.body) this.body.setVelocity(0, 0);
  }

  respawn(x: number, y: number): void {
    this.isDead = false;
    this.setPosition(x, y);
    this.setAlpha(1);
    this.stats.hp = this.stats.maxHp;
    this.isInvulnerable = true;
    this.invulnerableTimer = 3;
    this.bodySprite.clearTint();
  }

  addFury(amount: number): void {
    if (this.classData.id !== 'titan_shifter') return;
    this.stats.resource = Math.min(this.stats.maxResource, this.stats.resource + amount);
  }

  gainGold(amount: number): void {
    this.stats.gold += amount;
  }

  update(delta: number): void {
    const dt = delta / 1000;

    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      this.setAlpha(Math.sin(this.invulnerableTimer * 20) > 0 ? 1 : 0.5);
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
        this.setAlpha(1);
      }
    }

    if (this.isTransformed) {
      this.transformTimer -= dt;
      if (this.transformTimer <= 0) {
        this.setTransformed(false);
        this.stats.resource = 0;
      }
    }

    // Resource regen (not fury)
    if (this.classData.id !== 'titan_shifter' && !this.isDead) {
      const regenRate = this.classData.resource.regenRate;
      if (regenRate > 0) {
        this.stats.resource = Math.min(
          this.stats.maxResource,
          this.stats.resource + regenRate * dt
        );
      }
    }
  }

  getAttackDamage(): number {
    const base = this.stats.attack;
    if (this.isTransformed) return base * 3;
    return base;
  }

  isAttackingFromBehind(targetX: number, targetY: number, targetFacing: number): boolean {
    // Angle from target to attacker
    const angleToAttacker = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(targetX, targetY, this.x, this.y)
    );
    let diff = Math.abs(angleToAttacker - targetFacing);
    if (diff > 180) diff = 360 - diff;
    return diff < 60; // Attacker is behind target if the angle from target to attacker is close to target's facing direction going backwards
  }
}
