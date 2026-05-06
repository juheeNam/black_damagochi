import './style.css';
import { initCharacter, renderFrame, setState } from './character';
import { loadStats, persistStats, tickDecay, getStats } from './stats';
import { initBubble, showBubble } from './bubble';
import { initDrag } from './drag';
import { initGauge, updateGauge } from './gauge';
import { initInteractions } from './interactions';

async function main() {
  const canvas = document.getElementById('sprite') as HTMLCanvasElement;
  const bubbleEl = document.getElementById('bubble') as HTMLElement;
  const gaugeBar = document.getElementById('gauge-bar') as HTMLElement;

  initCharacter(canvas);
  initBubble(bubbleEl);
  initGauge(gaugeBar);
  initInteractions(canvas);
  initDrag(canvas);

  const stats = await loadStats();
  updateGauge(stats.mood);

  if (stats.mood > 70) {
    showBubble('(^▽^) ♪');
  } else if (stats.mood > 40) {
    setState('dizzy');
    showBubble('(・・;)');
    setTimeout(() => setState('idle'), 1500);
  } else {
    setState('down');
    showBubble('(；＿；)');
    setTimeout(() => setState('idle'), 2000);
  }

  let lastTime = performance.now();
  let saveAccum = 0;

  function loop(now: number) {
    const dt = now - lastTime;
    lastTime = now;
    saveAccum += dt;

    tickDecay(dt);
    updateGauge(getStats().mood);
    renderFrame();

    if (saveAccum >= 10_000) {
      saveAccum = 0;
      persistStats();
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
