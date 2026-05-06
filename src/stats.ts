import { load, Store } from '@tauri-apps/plugin-store';

export interface PetStats {
  mood: number;
  lastSeen: number;
}

const MOOD_DECAY_PER_MIN = 1;
const MAX_OFFLINE_MS = 30 * 60 * 1000;

let store: Store | null = null;
let stats: PetStats = { mood: 80, lastSeen: Date.now() };

export async function loadStats(): Promise<PetStats> {
  store = await load('pet.json');
  const mood     = (await store.get<number>('mood'))     ?? 80;
  const lastSeen = (await store.get<number>('lastSeen')) ?? Date.now();

  const elapsed = Math.min(Date.now() - lastSeen, MAX_OFFLINE_MS);
  const mins = elapsed / 60000;

  stats = {
    mood:    Math.max(0, mood - mins * MOOD_DECAY_PER_MIN),
    lastSeen: Date.now(),
  };
  await persistStats();
  return { ...stats };
}

export async function persistStats() {
  if (!store) return;
  await store.set('mood',     stats.mood);
  await store.set('lastSeen', Date.now());
}

export function getStats(): PetStats {
  return stats;
}

export function adjustMood(delta: number) {
  stats.mood = Math.max(0, Math.min(100, stats.mood + delta));
}

export function tickDecay(dtMs: number) {
  const mins = dtMs / 60000;
  stats.mood = Math.max(0, stats.mood - mins * MOOD_DECAY_PER_MIN);
}
