import { load, Store } from '@tauri-apps/plugin-store';

export interface ActiveQuest {
  id: string;
  startedAt: number;
}

export interface PetStats {
  mood: number;
  lastSeen: number;
  exp: number;
  level: number;
  unlockedSkills: string[];
  quest: ActiveQuest | null;
}

const MOOD_DECAY_PER_MIN = 1;
const MAX_OFFLINE_MS = 30 * 60 * 1000;

const EXP_TABLE = [100, 200, 350, 550, 800, 1100, 1500, 2000, 2700];

export function getExpThreshold(level: number): number {
  return EXP_TABLE[Math.min(level - 1, EXP_TABLE.length - 1)] ?? Infinity;
}

let store: Store | null = null;
let stats: PetStats = {
  mood: 80,
  lastSeen: Date.now(),
  exp: 0,
  level: 1,
  unlockedSkills: [],
  quest: null,
};

type LevelUpCallback = (newLevel: number) => void;
let levelUpCallback: LevelUpCallback | null = null;

export function onLevelUp(cb: LevelUpCallback) {
  levelUpCallback = cb;
}

export async function loadStats(): Promise<PetStats> {
  store = await load('pet.json');
  const mood            = (await store.get<number>('mood'))            ?? 80;
  const lastSeen        = (await store.get<number>('lastSeen'))        ?? Date.now();
  const exp             = (await store.get<number>('exp'))             ?? 0;
  const level           = (await store.get<number>('level'))           ?? 1;
  const unlockedSkills  = (await store.get<string[]>('unlockedSkills')) ?? [];
  const quest           = (await store.get<ActiveQuest | null>('quest')) ?? null;

  const elapsed = Math.min(Date.now() - lastSeen, MAX_OFFLINE_MS);
  const mins = elapsed / 60000;

  stats = {
    mood:           Math.max(0, mood - mins * MOOD_DECAY_PER_MIN),
    lastSeen:       Date.now(),
    exp,
    level,
    unlockedSkills,
    quest,
  };
  await persistStats();
  return { ...stats };
}

export async function persistStats() {
  if (!store) return;
  await store.set('mood',           stats.mood);
  await store.set('lastSeen',       Date.now());
  await store.set('exp',            stats.exp);
  await store.set('level',          stats.level);
  await store.set('unlockedSkills', stats.unlockedSkills);
  await store.set('quest',          stats.quest);
}

export function getStats(): PetStats {
  return stats;
}

export function adjustMood(delta: number) {
  stats.mood = Math.max(0, Math.min(100, stats.mood + delta));
}

export function tickDecay(dtMs: number, speedMultiplier = 1.0) {
  const mins = dtMs / 60000;
  stats.mood = Math.max(0, stats.mood - mins * MOOD_DECAY_PER_MIN * speedMultiplier);
}

export function gainExp(amount: number) {
  if (stats.level >= 10) return;
  stats.exp += amount;

  let threshold = getExpThreshold(stats.level);
  while (stats.exp >= threshold && stats.level < 10) {
    stats.exp -= threshold;
    stats.level += 1;
    levelUpCallback?.(stats.level);
    threshold = getExpThreshold(stats.level);
  }
}

export function unlockSkill(id: string) {
  if (!stats.unlockedSkills.includes(id)) {
    stats.unlockedSkills.push(id);
  }
}

export function setQuest(quest: ActiveQuest) {
  stats.quest = quest;
}

export function clearQuest() {
  stats.quest = null;
}
