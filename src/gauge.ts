// Stress/mood gauge rendering

let barEl: HTMLElement;

export function initGauge(bar: HTMLElement) {
  barEl = bar;
}

export function updateGauge(value: number) {
  const pct = Math.max(0, Math.min(100, value));
  barEl.style.width = `${pct}%`;
  if (pct > 60) {
    barEl.style.backgroundColor = '#4caf50';
  } else if (pct > 30) {
    barEl.style.backgroundColor = '#ff9800';
  } else {
    barEl.style.backgroundColor = '#f44336';
  }
}
