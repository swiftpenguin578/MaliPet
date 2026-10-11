import { type Point, type RigPose, FLOOR, foot, knee, mix } from './model';
interface Part { canvas: HTMLCanvasElement; }
export class CatRig {
  private parts: Part[] = [];
  async load() {
    const image = new Image(); image.src = '/assets/motion/rig-parts-v1.png'; await image.decode();
    // Explicitly measured regions include the torso's left fur beyond its nominal
    // grid cell. The source is never independently fitted for each animation pose.
    const regions = [[40,40,450,445],[552,40,440,445],[988,64,548,436],[165,525,270,480],[635,525,280,480],[1170,510,230,510]];
    for (let index = 0; index < 6; index++) {
      const [x, y, width, height] = regions[index];
      const cell = document.createElement('canvas'); cell.width = width; cell.height = height;
      const ctx = cell.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, cell.width, cell.height);
      let left = cell.width, top = cell.height, right = 0, bottom = 0;
      for (let y = 0; y < cell.height; y++) for (let x = 0; x < cell.width; x++) {
        const i = (y * cell.width + x) * 4;
        // Same matte threshold for every piece, evaluated once at load.
        pixels.data[i + 3] = Math.max(0, Math.min(255, (pixels.data[i + 3] - 140) * 255 / 114));
        if (pixels.data[i + 3] > 32) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      }
      ctx.putImageData(pixels, 0, 0);
      if (right <= left || bottom <= top) throw new Error(`Empty rig part ${index}`);
      const part = document.createElement('canvas'); part.width = right - left + 1; part.height = bottom - top + 1;
      part.getContext('2d')!.drawImage(cell, left, top, part.width, part.height, 0, 0, part.width, part.height);
      this.parts.push({ canvas: part });
    }
  }
  private stamp(ctx: CanvasRenderingContext2D, part: number, x: number, y: number, width: number, height: number, angle = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.drawImage(this.parts[part].canvas, -width / 2, -height / 2, width, height); ctx.restore();
  }
  // Skin a single existing texture along its bones. Adjacent strips overlap by a
  // fraction of a pixel so subpixel rotations do not open transparent seams.
  private ribbon(ctx: CanvasRenderingContext2D, part: number, points: Point[], width: number, count = 96) {
    const image = this.parts[part].canvas;
    const at = (u: number): Point => {
      const scaled = u * (points.length - 1), i = Math.min(points.length - 2, Math.floor(scaled));
      const f = scaled - i;
      const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
      const smooth = (axis: 0 | 1) => 0.5 * ((2 * b[axis]) + (-a[axis] + c[axis]) * f +
        (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * f * f +
        (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * f * f * f);
      return [smooth(0), smooth(1)];
    };
    for (let i = 0; i < count; i++) {
      const a = at(i / count), b = at((i + 1) / count);
      ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2);
      ctx.drawImage(image, 0, i * image.height / count, image.width, image.height / count, -width / 2, -0.35, width, Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.7); ctx.restore();
    }
  }
  draw(ctx: CanvasRenderingContext2D, p: RigPose, time: number, guides: boolean) {
    const phase = time * Math.PI * 2 * 1.25;
    const breath = Math.sin(time * 1.5) * p.eyes * 1.1;
    const shoulder: Point = [p.shoulder[0], p.shoulder[1] - breath];
    const hip: Point = [p.hip[0], p.hip[1] - breath];
    const frontRoot: Point = [shoulder[0] - 5, shoulder[1] + 8];
    const rearRoot: Point = [hip[0], hip[1] + 6];
    const front = foot(p.front, phase, p.gait), rear = foot(p.rear, phase + Math.PI / 2, p.gait);
    const farFront = foot([p.front[0] - 13, p.front[1] - 3], phase + Math.PI, p.gait);
    const farRear = foot([p.rear[0] - 13, p.rear[1] - 3], phase + Math.PI * 1.5, p.gait);
    const leg = (part: number, root: Point, tip: Point, near: boolean) => {
      const joint = knee(root, tip, part === 3 ? 51 : 54, part === 3 ? 51 : 51, part === 3 ? 1 : -1);
      joint[1] = Math.min(joint[1], FLOOR - 12);
      ctx.save(); if (!near) ctx.filter = 'brightness(0.78)';
      this.ribbon(ctx, part, [root, joint, tip], part === 3 ? 29 : 35); ctx.restore();
    };
    // Far legs always stay behind the trunk; nearer legs overlap their shoulder.
    leg(4, rearRoot, farRear, false); leg(3, frontRoot, farFront, false);
    leg(4, rearRoot, rear, true);
    const tuck = Math.max(p.curl, Math.max(0, Math.min(1, (shoulder[1] - 194) / 30)) * Math.max(0, 1 - Math.abs(shoulder[1] - hip[1]) / 40));
    ctx.save(); ctx.globalAlpha = tuck;
    leg(3, frontRoot, front, true); ctx.restore();
    const tail: Point[] = [];
    const bodyAngle = Math.atan2(shoulder[1] - hip[1], shoulder[0] - hip[0]);
    const bodyWidth = mix(178, 151, p.curl);
    const tailBase: Point = [(hip[0] + shoulder[0]) / 2 - Math.cos(bodyAngle) * bodyWidth * 0.38,
      (hip[1] + shoulder[1]) / 2 - 4 - Math.sin(bodyAngle) * bodyWidth * 0.38];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const upright: Point = [tailBase[0] - Math.sin(u * Math.PI * 0.8) * 48 + Math.sin(time * 1.7) * u * 5, tailBase[1] - u * 112];
      const wrapped: Point = [tailBase[0] + u * 128, Math.min(FLOOR - 11, tailBase[1] + 12 + Math.sin(u * Math.PI) * 25)];
      tail.push([mix(upright[0], wrapped[0], p.curl), mix(upright[1], wrapped[1], p.curl)]);
    }
    const tailFront = Math.max(0, Math.min(1, (p.curl - 0.35) / 0.3));
    ctx.save(); ctx.globalAlpha = 1 - tailFront; this.ribbon(ctx, 5, tail, 19); ctx.restore();
    this.stamp(ctx, 2, (hip[0] + shoulder[0]) / 2, (hip[1] + shoulder[1]) / 2 - 4,
      mix(178, 151, p.curl), mix(83, 100, p.curl), bodyAngle);
    ctx.save(); ctx.globalAlpha = 1 - tuck;
    leg(3, frontRoot, front, true); ctx.restore();
    ctx.save(); ctx.globalAlpha = tailFront; this.ribbon(ctx, 5, tail, 19); ctx.restore();
    // Head has one fixed size throughout the entire sequence. Only eyelids blend.
    const headY = p.head[1] - breath;
    ctx.save(); ctx.globalAlpha = 1 - p.eyes;
    this.stamp(ctx, 0, p.head[0], headY, 76, 84, p.headAngle * Math.PI / 180); ctx.restore();
    if (p.eyes > 0) { ctx.save(); ctx.globalAlpha = p.eyes; this.stamp(ctx, 1, p.head[0], headY, 76, 84, p.headAngle * Math.PI / 180); ctx.restore(); }
    if (guides) {
      ctx.save(); ctx.strokeStyle = '#dd8967'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 3]);
      ctx.strokeRect(p.head[0] - 38, headY - 42, 76, 84);
      ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...shoulder); ctx.lineTo(...front); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...rear); ctx.stroke(); ctx.setLineDash([]);
      [hip, shoulder, front, rear].forEach(pt => { ctx.beginPath(); ctx.arc(...pt, 2.5, 0, Math.PI * 2); ctx.stroke(); });
      ctx.restore();
    }
  }
}
