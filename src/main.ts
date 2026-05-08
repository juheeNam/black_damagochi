import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { initCharacter, renderFrame, setState, getState } from './character';
import { loadStats, persistStats, tickDecay, getStats, onLevelUp, unlockSkill, resetAllData as resetStatsData } from './stats';
import { initBubble, showBubble } from './bubble';
import { initGauge, updateGauge, initExpGauge, updateExpGauge } from './gauge';
import { initInteractions } from './interactions';
import {
  initSettings, setSize, setOpacity, toggleMini, toggleDoNotDisturb, isDoNotDisturb,
  setNotif, isNotifSetting, resetSettings, setSoundSetting, setSkin,
  setHead, setBody, getHeadStyle, getBodyStyle,
  openSidePanel, closeSidePanel,
} from './settings';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { SizePreset, OpacityPreset } from './settings';
import { SKILL_LIST, syncUnlocked, checkNewUnlocks, isUnlocked as skillUnlocked } from './skills';
import { QUEST_LIST, startQuest, collectQuest, cancelQuest, getProgress, isComplete, formatRemaining, getQuestDef } from './quests';
import { selectItem, cancelSelection } from './throw';
import { notify } from './notifications';
import { getLastInteractionTime } from './interactions';
import { playLevelUp } from './sounds';
import { SKIN_LIST } from './skins';
import { HEAD_STYLES, BODY_STYLES } from './accessories';

const IDLE_CHATTER = [
  '퇴근하고 싶다...',
  '월급날 언제더라',
  '점심 뭐 먹지',
  '커피 한 잔 해야겠어',
  '야근이면 어쩌지',
  '회의가 또야?',
  '보고서 언제 쓰지',
  '연차 쓰고 싶다',
  '이게 내 일 맞나',
  '오늘도 화이팅... 일단',
  '(눈치보는 중)',
  '엑셀 또 튕겼어',
  '에어컨 왜 이렇게 추워',
  '점심시간이 제일 좋아',
  '주말아 기다려라',
  '칼퇴 가능할까...',
  '왜 자꾸 나한테만',
  '이것도 내 업무임?',
  '(조용히 딴짓 중)',
  '올해도 승진은 글렀나',
  '(모니터 뒤에 숨는 중)',
  '커피값만 해도 얼마야',
  '차장님이 또 부르셨대',
  '퇴사각인데',
  '(사직서 초안 작성 중)',
  '야 인생이 뭔가',
  '다음 생엔 건물주로',
];

function resolveIdle(mood: number) {
  setState(mood <= 30 ? 'angry' : 'idle');
}

function buildQuestList(onStart: () => void) {
  const listEl = document.getElementById('quest-list')!;
  listEl.innerHTML = '<div class="popup-title">📋 심부름</div>';
  QUEST_LIST.forEach(q => {
    const mins = q.durationMs / 60_000;
    const item = document.createElement('div');
    item.className = 'quest-item';
    item.innerHTML = `
      <span class="quest-item-name">${q.name}</span>
      <span class="quest-item-meta">${mins}분 / +${q.exp}exp</span>
    `;
    item.addEventListener('click', () => {
      startQuest(q.id);
      const startMsgs = ['또 심부름이야...', '(한숨)', '알겠어요 다녀올게요', '이것도 내 일임?'];
      showBubble(startMsgs[Math.floor(Math.random() * startMsgs.length)], 3000);
      onStart();
    });
    listEl.appendChild(item);
  });
}

