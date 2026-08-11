import Phaser from 'phaser';

export class AssetPreviewScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AssetPreviewScene' });
  }

  preload(): void {
    const singleDir = 'assets/single/';
    this.load.image('grass_single', singleDir + 'grass_single.png');
    this.load.image('dirt_single', singleDir + 'dirt_single.png');
    this.load.image('town_single', singleDir + 'town_single.png');
    this.load.image('wall_single', singleDir + 'wall_single.png');
    this.load.image('house_single', singleDir + 'house_single.png');
    this.load.image('tree_single', singleDir + 'tree_single.png');
    this.load.image('bush_single', singleDir + 'bush_single.png');
    this.load.image('rock_single', singleDir + 'rock_single.png');

    // Characters already loaded in BootScene
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#222222');
    this.add.text(10, 10, 'Asset Preview (Debug) - SINGLE TILES', { fontSize: '20px', color: '#ffffff' });

    let yPos = 50;
    
    const addSingle = (name: string, key: string, scale: number = 1) => {
      const img = this.add.image(200, yPos, key);
      img.setScale(scale);
      
      this.add.text(350, yPos, `${name}\nKey: ${key}\nScale: ${scale}`, { fontSize: '14px', color: '#aaaaaa' }).setOrigin(0, 0.5);
      yPos += (img.height * scale) + 20;
    };

    const addSprite = (name: string, key: string, frame: number, scale: number = 1) => {
      const spr = this.add.sprite(200, yPos, key, frame);
      spr.setScale(scale);
      this.add.text(350, yPos, `${name}\nKey: ${key}\nFrame: ${frame}\nScale: ${scale}`, { fontSize: '14px', color: '#aaaaaa' }).setOrigin(0, 0.5);
      yPos += (spr.height * scale) + 20;
    }

    addSingle('Grama Principal', 'grass_single');
    addSingle('Caminho Terra', 'dirt_single');
    addSingle('Piso Cidade', 'town_single');
    addSingle('Muralha (Frente)', 'wall_single');
    addSingle('Casa Pequena', 'house_single');
    addSingle('Árvore Grande', 'tree_single');
    addSingle('Arbusto', 'bush_single');
    addSingle('Pedra', 'rock_single');

    // Player:
    addSprite('Jogador Completo', 'player', 130);
    // NPC:
    addSprite('Capitão NPC', 'npc', 130);
    // Titan Normal
    addSprite('Titã Normal', 'titan_base', 130, 3.5);
    // Titan Aberrant
    addSprite('Titã Excêntrico', 'titan_base', 130, 2.5);

    // Enable scrolling
    this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number, deltaZ: number) => {
        this.cameras.main.scrollY += deltaY;
    });
  }
}
