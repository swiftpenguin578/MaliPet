import test from 'node:test';
import assert from 'node:assert/strict';
import { sample, foot, knee, FLOOR, DURATION } from '../src/motion/model.ts';

test('scrubbing the complete sequence never produces a position jump or foot below ground', () => {
  let previous = sample(0);
  for (let i = 1; i <= DURATION * 120; i++) {
    const t = i / 120, current = sample(t);
    for (const key of ['hip', 'shoulder', 'head', 'front', 'rear'] as const) {
      assert.ok(Math.hypot(current[key][0] - previous[key][0], current[key][1] - previous[key][1]) < 2, `${key} jumped at ${t}`);
      assert.ok(current[key].every(Number.isFinite));
    }
    assert.ok(foot(current.front, t * Math.PI * 2.5, current.gait)[1] <= FLOOR);
    assert.ok(foot(current.rear, t * Math.PI * 2.5 + Math.PI / 2, current.gait)[1] <= FLOOR);
    previous = current;
  }
});
test('knees retain two bone lengths for reachable targets', () => {
  const root: [number, number] = [0, 0], tip: [number, number] = [40, 65];
  const joint = knee(root, tip, 51, 51, 1);
  assert.ok(Math.abs(Math.hypot(...joint) - 51) < 0.0001);
  assert.ok(Math.abs(Math.hypot(joint[0] - tip[0], joint[1] - tip[1]) - 51) < 0.0001);
});
test('sleep closes eyes and wake returns to the same master walking proportions', () => {
  assert.equal(sample(12).eyes, 1); assert.equal(sample(12).gait, 0);
  assert.deepEqual(sample(DURATION), sample(0));
});
