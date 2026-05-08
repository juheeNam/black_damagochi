export interface FaceStyleDef {
  id: string;
  name: string;
  emoji: string;
}

export interface BodyStyleDef {
  id: string;
  name: string;
  emoji: string;
}

export const FACE_STYLES: FaceStyleDef[] = [
  { id: 'hat_top',     name: '중절모',   emoji: '🎩' },
  { id: 'hat_straw',   name: '밀짚모자', emoji: '👒' },
  { id: 'hat_santa',   name: '산타모자', emoji: '🎅' },
  { id: 'glasses_sun', name: '선글라스', emoji: '🕶' },
  { id: 'glasses',     name: '안경',     emoji: '👓' },
  { id: 'mask',        name: '마스크',   emoji: '😷' },
  { id: 'ribbon',      name: '리본',     emoji: '🎀' },
];

export const BODY_STYLES: BodyStyleDef[] = [
  { id: 'normal',       name: '기본',        emoji: '👤' },
  { id: 'tie_red',      name: '빨간 넥타이',  emoji: '🔴' },
  { id: 'tie_blue',     name: '파란 넥타이',  emoji: '🔵' },
  { id: 'suit_dot',     name: '땡땡이 양복',  emoji: '🟣' },
  { id: 'suit_stripe',  name: '스트라이프',   emoji: '〰️' },
];
