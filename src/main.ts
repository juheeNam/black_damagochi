import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { initCharacter, renderFrame, setState, getState } from './character';
import { loadStats, persistStats, tickDecay, getStats } from './stats';
import { initBubble, showBubble } from './bubble';
import { initGauge, updateGauge } from './gauge';
import { initInteractions } from './interactions';
import { initSettings, setSize, setOpacity, hideWindow, toggleDoNotDisturb, isDoNotDisturb } from './settings';
import type { SizePreset, OpacityPreset } from './settings';

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

  await initSettings();

  // Settings panel toggle
  const settingsBtn   = document.getElementById('settings-btn')!;
  const settingsPanel = document.getElementById('settings-panel')!;

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !settingsPanel.classList.contains('hidden');
    settingsPanel.classList.toggle('hidden', open);
    settingsBtn.classList.toggle('open', !open);
  });

  document.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
    settingsBtn.classList.remove('open');
  });

  settingsPanel.addEventListener('click', (e) => e.stopPropagation());

  // Size buttons
  document.querySelectorAll<HTMLElement>('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => setSize(btn.dataset.size as SizePreset));
  });

  // Opacity buttons
  document.querySelectorAll<HTMLElement>('[data-opacity]').forEach(btn => {
    btn.addEventListener('click', () => setOpacity(btn.dataset.opacity as OpacityPreset));
  });

  // Hide / Do Not Disturb buttons
  document.getElementById('hide-btn')!.addEventListener('click', () => hideWindow());
  const dndBtn = document.getElementById('dnd-btn')!;
  dndBtn.addEventListener('click', async () => {
    await toggleDoNotDisturb();
    dndBtn.classList.toggle('active', isDoNotDisturb());
  });

  // Tray "방해 금지" event
  await listen('toggle-dnd', async () => {
    await toggleDoNotDisturb();
    dndBtn.classList.toggle('active', isDoNotDisturb());
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') invoke('quit');
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      toggleDoNotDisturb().then(() => {
        dndBtn.classList.toggle('active', isDoNotDisturb());
      });
    }
  });

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
