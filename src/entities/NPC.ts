// src/entities/NPC.ts
import Phaser from 'phaser';

export class NPC extends Phaser.GameObjects.Container {
  npcId: string;
  npcName: string;
  dialog: string[];
  private bodySprite!: Phaser.GameObjects.Image;
  private nameLabel!: Phaser.GameObjects.Text;
  private interactHint!: Phaser.GameObjects.Text;
  isNearPlayer: boolean = false;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    name: string,
    color: number,
    dialog: string[]
  ) {
    super(scene, x, y);
    this.npcId = id;
    this.npcName = name;
    this.dialog = dialog;

    this.createVisuals(color);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
  }

  private createVisuals(color: number): void {
    // Map NPC id to texture
    let texture = 'npc_levi';
    if (this.npcId === 'priest' || this.npcId === 'priest_npc') texture = 'npc_priest';
    if (this.npcId === 'blacksmith') texture = 'npc_blacksmith';

    // Body Sprite
    this.bodySprite = this.scene.add.image(0, 0, texture);
    this.bodySprite.setDisplaySize(20, 32);
    this.add(this.bodySprite);

    // Name label above NPC
    this.nameLabel = this.scene.add.text(0, -30, this.npcName, {
      fontSize: '9px',
      color: '#FFFF88',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5, 1);
    this.add(this.nameLabel);

    // Interact hint
    this.interactHint = this.scene.add.text(0, -44, '[F] Falar', {
      fontSize: '8px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5, 1).setVisible(false);
    this.add(this.interactHint);
  }

  setPlayerNearby(near: boolean): void {
    if (this.isNearPlayer === near) return;
    this.isNearPlayer = near;
    this.interactHint.setVisible(near);
    if (near) {
      this.scene.tweens.add({
        targets: this.interactHint,
        y: -50,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.scene.tweens.killTweensOf(this.interactHint);
      this.interactHint.setY(-44);
    }
  }
}
