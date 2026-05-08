import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { load } from '@tauri-apps/plugin-store';
import { setBubbleDnd } from './bubble';
import { setNotifEnabled, isNotifEnabled } from './notifications';
import { applySkin } from './skins';
import type { SkinId } from './skins';
import { initSound, setSoundVolume } from './sounds';
import type { AccessorySlot, EquippedAccessories } from './accessories';
import { setEquippedAccessories } from './character';

export type SizePreset = 'small' | 'medium' | 'large';
export type OpacityPreset = 'low' | 'normal' | 'high';

const SIZE_MAP: Record<SizePreset, [number, number]> = {
  small:  [140, 168],
  medium: [200, 240],
  large:  [280, 336],
};

const SPRITE_SIZE_MAP: Record<SizePreset, number> = {
  small:  60,
  medium: 80,
  large:  110,
};

const ACC_FONT_MAP: Record<SizePreset, string> = {
  small:  '11px',
  medium: '14px',
  large:  '19px',
};

const OPACITY_MAP: Record<OpacityPreset, number> = {
  low:    0.4,
  normal: 1.0,
  high:   1.0,
};

let currentDnd = false;
let isMinimized = false;
let savedSizePreset: SizePreset = 'medium';
let store: Awaited<ReturnType<typeof load>> | null = null;

export async function initSettings() {
  store = await load('settings.json');

  const size    = (await store.get<SizePreset>('size'))    ?? 'medium';
  const opacity = (await store.get<OpacityPreset>('opacity')) ?? 'normal';
  const dnd     = (await store.get<boolean>('dnd'))        ?? false;

  const notif  = (await store.get<boolean>('notif'))  ?? true;
  const sound  = (await store.get<number>('sound'))   ?? 0.5;
  const skin   = (await store.get<SkinId>('skin'))    ?? 'default';

  const equipped: EquippedAccessories = {
    top:  (await store.get<string | null>('equip_top'))  ?? null,
    face: (await store.get<string | null>('equip_face')) ?? null,
    neck: (await store.get<string | null>('equip_neck')) ?? null,
  };

  await applySize(size);
  applyOpacity(opacity);
  if (dnd) await applyDnd(true);
  setNotifEnabled(notif);
  initSound(sound);
  applySkin(skin);
  applyAccessories(equipped);

  syncSizeButtons(size);
  syncOpacityButtons(opacity);
  if (dnd) document.getElementById('app')?.classList.add('dnd-active');
  document.getElementById('notif-btn')?.classList.toggle('active', notif);

  const soundRange = document.getElementById('sound-range') as HTMLInputElement | null;
  if (soundRange) soundRange.value = String(Math.round(sound * 100));
}

const BUBBLE_FONT_MAP: Record<SizePreset, string> = {
  small:  '10px',
  medium: '12px',
  large:  '14px',
};

async function applySize(preset: SizePreset) {
  savedSizePreset = preset;
  const [w, h] = SIZE_MAP[preset];
  const spriteSize = SPRITE_SIZE_MAP[preset];
  const win = getCurrentWindow();
  await win.setSize(new LogicalSize(w, h));
  document.body.style.width  = `${w}px`;
  document.body.style.height = `${h}px`;
  const app = document.getElementById('app');
  if (app) { app.style.width = `${w}px`; app.style.height = `${h}px`; }
  const sprite = document.getElementById('sprite') as HTMLCanvasElement | null;
  if (sprite) { sprite.style.width = `${spriteSize}px`; sprite.style.height = `${spriteSize}px`; }
  const wrap = sprite?.parentElement as HTMLElement | null;
  if (wrap?.classList.contains('sprite-wrap')) { wrap.style.width = `${spriteSize}px`; wrap.style.height = `${spriteSize}px`; }
  const bubble = document.getElementById('bubble') as HTMLElement | null;
  if (bubble) bubble.style.fontSize = BUBBLE_FONT_MAP[preset];
  const overlay = document.getElementById('accessory-overlay') as HTMLElement | null;
  if (overlay) overlay.style.fontSize = ACC_FONT_MAP[preset];
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
    if (!enabled) {
      sprite.style.animation = 'none';
      void sprite.offsetHeight;
      sprite.style.animation = '';
    }
  }
  setBubbleDnd(enabled);
}

function syncSizeButtons(active: SizePreset) {
  document.querySelectorAll<HTMLElement>('[data-size]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === active);
  });
}

function syncOpacityButtons(active: OpacityPreset) {
  document.querySelectorAll<HTMLElement>('[data-opacity]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.opacity === active);
  });
}

export async function setSize(preset: SizePreset) {
  await applySize(preset);
  syncSizeButtons(preset);
  if (store) await store.set('size', preset);
}

export async function setOpacity(preset: OpacityPreset) {
  applyOpacity(preset);
  syncOpacityButtons(preset);
  if (store) await store.set('opacity', preset);
}

export async function setDoNotDisturb(enabled: boolean) {
  applyDnd(enabled);
  if (store) await store.set('dnd', enabled);
}

export async function toggleDoNotDisturb() {
  await setDoNotDisturb(!currentDnd);
}

export function isDoNotDisturb() {
  return currentDnd;
}

export async function setSoundSetting(vol: number) {
  setSoundVolume(vol);
  if (store) await store.set('sound', vol);
}

let currentEquipped: EquippedAccessories = { top: null, face: null, neck: null };

function applyAccessories(equipped: EquippedAccessories) {
  currentEquipped = { ...equipped };
  setEquippedAccessories(equipped);
}

export function getEquippedAccessories(): EquippedAccessories {
  return { ...currentEquipped };
}

export async function setAccessory(slot: AccessorySlot, id: string | null) {
  currentEquipped = { ...currentEquipped, [slot]: id };
  setEquippedAccessories(currentEquipped);
  if (store) await store.set(`equip_${slot}`, id);
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

export function isNotifSetting(): boolean {
  return isNotifEnabled();
}

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
