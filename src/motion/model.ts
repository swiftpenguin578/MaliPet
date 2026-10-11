export type Point = [number, number];
export interface RigPose {
  hip: Point; shoulder: Point; head: Point;
  front: Point; rear: Point;
  headAngle: number; eyes: number; curl: number; gait: number;
}
export const FLOOR = 266;
export const DURATION = 24;
export const chapters = [
  { at: 0, label: 'Walk' }, { at: 3, label: 'Stop' }, { at: 4.4, label: 'Sit' },
  { at: 7, label: 'Lie down' }, { at: 8.8, label: 'Curl up' },
  { at: 10.8, label: 'Sleep' }, { at: 14, label: 'Wake' },
  { at: 16, label: 'Stretch' }, { at: 19, label: 'Walk again' },
];
const stand: RigPose = {
  hip: [132, 164], shoulder: [251, 158], head: [282, 124],
  front: [262, FLOOR], rear: [127, FLOOR], headAngle: 0, eyes: 0, curl: 0, gait: 0,
};
const sit: RigPose = { ...stand, hip: [166, 225], shoulder: [233, 173], head: [260, 131], rear: [190, FLOOR] };
const lie: RigPose = { ...stand, hip: [147, 232], shoulder: [254, 234], head: [289, 225], front: [300, FLOOR], rear: [171, FLOOR], headAngle: 8 };
const curl: RigPose = { ...lie, hip: [180, 213], shoulder: [235, 220], head: [269, 208], front: [254, FLOOR], rear: [224, FLOOR], headAngle: 15, curl: 1 };
const stretch: RigPose = { ...stand, hip: [138, 169], shoulder: [267, 227], head: [299, 216], front: [327, FLOOR], rear: [116, FLOOR], headAngle: -8 };
const keys: { at: number; pose: RigPose }[] = [
  { at: 0, pose: { ...stand, gait: 1 } },
  { at: 3, pose: { ...stand, gait: 1 } },
  { at: 4, pose: stand }, { at: 4.4, pose: stand },
  { at: 6.1, pose: sit }, { at: 7, pose: sit },
  { at: 8.8, pose: lie }, { at: 10.2, pose: curl },
  { at: 10.8, pose: { ...curl, eyes: 1 } },
  { at: 14, pose: { ...curl, eyes: 1 } },
  { at: 14.7, pose: curl }, { at: 16, pose: lie },
  { at: 17.6, pose: stretch }, { at: 18.3, pose: stretch },
  { at: 19.5, pose: stand }, { at: 20.4, pose: { ...stand, gait: 1 } },
  { at: DURATION, pose: { ...stand, gait: 1 } },
];
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const blendPoint = (a: Point, b: Point, t: number): Point => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
export function sample(time: number): RigPose {
  const t = Math.max(0, Math.min(DURATION, time));
  const index = keys.findIndex((k, i) => i < keys.length - 1 && t >= k.at && t <= keys[i + 1].at);
  const a = keys[Math.max(0, index)], b = keys[Math.max(0, index) + 1];
  const u = (t - a.at) / (b.at - a.at), eased = u * u * (3 - 2 * u);
  return {
    hip: blendPoint(a.pose.hip, b.pose.hip, eased), shoulder: blendPoint(a.pose.shoulder, b.pose.shoulder, eased),
    head: blendPoint(a.pose.head, b.pose.head, eased), front: blendPoint(a.pose.front, b.pose.front, eased), rear: blendPoint(a.pose.rear, b.pose.rear, eased),
    headAngle: mix(a.pose.headAngle, b.pose.headAngle, eased), eyes: mix(a.pose.eyes, b.pose.eyes, eased),
    curl: mix(a.pose.curl, b.pose.curl, eased), gait: mix(a.pose.gait, b.pose.gait, eased),
  };
}
export function foot(base: Point, phase: number, amount: number): Point {
  return [base[0] + Math.cos(phase) * 18 * amount, base[1] - Math.max(0, Math.sin(phase)) * 14 * amount];
}
// Two-bone inverse kinematics retains limb lengths while the body lowers.
export function knee(root: Point, tip: Point, upper: number, lower: number, bend: number): Point {
  const dx = tip[0] - root[0], dy = tip[1] - root[1];
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const d = Math.min(upper + lower - 0.001, Math.max(Math.abs(upper - lower) + 0.001, distance));
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return [root[0] + dx / distance * along - dy / distance * height * bend,
    root[1] + dy / distance * along + dx / distance * height * bend];
}
