import './style.css';
import { initCharacter, renderFrame, setState, getState } from './character';
import { loadStats, persistStats, tickDecay, getStats } from './stats';
import { initBubble, showBubble } from './bubble';
import { initGauge, updateGauge } from './gauge';
import { initInteractions } from './interactions';

const IDLE_CHATTER = [
  '(^▽^) ♪', '(＿▽＿)', '...', '(*´ҳ`*)', '(◕ω◕)',
  'zzz...', '(・∀・)', '♪～', '(ˊҳˋ)',
];

function resolveIdle(mood: number) {
  setState(mood <= 30 ? 'angry' : 'idle');
}

async function main() {
  const canvas   = document.getElementById('sprite')   as HTMLCanvasElement;
  const bubbleEl = document.getElementById('bubble')   as HTMLElement;
  const moodBar  = document.getElementById('mood-bar') as HTMLElement;

  initCharacter(canvas);
  initBubble(bubbleEl);
  initGauge(moodBar);
  initInteractions(canvas);

  const stats = await loadStats();
  updateGauge(stats.mood);

  if (stats.mood > 70) {
    setState('idle');
    showBubble('(^▽^) ♪');
  } else if (stats.mood > 40) {
    setState('dizzy');
    showBubble('(・・;)');
    setTimeout(() => resolveIdle(stats.mood), 1500);
  } else {
    setState('down');
    showBubble('(；＿；)');
    setTimeout(() => resolveIdle(stats.mood), 2000);
  }

  let lastTime     = performance.now();
  let saveAccum    = 0;
  let chatterAccum = 0;
  let moodWarned   = false;

  let nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);

  function loop(now: number) {
    const dt = now - lastTime;
    lastTime = now;
    saveAccum    += dt;
    chatterAccum += dt;

    tickDecay(dt);

    const { mood } = getStats();
    updateGauge(mood);
    renderFrame();

    // idle ↔ angry 자동 전환 (기분 30 이하면 화남)
    const state = getState();
    if (mood <= 30 && state === 'idle')  setState('angry');
    if (mood >  30 && state === 'angry') setState('idle');

    // 기분 저하 경고
    if (mood < 20 && !moodWarned) {
      moodWarned = true;
      showBubble('(；ω；) 외로워...', 3000);
      setState('dizzy');
      setTimeout(() => resolveIdle(getStats().mood), 1500);
    } else if (mood >= 20) {
      moodWarned = false;
    }

    // 주기적 혼잣말 (기분 좋을 때만)
    if (chatterAccum >= nextChatterMs) {
      chatterAccum = 0;
      nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);
      if (mood > 40) {
        showBubble(IDLE_CHATTER[Math.floor(Math.random() * IDLE_CHATTER.length)]);
      }
    }

    // 10초마다 자동 저장
    if (saveAccum >= 10_000) {
      saveAccum = 0;
      persistStats();
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

main();
