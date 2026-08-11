import Phaser from 'phaser';
import { MonsterData } from '../data/monsters';

export type TitanState = 'idle' | 'chase' | 'attack' | 'stunned' | 'dead';

export class Titan extends Phaser.GameObjects.Container {
  monsterData: MonsterData;
  hp: number;
  maxHp: number;
  facing = 90;
  state: TitanState = 'idle';
  attackCooldownTimer = 0;
  stunnedTimer = 0;
  tauntedTimer = 0;

  private bodySprite!: Phaser.GameObjects.Image;
  private napeIndicator!: Phaser.GameObjects.Ellipse;
  private shadowSprite!: Phaser.GameObjects.Ellipse;
  private hpBar!: Phaser.GameObjects.Graphics;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, data: MonsterData) {
    super(scene, x, y);
    this.monsterData = data;
    this.hp = data.hp;
    this.maxHp = data.hp;

    this.createVisuals();
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(data.width, data.height * 0.62);
    this.setInteractive(new Phaser.Geom.Rectangle(-data.width / 2, -data.height / 2, data.width, data.height), Phaser.Geom.Rectangle.Contains);

    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setSize(data.width * 0.62, data.height * 0.35);
      this.body.setOffset(-data.width * 0.31, data.height * 0.05);
      this.body.setCollideWorldBounds(true);
    }
  }

  private createVisuals(): void {
    const d = this.monsterData;
    this.shadowSprite = this.scene.add.ellipse(0, d.height * 0.36, d.width * 0.85, d.width * 0.25, 0x000000, 0.38);
    const texture = d.id === 'titan_aberrant'
      ? 'titan_aberrant_art'
      : d.id === 'titan_colossal'
        ? 'titan_colossal_art'
        : 'titan_normal_art';
    this.bodySprite = this.scene.add.image(0, 0, texture)
      .setDisplaySize(d.width * 1.16, d.height * 1.16);
    this.napeIndicator = this.scene.add.ellipse(0, -d.height * 0.27, d.boss ? 18 : 10, d.boss ? 18 : 10, 0xff3b1f, 0.95)
      .setStrokeStyle(2, 0xffd27a, 0.85);
    this.hpBar = this.scene.add.graphics();
    this.add([this.shadowSprite, this.bodySprite, this.napeIndicator, this.hpBar]);
    this.drawHpBar();
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const w = Math.max(64, this.monsterData.width + 12);
    const y = -this.monsterData.height * 0.56 - 15;
    this.hpBar.fillStyle(0x111111, 0.9).fillRect(-w / 2, y, w, 7);
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const color = this.monsterData.boss ? 0xd62f24 : pct > 0.5 ? 0x4fae55 : pct > 0.25 ? 0xe3a832 : 0xd94636;
    this.hpBar.fillStyle(color, 1).fillRect(-w / 2 + 1, y + 1, (w - 2) * pct, 5);
  }

  private turnTowards(targetX: number, targetY: number, delta: number): void {
    const targetFacing = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY));
    this.facing = Phaser.Math.Angle.RotateTo(
      Phaser.Math.DegToRad(this.facing), Phaser.Math.DegToRad(targetFacing), delta / 1000 * 2.2
    ) * Phaser.Math.RAD_TO_DEG;

    const napeRad = Phaser.Math.DegToRad(this.facing + 180);
    const dist = this.monsterData.height * 0.27;
    this.napeIndicator.setPosition(Math.cos(napeRad) * dist, Math.sin(napeRad) * dist - 2);
  }

  isAttackedFromBehind(attackerX: number, attackerY: number): boolean {
    const angleToAttacker = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.x, this.y, attackerX, attackerY));
    let diff = Math.abs(Phaser.Math.Angle.WrapDegrees(angleToAttacker - this.facing));
    if (diff > 180) diff = 360 - diff;
    return diff > 115;
  }

  takeDamage(amount: number, fromBehind = false, isNapeAttack = false): number {
    if (this.state === 'dead') return 0;
    let mult = fromBehind ? this.monsterData.weaknessMultiplier : 1;
    if (isNapeAttack) mult = fromBehind ? 4 : 0.35;
    const damage = Math.floor(Math.max(1, amount * mult - this.monsterData.defense));
    this.hp = Math.max(0, this.hp - damage);
    this.drawHpBar();
    this.bodySprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.state !== 'dead') {
        if (this.state === 'stunned') this.bodySprite.setTint(0x6d72ba);
        else this.bodySprite.clearTint();
      }
    });
    if (this.hp <= 0) this.die();
    return damage;
  }

  stun(duration: number): void {
    if (this.state === 'dead' || this.monsterData.boss) return;
    this.state = 'stunned';
    this.stunnedTimer = duration;
    this.bodySprite.setTint(0x6d72ba);
    this.body.setVelocity(0, 0);
  }

  private die(): void {
    this.state = 'dead';
    this.napeIndicator.setVisible(false);
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.scene.events.emit('titan_died', this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 8,
      duration: this.monsterData.boss ? 2200 : 1100,
      delay: 500,
      onComplete: () => this.destroy()
    });
  }

  update(delta: number, playerX: number, playerY: number): void {
    if (this.state === 'dead') return;
    const dt = delta / 1000;
    this.setDepth(this.y + 100);

    if (this.state === 'stunned') {
      this.stunnedTimer -= dt;
      if (this.stunnedTimer <= 0) {
        this.state = 'idle';
        this.bodySprite.clearTint();
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    this.tauntedTimer = Math.max(0, this.tauntedTimer - dt);
    if (dist <= this.monsterData.attackRange) this.state = 'attack';
    else if (dist <= this.monsterData.detectionRange || this.tauntedTimer > 0) this.state = 'chase';
    else this.state = 'idle';

    this.turnTowards(playerX, playerY, delta);
    if (this.state === 'chase') {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      this.body.setVelocity(Math.cos(angle) * this.monsterData.speed, Math.sin(angle) * this.monsterData.speed);
      this.bodySprite.setFlipX(Math.cos(angle) > 0);
      this.bodySprite.setY(Math.sin(this.scene.time.now / 85) * 2);
      this.bodySprite.setAngle(Math.sin(this.scene.time.now / 150) * 1.3);
    } else {
      this.body.setVelocity(0, 0);
      this.bodySprite.setY(Math.sin(this.scene.time.now / 420) * 0.8);
      this.bodySprite.setAngle(0);
    }

    this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
  }

  canAttack(): boolean {
    return this.state === 'attack' && this.attackCooldownTimer <= 0;
  }

  resetAttackCooldown(): void {
    this.attackCooldownTimer = this.monsterData.attackCooldown;
  }
}
