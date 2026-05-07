export interface SkillDef {
  id: string;
  name: string;
  unlockLevel: number;
  description: string;
}

export const SKILL_LIST: SkillDef[] = [
  { id: 'nerve',    name: '신경질적',    unlockLevel: 2,  description: '클릭 기분 감소 +1' },
  { id: 'obsess',   name: '집착형',      unlockLevel: 4,  description: '기분 자동 감소 -15%' },
  { id: 'verbal',   name: '언어폭력',    unlockLevel: 6,  description: '특수 반응 메시지 5종 해금' },
  { id: 'pressure', name: '고압적 태도', unlockLevel: 8,  description: '드래그 경험치 +2' },
  { id: 'dominate', name: '완전 지배',   unlockLevel: 10, description: '특수 복종 리액션 해금' },
];

const unlocked = new Set<string>();

export function syncUnlocked(ids: string[]) {
  unlocked.clear();
  ids.forEach(id => unlocked.add(id));
}

export function isUnlocked(id: string): boolean {
  return unlocked.has(id);
}

export function checkNewUnlocks(level: number): SkillDef[] {
  return SKILL_LIST.filter(s => s.unlockLevel === level);
}
