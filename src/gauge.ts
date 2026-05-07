function colorFor(pct: number): string {
  if (pct > 60) return '#4caf50';
  if (pct > 30) return '#ff9800';
  return '#f44336';
}

function updateBar(barEl: HTMLElement, value: number) {
  const pct = Math.max(0, Math.min(100, value));
  barEl.style.width = `${pct}%`;
  barEl.style.backgroundColor = colorFor(pct);
}

let moodBar: HTMLElement;
let expBar: HTMLElement | null = null;

export function initGauge(mood: HTMLElement) {
  moodBar = mood;
}

export function initExpGauge(bar: HTMLElement) {
  expBar = bar;
  bar.style.backgroundColor = '#4a9eff';
}

export function updateGauge(mood: number) {
  updateBar(moodBar, mood);
}

export function updateExpGauge(exp: number, maxExp: number) {
  if (!expBar) return;
  const pct = maxExp > 0 ? Math.min(100, (exp / maxExp) * 100) : 0;
  expBar.style.width = `${pct}%`;
}
