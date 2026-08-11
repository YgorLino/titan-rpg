import Phaser from 'phaser';
import { CLASSES, ClassId } from '../data/classes';
import { MONSTERS } from '../data/monsters';
import { QUESTS } from '../data/quests';
import { Player, PlayerSnapshot } from '../entities/Player';
import { Titan } from '../entities/Titan';
import { NPC } from '../entities/NPC';
import { CombatSystem } from '../systems/CombatSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { QuestSnapshot, QuestSystem } from '../systems/QuestSystem';
import { HUD } from '../ui/HUD';

const TILE = 32;
const MAP_W = 60;
const CITY_H = 24;
const FIELD_H = 40;
const FOREST_H = 32;
const WORLD_W = MAP_W * TILE;
const WORLD_H = (CITY_H + FIELD_H + FOREST_H) * TILE;
const CITY_END = CITY_H * TILE;
const FIELD_END = (CITY_H + FIELD_H) * TILE;
const GATE_X = WORLD_W / 2;
const SPAWN_Y = CITY_END - TILE * 6;
const SAVE_KEY = 'titan-rpg-save-v1';

type ZoneId = 'city' | 'field' | 'forest';

interface SaveData {
  version: 1;
  classId: ClassId;
  player: PlayerSnapshot;
  quests: QuestSnapshot[];
}

