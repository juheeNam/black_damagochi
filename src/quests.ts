import { ActiveQuest, getStats, setQuest, clearQuest, gainExp } from './stats';

export interface QuestDef {
  id: string;
  name: string;
  durationMs: number;
  exp: number;
}

export const QUEST_LIST: QuestDef[] = [
  { id: 'coffee',   name: '☕ 커피 심부름', durationMs:  5 * 60_000, exp: 15 },
  { id: 'lunch',    name: '🍱 점심 심부름', durationMs:  8 * 60_000, exp: 22 },
  { id: 'report',   name: '📄 보고서 작성', durationMs: 10 * 60_000, exp: 30 },
  { id: 'meeting',  name: '📊 회의 준비',   durationMs: 15 * 60_000, exp: 45 },
  { id: 'overtime', name: '🌙 야근',         durationMs: 30 * 60_000, exp: 80 },
];

export function getQuestDef(id: string): QuestDef | undefined {
  return QUEST_LIST.find(q => q.id === id);
}

export function getProgress(quest: ActiveQuest): number {
  const def = getQuestDef(quest.id);
  if (!def) return 0;
  const elapsed = Date.now() - quest.startedAt;
  return Math.min(1, elapsed / def.durationMs);
}

export function isComplete(quest: ActiveQuest): boolean {
  return getProgress(quest) >= 1;
}

export function startQuest(id: string) {
  setQuest({ id, startedAt: Date.now() });
}

export function collectQuest(): number {
  const quest = getStats().quest;
  if (!quest || !isComplete(quest)) return 0;
  const def = getQuestDef(quest.id);
  const exp = def?.exp ?? 0;
  clearQuest();
  gainExp(exp);
  return exp;
}

export function cancelQuest() {
  clearQuest();
}

export function formatRemaining(quest: ActiveQuest): string {
  const def = getQuestDef(quest.id);
  if (!def) return '';
  const remainMs = Math.max(0, def.durationMs - (Date.now() - quest.startedAt));
  const mins = Math.floor(remainMs / 60_000);
  const secs = Math.floor((remainMs % 60_000) / 1000);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
