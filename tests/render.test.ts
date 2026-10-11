import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alphaMask } from '../src/render.ts';

test('transparent pixels do not capture clicks; opaque pixels do at retina scale', () => {
  const pixels=new Uint8ClampedArray(560*440*4);
  pixels[(160*560+240)*4+3]=255;
  pixels[(160*560+248)*4+3]=60;
  const mask=alphaMask(pixels,560,440);
  assert.equal(mask.length,3850);
  assert.equal(mask[20*70+30],1);
  assert.equal(mask[20*70+31],0);
  assert.equal(mask.reduce((a,b)=>a+b,0),1);
});
