// src/systems/CombatSystem.ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Titan } from '../entities/Titan';

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  fromBehind: boolean;
  isNapeKill: boolean;
}

export class CombatSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playerAttacksTitan(
    player: Player,
    titan: Titan,
    isNapeAttack: boolean = false,
    damageMultiplier: number = 1.0
  ): DamageResult {
    const fromBehind = titan.isAttackedFromBehind(player.x, player.y);
    const baseDmg = Math.floor(player.getAttackDamage() * damageMultiplier);
    const dmgDealt = titan.takeDamage(baseDmg, fromBehind, isNapeAttack);

    const isCrit = fromBehind && isNapeAttack;

    // Fury gain for titan shifter on hit
    if (player.classData.id === 'titan_shifter') {
      player.addFury(8);
    }

    this.showDamageNumber(titan.x, titan.y - 30, dmgDealt, isCrit);

    // Particle effect (blood/dust)
    this.createHitParticles(titan.x, titan.y, isCrit ? 0xCC0000 : 0xAAAAAA);

    if (isCrit) {
      this.scene.cameras.main.shake(150, 0.015);
      this.showText(titan.x, titan.y - 50, 'CORTE NA NUCA!', '#FFD700', '16px');
    }

    return {
      damage: dmgDealt,
      isCritical: isCrit,
      fromBehind,
      isNapeKill: titan.state === 'dead' && isNapeAttack && fromBehind
    };
  }

  titanAttacksPlayer(titan: Titan, player: Player): number {
    const dmg = titan.monsterData.attack;
    const dealt = player.takeDamage(dmg);

    // Fury gain when taking damage
    if (player.classData.id === 'titan_shifter' && dealt > 0) {
      player.addFury(12);
    }

    if (dealt > 0) {
      this.showDamageNumber(player.x, player.y - 25, dealt, false, true);
    }

    titan.resetAttackCooldown();
    return dealt;
  }

  private showDamageNumber(
    x: number,
    y: number,
    damage: number,
    isCrit: boolean,
    isPlayerHit: boolean = false
  ): void {
    const color = isCrit ? '#FF4400' : isPlayerHit ? '#FF8888' : '#FFFFFF';
    const fontSize = isCrit ? '18px' : isPlayerHit ? '12px' : '14px';
    const prefix = isCrit ? 'CRÍTICO! ' : '';

    const txt = this.scene.add.text(
      x + Phaser.Math.Between(-15, 15),
      y,
      `${prefix}${damage}`,
      {
        fontSize,
        color,
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5, 1).setDepth(100);

    this.scene.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      scale: isCrit ? 1.5 : 1,
      duration: isCrit ? 1000 : 800,
      ease: 'Back.easeOut',
      onComplete: () => txt.destroy()
    });
  }

  private createHitParticles(x: number, y: number, color: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      tint: color,
      lifespan: 400,
      quantity: 8,
      blendMode: 'NORMAL'
    });
    emitter.setDepth(60);
    this.scene.time.delayedCall(450, () => emitter.destroy());
  }

  // Removed duplicate showText


  showHealNumber(x: number, y: number, amount: number): void {
    const txt = this.scene.add.text(x, y - 10, `+${amount}`, {
      fontSize: '13px',
      color: '#00FF88',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold'
    }).setOrigin(0.5, 1).setDepth(100);

    this.scene.tweens.add({
      targets: txt,
      y: y - 45,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });
  }

  showText(x: number, y: number, message: string, color: string = '#FFFF00', fontSize: string = '14px'): void {
    const txt = this.scene.add.text(x, y, message, {
      fontSize,
      color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold'
    }).setOrigin(0.5, 1).setDepth(100);

    this.scene.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });
  }
}
