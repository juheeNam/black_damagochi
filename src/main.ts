import './style.css';
import { initCharacter, renderFrame, setState } from './character';
import { loadStats, persistStats, tickDecay, getStats } from './stats';
import { initBubble, showBubble } from './bubble';
import { initDrag } from './drag';
import { initGauge, updateGauge } from './gauge';
import { initInteractions } from './interactions';

async function main() {
  const canvas    = document.getElementById('sprite')     as HTMLCanvasElement;
  const bubbleEl  = document.getElementById('bubble')     as HTMLElement;
  const moodBar   = document.getElementById('mood-bar')   as HTMLElement;
  const hungerBar = document.getElementById('hunger-bar') as HTMLElement;

  initCharacter(canvas);
  initBubble(bubbleEl);
  initGauge(moodBar, hungerBar);
  initInteractions(canvas);
  initDrag(canvas);

  const stats = await loadStats();
  updateGauge(stats.mood, stats.hunger);

  // 시작 인사 (mood와 hunger 중 나쁜 쪽 기준)
  if (stats.hunger < 30) {
    setState('down');
    showBubble('배고파... (；＿；)');
    setTimeout(() => setState('idle'), 2000);
  } else if (stats.mood > 70) {
    setState('idle');
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
  let hungryWarned = false;

  function loop(now: number) {
    const dt = now - lastTime;
    lastTime = now;
    saveAccum += dt;

    tickDecay(dt);

    const { mood, hunger } = getStats();
    updateGauge(mood, hunger);
    renderFrame();

    // 허기 경고 (한 번만)
    if (hunger < 20 && !hungryWarned) {
      hungryWarned = true;
      showBubble('배고파... (；＿；)', 3000);
      setState('down');
      setTimeout(() => setState('idle'), 1500);
    } else if (hunger >= 20) {
      hungryWarned = false;
    }

    if (saveAccum >= 10_000) {
      saveAccum = 0;
      persistStats();
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
