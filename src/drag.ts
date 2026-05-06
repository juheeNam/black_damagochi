// Drag-to-move window via Tauri
// 스프라이트 위는 클릭 이벤트 전용, 나머지 영역에서 드래그

import { getCurrentWindow } from '@tauri-apps/api/window';

export function initDrag(appEl: HTMLElement, spriteEl: HTMLElement) {
  appEl.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !spriteEl.contains(e.target as Node)) {
      getCurrentWindow().startDragging();
    }
  });
}
