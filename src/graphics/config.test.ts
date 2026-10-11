import { describe, expect, it } from 'vitest';
import { clone, defaults } from './defaults';
import { builtins } from './presets';
import { mix } from './palettes';
import { validateConfig } from './config';
import { svgFor } from './renderer';
describe('generator configuration',()=>{
  it('has a valid deterministic default',()=>{const c=clone(defaults);expect(c.version).toBe(1);expect(c.seed).toBeTruthy();expect(c.canvas.width).toBeGreaterThan(0);expect(c.mark.minOpacity).toBeGreaterThanOrEqual(0);expect(c.mark.maxOpacity).toBeLessThanOrEqual(1)});
  it('ships twelve separately seeded built-in presets',()=>{expect(builtins).toHaveLength(12);expect(new Set(builtins.map(p=>p.seed)).size).toBe(12);expect(builtins.every(p=>p.canvas.maxPoints>0&&p.grid.spacingX>0)).toBe(true)});
  it('does not mutate a cloned configuration',()=>{const a=clone(defaults),b=clone(defaults);a.noise.scale=.02;expect(b.noise.scale).toBe(defaults.noise.scale)});
  it('interpolates stable palette colors',()=>{expect(mix('#000000','#ffffff',.5)).toBe('#808080')});
  it('sanitizes malformed imported settings without breaking defaults',()=>{const result=validateConfig({version:1,canvas:{width:-2,height:'huge'},noise:{scale:Infinity},mark:{density:7},color:{background:'bad'}});expect(result.canvas.width).toBe(64);expect(result.canvas.height).toBe(defaults.canvas.height);expect(result.noise.scale).toBe(defaults.noise.scale);expect(result.mark.density).toBe(1);expect(result.color.background).toBe(defaults.color.background)});
  it('migrates valid randomization locks and image mask fit modes',()=>{const result=validateConfig({version:1,locks:{seed:true,noise:true,geometry:false,palette:true},mask:{fit:'cover'}});expect(result.locks).toEqual({seed:true,noise:true,geometry:false,palette:true});expect(result.mask.fit).toBe('cover')});
  it('produces deterministic native SVG geometry',()=>{const a=svgFor(defaults),b=svgFor(defaults);expect(a).toBe(b);expect(a).toContain('<svg');expect(a).toContain('<line');expect(a).toContain(`width="${defaults.canvas.width}"`)});
});
