// Drag-to-move window via Tauri

import { getCurrentWindow } from '@tauri-apps/api/window';

export function initDrag(el: HTMLElement) {
  el.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      getCurrentWindow().startDragging();
    }
  });
}