function updateQuestPanel() {
  const { quest } = getStats();
  const listEl     = document.getElementById('quest-list')!;
  const progressEl = document.getElementById('quest-progress')!;
  const nameEl     = document.getElementById('quest-name')!;
  const barEl      = document.getElementById('quest-progress-bar') as HTMLElement;
  const timeEl     = document.getElementById('quest-time')!;
  const collectBtn = document.getElementById('quest-collect-btn')!;

  if (quest) {
    listEl.classList.add('hidden');
    progressEl.classList.remove('hidden');
    const def = getQuestDef(quest.id);
    nameEl.textContent = def?.name ?? '';
    barEl.style.width = `${getProgress(quest) * 100}%`;
    timeEl.textContent = isComplete(quest) ? '완료!' : formatRemaining(quest);
    collectBtn.classList.toggle('hidden', !isComplete(quest));
  } else {
    listEl.classList.remove('hidden');
    progressEl.classList.add('hidden');
  }
}

function buildSkillPanel() {
  const listEl = document.getElementById('skill-list')!;
  const { unlockedSkills, level } = getStats();
  listEl.innerHTML = '';
  SKILL_LIST.forEach(skill => {
    const unlocked = unlockedSkills.includes(skill.id);
    const item = document.createElement('div');
    item.className = `skill-item${unlocked ? '' : ' locked'}`;
    item.innerHTML = `
      <div class="skill-item-header">
        <span class="skill-item-name">${unlocked ? '✓ ' : '🔒 '}${skill.name}</span>
        <span class="skill-item-level">Lv.${skill.unlockLevel}</span>
      </div>
      <div class="skill-item-desc">${skill.description}${!unlocked ? ` (Lv.${skill.unlockLevel} 해금)` : ''}</div>
    `;
    listEl.appendChild(item);
  });
  void level;
}

