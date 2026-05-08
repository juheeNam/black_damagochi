export interface HeadStyleDef {
  id: string;
  name: string;
  emoji: string;
}

export interface BodyStyleDef {
  id: string;
  name: string;
  emoji: string;
}

export const HEAD_STYLES: HeadStyleDef[] = [
  { id: 'sunglasses',  name: '선글라스',    emoji: '🕶️' },
  { id: 'magician',    name: '마술사 모자',  emoji: '🎩' },
  { id: 'dizzy',       name: '눈이 빙빙',   emoji: '😵' },
  { id: 'x_eyes',      name: '눈이 X',      emoji: '❌' },
  { id: 'bright_eyes', name: '초롱초롱',    emoji: '👀' },
  { id: 'santa',       name: '산타모자',    emoji: '🎅' },
  { id: 'metal_glass', name: '안경',        emoji: '🤓' },
  { id: 'blush',       name: '부끄럼',      emoji: '😳' },
  { id: 'happy',       name: '기쁨',        emoji: '😄' },
  { id: 'sad',         name: '슬픔',        emoji: '😢' },
  { id: 'flower',      name: '화관',        emoji: '🌸' },
];

export const BODY_STYLES: BodyStyleDef[] = [
  { id: 'no_tie',       name: '기본',        emoji: '👔' },
  { id: 'tie_red',      name: '빨간 넥타이', emoji: '🔶' },
  { id: 'tie_blue',     name: '파란 넥타이', emoji: '🔷' },
  { id: 'tie_yellow',   name: '노란 넥타이', emoji: '🔸' },
  { id: 'polka_red',    name: '빨강 땡땡이', emoji: '⭕' },
  { id: 'polka_blue',   name: '파랑 땡땡이', emoji: '🔵' },
  { id: 'polka_yellow', name: '노랑 땡땡이', emoji: '🟡' },
  { id: 'hawaiian',     name: '하와이안',    emoji: '🌺' },
];
