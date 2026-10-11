import type { Config } from './types';
export type ImageFormat = 'png' | 'jpeg';
export interface ExportRequest { width:number; height:number; multiplier:number; format:ImageFormat; quality:number }
export const safeExportRequest=(config:Config, partial:Partial<ExportRequest>):ExportRequest=>({width:Math.max(64,Math.min(8000,Math.round(partial.width??config.canvas.width))),height:Math.max(64,Math.min(8000,Math.round(partial.height??config.canvas.height))),multiplier:Math.max(.25,Math.min(4,partial.multiplier??1)),format:partial.format??'png',quality:Math.max(.1,Math.min(1,partial.quality??.94))});
