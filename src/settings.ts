import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { load } from '@tauri-apps/plugin-store';
import { setBubbleDnd } from './bubble';
import { setNotifEnabled, isNotifEnabled } from './notifications';
import { applySkin } from './skins';
import type { SkinId } from './skins';
import { initSound, setSoundVolume } from './sounds';
import { setHeadStyle, setBodyStyle, getHeadStyle, getBodyStyle } from './character';

export type SizePreset = 'small' | 'medium' | 'large';
export type OpacityPreset = 'low' | 'normal' | 'high';

const FIXED_W = 280;
const FIXED_H = 336;
const SPRITE_SIZE_MAP: Record<SizePreset, number> = { small:60, medium:80, large:110 };
const OPACITY_MAP: Record<OpacityPreset, number>  = { low:0.4, normal:1.0, high:1.0 };
const BUBBLE_FONT_MAP: Record<SizePreset, string>  = { small:'10px', medium:'12px', large:'14px' };

export const PANEL_WIDTH = 210;

let currentDnd = false;
let isMinimized = false;
let savedSizePreset: SizePreset = 'medium';
let panelOpen = false;
let store: Awaited<ReturnType<typeof load>> | null = null;

export async function initSettings() {
  store = await load('settings.json');
  const size    = (await store.get<SizePreset>('size'))       ?? 'medium';
  const opacity = (await store.get<OpacityPreset>('opacity')) ?? 'normal';
  const dnd     = (await store.get<boolean>('dnd'))           ?? false;
  const notif   = (await store.get<boolean>('notif'))         ?? true;
  const sound   = (await store.get<number>('sound'))          ?? 0.5;
  const skin    = (await store.get<SkinId>('skin'))           ?? 'default';
  const head    = (await store.get<string>('head_style'))     ?? 'sunglasses';
  const body    = (await store.get<string>('body_style'))     ?? 'no_tie';

  await applySize(size);
  applyOpacity(opacity);
  if (dnd) await applyDnd(true);
  setNotifEnabled(notif);
  initSound(sound);
  applySkin(skin);
  setHeadStyle(head);
  setBodyStyle(body);

  syncSizeButtons(size);
  syncOpacityButtons(opacity);
  if (dnd) document.getElementById('app')?.classList.add('dnd-active');
  document.getElementById('notif-btn')?.classList.toggle('active', notif);
  const soundRange = document.getElementById('sound-range') as HTMLInputElement | null;
  if (soundRange) soundRange.value = String(Math.round(sound * 100));
}

async function applySize(preset: SizePreset) {
  savedSizePreset = preset;
  const spriteSize = SPRITE_SIZE_MAP[preset];
  const totalW = panelOpen ? FIXED_W + PANEL_WIDTH : FIXED_W;
  await getCurrentWindow().setSize(new LogicalSize(totalW, FIXED_H));
  document.body.style.width  = `${totalW}px`;
  document.body.style.height = `${FIXED_H}px`;
  const app = document.getElementById('app');
  if (app) { app.style.width = `${totalW}px`; app.style.height = `${FIXED_H}px`; }
  const petArea = document.querySelector<HTMLElement>('.pet-area');
  if (petArea) { petArea.style.width = `${FIXED_W}px`; petArea.style.height = `${FIXED_H}px`; }
  const sprite = document.getElementById('sprite') as HTMLCanvasElement | null;
  if (sprite) { sprite.style.width = `${spriteSize}px`; sprite.style.height = `${spriteSize}px`; }
  const wrap = sprite?.parentElement as HTMLElement | null;
  if (wrap?.classList.contains('sprite-wrap')) { wrap.style.width = `${spriteSize}px`; wrap.style.height = `${spriteSize}px`; }
  const bubble = document.getElementById('bubble') as HTMLElement | null;
  if (bubble) bubble.style.fontSize = BUBBLE_FONT_MAP[preset];
}

function applyOpacity(preset: OpacityPreset) {
  const app = document.getElementById('app');
  if (app) app.style.opacity = String(OPACITY_MAP[preset]);
}

function applyDnd(enabled: boolean) {
  currentDnd = enabled;
  document.getElementById('app')?.classList.toggle('dnd-active', enabled);
  const sprite = document.getElementById('sprite');
  if (sprite) {
    sprite.classList.toggle('dnd-mode', enabled);
    if (!enabled) { sprite.style.animation = 'none'; void sprite.offsetHeight; sprite.style.animation = ''; }
  }
  setBubbleDnd(enabled);
}

function syncSizeButtons(active: SizePreset) {
  document.querySelectorAll<HTMLElement>('[data-size]').forEach(btn => btn.classList.toggle('active', btn.dataset.size === active));
}
function syncOpacityButtons(active: OpacityPreset) {
  document.querySelectorAll<HTMLElement>('[data-opacity]').forEach(btn => btn.classList.toggle('active', btn.dataset.opacity === active));
}

export async function setSize(preset: SizePreset) {
  await applySize(preset); syncSizeButtons(preset);
  if (store) await store.set('size', preset);
}
export async function setOpacity(preset: OpacityPreset) {
  applyOpacity(preset); syncOpacityButtons(preset);
  if (store) await store.set('opacity', preset);
}
export async function setDoNotDisturb(enabled: boolean) {
  applyDnd(enabled);
  if (store) await store.set('dnd', enabled);
}
export async function toggleDoNotDisturb() { await setDoNotDisturb(!currentDnd); }
export function isDoNotDisturb() { return currentDnd; }

export async function setSoundSetting(vol: number) {
  setSoundVolume(vol);
  if (store) await store.set('sound', vol);
}
export async function setSkin(id: SkinId) {
  applySkin(id);
  if (store) await store.set('skin', id);
}
export async function setNotif(val: boolean) {
  setNotifEnabled(val);
  document.getElementById('notif-btn')?.classList.toggle('active', val);
  if (store) await store.set('notif', val);
}
export function isNotifSetting(): boolean { return isNotifEnabled(); }

export async function setHead(id: string) {
  setHeadStyle(id);
  if (store) await store.set('head_style', id);
}
export async function setBody(id: string) {
  setBodyStyle(id);
  if (store) await store.set('body_style', id);
}
export { getHeadStyle, getBodyStyle };

export async function openSidePanel() {
  if (panelOpen) return;
  panelOpen = true;
  document.getElementById('side-panel')?.classList.add('open');
  await getCurrentWindow().setSize(new LogicalSize(FIXED_W + PANEL_WIDTH, FIXED_H));
  document.body.style.width = `${FIXED_W + PANEL_WIDTH}px`;
  const app = document.getElementById('app');
  if (app) app.style.width = `${FIXED_W + PANEL_WIDTH}px`;
}
export async function closeSidePanel() {
  if (!panelOpen) return;
  panelOpen = false;
  document.getElementById('side-panel')?.classList.remove('open');
  await getCurrentWindow().setSize(new LogicalSize(FIXED_W, FIXED_H));
  document.body.style.width = `${FIXED_W}px`;
  const app = document.getElementById('app');
  if (app) app.style.width = `${FIXED_W}px`;
}
export function isSidePanelOpen() { return panelOpen; }

export async function resetSettings() {
  if (!store) return;
  await store.clear();
}
export async function toggleMini() {
  const win = getCurrentWindow();
  if (isMinimized) {
    isMinimized = false;
    document.getElementById('app')?.classList.remove('minimized');
    await applySize(savedSizePreset);
  } else {
    isMinimized = true;
    document.getElementById('app')?.classList.add('minimized');
    await win.setSize(new LogicalSize(40, 40));
  }
}
