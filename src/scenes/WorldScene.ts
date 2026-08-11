// src/scenes/WorldScene.ts
import Phaser from 'phaser';
import { CLASSES, ClassId } from '../data/classes';
import { MONSTERS } from '../data/monsters';
import { Player } from '../entities/Player';
import { Titan } from '../entities/Titan';
import { NPC } from '../entities/NPC';
import { CombatSystem } from '../systems/CombatSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { HUD } from '../ui/HUD';
import { QUESTS } from '../data/quests';

// Map dimensions
const TILE = 32;
const CITY_W = 38;
const CITY_H = 28;
const FIELD_W = 60;
const FIELD_H = 56;
const TOTAL_W = CITY_W * TILE; // city on top
const TOTAL_H = (CITY_H + FIELD_H) * TILE;

// Zone boundaries
const CITY_ZONE_Y_END = CITY_H * TILE;
const GATE_X = (CITY_W / 2) * TILE;
const GATE_Y = CITY_ZONE_Y_END;

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private titans: Titan[] = [];
  private npcs: NPC[] = [];
  private hud!: HUD;
  private combat!: CombatSystem;
  private skills!: SkillSystem;
  private quests!: QuestSystem;

  private selectedTitan: Titan | null = null;
  private classId!: ClassId;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    one: Phaser.Input.Keyboard.Key;
    two: Phaser.Input.Keyboard.Key;
    three: Phaser.Input.Keyboard.Key;
    f: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };

  // World objects
  private walls: Phaser.GameObjects.Rectangle[] = [];
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private titanGroup!: Phaser.Physics.Arcade.Group;

  // Dialog
  private dialogBox!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogFullText: string = '';
  private dialogCharIndex: number = 0;
  private dialogEvent?: Phaser.Time.TimerEvent;
  private isDialogOpen: boolean = false;
  private currentNPC: NPC | null = null;
  private dialogOptions!: Phaser.GameObjects.Text;
  private dialogCallback?: (accepted: boolean) => void;

  // State
  private titanSpawnTimer: number = 0;
  private cannonFireTimer: number = 0;
  private basicAttackCooldown: number = 0;
  private nearNPC: NPC | null = null;

  // Zone label
  private zoneLabelText!: Phaser.GameObjects.Text;
  private currentZone: 'city' | 'field' = 'city';

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data: { classId: ClassId }): void {
    this.classId = data.classId || 'titan_shifter';
  }

  create(): void {
    const W = TOTAL_W;
    const H = TOTAL_H;

    // Camera
    this.cameras.main.setBounds(0, 0, W, H);
    this.physics.world.setBounds(0, 0, W, H);

    // Create world
    this.createWorld();

    // Create player
    const classData = CLASSES[this.classId];
    const spawnX = GATE_X;
    const spawnY = CITY_H * TILE / 2;
    this.player = new Player(this, spawnX, spawnY, classData);
    this.player.setDepth(20);

    // Systems
    this.combat = new CombatSystem(this);
    this.skills = new SkillSystem(this, this.combat);
    this.quests = new QuestSystem();

    // HUD
    this.hud = new HUD(this);
    this.hud.create(this.player, this.skills, this.quests);

    // Camera follow
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.25);
    this.cameras.main.setDeadzone(100, 100);

    // Input
    this.setupInput();

    // Physics
    this.setupPhysics();

    // Spawn NPCs
    this.createNPCs();

    // Spawn initial titans
    this.spawnInitialTitans();

    // Dialog box
    this.createDialogBox();

    // Zone label
    this.zoneLabelText = this.add.text(
      this.scale.width / 2, 10,
      '🏰 Dentro das Muralhas', {
        fontSize: '13px',
        color: '#AACCFF',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold'
      }
    ).setScrollFactor(0).setDepth(60).setOrigin(0.5, 0);

    // Add minimap
    this.createMinimap();

    // Welcome message
    this.time.delayedCall(500, () => {
      this.hud.addMessage(`Bem-vindo, ${classData.name}!`, '#' + classData.color.toString(16).padStart(6, '0'));
      this.hud.addMessage('Fale com o Capitão para receber sua missão [F]', '#FFFF88');
      this.hud.addMessage('WASD/Setas = mover | 1,2,3 = habilidades | SPACE = ataque básico', '#AAAAAA');
    });

    // Listen to titan death events for quest/xp globally (from skills too)
    this.events.on('titan_died', this.onTitanDeath, this);
  }

  // ========================= WORLD CREATION =========================

  private createWorld(): void {
    this.wallGroup = this.physics.add.staticGroup();

    this.drawGround();
    this.drawCity();
    this.drawField();
  }

  private drawGround(): void {
    // City ground - cobblestone look
    for (let row = 0; row < CITY_H; row++) {
      for (let col = 0; col < CITY_W; col++) {
        this.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, 'cobblestone').setDepth(0);
      }
    }

    // Field ground - grass
    const fieldYOffset = CITY_H * TILE;
    for (let row = 0; row < FIELD_H; row++) {
      for (let col = 0; col < FIELD_W; col++) {
        const texture = Phaser.Math.Between(1, 10) > 8 ? 'grass_flower' : 'grass_base';
        this.add.image(col * TILE + TILE / 2, fieldYOffset + row * TILE + TILE / 2, texture).setDepth(0);
      }
    }

    // Field path (Pokemon style winding route)
    for (let row = 0; row < FIELD_H; row++) {
      const pathCenter = Math.floor(FIELD_W / 2 + Math.sin(row / 6) * 3);
      for (let col = 0; col < FIELD_W; col++) {
        if (Math.abs(col - pathCenter) <= 2) {
          this.add.image(col * TILE + TILE / 2, fieldYOffset + row * TILE + TILE / 2, 'dirt').setDepth(1);
        }
      }
    }
  }

  private drawCity(): void {
    const W = CITY_W * TILE;
    const H = CITY_H * TILE;
    // === OUTER WALLS (Tibia style 3/4 walls) ===
    const wallThick = TILE * 3; // Thick wall

    // Top wall
    this.addWall(W / 2, wallThick / 2, W, wallThick);
    
    // Bottom wall (with gate gap)
    const gateW = TILE * 4;
    const gateXPos = GATE_X;
    
    const leftWallW = gateXPos - gateW / 2;
    this.addWall(leftWallW / 2, H - wallThick / 2, leftWallW, wallThick);
    
    const rightWallW = W - (gateXPos + gateW / 2);
    this.addWall(W - rightWallW / 2, H - wallThick / 2, rightWallW, wallThick);
    
    // Left and Right walls
    this.addWall(wallThick / 2, H / 2, wallThick, H);
    this.addWall(W - wallThick / 2, H / 2, wallThick, H);

    // Gate visual - Imposing Tibia-like gate
    this.add.ellipse(gateXPos, H - wallThick + 10, gateW * 1.5, TILE, 0x000000, 0.4).setDepth(1);
    this.add.image(gateXPos, H - wallThick / 2, 'gate').setDisplaySize(gateW, wallThick + TILE).setDepth(4);
    
    // Massive gate towers
    const towerSize = TILE * 3.5;
    this.add.image(gateXPos - gateW / 2 - towerSize / 2, H - wallThick / 2, 'wall_stone').setDisplaySize(towerSize, towerSize).setDepth(4);
    this.add.image(gateXPos - gateW / 2 - towerSize / 2, H - wallThick / 2, 'roof').setDisplaySize(towerSize + 8, towerSize + 8).setDepth(5);
    
    this.add.image(gateXPos + gateW / 2 + towerSize / 2, H - wallThick / 2, 'wall_stone').setDisplaySize(towerSize, towerSize).setDepth(4);
    this.add.image(gateXPos + gateW / 2 + towerSize / 2, H - wallThick / 2, 'roof').setDisplaySize(towerSize + 8, towerSize + 8).setDepth(5);

    // Corner towers
    const cornerTowerSize = TILE * 4;
    const towers = [
      [wallThick / 2, wallThick / 2],
      [W - wallThick / 2, wallThick / 2],
      [wallThick / 2, H - wallThick / 2],
      [W - wallThick / 2, H - wallThick / 2]
    ];
    towers.forEach(([tx, ty]) => {
      this.add.image(tx, ty, 'wall_stone').setDisplaySize(cornerTowerSize, cornerTowerSize).setDepth(4);
      this.add.image(tx, ty, 'roof').setDisplaySize(cornerTowerSize - 4, cornerTowerSize - 4).setDepth(5);
    });

    // === BUILDINGS (Tibia style structures) ===
    const b = TILE;

    // Church (top center, very distinct)
    this.addBuilding(W / 2, b * 7, b * 9, b * 8, '✝ Igreja', 'roof');
    this.add.image(W / 2, b * 7 - b * 5, 'roof').setDisplaySize(b * 3, b * 4).setDepth(7);

    // Barracks (left side)
    this.addBuilding(b * 9, b * 12, b * 10, b * 6, '⚔ Quartel', 'roof');
    this.addTrainingGround(b * 9, b * 16);

    // Blacksmith (right side)
    this.addBuilding(W - b * 9, b * 13, b * 8, b * 6, '⚒ Oficina', 'wood');

    // Central Plaza (Tibia style clear area)
    const plazaX = W / 2;
    const plazaY = b * 16;
    this.add.image(plazaX, plazaY, 'cobblestone').setDisplaySize(b * 8, b * 8).setTint(0xCCCCCC).setDepth(1);
    this.add.text(plazaX, plazaY, 'Praça Central', { fontSize: '11px', color: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
    this.add.image(plazaX, plazaY, 'ruin').setDisplaySize(b * 2, b * 2).setTint(0xAAAAAA).setDepth(2); // Use ruin asset as a stone monument/fountain

    // Organized Residential Area
    this.addBuilding(b * 8, b * 23, b * 5, b * 5, 'Casa', 'roof');
    this.addBuilding(b * 14, b * 23, b * 5, b * 5, 'Casa', 'roof');
    
    this.addBuilding(W - b * 8, b * 23, b * 5, b * 5, 'Casa', 'roof');
    this.addBuilding(W - b * 14, b * 23, b * 5, b * 5, 'Casa', 'roof');

    this.addBuilding(W - b * 8, b * 7, b * 5, b * 5, 'Casa', 'roof');
    this.addBuilding(W - b * 14, b * 7, b * 5, b * 5, 'Casa', 'roof');
  }

  private addWall(x: number, y: number, w: number, h: number): void {
    const wall = this.add.image(x, y, 'wall_stone').setDisplaySize(w, h).setDepth(3);
    this.walls.push(wall as unknown as Phaser.GameObjects.Rectangle);
    const wallBody = this.wallGroup.create(x, y, undefined, undefined, false) as Phaser.Physics.Arcade.Image;
    wallBody.setVisible(false);
    if (wallBody.body) (wallBody.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h);
    wallBody.refreshBody();
  }

  private addBuilding(x: number, y: number, w: number, h: number, label: string, texture: string): void {
    // Building base
    this.add.image(x, y, 'wall_stone').setDisplaySize(w, h).setDepth(5);
    // Roof
    this.add.image(x, y, texture).setDisplaySize(w - 4, h - 4).setDepth(6);
    // Door
    this.add.image(x, y + h / 2 - 4, 'wood').setDisplaySize(TILE * 0.8, TILE * 0.8).setDepth(7);
    // Label
    this.add.text(x, y - h / 2 - 10, label, {
      fontSize: '11px', color: '#FFFFFF', stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
    }).setOrigin(0.5, 1).setDepth(10);

    // Add wall physics
    const physX = x;
    const physY = y - TILE * 0.4; // Slightly up from center (avoid door)
    const bw = this.wallGroup.create(physX, physY, undefined, undefined, false) as Phaser.Physics.Arcade.Image;
    bw.setVisible(false);
    if (bw.body) (bw.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h * 0.7);
    bw.refreshBody();
  }

  private addTrainingGround(x: number, y: number): void {
    // Training area
    this.add.image(x, y, 'dirt').setDisplaySize(TILE * 8, TILE * 6).setDepth(1);
    
    // Wooden dummies
    for (let i = -1; i <= 1; i++) {
      const dx = x + i * TILE * 2;
      this.add.ellipse(dx, y + 10, 16, 6, 0x000000, 0.4).setDepth(2); // shadow
      this.add.image(dx, y, 'wood').setDisplaySize(8, 24).setDepth(3); // dummy base
      this.add.image(dx, y - 16, 'wood').setDisplaySize(16, 16).setDepth(3); // dummy head
    }
    
    this.add.text(x, y + TILE * 3 + 4, '[ Área de Treino ]', {
      fontSize: '9px', color: '#CCAA88', stroke: '#000000', strokeThickness: 2, fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(10);
  }

  private drawField(): void {
    const fieldYOffset = CITY_H * TILE;
    const W = FIELD_W * TILE;

    // Field walls (continuation of city walls)
    this.addWall(TILE, fieldYOffset + FIELD_H * TILE / 2, TILE * 2, FIELD_H * TILE);
    this.addWall(W - TILE, fieldYOffset + FIELD_H * TILE / 2, TILE * 2, FIELD_H * TILE);

    // Pokemon-style Nature/Route composition
    // We will scatter trees, bushes and rocks to form natural "fences" and groves
    for (let i = 0; i < 150; i++) {
      const col = Phaser.Math.Between(3, FIELD_W - 3);
      const row = Phaser.Math.Between(3, FIELD_H - 3);
      
      // Keep path clear
      const pathCenter = Math.floor(FIELD_W / 2 + Math.sin(row / 6) * 3);
      if (Math.abs(col - pathCenter) <= 4) continue;

      const x = col * TILE + TILE / 2;
      const y = fieldYOffset + row * TILE + TILE / 2;
      
      const rand = Phaser.Math.Between(1, 100);
      if (rand < 60) {
        this.drawTree(x, y);
      } else if (rand < 90) {
        this.drawBush(x, y);
      } else {
        this.drawRock(x, y);
      }
    }

    // Ruined buildings to break the repetition
    this.drawRuin(W * 0.25, fieldYOffset + FIELD_H * TILE * 0.3);
    this.drawRuin(W * 0.7, fieldYOffset + FIELD_H * TILE * 0.5);
    this.drawRuin(W * 0.35, fieldYOffset + FIELD_H * TILE * 0.8);

    // Danger zone border (visual)
    this.add.rectangle(W / 2, fieldYOffset + 10, W, 4, 0x880000).setDepth(5);
    this.add.text(W / 2, fieldYOffset + 16, '⚠ ZONA DE PERIGO - TITÃS ALÉM DAS MURALHAS ⚠', {
      fontSize: '9px', color: '#FF4444', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5, 0).setDepth(10);
  }

  private drawTree(x: number, y: number): void {
    this.add.image(x, y - 8, 'tree').setDisplaySize(48, 64).setDepth(4);
  }

  private drawBush(x: number, y: number): void {
    this.add.image(x, y, 'bush').setDisplaySize(32, 32).setDepth(3);
  }

  private drawRuin(x: number, y: number): void {
    // Ruined structure
    this.add.image(x, y, 'ruin').setDisplaySize(64, 64).setDepth(2);
  }

  private drawRock(x: number, y: number): void {
    this.add.image(x, y, 'rock_texture').setDisplaySize(32, 32).setDepth(3);
  }

  // ========================= NPCs =========================

  private createNPCs(): void {
    const captainX = GATE_X;
    const captainY = CITY_H * TILE - TILE * 4;
    const captain = new NPC(
      this, captainX, captainY,
      'captain', 'Capitão Levi', 0x445566,
      [QUESTS.first_expedition.startDialog]
    );
    captain.setDepth(15);
    this.npcs.push(captain);

    // Church priest
    const priestX = CITY_W * TILE / 2;
    const priestY = TILE * 7;
    const priest = new NPC(
      this, priestX, priestY,
      'priest_npc', 'Pastor Shadis', 0xCCAA44,
      ['As Muralhas nos protegem.\nReze pela humanidade, jovem soldado.']
    );
    priest.setDepth(15);
    this.npcs.push(priest);

    // Blacksmith
    const smithX = CITY_W * TILE - TILE * 7;
    const smithY = TILE * 13;
    const smith = new NPC(
      this, smithX, smithY,
      'blacksmith', 'Ferreiro', 0xAA8844,
      ['Boas lâminas para um bom soldado!\nVolte quando tiver moedas para melhorias.']
    );
    smith.setDepth(15);
    this.npcs.push(smith);
  }

  // ========================= TITANS =========================

  private spawnInitialTitans(): void {
    const fieldY = CITY_H * TILE;
    const W = FIELD_W * TILE;

    // Spawn normal titans spread around the field
    const normalPositions = [
      [W * 0.2, fieldY + TILE * 10],
      [W * 0.6, fieldY + TILE * 8],
      [W * 0.8, fieldY + TILE * 15],
      [W * 0.3, fieldY + TILE * 22],
      [W * 0.7, fieldY + TILE * 25],
    ];

    normalPositions.forEach(([x, y]) => {
      this.spawnTitan(x, y, 'titan_normal');
    });

    // Spawn aberrant titans (faster, more aggressive)
    const aberrantPositions = [
      [W * 0.45, fieldY + TILE * 30],
      [W * 0.15, fieldY + TILE * 35],
      [W * 0.75, fieldY + TILE * 38],
    ];

    aberrantPositions.forEach(([x, y]) => {
      this.spawnTitan(x, y, 'titan_aberrant');
    });
  }

  private spawnTitan(x: number, y: number, type: string): Titan {
    const data = MONSTERS[type];
    const titan = new Titan(this, x, y, data);
    titan.setDepth(18);

    // Make clickable for selection
    const hitArea = this.add.rectangle(x, y, data.width + 10, data.height + 10, 0xFFFFFF, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      if (titan.state !== 'dead') {
        this.selectTitan(titan);
      }
    });

    this.titans.push(titan);

    if (this.titanGroup) {
      this.titanGroup.add(titan);
    }

    return titan;
  }

  // ========================= INPUT =========================

  private setupInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      one: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      f: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    };

    this.keys.one.on('down', () => {
      if (this.isDialogOpen && this.dialogOptions.visible && this.dialogCallback) {
        this.dialogCallback(true);
        this.closeDialog();
      }
    });

    this.keys.two.on('down', () => {
      if (this.isDialogOpen && this.dialogOptions.visible && this.dialogCallback) {
        this.dialogCallback(false);
        this.closeDialog();
      }
    });
  }

  private setupPhysics(): void {
    this.titanGroup = this.physics.add.group();

    // Player vs walls
    this.physics.add.collider(this.player, this.wallGroup);
    // Titans vs walls
    this.physics.add.collider(this.titanGroup, this.wallGroup);
    // Titans vs titans (prevent overlap)
    this.physics.add.collider(this.titanGroup, this.titanGroup);
  }

  // ========================= DIALOG =========================

  private createDialogBox(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.dialogBox = this.add.container(W / 2, H - 70)
      .setScrollFactor(0).setDepth(100).setVisible(false);

    const bg = this.add.rectangle(0, 0, W - 40, 100, 0x111118, 0.95).setOrigin(0.5, 1);
    const border5 = this.add.rectangle(0, 0, W - 36, 104, 0x886600, 0.9).setOrigin(0.5, 1);
    const line = this.add.rectangle(0, -94, W - 60, 1, 0x886600).setOrigin(0.5, 0.5);

    this.dialogText = this.add.text(0, -80, '', {
      fontSize: '11px',
      color: '#FFEECC',
      wordWrap: { width: W - 80 },
      lineSpacing: 4,
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5, 0);

    const closeHint = this.add.text(W / 2 - 30, -8, '[F] Fechar', {
      fontSize: '8px',
      color: '#886600',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(1, 1);

    this.dialogOptions = this.add.text(0, -20, '[1] Aceitar   [2] Recusar', {
      fontSize: '10px',
      color: '#55FF55',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0).setVisible(false);

    this.dialogBox.add([border5, bg, line, this.dialogText, closeHint, this.dialogOptions]);
  }

  private openDialog(npc: NPC, text: string, showOptions: boolean = false, callback?: (acc: boolean) => void): void {
    this.isDialogOpen = true;
    this.currentNPC = npc;
    this.dialogBox.setVisible(true);
    this.dialogFullText = text;
    this.dialogCharIndex = 0;
    this.dialogText.setText('');
    this.dialogOptions.setVisible(false);
    this.dialogCallback = callback;

    if (this.dialogEvent) this.dialogEvent.destroy();
    
    this.dialogEvent = this.time.addEvent({
      delay: 30,
      repeat: text.length - 1,
      callback: () => {
        this.dialogCharIndex++;
        this.dialogText.setText(this.dialogFullText.substring(0, this.dialogCharIndex));
        if (this.dialogCharIndex >= this.dialogFullText.length) {
          if (showOptions) this.dialogOptions.setVisible(true);
        }
      }
    });
  }

  private closeDialog(): void {
    if (this.dialogEvent) this.dialogEvent.destroy();
    this.isDialogOpen = false;
    this.currentNPC = null;
    this.dialogBox.setVisible(false);
    this.dialogCallback = undefined;
  }

  // ========================= GAME LOGIC =========================

  private selectTitan(titan: Titan): void {
    this.selectedTitan = titan;
    this.hud.setTarget({
      name: titan.monsterData.name,
      hp: titan.hp,
      maxHp: titan.maxHp
    });
  }

  private doBasicAttack(): void {
    if (this.basicAttackCooldown > 0) return;
    if (this.player.isDead) return;

    // Find nearest titan in range
    let nearest: Titan | null = null;
    let nearestDist = 80;

    // If we have a selected titan, prefer it
    if (this.selectedTitan && this.selectedTitan.state !== 'dead') {
      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.selectedTitan.x, this.selectedTitan.y
      );
      if (d < 100) nearest = this.selectedTitan;
    }

    if (!nearest) {
      for (const t of this.titans) {
        if (t.state === 'dead') continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = t;
        }
      }
    }

    if (!nearest) return;

    // Attack range: ranged classes have longer range
    const range = (this.classId === 'gunner') ? 280 : 80;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, nearest.x, nearest.y);
    if (dist > range) return;

    this.combat.playerAttacksTitan(this.player, nearest, false, 1.0);
    this.basicAttackCooldown = 0.8;

    if (this.selectedTitan) {
      this.hud.setTarget({
        name: this.selectedTitan.monsterData.name,
        hp: this.selectedTitan.hp,
        maxHp: this.selectedTitan.maxHp
      });
    }
  }

  private onTitanDeath(titan: Titan): void {
    const xpGained = titan.monsterData.xpReward;
    const leveledUp = this.player.gainXp(xpGained);
    this.player.stats.gold += 10;

    this.hud.addMessage(`Titã derrotado! +${xpGained} XP, +10 moedas`, '#FFDD44');

    if (leveledUp) {
      this.hud.showLevelUp(this.player.stats.level);
      this.hud.addMessage(`LEVEL UP! Nível ${this.player.stats.level}!`, '#FFDD44');
    }

    // Quest progress
    this.quests.onKill(titan.monsterData.id);

    if (this.selectedTitan === titan) {
      this.selectedTitan = null;
      this.hud.setTarget(null);
    }
  }

  private checkNPCInteraction(): void {
    this.nearNPC = null;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < 55) {
        this.nearNPC = npc;
        npc.setPlayerNearby(true);
      } else {
        npc.setPlayerNearby(false);
      }
    }
  }

  private handleNPCInteract(): void {
    if (this.isDialogOpen) {
      // Check if quest can be turned in
      if (this.currentNPC?.npcId === 'captain') {
        if (this.quests.isQuestReadyToTurnIn('first_expedition')) {
          const reward = this.quests.completeQuest('first_expedition');
          if (reward) {
            this.player.gainXp(reward.xp);
            this.player.stats.gold += reward.gold;
            this.hud.addMessage(`Missão concluída! +${reward.xp} XP, +${reward.gold} moedas!`, '#FFD700');
          }
        }
      }
      this.closeDialog();
      return;
    }

    if (!this.nearNPC) return;

    const npc = this.nearNPC;

    if (npc.npcId === 'captain') {
      const quest = this.quests.getQuest('first_expedition');
      const eliteQuest = this.quests.getQuest('elite_titan');
      
      if (!quest) {
        // Offer quest
        this.openDialog(npc, QUESTS.first_expedition.startDialog + '\n\nAceitar a missão Primeira Expedição?', true, (accepted) => {
          if (accepted) {
            this.quests.startQuest('first_expedition');
            this.hud.addMessage('Nova missão: Primeira Expedição!', '#FFD700');
          }
        });
      } else if (quest.status === 'objectives_done') {
        this.openDialog(npc, QUESTS.first_expedition.completionDialog, false, () => {
          const reward = this.quests.completeQuest('first_expedition');
          if (reward) {
            this.player.gainXp(reward.xp);
            this.player.gainGold(reward.gold);
            this.hud.addMessage(`Recompensa: +${reward.xp} XP, +${reward.gold} 💰`, '#00FF00');
          }
        });
      } else if (quest.status === 'completed' && !eliteQuest) {
        this.openDialog(npc, QUESTS.elite_titan.startDialog + '\n\nAceitar a missão Ameaça Excêntrica?', true, (accepted) => {
          if (accepted) {
            this.quests.startQuest('elite_titan');
            this.hud.addMessage('Nova missão: Ameaça Excêntrica!', '#FFD700');
          }
        });
      } else if (eliteQuest?.status === 'objectives_done') {
        this.openDialog(npc, QUESTS.elite_titan.completionDialog, false, () => {
          const reward = this.quests.completeQuest('elite_titan');
          if (reward) {
            this.player.gainXp(reward.xp);
            this.player.gainGold(reward.gold);
            this.hud.addMessage(`Recompensa: +${reward.xp} XP, +${reward.gold} 💰`, '#00FF00');
          }
        });
      } else if (eliteQuest?.status === 'completed') {
        this.openDialog(npc, 'Bom trabalho, soldado! Continue assim.\nHá muitos Titãs além das muralhas.');
      } else {
        const prog1 = quest.status === 'active' ? this.quests.getObjectiveText('first_expedition') : '';
        const prog2 = eliteQuest?.status === 'active' ? '\n' + this.quests.getObjectiveText('elite_titan') : '';
        this.openDialog(npc, `Missões em andamento:\n${prog1}${prog2}`);
      }
    } else if (npc.npcId === 'blacksmith') {
      const quest = this.quests.getQuest('lost_supplies');
      if (!quest) {
        this.openDialog(npc, QUESTS.lost_supplies.startDialog + '\n\nAceitar a missão Suprimentos Perdidos?', true, (accepted) => {
          if (accepted) {
            this.quests.startQuest('lost_supplies');
            this.hud.addMessage('Nova missão: Suprimentos Perdidos!', '#FFD700');
          }
        });
      } else if (quest.status === 'objectives_done') {
        this.openDialog(npc, QUESTS.lost_supplies.completionDialog, false, () => {
          const reward = this.quests.completeQuest('lost_supplies');
          if (reward) {
            this.player.gainXp(reward.xp);
            this.player.gainGold(reward.gold);
            this.hud.addMessage(`Recompensa: +${reward.xp} XP, +${reward.gold} 💰`, '#00FF00');
          }
        });
      } else if (quest.status === 'completed') {
        this.openDialog(npc, 'Obrigado pela ajuda, guerreiro. A forja nunca para!');
      } else {
        this.openDialog(npc, `Missão em andamento:\n${this.quests.getObjectiveText('lost_supplies')}`);
      }
    } else {
      this.openDialog(npc, npc.dialog[0]);
    }
  }

  private updateZone(): void {
    const inCity = this.player.y < CITY_ZONE_Y_END;
    const zone = inCity ? 'city' : 'field';
    if (zone !== this.currentZone) {
      this.currentZone = zone;
      if (zone === 'city') {
        this.zoneLabelText.setText('🏰 Dentro das Muralhas');
        this.zoneLabelText.setColor('#AACCFF');
        this.cameras.main.setBackgroundColor('#080810');
      } else {
        this.zoneLabelText.setText('⚠ Além das Muralhas - ZONA DE PERIGO');
        this.zoneLabelText.setColor('#FF6644');
        this.cameras.main.setBackgroundColor('#050808');
      }
    }
  }

  // ========================= MINIMAP =========================

  private minimapGfx!: Phaser.GameObjects.Graphics;
  private minimapPlayerDot!: Phaser.GameObjects.Ellipse;

  private createMinimap(): void {
    const W = this.scale.width;
    const mmW = 120;
    const mmH = 120;
    const mmX = W - mmW - 20;
    const mmY = 20;

    // Stone Frame
    this.add.rectangle(mmX + mmW / 2, mmY + mmH / 2, mmW + 12, mmH + 12, 0x666666)
      .setScrollFactor(0).setDepth(60);
    this.add.rectangle(mmX + mmW / 2, mmY + mmH / 2, mmW + 4, mmH + 4, 0x333333)
      .setScrollFactor(0).setDepth(61);
    
    // Parchment background
    this.add.rectangle(mmX + mmW / 2, mmY + mmH / 2, mmW, mmH, 0xEEDDCC)
      .setScrollFactor(0).setDepth(62);

    // Label
    this.add.text(mmX + mmW / 2, mmY - 8, 'MAPA MÚNDI', {
      fontSize: '9px', color: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(62);

    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(63);
    
    // Player dot
    this.minimapPlayerDot = this.add.ellipse(mmX, mmY, 6, 6, 0x0055FF).setStrokeStyle(1, 0xFFFFFF)
      .setScrollFactor(0).setDepth(64);

    // Draw static map features (city vs field)
    const scaleX = mmW / (FIELD_W * TILE);
    const scaleY = mmH / ((CITY_H + FIELD_H) * TILE);

    // City (light brown)
    this.minimapGfx.fillStyle(0xCCAA88, 0.5);
    this.minimapGfx.fillRect(mmX, mmY, mmW * (CITY_W / FIELD_W), mmH * (CITY_H / (CITY_H + FIELD_H)));

    // Field (light green)
    this.minimapGfx.fillStyle(0x99CC99, 0.5);
    this.minimapGfx.fillRect(mmX, mmY + mmH * (CITY_H / (CITY_H + FIELD_H)), mmW, mmH * (FIELD_H / (CITY_H + FIELD_H)));

    // Gate marker
    this.minimapGfx.fillStyle(0x884400, 1);
    this.minimapGfx.fillRect(mmX + (GATE_X / (FIELD_W * TILE)) * mmW - 2, mmY + (CITY_H * TILE / ((CITY_H + FIELD_H) * TILE)) * mmH - 2, 4, 4);

    // Store for update
    (this as any)._mmData = { mmX, mmY, mmW, mmH, scaleX, scaleY };
  }

  private updateMinimap(): void {
    const data = (this as any)._mmData;
    if (!data) return;
    const { mmX, mmY, mmW, mmH } = data;

    const totalMapW = FIELD_W * TILE;
    const totalMapH = (CITY_H + FIELD_H) * TILE;

    const px = mmX + (this.player.x / totalMapW) * mmW;
    const py = mmY + (this.player.y / totalMapH) * mmH;
    this.minimapPlayerDot.setPosition(px, py);

    // Dynamic entities
    this.minimapGfx.clear();
    
    // Redraw static
    // City
    this.minimapGfx.fillStyle(0xCCAA88, 0.5);
    this.minimapGfx.fillRect(mmX, mmY, mmW * (CITY_W / FIELD_W), mmH * (CITY_H / (CITY_H + FIELD_H)));
    // Field
    this.minimapGfx.fillStyle(0x99CC99, 0.5);
    this.minimapGfx.fillRect(mmX, mmY + mmH * (CITY_H / (CITY_H + FIELD_H)), mmW, mmH * (FIELD_H / (CITY_H + FIELD_H)));
    // Gate
    this.minimapGfx.fillStyle(0x884400, 1);
    this.minimapGfx.fillRect(mmX + (GATE_X / totalMapW) * mmW - 2, mmY + (CITY_H * TILE / totalMapH) * mmH - 2, 4, 4);

    // Draw Titans
    this.minimapGfx.fillStyle(0xFF0000, 0.8);
    this.titans.forEach(t => {
      if (t.state !== 'dead') {
        const tx = mmX + (t.x / totalMapW) * mmW;
        const ty = mmY + (t.y / totalMapH) * mmH;
        this.minimapGfx.fillCircle(tx, ty, 2.5);
      }
    });
  }

  // ========================= UPDATE =========================

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.player.isDead) {
      // Handle respawn
      this.handleDeadPlayer(dt);
      return;
    }

    // Movement
    if (!this.isDialogOpen) {
      this.handleMovement();
    } else {
      this.player.body.setVelocity(0, 0);
    }

    if (!this.isDialogOpen) {
      // Basic attack
      if (this.basicAttackCooldown > 0) this.basicAttackCooldown -= dt;
      if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
        this.doBasicAttack();
      }

      // Skills
      if (Phaser.Input.Keyboard.JustDown(this.keys.one)) {
        this.skills.useSkill(0, this.player, this.titans, this.selectedTitan);
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.two)) {
        this.skills.useSkill(1, this.player, this.titans, this.selectedTitan);
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.three)) {
        this.skills.useSkill(2, this.player, this.titans, this.selectedTitan);
      }
    }

    // Interact
    if (Phaser.Input.Keyboard.JustDown(this.keys.f)) {
      this.handleNPCInteract();
    }

    // Update player
    this.player.update(delta);

    // Update titan shifter skill bar on transform change
    if (this.classId === 'titan_shifter') {
      // Check if transformation state changed this frame - handled in skills system
    }

    // Titan AI
    this.updateTitans(delta);

    // Check titan attacks
    this.checkTitanAttacks();

    // NPC proximity
    this.checkNPCInteraction();

    // Update HUD
    this.hud.update();

    // Update skill system
    this.skills.update(delta, this.player);

    // Cannon fire
    this.cannonFireTimer += dt;
    if (this.cannonFireTimer >= 2) {
      this.cannonFireTimer = 0;
      this.skills.fireCannons(this.titans, this.player);
    }

    // Update selected titan HP display
    if (this.selectedTitan && this.selectedTitan.state !== 'dead') {
      this.hud.setTarget({
        name: this.selectedTitan.monsterData.name,
        hp: this.selectedTitan.hp,
        maxHp: this.selectedTitan.maxHp
      });
    } else if (this.selectedTitan?.state === 'dead') {
      this.selectedTitan = null;
      this.hud.setTarget(null);
    }

    // Zone tracking
    this.updateZone();

    // Minimap
    this.updateMinimap();

    // Titan spawning (periodic)
    this.titanSpawnTimer += dt;
    if (this.titanSpawnTimer >= 30) {
      this.titanSpawnTimer = 0;
      this.spawnWave();
    }

    // Skill bar update for transform
    const prevTransform = (this as any)._wasTransformed;
    if (this.player.isTransformed !== prevTransform) {
      (this as any)._wasTransformed = this.player.isTransformed;
      this.hud.updateSkillBarForTransform(this.player.isTransformed);
    }
  }

  private handleMovement(): void {
    if (this.skills.isGrappling) return; // Don't override grapple movement

    const speed = this.player.isTransformed
      ? this.player.stats.speed * 0.5  // Titan form is slower
      : this.player.stats.speed;

    let vx = 0;
    let vy = 0;

    const left = this.keys.a.isDown || this.cursors.left.isDown;
    const right = this.keys.d.isDown || this.cursors.right.isDown;
    const up = this.keys.w.isDown || this.cursors.up.isDown;
    const down = this.keys.s.isDown || this.cursors.down.isDown;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.player.body.setVelocity(vx * speed, vy * speed);

    // Update facing based on movement direction
    if (vx !== 0 || vy !== 0) {
      const angle = Phaser.Math.RadToDeg(Math.atan2(vy, vx));
      this.player.setFacing(angle);
    }
  }

  private updateTitans(delta: number): void {
    for (let i = this.titans.length - 1; i >= 0; i--) {
      const titan = this.titans[i];
      if (!titan.active) {
        this.titans.splice(i, 1);
        continue;
      }
      titan.update(delta, this.player.x, this.player.y);
    }
  }

  private checkTitanAttacks(): void {
    for (const titan of this.titans) {
      if (titan.canAttack()) {
        this.combat.titanAttacksPlayer(titan, this.player);
        if (this.player.isDead) {
          this.onPlayerDeath();
          return;
        }
      }
    }
  }

  private onPlayerDeath(): void {
    this.hud.showDeathScreen();
    this.cameras.main.shake(500, 0.03);
  }

  private _respawnTimer: number = 0;

  private handleDeadPlayer(dt: number): void {
    this._respawnTimer += dt;
    if (this._respawnTimer >= 3.5) {
      this._respawnTimer = 0;
      this.player.respawn(GATE_X, CITY_H * TILE / 2);
      this.hud.addMessage('Você renasceu na cidade.', '#AAAAFF');
    }
  }

  private spawnWave(): void {
    const fieldY = CITY_H * TILE;
    const W = FIELD_W * TILE;

    // Spawn 2-3 titans at random field positions
    const count = Phaser.Math.Between(2, 3);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(TILE * 4, W - TILE * 4);
      const y = fieldY + Phaser.Math.Between(TILE * 5, FIELD_H * TILE - TILE * 5);
      const type = Math.random() < 0.3 ? 'titan_aberrant' : 'titan_normal';
      this.spawnTitan(x, y, type);
    }
  }
}