async function main() {
  const canvas   = document.getElementById('sprite')   as HTMLCanvasElement;
  const bubbleEl = document.getElementById('bubble')   as HTMLElement;
  const moodBar  = document.getElementById('mood-bar') as HTMLElement;
  const expBarEl = document.getElementById('exp-bar')  as HTMLElement;
  const levelEl  = document.getElementById('level-display')!;

  initCharacter(canvas);
  initBubble(bubbleEl);
  initGauge(moodBar);
  initExpGauge(expBarEl);
  initInteractions(canvas);

  await initSettings();
  updateQuestStatus();

  onLevelUp((newLevel) => {
    playLevelUp();
    showBubble(`★ 레벨 업! Lv.${newLevel}`, 3000);
    notify('★ 레벨 업!', `Lv.${newLevel} 달성`);
    setState('hit');
    setTimeout(() => resolveIdle(getStats().mood), 1500);
    const newSkills = checkNewUnlocks(newLevel);
    newSkills.forEach(skill => {
      unlockSkill(skill.id);
      syncUnlocked(getStats().unlockedSkills);
      setTimeout(() => showBubble(`⚡ 스킬 해금: ${skill.name}`, 2500), 1800);
    });
    buildSkillPanel();
  });

  function updateQuestStatus() {
    const statusEl = document.getElementById('quest-status');
    if (!statusEl) return;
    const { quest } = getStats();
    if (!quest) { statusEl.textContent = ''; statusEl.classList.add('hidden'); statusEl.classList.remove('done'); return; }
    const def = getQuestDef(quest.id);
    if (isComplete(quest)) {
      statusEl.textContent = `-${def?.name ?? ''} 심부름 완료!-`;
      statusEl.classList.remove('hidden'); statusEl.classList.add('done');
    } else {
      statusEl.textContent = `-${def?.name ?? ''} 심부름 중-`;
      statusEl.classList.remove('hidden', 'done');
    }
  }

  const settingsBtn   = document.getElementById('settings-btn')!;
  const settingsPanel = document.getElementById('settings-panel')!;
  const questPanel    = document.getElementById('quest-panel')!;
  const skillPanel    = document.getElementById('skill-panel')!;
  const coordPanel    = document.getElementById('coord-panel')!;
  const resetConfirm  = document.getElementById('reset-confirm')!;

  function showPanel(el: HTMLElement) {
    [settingsPanel, questPanel, skillPanel, coordPanel, resetConfirm].forEach(p => p.classList.add('hidden'));
    el.classList.remove('hidden');
    settingsBtn.classList.toggle('open', el === settingsPanel);
    openSidePanel();
  }

  async function closeAllPanels() {
    [settingsPanel, questPanel, skillPanel, coordPanel, resetConfirm].forEach(p => p.classList.add('hidden'));
    settingsBtn.classList.remove('open');
    await closeSidePanel();
  }

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!settingsPanel.classList.contains('hidden')) { closeAllPanels(); return; }
    showPanel(settingsPanel);
  });

  document.addEventListener('click', () => closeAllPanels());
  [settingsPanel, questPanel, skillPanel, coordPanel, resetConfirm].forEach(el =>
    el.addEventListener('click', e => e.stopPropagation()));
  document.getElementById('side-panel')!.addEventListener('click', e => e.stopPropagation());

  document.querySelectorAll<HTMLElement>('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => setSize(btn.dataset.size as SizePreset));
  });
  document.querySelectorAll<HTMLElement>('[data-opacity]').forEach(btn => {
    btn.addEventListener('click', () => setOpacity(btn.dataset.opacity as OpacityPreset));
  });

  document.getElementById('hide-btn')!.addEventListener('click', () => toggleMini());

  const miniRestoreBtn = document.getElementById('mini-restore-btn')!;
  let miniDragging = false;
  miniRestoreBtn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    miniDragging = false;
    const startX = e.clientX, startY = e.clientY;
    const onMove = (me: MouseEvent) => {
      if (!miniDragging && Math.hypot(me.clientX - startX, me.clientY - startY) > 4) {
        miniDragging = true;
        getCurrentWindow().startDragging();
        document.removeEventListener('mousemove', onMove);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true });
  });
  miniRestoreBtn.addEventListener('click', () => { if (!miniDragging) toggleMini(); miniDragging = false; });

  const dndBtn = document.getElementById('dnd-btn')!;
  dndBtn.addEventListener('click', async () => {
    await toggleDoNotDisturb();
    dndBtn.classList.toggle('active', isDoNotDisturb());
  });

  await listen('toggle-dnd', async () => {
    await toggleDoNotDisturb();
    dndBtn.classList.toggle('active', isDoNotDisturb());
  });

  document.getElementById('settings-close-btn')!.addEventListener('click', () => closeAllPanels());
  document.getElementById('notif-btn')!.addEventListener('click', async () => { await setNotif(!isNotifSetting()); });

  document.getElementById('reset-btn')!.addEventListener('click', (e) => {
    e.stopPropagation(); showPanel(resetConfirm);
  });
  document.getElementById('reset-ok-btn')!.addEventListener('click', async () => {
    await resetStatsData(); await resetSettings(); window.location.reload();
  });
  document.getElementById('reset-cancel-btn')!.addEventListener('click', () => showPanel(settingsPanel));

  // 심부름 패널
  buildQuestList(() => { closeAllPanels(); updateQuestStatus(); });
  document.getElementById('quest-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!questPanel.classList.contains('hidden')) { showPanel(settingsPanel); return; }
    updateQuestPanel(); showPanel(questPanel);
  });
  document.getElementById('quest-collect-btn')!.addEventListener('click', () => {
    const exp = collectQuest();
    if (exp > 0) { const r = ['고생했다 나 자신', '이게 다 내 월급이야', `+${exp} EXP... 쓸쓸하네`]; showBubble(r[Math.floor(Math.random() * r.length)], 2000); }
    closeAllPanels(); updateQuestStatus();
  });
  document.getElementById('quest-cancel-btn')!.addEventListener('click', () => {
    cancelQuest(); updateQuestPanel(); updateQuestStatus();
  });
  document.getElementById('quest-back-btn')!.addEventListener('click', (e) => { e.stopPropagation(); showPanel(settingsPanel); });

  // 스킬 패널
  document.getElementById('skill-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!skillPanel.classList.contains('hidden')) { showPanel(settingsPanel); return; }
    buildSkillPanel(); showPanel(skillPanel);
  });
  document.getElementById('skill-back-btn')!.addEventListener('click', (e) => { e.stopPropagation(); showPanel(settingsPanel); });

  // 코디 패널
  function buildCoordPanel() {
    // 스킨
    const skinListEl = document.getElementById('skin-list')!;
    skinListEl.innerHTML = '';
    SKIN_LIST.forEach(skin => {
      const item = document.createElement('div');
      item.className = 'skin-item';
      item.dataset.skinId = skin.id;
      item.textContent = skin.name;
      item.addEventListener('click', async () => {
        await setSkin(skin.id as Parameters<typeof setSkin>[0]);
        document.querySelectorAll<HTMLElement>('.skin-item').forEach(el => {
          el.classList.toggle('active', el.dataset.skinId === skin.id);
        });
      });
      skinListEl.appendChild(item);
    });

    // 얼굴 스타일
    const headListEl = document.getElementById('head-style-list')!;
    headListEl.innerHTML = '';
    HEAD_STYLES.forEach(hs => {
      const btn = document.createElement('button');
      btn.className = 'style-btn';
      btn.dataset.headId = hs.id;
      btn.textContent = hs.emoji;
      btn.title = hs.name;
      btn.addEventListener('click', async () => {
        await setHead(hs.id);
        syncStyleButtons();
      });
      headListEl.appendChild(btn);
    });

    // 바디 스타일
    const bodyListEl = document.getElementById('body-style-list')!;
    bodyListEl.innerHTML = '';
    BODY_STYLES.forEach(bs => {
      const btn = document.createElement('button');
      btn.className = 'style-btn';
      btn.dataset.bodyId = bs.id;
      btn.textContent = bs.emoji;
      btn.title = bs.name;
      btn.addEventListener('click', async () => {
        await setBody(bs.id);
        syncStyleButtons();
      });
      bodyListEl.appendChild(btn);
    });

    syncStyleButtons();
  }

  function syncStyleButtons() {
    const head = getHeadStyle();
    const body = getBodyStyle();
    document.querySelectorAll<HTMLElement>('[data-head-id]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.headId === head);
    });
    document.querySelectorAll<HTMLElement>('[data-body-id]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bodyId === body);
    });
  }

  document.getElementById('coord-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!coordPanel.classList.contains('hidden')) { showPanel(settingsPanel); return; }
    buildCoordPanel(); showPanel(coordPanel);
  });
  document.getElementById('coord-back-btn')!.addEventListener('click', (e) => { e.stopPropagation(); showPanel(settingsPanel); });

  // 볼륨
  document.getElementById('sound-range')!.addEventListener('input', (e) => {
    const val = Number((e.target as HTMLInputElement).value) / 100;
    setSoundSetting(val);
  });

  // 단축키
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { cancelSelection(); invoke('quit'); }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      toggleDoNotDisturb().then(() => dndBtn.classList.toggle('active', isDoNotDisturb()));
    }
    if (e.key === '1') selectItem('paper');
    if (e.key === '2') selectItem('pen');
    if (e.key === '3') selectItem('slipper');
  });

  const stats = await loadStats();
  syncUnlocked(stats.unlockedSkills);
  updateGauge(stats.mood);
  updateExpGauge(stats.exp, getExpThreshold(stats.level));
  levelEl.textContent = `Lv.${stats.level}`;

  if (stats.mood > 70) {
    const msgs = ['오늘은 기분 좋은데?', '(기지개 켜는 중)', '이 정도면 할만해', '♪～'];
    setState('idle'); showBubble(msgs[Math.floor(Math.random() * msgs.length)]);
  } else if (stats.mood > 40) {
    const msgs = ['야근 3일째...', '(정신줄 놓는 중)', '머리가 핑핑', '(멍...)'];
    setState('dizzy'); showBubble(msgs[Math.floor(Math.random() * msgs.length)]);
    setTimeout(() => resolveIdle(stats.mood), 1500);
  } else {
    const msgs = ['퇴사각이다 진짜', '힘들다 진짜...', '(쓰러지는 중)', '한계임'];
    setState('down'); showBubble(msgs[Math.floor(Math.random() * msgs.length)]);
    setTimeout(() => resolveIdle(stats.mood), 2000);
  }

  const NEGLECT_MS = 10 * 60_000;
  let lastTime = performance.now();
  let saveAccum = 0, chatterAccum = 0, questAccum = 0;
  let moodWarned = false, neglectNotified = false, questCompleteNotified = false;
  let nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);

  function loop(now: number) {
    const dt = now - lastTime; lastTime = now;
    saveAccum += dt; chatterAccum += dt; questAccum += dt;

    const decayMultiplier = skillUnlocked('obsess') ? 0.85 : 1.0;
    tickDecay(dt, decayMultiplier);

    const { mood, level, exp, quest } = getStats();
    updateGauge(mood);
    updateExpGauge(exp, getExpThreshold(level));
    levelEl.textContent = `Lv.${level}`;
    renderFrame();

    const state = getState();
    if (mood <= 0) { setState('down'); }
    else if (quest && mood > 30 && (state === 'idle' || state === 'angry')) { setState('quest'); }
    else if (!quest && state === 'quest') { setState(mood <= 30 ? 'angry' : 'idle'); }
    else if (mood <= 30 && (state === 'idle' || state === 'quest')) { setState('angry'); }
    else if (mood > 30 && state === 'angry') { setState('idle'); }
    else if (mood > 0 && state === 'down') { setState(quest && mood > 30 ? 'quest' : mood <= 30 ? 'angry' : 'idle'); }

    if (mood < 20 && !moodWarned) {
      const neglectMsgs = ['나 좀 봐줘...', '이러다 번아웃 온다', '(방치된 기분)', '외롭다 진짜'];
      moodWarned = true; showBubble(neglectMsgs[Math.floor(Math.random() * neglectMsgs.length)], 3000);
      setState('dizzy'); setTimeout(() => resolveIdle(getStats().mood), 1500);
    } else if (mood >= 20) { moodWarned = false; }

    const neglected = Date.now() - getLastInteractionTime() >= NEGLECT_MS;
    if (neglected && !neglectNotified) { neglectNotified = true; notify('(；ω；) 상사가 많이 외로워합니다...'); }
    else if (!neglected) { neglectNotified = false; }

    if (chatterAccum >= nextChatterMs) {
      chatterAccum = 0; nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);
      if (mood > 40) showBubble(IDLE_CHATTER[Math.floor(Math.random() * IDLE_CHATTER.length)]);
    }

    if (questAccum >= 1000) {
      questAccum = 0;
      updateQuestStatus();
      if (quest && isComplete(quest)) {
        if (!questCompleteNotified) {
          questCompleteNotified = true;
          const def = getQuestDef(quest.id);
          if (def) { showBubble(`${def.name} 완료!`, 3000); notify(`📋 ${def.name} 완료!`, `+${def.exp} EXP 수령 대기 중`); }
          const questBtnEl = document.getElementById('quest-btn');
          if (questBtnEl) questBtnEl.textContent = '📋 심부름 ●';
          updateQuestStatus();
        }
      } else if (!quest) {
        questCompleteNotified = false;
        const questBtnEl = document.getElementById('quest-btn');
        if (questBtnEl) questBtnEl.textContent = '📋 심부름';
      }
      if (!questPanel.classList.contains('hidden')) updateQuestPanel();
    }

    if (saveAccum >= 10_000) { saveAccum = 0; persistStats(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function getExpThreshold(level: number): number {
  const EXP_TABLE = [100, 200, 350, 550, 800, 1100, 1500, 2000, 2700];
  return EXP_TABLE[Math.min(level - 1, EXP_TABLE.length - 1)] ?? Infinity;
}
function randomBetween(min: number, max: number): number { return Math.random() * (max - min) + min; }

main();
