import type { PaletteName } from './types';
export const palettes: Record<Exclude<PaletteName,'Custom'>,[string,string,string]> = {
  'Electric Blue / Coral':['#f04f43','#1230e8','#54d5ff'], 'Ink / Tangerine':['#ff6b22','#151515','#853000'], 'Midnight Flow':['#0c0d1d','#7264ff','#49b2ff'], 'Monochrome Field':['#f3eddf','#171614','#867f72'], 'Acid Study':['#090909','#b5ff32','#eaffb6'], 'Violet / Yellow':['#fff29d','#4828a8','#cc51c8']
};
export function hexToRgb(hex:string){ const h=hex.replace('#',''); return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}; }
export function mix(a:string,b:string,t:number){ const x=hexToRgb(a),y=hexToRgb(b), z=(u:number,v:number)=>Math.round(u+(v-u)*t).toString(16).padStart(2,'0'); return `#${z(x.r,y.r)}${z(x.g,y.g)}${z(x.b,y.b)}`; }
