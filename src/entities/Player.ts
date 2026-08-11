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

export interface PlayerSnapshot {
  stats: PlayerStats;
  blades: number;
  x: number;
  y: number;
}

const RANKS = [
  'Recruta', 'Cadete', 'Cadete', 'Soldado', 'Soldado',
  'Veterano', 'Veterano', 'Oficial', 'Oficial', 'Herói da Humanidade'
];

export class Player extends Phaser.GameObjects.Container {
  classData: ClassData;
  stats: PlayerStats;
  facing = 90;
  isTransformed = false;
  transformTimer = 0;
  isDead = false;
  isInvulnerable = false;
  invulnerableTimer = 0;
  blades = 100;
  readonly maxBlades = 100;

  private bodySprite!: Phaser.GameObjects.Sprite;
  private shadowSprite!: Phaser.GameObjects.Ellipse;
  private classRing!: Phaser.GameObjects.Ellipse;
  private humanMaxHp = 0;
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
      resource: classData.id === 'titan_shifter' ? 0 : classData.resource.max,
      maxResource: classData.resource.max,
      gold: 0
    };
    this.humanMaxHp = base.hp;

    this.createVisuals();
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(30, 34);

    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setCollideWorldBounds(true);
      this.body.setSize(28, 28);
      this.body.setOffset(-14, -7);
    }
  }

  private createVisuals(): void {
    this.shadowSprite = this.scene.add.ellipse(0, 17, 30, 11, 0x000000, 0.45);
    this.classRing = this.scene.add.ellipse(0, 16, 34, 14, this.classData.color, 0.42)
      .setStrokeStyle(1, this.classData.color, 0.8);
    this.bodySprite = this.scene.add.sprite(0, 0, 'player', 0).setDisplaySize(48, 48);
    this.add([this.shadowSprite, this.classRing, this.bodySprite]);
  }

  get rank(): string {
    return RANKS[Math.min(RANKS.length - 1, Math.max(0, this.stats.level - 1))];
  }

  setTransformed(transformed: boolean): void {
    if (this.isTransformed === transformed) return;
    this.isTransformed = transformed;

    if (transformed) {
      this.humanMaxHp = this.stats.maxHp;
      this.bodySprite.stop().setTexture('player_titan_walk', 0).setDisplaySize(124, 124).setY(-5);
      this.classRing.setDisplaySize(78, 28).setFillStyle(0xff5a32, 0.38);
      this.shadowSprite.setDisplaySize(82, 25).setY(38);
      this.stats.maxHp = this.humanMaxHp + 400;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 240);
      this.transformTimer = 30;
      this.body.setSize(68, 58).setOffset(-34, -12);
    } else {
      this.bodySprite.stop().setTexture('player', 0).setDisplaySize(48, 48).setY(0).setAngle(0).setFlipX(false);
      this.classRing.setDisplaySize(34, 14).setFillStyle(this.classData.color, 0.42);
      this.shadowSprite.setDisplaySize(30, 11).setY(17);
      this.stats.maxHp = this.humanMaxHp;
      this.stats.hp = Math.min(this.stats.hp, this.stats.maxHp);
      this.body.setSize(28, 28).setOffset(-14, -7);
    }
  }

  setFacing(angle: number): void {
    this.facing = Phaser.Math.Angle.WrapDegrees(angle);
  }

  updateMovementAnimation(vx: number, vy: number): void {
    if (this.isDead) {
      this.bodySprite.stop();
      return;
    }

    if (this.isTransformed) {
      if (vx !== 0) this.bodySprite.setFlipX(vx > 0);
      const moving = vx !== 0 || vy !== 0;
      if (moving) this.bodySprite.setY(-5).setAngle(0).play('player_titan_running', true);
      else this.bodySprite.stop().setFrame(0).setY(-5).setAngle(0);
      return;
    }

    if (vx === 0 && vy === 0) {
      this.bodySprite.stop();
      return;
    }

    let direction = 'down';
    if (Math.abs(vx) > Math.abs(vy)) direction = vx < 0 ? 'left' : 'right';
    else direction = vy < 0 ? 'up' : 'down';
    this.bodySprite.play(`player_${direction}`, true);
  }

  takeDamage(amount: number): number {
    if (this.isDead || this.isInvulnerable) return 0;
    const reduced = Math.max(1, amount - this.stats.defense);
    this.stats.hp = Math.max(0, this.stats.hp - reduced);
    this.bodySprite.setTint(0xff5555);
    this.scene.time.delayedCall(130, () => {
      if (!this.isDead) this.bodySprite.clearTint();
    });
    if (this.stats.hp <= 0) this.die();
    return reduced;
  }

  heal(amount: number): void {
    if (!this.isDead) this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  gainResource(amount: number): void {
    this.stats.resource = Math.min(this.stats.maxResource, this.stats.resource + amount);
  }

  spendResource(amount: number): boolean {
    if (this.stats.resource < amount) return false;
    this.stats.resource = Math.max(0, this.stats.resource - amount);
    return true;
  }

  useBlades(amount: number): boolean {
    if (this.classData.id !== 'scout') return true;
    if (this.blades < amount) return false;
    this.blades = Math.max(0, this.blades - amount);
    return true;
  }

  resupply(): void {
    if (this.classData.id !== 'titan_shifter') this.stats.resource = this.stats.maxResource;
    if (this.classData.id === 'scout') this.blades = this.maxBlades;
  }

  gainXp(amount: number): boolean {
    if (this.stats.level >= 10) return false;
    this.stats.xp += amount;
    let leveledUp = false;
    while (this.stats.level < 10 && this.stats.xp >= this.stats.xpToNext) {
      this.stats.xp -= this.stats.xpToNext;
      this.levelUp();
      leveledUp = true;
    }
    return leveledUp;
  }

  private levelUp(): void {
    this.stats.level++;
    const hpGain = 20 + this.stats.level * 5;
    this.humanMaxHp += hpGain;
    this.stats.maxHp = this.isTransformed ? this.humanMaxHp + 400 : this.humanMaxHp;
    this.stats.hp = this.stats.maxHp;
    this.stats.attack += 3;
    this.stats.defense += 2;
    this.stats.xpToNext = this.stats.level < 10 ? getXpForNextLevel(this.stats.level) : 0;
  }

  private die(): void {
    this.isDead = true;
    if (this.isTransformed) this.setTransformed(false);
    this.setAlpha(0.4);
    this.body.setVelocity(0, 0);
    this.bodySprite.stop();
  }

  applyDeathPenalty(): { xpLost: number; goldLost: number } {
    const xpLost = Math.floor(this.stats.xp * 0.1);
    const goldLost = Math.floor(this.stats.gold * 0.1);
    this.stats.xp = Math.max(0, this.stats.xp - xpLost);
    this.stats.gold = Math.max(0, this.stats.gold - goldLost);
    return { xpLost, goldLost };
  }

  respawn(x: number, y: number): void {
    this.isDead = false;
    this.setPosition(x, y).setAlpha(1);
    this.stats.hp = this.stats.maxHp;
    this.resupply();
    this.isInvulnerable = true;
    this.invulnerableTimer = 3;
    this.bodySprite.clearTint();
    this.body.enable = true;
  }

  addFury(amount: number): void {
    if (this.classData.id === 'titan_shifter' && !this.isTransformed) this.gainResource(amount);
  }

  gainGold(amount: number): void {
    this.stats.gold += amount;
  }

  update(delta: number): void {
    const dt = delta / 1000;
    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      this.setAlpha(Math.sin(this.invulnerableTimer * 20) > 0 ? 1 : 0.55);
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

    if (this.classData.id !== 'titan_shifter' && !this.isDead) {
      this.gainResource(this.classData.resource.regenRate * dt);
    }
  }

  getAttackDamage(): number {
    return this.stats.attack * (this.isTransformed ? 3 : 1);
  }

  toSnapshot(): PlayerSnapshot {
    const savedStats = {
      ...this.stats,
      hp: Math.min(this.stats.hp, this.humanMaxHp),
      maxHp: this.humanMaxHp
    };
    return {
      stats: savedStats,
      blades: this.blades,
      x: this.x,
      y: this.y
    };
  }

  restore(snapshot: PlayerSnapshot): void {
    this.stats = { ...snapshot.stats };
    this.blades = snapshot.blades ?? this.maxBlades;
    this.humanMaxHp = this.stats.maxHp;
    this.setPosition(snapshot.x, snapshot.y);
    if (this.stats.hp <= 0) {
      this.stats.hp = this.stats.maxHp;
      this.setPosition(960, 576);
    }
  }
}
