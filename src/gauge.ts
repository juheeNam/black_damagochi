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

export function initGauge(mood: HTMLElement) {
  moodBar = mood;
}

export function updateGauge(mood: number) {
  updateBar(moodBar, mood);
}