interface WorldKeys {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  one: Phaser.Input.Keyboard.Key;
  two: Phaser.Input.Keyboard.Key;
  three: Phaser.Input.Keyboard.Key;
  f: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
  h: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  escape: Phaser.Input.Keyboard.Key;
}

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private titans: Titan[] = [];
  private npcs: NPC[] = [];
  private hud!: HUD;
  private combat!: CombatSystem;
  private skills!: SkillSystem;
  private quests!: QuestSystem;
  private selectedTitan: Titan | null = null;
  private classId: ClassId = 'titan_shifter';
  private continueSave = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: WorldKeys;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private titanGroup!: Phaser.Physics.Arcade.Group;

  private dialogBox!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogOptions!: Phaser.GameObjects.Text;
  private dialogTimer?: Phaser.Time.TimerEvent;
  private dialogCallback?: (accepted: boolean) => void;
  private isDialogOpen = false;
  private nearNPC: NPC | null = null;

  private zoneLabel!: Phaser.GameObjects.Text;
  private currentZone: ZoneId = 'city';
  private helpOverlay!: Phaser.GameObjects.Container;
  private isHelpOpen = false;
  private basicAttackCooldown = 0;
  private spawnTimer = 0;
  private cannonTimer = 0;
  private respawnTimer = 0;
  private bossSpawned = false;
  private deathPenaltyApplied = false;
  private supplyX = GATE_X + TILE * 3;
  private supplyY = CITY_END - TILE * 5;

  private minimapGfx!: Phaser.GameObjects.Graphics;
  private minimapPlayer!: Phaser.GameObjects.Ellipse;
  private minimapData!: { x: number; y: number; w: number; h: number };

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data: { classId?: ClassId; continueSave?: boolean }): void {
    this.continueSave = Boolean(data.continueSave);
    const save = this.continueSave ? this.readSave() : null;
    this.classId = data.classId ?? save?.classId ?? 'titan_shifter';
    if (!this.continueSave && data.classId) localStorage.removeItem(SAVE_KEY);
  }

  create(): void {
    this.resetRuntimeState();
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this.wallGroup = this.physics.add.staticGroup();
    this.titanGroup = this.physics.add.group();
    this.drawWorld();

    this.player = new Player(this, GATE_X, SPAWN_Y, CLASSES[this.classId]);
    this.combat = new CombatSystem(this);
    this.skills = new SkillSystem(this, this.combat);
    this.quests = new QuestSystem();

    const save = this.continueSave ? this.readSave() : null;
    if (save?.classId === this.classId) {
      this.player.restore(save.player);
      this.quests.restore(save.quests);
    }

    this.createNPCs();
    this.spawnInitialTitans();
    this.setupPhysics();
    this.setupInput();

    this.hud = new HUD(this);
    this.hud.create(this.player, this.skills, this.quests);
    this.createDialogBox();
    this.createZoneLabel();
    this.createMinimap();
    this.createHelpOverlay();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.22);
    this.cameras.main.setDeadzone(120, 90);

    this.events.on('titan_died', this.onTitanDeath, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('titan_died', this.onTitanDeath, this);
    });
    this.time.addEvent({ delay: 10000, loop: true, callback: () => this.saveGame() });

    this.time.delayedCall(300, () => {
      this.hud.addMessage(`${this.player.rank} da ${this.player.classData.name}`, '#f0d29b');
      this.hud.addMessage('Fale com o Capitão no portão [F]', '#ffe070');
      this.hud.addMessage('H abre os controles e pausa a ação', '#aeb6c2');
    });
  }

  private resetRuntimeState(): void {
    this.titans = [];
    this.npcs = [];
    this.selectedTitan = null;
    this.currentZone = 'city';
    this.basicAttackCooldown = 0;
    this.spawnTimer = 0;
    this.cannonTimer = 0;
    this.respawnTimer = 0;
    this.bossSpawned = false;
    this.deathPenaltyApplied = false;
    this.isDialogOpen = false;
    this.isHelpOpen = false;
  }

  // ------------------------- WORLD -------------------------

  private drawWorld(): void {
    this.add.tileSprite(WORLD_W / 2, CITY_END / 2, WORLD_W, CITY_END, 'stone_floor').setDepth(0);
    this.add.tileSprite(WORLD_W / 2, (CITY_END + WORLD_H) / 2, WORLD_W, WORLD_H - CITY_END, 'grass').setDepth(0);

    for (let row = 0; row < FIELD_H + FOREST_H; row++) {
      const center = Math.floor(MAP_W / 2 + Math.sin(row / 7) * 4);
      for (let offset = -2; offset <= 2; offset++) {
        this.add.image((center + offset) * TILE + TILE / 2, CITY_END + row * TILE + TILE / 2, 'dirt').setDepth(1);
      }
    }

    this.drawCity();
    this.drawExpeditionField();
    this.drawGiantForest();
  }

  private drawCity(): void {
    const wall = 74;
    this.addFortifiedWall(WORLD_W / 2, wall / 2, WORLD_W, wall);
    this.addFortifiedWall(wall / 2, CITY_END / 2, wall, CITY_END);
    this.addFortifiedWall(WORLD_W - wall / 2, CITY_END / 2, wall, CITY_END);

    const gateWidth = TILE * 5;
    this.addFortifiedWall((GATE_X - gateWidth / 2) / 2, CITY_END - wall / 2, GATE_X - gateWidth / 2, wall);
    const rightStart = GATE_X + gateWidth / 2;
    this.addFortifiedWall(rightStart + (WORLD_W - rightStart) / 2, CITY_END - wall / 2, WORLD_W - rightStart, wall);

    this.add.rectangle(GATE_X, CITY_END - wall / 2, gateWidth, wall + 6, 0x2e241d)
      .setStrokeStyle(4, 0x8b745a).setDepth(4);
    this.add.text(GATE_X, CITY_END - wall - 8, 'PORTÃO DE SHIGANSHINA', {
      fontSize: '11px', color: '#eee0cb', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(8);

    this.addBuilding(TILE * 11, TILE * 8, 'QUARTEL DA TROPA', 0x8c8f82);
    this.addBuilding(WORLD_W - TILE * 11, TILE * 8, 'IGREJA DAS MURALHAS', 0xd6c080);
    this.addBuilding(TILE * 12, TILE * 17, 'FORJA E OFICINA', 0xb27649);
    this.addBuilding(WORLD_W - TILE * 12, TILE * 17, 'ALOJAMENTOS', 0x8c735e);

    this.add.rectangle(GATE_X, TILE * 12, TILE * 12, TILE * 8, 0xc2aa82, 0.42).setDepth(1);
    this.add.circle(GATE_X, TILE * 12, 42, 0x61666b).setStrokeStyle(5, 0xd0c0a0).setDepth(2);
    this.add.text(GATE_X, TILE * 12, 'ASAS\nDA LIBERDADE', {
      fontSize: '10px', align: 'center', color: '#e7ded0', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(3);

    this.add.rectangle(this.supplyX, this.supplyY, 54, 40, 0x42576a).setStrokeStyle(3, 0xbfd9e6).setDepth(5);
    this.add.text(this.supplyX, this.supplyY - 30, 'SUPRIMENTOS [R]', {
      fontSize: '9px', color: '#cfefff', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(8);
  }

  private addFortifiedWall(x: number, y: number, w: number, h: number): void {
    this.add.rectangle(x, y, w, h, 0x68655e).setStrokeStyle(3, 0xaaa398).setDepth(3);
    const horizontal = w > h;
    const length = horizontal ? w : h;
    for (let p = -length / 2 + 16; p < length / 2; p += 32) {
      const bx = horizontal ? x + p : x;
      const by = horizontal ? y - h / 2 + 8 : y + p;
      this.add.rectangle(bx, by, horizontal ? 22 : w, horizontal ? 16 : 22, 0x858079).setDepth(4);
    }
    this.addBlocker(x, y, w, h);
  }

  private addBuilding(x: number, y: number, label: string, tint: number): void {
    this.add.image(x, y, 'house').setDisplaySize(190, 170).setTint(tint).setDepth(y + 30);
    this.add.text(x, y - 92, label, {
      fontSize: '10px', color: '#fff2dc', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(y + 60);
    this.addBlocker(x, y + 24, 145, 76);
  }

  private drawExpeditionField(): void {
    const seeded = new Phaser.Math.RandomDataGenerator(['titan-rpg-expedition']);
    for (let i = 0; i < 120; i++) {
      const x = seeded.between(TILE * 3, WORLD_W - TILE * 3);
      const y = seeded.between(CITY_END + TILE * 3, FIELD_END - TILE * 3);
      const row = Math.floor((y - CITY_END) / TILE);
      const pathCenter = (MAP_W / 2 + Math.sin(row / 7) * 4) * TILE;
      if (Math.abs(x - pathCenter) < TILE * 5) continue;
      const roll = seeded.between(0, 100);
      if (roll < 54) this.addNatureObject(x, y, 'tree', 72, 96, i % 4 === 0);
      else if (roll < 82) this.add.image(x, y, 'bush').setDisplaySize(34, 34).setDepth(y);
      else this.add.image(x, y, 'rock').setDisplaySize(34, 34).setDepth(y);
    }

    this.add.text(GATE_X, CITY_END + 46, 'ALÉM DAS MURALHAS • ROTA DE EXPEDIÇÃO', {
      fontSize: '13px', color: '#efc39b', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(10);

    this.drawRuins(TILE * 13, CITY_END + TILE * 20);
    this.drawRuins(WORLD_W - TILE * 13, CITY_END + TILE * 29);
  }

  private drawGiantForest(): void {
    this.add.rectangle(WORLD_W / 2, FIELD_END + 5, WORLD_W, 10, 0x40231c).setDepth(3);
    this.add.text(GATE_X, FIELD_END + 34, 'DUNGEON • FLORESTA DAS ÁRVORES GIGANTES', {
      fontSize: '15px', color: '#ffcb85', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(20);

    const seeded = new Phaser.Math.RandomDataGenerator(['titan-rpg-forest']);
    for (let row = 2; row < FOREST_H - 5; row += 3) {
      for (let col = 2; col < MAP_W - 2; col += 3) {
        const pathCenter = Math.floor(MAP_W / 2 + Math.sin(row / 4) * 5);
        const arena = row > FOREST_H - 13 && Math.abs(col - MAP_W / 2) < 11;
        if (Math.abs(col - pathCenter) < 4 || arena || seeded.between(0, 100) < 22) continue;
        this.addNatureObject(col * TILE, FIELD_END + row * TILE, 'tree', 118, 154, true);
      }
    }

    const arenaY = WORLD_H - TILE * 7;
    this.add.rectangle(GATE_X, arenaY, TILE * 20, TILE * 11, 0x574838, 0.48)
      .setStrokeStyle(5, 0x887258).setDepth(1);
    this.add.text(GATE_X, arenaY - TILE * 5, 'RUÍNAS DA 19ª EXPEDIÇÃO', {
      fontSize: '12px', color: '#d9c29c', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(10);
    for (let i = -9; i <= 9; i += 3) {
      this.add.rectangle(GATE_X + i * TILE, arenaY - TILE * 5.2, TILE * 1.5, 20, 0x777067).setDepth(3);
    }
  }

  private addNatureObject(x: number, y: number, texture: string, w: number, h: number, solid: boolean): void {
    this.add.image(x, y, texture).setDisplaySize(w, h).setDepth(y + 20);
    if (solid) this.addBlocker(x, y + h * 0.3, w * 0.48, h * 0.25);
  }

  private drawRuins(x: number, y: number): void {
    this.add.rectangle(x, y, 118, 92, 0x736a5d, 0.75).setStrokeStyle(4, 0x4f4941).setDepth(2);
    this.add.rectangle(x + 34, y - 30, 42, 16, 0x4f4941).setDepth(3);
    this.add.text(x, y + 58, 'Ruínas', { fontSize: '9px', color: '#bcb4a8', stroke: '#000', strokeThickness: 2 })
      .setOrigin(0.5).setDepth(4);
  }

  private addBlocker(x: number, y: number, w: number, h: number): void {
    const blocker = this.wallGroup.create(x, y, 'particle') as Phaser.Physics.Arcade.Image;
    blocker.setDisplaySize(Math.max(4, w), Math.max(4, h)).setVisible(false).refreshBody();
  }

  // ------------------------- ENTITIES -------------------------

  private createNPCs(): void {
    this.npcs.push(new NPC(this, GATE_X, CITY_END - TILE * 4, 'captain', 'Capitão da Exploração', 0x7d8893,
      ['A humanidade paga caro por cada passo além das muralhas.']));
    this.npcs.push(new NPC(this, WORLD_W - TILE * 11, TILE * 10, 'priest_npc', 'Sacerdote Wallen', 0xe3c25d,
      ['A Igreja acolhe os feridos. Ajoelhe-se e recupere suas forças.']));
    this.npcs.push(new NPC(this, TILE * 12, TILE * 19, 'blacksmith', 'Ferreira Hange', 0xc17b45,
      ['Gás, aço e coragem. Sem os três, ninguém volta de uma expedição.']));
    this.npcs.forEach(npc => npc.setDepth(npc.y + 100));
  }

  private spawnInitialTitans(): void {
    const positions: Array<[number, number, string]> = [
      [TILE * 17, CITY_END + TILE * 10, 'titan_normal'],
      [TILE * 38, CITY_END + TILE * 8, 'titan_normal'],
      [TILE * 46, CITY_END + TILE * 17, 'titan_normal'],
      [TILE * 22, CITY_END + TILE * 23, 'titan_normal'],
      [TILE * 41, CITY_END + TILE * 28, 'titan_normal'],
      [TILE * 13, CITY_END + TILE * 34, 'titan_aberrant'],
      [TILE * 46, CITY_END + TILE * 35, 'titan_aberrant'],
      [TILE * 19, FIELD_END + TILE * 11, 'titan_aberrant'],
      [TILE * 43, FIELD_END + TILE * 16, 'titan_normal']
    ];
    positions.forEach(([x, y, type]) => this.spawnTitan(x, y, type));
    this.ensureQuestBoss();
  }

  private spawnTitan(x: number, y: number, type: string): Titan {
    const titan = new Titan(this, x, y, MONSTERS[type]);
    titan.on('pointerdown', () => this.selectTitan(titan));
    this.titans.push(titan);
    this.titanGroup.add(titan);
    return titan;
  }

  private ensureQuestBoss(): void {
    const quest = this.quests.getQuest('forest_dungeon');
    if (!this.bossSpawned && quest && quest.status !== 'completed') {
      this.bossSpawned = true;
      const boss = this.spawnTitan(GATE_X, WORLD_H - TILE * 7, 'titan_colossal');
      this.cameras.main.flash(250, 150, 25, 20);
      this.hud?.addMessage('O Titã Colossal despertou na floresta.', '#ff5544');
      boss.setDepth(boss.y + 150);
    }
  }

  private setupPhysics(): void {
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.titanGroup, this.wallGroup);
    this.physics.add.collider(this.titanGroup, this.titanGroup);
    this.npcs.forEach(npc => this.physics.add.collider(this.player, npc));
  }

  // ------------------------- INPUT & DIALOG -------------------------

  private setupInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    const add = (key: number) => this.input.keyboard!.addKey(key);
    this.keys = {
      w: add(Phaser.Input.Keyboard.KeyCodes.W), a: add(Phaser.Input.Keyboard.KeyCodes.A),
      s: add(Phaser.Input.Keyboard.KeyCodes.S), d: add(Phaser.Input.Keyboard.KeyCodes.D),
      one: add(Phaser.Input.Keyboard.KeyCodes.ONE), two: add(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: add(Phaser.Input.Keyboard.KeyCodes.THREE), f: add(Phaser.Input.Keyboard.KeyCodes.F),
      r: add(Phaser.Input.Keyboard.KeyCodes.R), h: add(Phaser.Input.Keyboard.KeyCodes.H),
      space: add(Phaser.Input.Keyboard.KeyCodes.SPACE), escape: add(Phaser.Input.Keyboard.KeyCodes.ESC)
    };
  }

  private createDialogBox(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.dialogBox = this.add.container(W / 2, H - 18).setScrollFactor(0).setDepth(300).setVisible(false);
    const border = this.add.rectangle(0, 0, W - 28, 132, 0xb08a52).setOrigin(0.5, 1);
    const bg = this.add.rectangle(0, -3, W - 36, 124, 0x11151a, 0.98).setOrigin(0.5, 1);
    this.dialogText = this.add.text(-W / 2 + 36, -112, '', {
      fontSize: '12px', color: '#f4e6cf', lineSpacing: 5, wordWrap: { width: W - 74 }
    });
    this.dialogOptions = this.add.text(0, -25, '[1] Aceitar missão     [2] Agora não', {
      fontSize: '11px', color: '#72e08d', fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false);
    const hint = this.add.text(W / 2 - 36, -10, '[F] fechar', { fontSize: '9px', color: '#9a876c' }).setOrigin(1, 1);
    this.dialogBox.add([border, bg, this.dialogText, this.dialogOptions, hint]);
  }

  private openDialog(text: string, options = false, callback?: (accepted: boolean) => void): void {
    this.isDialogOpen = true;
    this.dialogBox.setVisible(true);
    this.dialogText.setText('');
    this.dialogOptions.setVisible(false);
    this.dialogCallback = callback;
    this.dialogTimer?.destroy();
    let index = 0;
    this.dialogTimer = this.time.addEvent({
      delay: 16,
      repeat: Math.max(0, text.length - 1),
      callback: () => {
        index++;
        this.dialogText.setText(text.substring(0, index));
        if (index >= text.length && options) this.dialogOptions.setVisible(true);
      }
    });
  }

  private closeDialog(): void {
    this.dialogTimer?.destroy();
    this.dialogBox.setVisible(false);
    this.dialogOptions.setVisible(false);
    this.dialogCallback = undefined;
    this.isDialogOpen = false;
  }

  private handleDialogInput(): void {
    if (this.dialogOptions.visible && this.dialogCallback) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.one)) {
        const callback = this.dialogCallback;
        this.closeDialog();
        callback(true);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.two)) {
        const callback = this.dialogCallback;
        this.closeDialog();
        callback(false);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.f)) this.closeDialog();
  }

  private checkNPCProximity(): void {
    this.nearNPC = null;
    this.npcs.forEach(npc => {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < 68;
      npc.setPlayerNearby(near);
      if (near) this.nearNPC = npc;
    });
  }

  private interactWithNPC(): void {
    if (!this.nearNPC) return;
    if (this.nearNPC.npcId === 'captain') this.handleCaptain();
    else if (this.nearNPC.npcId === 'blacksmith') this.handleBlacksmith();
    else {
      this.player.heal(this.player.stats.maxHp);
      this.openDialog('Sacerdote Wallen:\nA Igreja das Muralhas trata suas feridas. Que sua fé resista quando o aço falhar.\n\nSeu HP foi restaurado.');
      this.hud.addMessage('As orações restauraram seu HP.', '#9cffaa');
    }
  }

  private handleCaptain(): void {
    const chain = ['first_expedition', 'elite_titan', 'forest_dungeon'];
    for (const questId of chain) {
      if (this.quests.isQuestReadyToTurnIn(questId)) {
        const reward = this.quests.completeQuest(questId);
        if (reward) {
          const leveled = this.player.gainXp(reward.xp);
          this.player.gainGold(reward.gold);
          this.openDialog(`Capitão da Exploração:\n${QUESTS[questId].completionDialog}\n\nRecompensa: ${reward.xp} XP e ${reward.gold} moedas.`);
          this.hud.addMessage('Missão concluída. Patente atualizada.', '#ffd86b');
          if (leveled) this.hud.showLevelUp(this.player.stats.level);
          this.saveGame();
        }
        return;
      }
    }

    const available = chain.find((id, index) => !this.quests.getQuest(id) && (index === 0 || this.quests.isCompleted(chain[index - 1])));
    if (available) {
      const quest = QUESTS[available];
      this.openDialog(`Capitão da Exploração:\n${quest.startDialog}\n\nAceitar “${quest.name}”?`, true, accepted => {
        if (!accepted) return;
        this.quests.startQuest(available);
        this.hud.addMessage(`Nova missão: ${quest.name}`, '#ffe27a');
        this.ensureQuestBoss();
        this.saveGame();
      });
      return;
    }

    const active = chain.map(id => this.quests.getQuest(id)).find(quest => quest?.status === 'active');
    if (active) this.openDialog(`Capitão da Exploração:\nNão volte sem cumprir a missão.\n\n${this.quests.getObjectiveText(active.data.id)}`);
    else this.openDialog('Capitão da Exploração:\nVocê sobreviveu a tudo que havia além das muralhas. A humanidade lembrará seu nome.');
  }

  private handleBlacksmith(): void {
    const id = 'lost_supplies';
    if (this.quests.isQuestReadyToTurnIn(id)) {
      const reward = this.quests.completeQuest(id);
      if (reward) {
        const leveled = this.player.gainXp(reward.xp);
        this.player.gainGold(reward.gold);
        this.openDialog(`Ferreira Hange:\n${QUESTS[id].completionDialog}\n\nRecompensa: ${reward.xp} XP e ${reward.gold} moedas.`);
        if (leveled) this.hud.showLevelUp(this.player.stats.level);
        this.saveGame();
      }
    } else if (!this.quests.getQuest(id)) {
      this.openDialog(`Ferreira Hange:\n${QUESTS[id].startDialog}\n\nAceitar “${QUESTS[id].name}”?`, true, accepted => {
        if (accepted) {
          this.quests.startQuest(id);
          this.hud.addMessage(`Nova missão: ${QUESTS[id].name}`, '#ffe27a');
          this.saveGame();
        }
      });
    } else if (this.quests.isCompleted(id)) {
      this.player.resupply();
      this.openDialog('Ferreira Hange:\nEquipamento revisado. Gás, munição e lâminas estão em ordem.\n\nSe voltar vivo, eu reviso de novo.');
      this.hud.addMessage('Equipamento reabastecido.', '#bcecff');
    } else {
      this.openDialog(`Ferreira Hange:\nA rota ainda não está segura.\n\n${this.quests.getObjectiveText(id)}`);
    }
  }

  // ------------------------- COMBAT -------------------------

  private selectTitan(titan: Titan): void {
    if (titan.state === 'dead') return;
    this.selectedTitan = titan;
    this.hud.setTarget({ name: titan.monsterData.name, hp: titan.hp, maxHp: titan.maxHp });
  }

  private basicAttack(): void {
    if (this.basicAttackCooldown > 0 || this.player.isDead) return;
    const range = this.classId === 'gunner' ? 290 : this.player.isTransformed ? 125 : 82;
    let target = this.selectedTitan;
    if (!target || target.state === 'dead' || Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) > range) {
      target = this.findNearestTitan(range);
    }
    if (!target) return;
    if (!this.player.useBlades(5)) {
      this.hud.addMessage('Lâminas quebradas. Reabasteça com [R].', '#ff6655');
      return;
    }
    this.combat.playerAttacksTitan(this.player, target, false, 1);
    this.basicAttackCooldown = this.classId === 'gunner' ? 0.55 : 0.78;
  }

  private findNearestTitan(range: number): Titan | null {
    let nearest: Titan | null = null;
    let distance = range;
    this.titans.forEach(titan => {
      if (titan.state === 'dead') return;
      const current = Phaser.Math.Distance.Between(this.player.x, this.player.y, titan.x, titan.y);
      if (current < distance) {
        distance = current;
        nearest = titan;
      }
    });
    return nearest;
  }

  private onTitanDeath(titan: Titan): void {
    const reward = titan.monsterData.xpReward;
    const leveled = this.player.gainXp(reward);
    this.player.gainGold(titan.monsterData.boss ? 180 : titan.monsterData.id === 'titan_aberrant' ? 28 : 12);
    this.quests.onKill(titan.monsterData.id);
    this.hud.addMessage(`${titan.monsterData.name} derrotado • +${reward} XP`, '#ffd86b');
    if (leveled) this.hud.showLevelUp(this.player.stats.level);
    if (this.selectedTitan === titan) {
      this.selectedTitan = null;
      this.hud.setTarget(null);
    }
    if (titan.monsterData.boss) this.showBossVictory();
    this.saveGame();
  }

  private showBossVictory(): void {
    this.cameras.main.flash(900, 240, 225, 185);
    this.cameras.main.shake(900, 0.018);
    const text = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40,
      'O COLOSSAL CAIU\nRETORNE ÀS MURALHAS', {
        fontSize: '30px', color: '#ffe4a8', align: 'center', fontStyle: 'bold',
        stroke: '#30100b', strokeThickness: 7
      }).setOrigin(0.5).setScrollFactor(0).setDepth(500);
    this.tweens.add({ targets: text, alpha: 0, y: text.y - 45, delay: 2600, duration: 1600, onComplete: () => text.destroy() });
  }

  private updateTitans(delta: number): void {
    for (let i = this.titans.length - 1; i >= 0; i--) {
      const titan = this.titans[i];
      if (!titan.active) {
        this.titans.splice(i, 1);
        continue;
      }
      titan.update(delta, this.player.x, this.player.y);
      if (titan.canAttack()) {
        this.combat.titanAttacksPlayer(titan, this.player);
        if (this.player.isDead) this.handlePlayerDeath();
      }
    }
  }

  private handlePlayerDeath(): void {
    if (this.deathPenaltyApplied) return;
    this.deathPenaltyApplied = true;
    const loss = this.player.applyDeathPenalty();
    this.hud.showDeathScreen();
    this.hud.addMessage(`Penalidade: -${loss.xpLost} XP e -${loss.goldLost} moedas`, '#ff7668');
    this.cameras.main.shake(500, 0.025);
    this.saveGame();
  }

  private resupply(): void {
    const nearStation = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.supplyX, this.supplyY) < 105;
    const fieldBox = this.skills.checkSupplyBoxInteraction(this.player);
    if (!nearStation && !fieldBox) {
      this.hud.addMessage('Procure a estação no portão ou uma caixa de suprimentos.', '#aeb6c2');
      return;
    }
    this.player.resupply();
    this.hud.addMessage('Gás, munição e lâminas reabastecidos.', '#bcecff');
    this.saveGame();
  }

  // ------------------------- UI -------------------------

  private createZoneLabel(): void {
    this.zoneLabel = this.add.text(this.scale.width / 2, 12, 'DISTRITO DE SHIGANSHINA • DENTRO DAS MURALHAS', {
      fontSize: '12px', color: '#d5e6f4', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(180);
  }

  private createHelpOverlay(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.helpOverlay = this.add.container(W / 2, H / 2).setScrollFactor(0).setDepth(600).setVisible(false);
    const shade = this.add.rectangle(0, 0, W, H, 0x05070a, 0.92);
    const panel = this.add.rectangle(0, 0, 650, 430, 0x171c22).setStrokeStyle(3, 0x9b7951);
    const title = this.add.text(0, -178, 'MANUAL DO RECRUTA', {
      fontSize: '25px', color: '#f0d29b', fontStyle: 'bold'
    }).setOrigin(0.5);
    const body = this.add.text(-285, -130,
      'MOVIMENTO\nWASD ou setas — caminhar\n\nCOMBATE\nEspaço — ataque básico     1 / 2 / 3 — habilidades\nClique em um Titã — selecionar alvo\nO ponto vermelho marca a nuca: ataque por trás para causar dano crítico.\n\nEQUIPAMENTO\nA Tropa consome Gás ODM e durabilidade das Lâminas.\nR — reabastecer na estação do portão ou em uma caixa de Engenheiro.\n\nMUNDO\nF — conversar / interagir     H — fechar esta tela\nA morte custa 10% do XP atual e das moedas, como nos RPGs clássicos.\nComplete missões para subir de patente e liberar a expedição final.', {
        fontSize: '13px', color: '#d1d5da', lineSpacing: 6, wordWrap: { width: 570 }
      });
    this.helpOverlay.add([shade, panel, title, body]);
  }

  private toggleHelp(): void {
    this.isHelpOpen = !this.isHelpOpen;
    this.helpOverlay.setVisible(this.isHelpOpen);
    if (this.isHelpOpen) {
      this.player.body.setVelocity(0, 0);
      this.physics.world.pause();
    } else this.physics.world.resume();
  }

  private createMinimap(): void {
    const w = 116;
    const h = 146;
    const x = this.scale.width - w - 18;
    const y = 18;
    this.minimapData = { x, y, w, h };
    this.add.rectangle(x + w / 2, y + h / 2, w + 10, h + 10, 0x2b2d31)
      .setStrokeStyle(3, 0x8f806b).setScrollFactor(0).setDepth(185);
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xb7aa8d).setScrollFactor(0).setDepth(186);
    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(187);
    this.minimapPlayer = this.add.ellipse(x, y, 7, 7, 0x2877ff).setStrokeStyle(1, 0xffffff)
      .setScrollFactor(0).setDepth(188);
    this.drawMinimap();
  }

  private drawMinimap(): void {
    const { x, y, w, h } = this.minimapData;
    const sy = h / WORLD_H;
    const sx = w / WORLD_W;
    this.minimapGfx.clear();
    this.minimapGfx.fillStyle(0xb09a78, 1).fillRect(x, y, w, CITY_END * sy);
    this.minimapGfx.fillStyle(0x7ea477, 1).fillRect(x, y + CITY_END * sy, w, (FIELD_END - CITY_END) * sy);
    this.minimapGfx.fillStyle(0x3f6a49, 1).fillRect(x, y + FIELD_END * sy, w, (WORLD_H - FIELD_END) * sy);
    this.minimapGfx.fillStyle(0x4b3225, 1).fillRect(x + GATE_X * sx - 2, y + CITY_END * sy - 2, 4, 4);
    this.minimapGfx.fillStyle(0xc62828, 0.9);
    this.titans.forEach(titan => {
      if (titan.state !== 'dead') this.minimapGfx.fillCircle(x + titan.x * sx, y + titan.y * sy, titan.monsterData.boss ? 4 : 2);
    });
    this.minimapPlayer.setPosition(x + this.player.x * sx, y + this.player.y * sy);
  }

  private updateZone(): void {
    const zone: ZoneId = this.player.y < CITY_END ? 'city' : this.player.y < FIELD_END ? 'field' : 'forest';
    if (zone === this.currentZone) return;
    this.currentZone = zone;
    const labels: Record<ZoneId, [string, string]> = {
      city: ['DISTRITO DE SHIGANSHINA • DENTRO DAS MURALHAS', '#d5e6f4'],
      field: ['ROTA DE EXPEDIÇÃO • TERRITÓRIO DOS TITÃS', '#ffb37b'],
      forest: ['DUNGEON • FLORESTA DAS ÁRVORES GIGANTES', '#ffe08a']
    };
    this.zoneLabel.setText(labels[zone][0]).setColor(labels[zone][1]);
    this.cameras.main.flash(220, zone === 'forest' ? 92 : 35, zone === 'city' ? 80 : 35, 35);
  }

  // ------------------------- SAVE -------------------------

  private readSave(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) as SaveData : null;
    } catch {
      return null;
    }
  }

  private saveGame(): void {
    if (!this.player || !this.quests) return;
    const data: SaveData = {
      version: 1,
      classId: this.classId,
      player: this.player.toSnapshot(),
      quests: this.quests.toSnapshot()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  // ------------------------- UPDATE -------------------------

  update(_time: number, delta: number): void {
    if (!this.keys || !this.player) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.h)) {
      this.toggleHelp();
      return;
    }
    if (this.isHelpOpen) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      if (this.isDialogOpen) this.closeDialog();
      else {
        this.saveGame();
        this.scene.start('TitleScene');
      }
      return;
    }

    const dt = delta / 1000;
    if (this.player.isDead) {
      this.respawnTimer += dt;
      if (this.respawnTimer >= 3.4) {
        this.respawnTimer = 0;
        this.player.respawn(GATE_X, SPAWN_Y);
        this.deathPenaltyApplied = false;
        this.hud.addMessage('Você despertou na enfermaria da cidade.', '#b7cfff');
      }
      this.hud.update();
      return;
    }

    if (this.isDialogOpen) {
      this.player.body.setVelocity(0, 0);
      this.player.updateMovementAnimation(0, 0);
      this.handleDialogInput();
      this.hud.update();
      return;
    }

    this.handleMovement();
    this.basicAttackCooldown = Math.max(0, this.basicAttackCooldown - dt);
    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) this.basicAttack();
    if (Phaser.Input.Keyboard.JustDown(this.keys.one)) this.skills.useSkill(0, this.player, this.titans, this.selectedTitan);
    if (Phaser.Input.Keyboard.JustDown(this.keys.two)) this.skills.useSkill(1, this.player, this.titans, this.selectedTitan);
    if (Phaser.Input.Keyboard.JustDown(this.keys.three)) this.skills.useSkill(2, this.player, this.titans, this.selectedTitan);
    if (Phaser.Input.Keyboard.JustDown(this.keys.f)) this.interactWithNPC();
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) this.resupply();

    this.player.update(delta);
    this.player.setDepth(this.player.y + 120);
    this.updateTitans(delta);
    this.skills.update(delta, this.player);
    this.checkNPCProximity();
    this.updateZone();

    this.cannonTimer += dt;
    if (this.cannonTimer >= 2) {
      this.cannonTimer = 0;
      this.skills.fireCannons(this.titans, this.player);
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= 28) {
      this.spawnTimer = 0;
      this.spawnWave();
    }

    if (this.selectedTitan && this.selectedTitan.state !== 'dead') {
      this.hud.setTarget({ name: this.selectedTitan.monsterData.name, hp: this.selectedTitan.hp, maxHp: this.selectedTitan.maxHp });
    } else if (this.selectedTitan) {
      this.selectedTitan = null;
      this.hud.setTarget(null);
    }

    const previousTransform = (this as unknown as { wasTransformed?: boolean }).wasTransformed;
    if (previousTransform !== this.player.isTransformed) {
      (this as unknown as { wasTransformed?: boolean }).wasTransformed = this.player.isTransformed;
      this.hud.updateSkillBarForTransform(this.player.isTransformed);
    }
    this.drawMinimap();
    this.hud.update();
  }

  private handleMovement(): void {
    if (this.skills.isGrappling) return;
    let vx = 0;
    let vy = 0;
    if (this.keys.a.isDown || this.cursors.left.isDown) vx--;
    if (this.keys.d.isDown || this.cursors.right.isDown) vx++;
    if (this.keys.w.isDown || this.cursors.up.isDown) vy--;
    if (this.keys.s.isDown || this.cursors.down.isDown) vy++;
    if (vx && vy) {
      vx *= 0.707;
      vy *= 0.707;
    }
    const speed = this.player.stats.speed * (this.player.isTransformed ? 0.58 : 1);
    this.player.body.setVelocity(vx * speed, vy * speed);
    this.player.updateMovementAnimation(vx, vy);
    if (vx || vy) this.player.setFacing(Phaser.Math.RadToDeg(Math.atan2(vy, vx)));
  }

  private spawnWave(): void {
    const livingFieldTitans = this.titans.filter(titan => titan.active && titan.state !== 'dead' && !titan.monsterData.boss).length;
    if (livingFieldTitans >= 11) return;
    const y = Phaser.Math.Between(CITY_END + TILE * 7, FIELD_END - TILE * 4);
    const x = Phaser.Math.Between(TILE * 6, WORLD_W - TILE * 6);
    this.spawnTitan(x, y, Math.random() < 0.26 ? 'titan_aberrant' : 'titan_normal');
  }
}
