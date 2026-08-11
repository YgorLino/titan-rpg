// src/entities/Titan.ts
import Phaser from 'phaser';
import { MonsterData } from '../data/monsters';

export type TitanState = 'idle' | 'chase' | 'attack' | 'stunned' | 'dead';

export class Titan extends Phaser.GameObjects.Container {
  monsterData: MonsterData;
  hp: number;
  maxHp: number;
  facing: number = 180;
  state: TitanState = 'idle';
  attackCooldownTimer: number = 0;
  stunnedTimer: number = 0;
  tauntedTimer: number = 0;

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

    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setSize(data.width * 0.8, data.height * 0.5);
      this.body.setOffset(-data.width * 0.4, -data.height * 0.25);
    }
  }

  private createVisuals(): void {
    const d = this.monsterData;

    // Shadow
    this.shadowSprite = this.scene.add.ellipse(0, d.height * 0.38, d.width * 1.1, d.width * 0.35, 0x000000, 0.35);
    this.add(this.shadowSprite);

    // Body Sprite
    this.bodySprite = this.scene.add.image(0, 0, d.id);
    this.bodySprite.setDisplaySize(d.width, d.height);
    this.add(this.bodySprite);

    // Nape - glowing vulnerability spot
    this.napeIndicator = this.scene.add.ellipse(0, -d.height * 0.26, 10, 10, 0xFF3300, 0.9);
    this.add(this.napeIndicator);

    // HP bar
    this.hpBar = this.scene.add.graphics();
    this.add(this.hpBar);
    this.drawHpBar();
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const w = this.monsterData.width + 12;
    const h = 6;
    const x = -w / 2;
    const y = -this.monsterData.height * 0.58 - 14;

    this.hpBar.fillStyle(0x222222, 0.85);
    this.hpBar.fillRect(x, y, w, h);

    const pct = this.hp / this.maxHp;
    const color = pct > 0.5 ? 0x00CC00 : pct > 0.25 ? 0xFFAA00 : 0xFF0000;
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(x, y, w * pct, h);
  }

  updateFacing(targetX: number, targetY: number): void {
    this.facing = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY)
    );

    // Flip sprite if facing left
    if (this.facing > 90 && this.facing < 270) {
      this.bodySprite.setFlipX(true);
    } else {
      this.bodySprite.setFlipX(false);
    }

    // Move nape to back of head
    const napeRad = Phaser.Math.DegToRad(this.facing + 180);
    const dist = this.monsterData.height * 0.26;
    this.napeIndicator.setPosition(
      Math.cos(napeRad) * dist,
      Math.sin(napeRad) * dist - 2
    );
  }

  isAttackedFromBehind(attackerX: number, attackerY: number): boolean {
    const angleToAttacker = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(this.x, this.y, attackerX, attackerY)
    );
    // If attacker is behind (opposite direction of facing)
    let diff = Math.abs(angleToAttacker - this.facing);
    if (diff > 180) diff = 360 - diff;
    return diff > 120;
  }

  takeDamage(amount: number, fromBehind: boolean = false, isNapeAttack: boolean = false): number {
    if (this.state === 'dead') return 0;

    let mult = 1.0;
    if (fromBehind && !isNapeAttack) mult = this.monsterData.weaknessMultiplier;
    if (isNapeAttack && fromBehind) mult = 4.0;
    else if (isNapeAttack && !fromBehind) mult = 0.3; // Nape from front barely hurts

    const dmg = Math.floor(Math.max(1, amount * mult));
    this.hp = Math.max(0, this.hp - dmg);
    this.drawHpBar();

    // Flash white
    this.bodySprite.setTint(0xFFFFFF);
    this.scene.time.delayedCall(120, () => {
      if (this.state !== 'dead') {
        this.bodySprite.clearTint();
        if (this.state === 'stunned') {
          this.bodySprite.setTint(0x6666CC);
        }
      }
    });

    if (this.hp <= 0) {
      this.die();
    }

    return dmg;
  }

  stun(duration: number): void {
    if (this.state === 'dead') return;
    this.state = 'stunned';
    this.stunnedTimer = duration;
    this.bodySprite.setTint(0x6666CC);
    if (this.body) this.body.setVelocity(0, 0);
  }

  private die(): void {
    this.state = 'dead';
    this.setAlpha(0.35);
    this.napeIndicator.setVisible(false);
    if (this.body) {
      this.body.setVelocity(0, 0);
      this.body.enable = false;
    }
    this.scene.events.emit('titan_died', this);
    this.scene.time.delayedCall(2500, () => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 1000,
        onComplete: () => this.destroy()
      });
    });
  }

  update(delta: number, playerX: number, playerY: number): void {
    if (this.state === 'dead') return;
    const dt = delta / 1000;

    if (this.state === 'stunned') {
      this.stunnedTimer -= dt;
      if (this.stunnedTimer <= 0) {
        this.state = 'idle';
        this.bodySprite.clearTint();
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.tauntedTimer > 0) {
      this.tauntedTimer -= dt;
      if (dist <= this.monsterData.attackRange) {
        this.state = 'attack';
      } else {
        this.state = 'chase';
      }
    } else {
      if (dist <= this.monsterData.attackRange) {
        this.state = 'attack';
      } else if (dist <= this.monsterData.detectionRange) {
        this.state = 'chase';
      } else {
        this.state = 'idle';
      }
    }

    this.updateFacing(playerX, playerY);

    if (this.state === 'chase' && this.body) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const spd = this.monsterData.speed;
      this.body.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
    } else if (this.state !== 'chase' && this.body) {
      this.body.setVelocity(0, 0);
    }

    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= dt;
    }
  }

  canAttack(): boolean {
    return this.state === 'attack' && this.attackCooldownTimer <= 0;
  }

  resetAttackCooldown(): void {
    this.attackCooldownTimer = this.monsterData.attackCooldown;
  }
}
