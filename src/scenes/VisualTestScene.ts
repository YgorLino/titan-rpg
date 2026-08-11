import Phaser from 'phaser';

const TILE = 32;

export class VisualTestScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private npc!: Phaser.GameObjects.Sprite;
  private titanNormal!: Phaser.GameObjects.Sprite;
  private titanAberrant!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  
  private questActive = false;
  private dialogBox?: Phaser.GameObjects.Container;
  private questIndicator!: Phaser.GameObjects.Text;
  private questTrackerText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'VisualTestScene' });
  }

  create(): void {
    const W = 40 * TILE;
    const H = 50 * TILE;

    this.cameras.main.setBounds(0, 0, W, H);
    this.physics.world.setBounds(0, 0, W, H);

    this.drawTerrain(W, H);
    this.drawCity(W, H);
    this.drawNature(W, H);

    // Character Spritesheets have walking animation, frame 130 is idle down (row 10)
    // Wait, row 10 in LPC (index 10) is walk down. Frame 130 = 10 * 13 = 130.
    
    // Player
    this.player = this.add.sprite(20 * TILE, 8 * TILE, 'player');
    this.player.setFrame(130);
    this.player.setDepth(this.player.y);

    // NPC Capitão
    this.npc = this.add.sprite(20 * TILE, 11 * TILE, 'npc');
    this.npc.setFrame(39); // Idle up (row 3, wait, index 3 = 39?)
    this.npc.setDepth(this.npc.y);
    
    // Quest Indicator
    this.questIndicator = this.add.text(this.npc.x, this.npc.y - 40, '!', {
      fontSize: '24px', color: '#ffff00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    // Titan Normal (Largo, lento, ereto)
    this.titanNormal = this.add.sprite(20 * TILE, 30 * TILE, 'titan_base');
    this.titanNormal.setFrame(130);
    this.titanNormal.setScale(3.5, 3.5); // Giant
    this.titanNormal.setTint(0xffe0d0); // Slightly fleshy
    this.titanNormal.setDepth(this.titanNormal.y);

    // Titan Aberrant (Magro, inclinado, vermelho, rápido)
    this.titanAberrant = this.add.sprite(28 * TILE, 35 * TILE, 'titan_base');
    this.titanAberrant.setFrame(130);
    this.titanAberrant.setScale(2.5, 3.5); // Thinner, taller
    this.titanAberrant.setAngle(15); // Hunched forward
    this.titanAberrant.setTint(0xff6666); // Reddish
    this.titanAberrant.setDepth(this.titanAberrant.y);

    this.drawHUD();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
    
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey('F');
  }
  
  update(): void {
      const speed = 4;
      let moved = false;
      if (this.cursors.left.isDown) {
          this.player.x -= speed;
          moved = true;
      } else if (this.cursors.right.isDown) {
          this.player.x += speed;
          moved = true;
      }
      if (this.cursors.up.isDown) {
          this.player.y -= speed;
          moved = true;
      } else if (this.cursors.down.isDown) {
          this.player.y += speed;
          moved = true;
      }
      if (moved) {
          this.player.setDepth(this.player.y);
      }
      
      // Update Indicator
      this.questIndicator.setDepth(this.npc.y + 100);

      // Simple Distance Interaction
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
      if (dist < 60 && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        if (!this.questActive) {
          this.showDialog();
        }
      }
  }

  private showDialog() {
    if (this.dialogBox) return;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    
    this.dialogBox = this.add.container(w/2, h/2 + 100).setScrollFactor(0).setDepth(2000);
    
    const bg = this.add.rectangle(0, 0, 400, 100, 0x000000, 0.8).setStrokeStyle(2, 0xffffff);
    const title = this.add.text(-180, -40, 'Capitão', { fontSize: '18px', color: '#ffcc00', fontStyle: 'bold' });
    const text = this.add.text(-180, -15, 'Titãs foram avistados além das muralhas.\nPrecisamos que alguém investigue a região.', { fontSize: '14px', color: '#ffffff' });
    const action = this.add.text(0, 30, '[ F para Aceitar ]', { fontSize: '12px', color: '#00ff00' }).setOrigin(0.5);

    this.dialogBox.add([bg, title, text, action]);

    this.time.delayedCall(100, () => {
      this.input.keyboard!.once('keydown-F', () => {
        this.questActive = true;
        this.questIndicator.setVisible(false);
        this.questTrackerText.setText('Missão: Primeira Expedição\nElimine Titãs: 0/3');
        this.dialogBox?.destroy();
        this.dialogBox = undefined;
      });
    });
  }

  private drawTerrain(W: number, H: number): void {
    // Grass everywhere
    for (let row = 0; row < H / TILE; row++) {
      for (let col = 0; col < W / TILE; col++) {
        this.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, 'grass').setDepth(0);
      }
    }

    // Dirt path from gate downwards
    const pathCenter = 20;
    for (let row = 12; row < H / TILE; row++) {
      for (let col = 0; col < W / TILE; col++) {
        const dist = Math.abs(col - pathCenter - Math.sin(row / 5) * 3);
        if (dist <= 2) {
          this.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, 'town_floor').setTint(0xbb9977).setDepth(1);
        }
      }
    }
  }

  private drawCity(W: number, H: number): void {
    const wallRow = 12;
    // City floor at top
    for (let row = 0; row < wallRow; row++) {
      for (let col = 0; col < W / TILE; col++) {
        this.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, 'town_floor').setDepth(2);
      }
    }
    
    // Buildings to frame the city (Tibia style)
    for (let i=0; i<3; i++) {
       const hX = (5 + i*15) * TILE;
       const hY = 5 * TILE;
       this.add.image(hX, hY, 'house').setDepth(hY);
       this.add.image(hX, hY - TILE * 1.5, 'roof').setDepth(hY + 1);
    }

    // Wall (Tibia style)
    const wallY = wallRow * TILE;
    const gateCol = 20;
    for (let col = 0; col < W / TILE; col++) {
      if (col < gateCol - 2 || col > gateCol + 2) {
        this.add.image(col * TILE + TILE / 2, wallY - TILE / 2, 'wall').setDepth(wallY);
        this.add.image(col * TILE + TILE / 2, wallY - TILE * 1.5, 'roof').setDepth(wallY + 1);
      }
    }

    // Gate Floor (Cobblestone turning to dirt)
    for (let col = gateCol - 2; col <= gateCol + 2; col++) {
      this.add.image(col * TILE + TILE / 2, wallY, 'town_floor').setTint(0x999999).setDepth(2);
    }
  }

  private drawNature(W: number, H: number): void {
    const wallRow = 12;
    // Trees clustering on borders, leaving combat arena clear
    for (let row = wallRow + 2; row < H / TILE; row++) {
      for (let col = 0; col < W / TILE; col++) {
        // High chance of trees on left/right edges
        const isBorder = (col < 5 || col > W / TILE - 6 || row > H / TILE - 4);
        if (isBorder && Math.random() > 0.4) {
          const x = col * TILE + TILE / 2;
          const y = row * TILE + TILE / 2;
          this.add.image(x, y, 'tree').setDepth(y + 20); 
        }
      }
    }

    // Bushes & Rocks sparse in the middle
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(6 * TILE, W - 6 * TILE);
      const y = Phaser.Math.Between((wallRow + 4) * TILE, H - 4 * TILE);
      const isRock = Math.random() > 0.5;
      this.add.image(x, y, isRock ? 'rocks' : 'bush').setDepth(y);
    }
  }

  private drawHUD(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    
    // Top-left Player Info
    const topBar = this.add.graphics().setScrollFactor(0).setDepth(1000);
    topBar.fillStyle(0x000000, 0.7);
    topBar.fillRoundedRect(10, 10, 220, 60, 8);
    topBar.lineStyle(2, 0x555555);
    topBar.strokeRoundedRect(10, 10, 220, 60, 8);

    this.add.text(20, 15, 'Recruta (Lv. 1)', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setScrollFactor(0).setDepth(1001);
    
    // HP
    topBar.fillStyle(0x330000, 1).fillRect(20, 38, 180, 10);
    topBar.fillStyle(0xcc2222, 1).fillRect(20, 38, 150, 10);
    
    // Gás/Recurso
    topBar.fillStyle(0x003300, 1).fillRect(20, 52, 180, 6);
    topBar.fillStyle(0x22cc22, 1).fillRect(20, 52, 120, 6);

    // Bottom Skill Bar
    const skillBar = this.add.graphics().setScrollFactor(0).setDepth(1000);
    const startX = w / 2 - 100;
    skillBar.fillStyle(0x000000, 0.6).fillRoundedRect(startX - 10, h - 50, 220, 40, 8);
    for (let i = 0; i < 4; i++) {
      skillBar.fillStyle(0x222222, 1).fillRect(startX + i * 50, h - 45, 30, 30);
      skillBar.lineStyle(2, 0x666666).strokeRect(startX + i * 50, h - 45, 30, 30);
      this.add.text(startX + i * 50 + 2, h - 43, `${i+1}`, { fontSize: '10px', color: '#aaaaaa' }).setScrollFactor(0).setDepth(1001);
    }

    // Quest Tracker (Right Side)
    this.questTrackerText = this.add.text(w - 20, 150, '', {
      fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'right'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001);
    
    // Minimap
    this.drawMinimap(w, h);
  }
  
  private drawMinimap(w: number, h: number): void {
      const mmGraphics = this.add.graphics().setScrollFactor(0).setDepth(1000);
      
      mmGraphics.fillStyle(0x000000, 0.7);
      mmGraphics.fillRoundedRect(w - 140, 10, 130, 130, 8);
      mmGraphics.lineStyle(2, 0x555555);
      mmGraphics.strokeRoundedRect(w - 140, 10, 130, 130, 8);
      
      // Minimap dots
      mmGraphics.fillStyle(0x00ff00, 1).fillCircle(w - 75, 40, 4); // Player (approx)
      mmGraphics.fillStyle(0x00aaff, 1).fillCircle(w - 75, 60, 3); // NPC
      mmGraphics.fillStyle(0xff0000, 1).fillCircle(w - 60, 100, 5); // Titan Normal
      mmGraphics.fillStyle(0xffaa00, 1).fillCircle(w - 90, 120, 4); // Titan Aberrant
  }
}
