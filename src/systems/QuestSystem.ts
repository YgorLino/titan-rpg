// src/systems/QuestSystem.ts
import { QUESTS, QuestData, QuestObjective } from '../data/quests';

export type QuestStatus = 'inactive' | 'active' | 'objectives_done' | 'completed';

export interface ActiveQuest {
  data: QuestData;
  status: QuestStatus;
  objectives: QuestObjective[];
}

export class QuestSystem {
  private quests: Map<string, ActiveQuest> = new Map();

  startQuest(questId: string): boolean {
    const questData = QUESTS[questId];
    if (!questData) return false;
    if (this.quests.has(questId)) return false;

    this.quests.set(questId, {
      data: questData,
      status: 'active',
      objectives: questData.objectives.map(obj => ({ ...obj, current: 0 }))
    });
    return true;
  }

  getQuest(questId: string): ActiveQuest | undefined {
    return this.quests.get(questId);
  }

  getActiveQuests(): ActiveQuest[] {
    return Array.from(this.quests.values()).filter(q => q.status === 'active' || q.status === 'objectives_done');
  }

  onKill(targetType: string): void {
    for (const quest of this.quests.values()) {
      if (quest.status !== 'active') continue;
      for (const obj of quest.objectives) {
        if (obj.type === 'kill' && targetType.startsWith(obj.target)) {
          obj.current = Math.min(obj.count, obj.current + 1);
        }
      }
      this.checkObjectivesComplete(quest);
    }
  }

  private checkObjectivesComplete(quest: ActiveQuest): void {
    const allDone = quest.objectives.every(obj => obj.current >= obj.count);
    if (allDone && quest.status === 'active') {
      quest.status = 'objectives_done';
    }
  }

  completeQuest(questId: string): { xp: number; gold: number } | null {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'objectives_done') return null;
    quest.status = 'completed';
    return {
      xp: quest.data.xpReward,
      gold: quest.data.goldReward
    };
  }

  isCompleted(questId: string): boolean {
    return this.quests.get(questId)?.status === 'completed';
  }

  getObjectiveText(questId: string): string {
    const quest = this.quests.get(questId);
    if (!quest) return '';
    return quest.objectives.map(obj => {
      const done = obj.current >= obj.count;
      const prefix = done ? '✓ ' : '';
      return `${prefix}${obj.target}s eliminados: ${obj.current}/${obj.count}`;
    }).join('\n');
  }

  isQuestReadyToTurnIn(questId: string): boolean {
    const quest = this.quests.get(questId);
    return quest?.status === 'objectives_done';
  }
}
