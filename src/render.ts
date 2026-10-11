export type Pose = 'sit' | 'loaf' | 'walk' | 'stretch' | 'pet' | 'sleep' | 'hideaway';
export interface Frame {
  pose: Pose; facing: number; clock: number; age: number;
  paused: boolean; dragging: boolean; falling: boolean; blep: boolean;
}
export const WIDTH = 280, HEIGHT = 220;
export const initialFrame: Frame = { pose: 'sit', facing: 1, clock: 0, age: 0, paused: false, dragging: false, falling: false, blep: false };

// Hand-inspected regions of the generated atlas. It is not a uniform production atlas.
const regions = [
  [25, 65, 325, 467], [375, 247, 315, 282], [690, 125, 405, 412], [1102, 120, 434, 417],
  [0, 552, 437, 388], [444, 550, 243, 378], [690, 659, 380, 271], [1071, 658, 465, 290],
];
const indices: Record<Pose, number> = { sit: 0, loaf: 1, walk: 3, stretch: 4, pet: 5, sleep: 6, hideaway: 7 };

export function alphaMask(data: Uint8ClampedArray, width: number, height: number): number[] {
  const result = new Array<number>(70 * 55).fill(0);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    // A cell is interactive only where an opaque part of the cat is drawn.
    if (data[(y * width + x) * 4 + 3] > 96) result[Math.floor(y / height * 55) * 70 + Math.floor(x / width * 70)] = 1;
  }
  return result;
}

export class Renderer {
  private sprites: HTMLCanvasElement[] = [];
  private feet: number[] = [];
  private ctx: CanvasRenderingContext2D;
  lastMask: number[] = [];
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  }
  async load(): Promise<void> {
    const image = new Image(); image.src = '/assets/poses.png'; await image.decode();
    this.sprites = regions.map(([x, y, w, h]) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
      const pixels = ctx.getImageData(0, 0, w, h);
      // ImageGen supplied a translucent matte around the cutouts. Remove low-alpha
      // matte during rendering; original artwork remains unchanged on disk.
      for (let i = 3; i < pixels.data.length; i += 4) {
        pixels.data[i] = Math.max(0, Math.min(255, (pixels.data[i] - 140) * 255 / 114));
      }
      ctx.putImageData(pixels, 0, 0);
      let bottom = 0;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        if (pixels.data[(py * w + px) * 4 + 3] > 96) bottom = Math.max(bottom, py + 1);
      }
      this.feet.push(bottom);
      return c;
    });
  }
  draw(frame: Frame): number[] {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.canvas.width / WIDTH, this.canvas.height / HEIGHT);
    const pose = frame.dragging || frame.falling ? 'loaf' : frame.pose;
    // Walk 2 anchors the likeness. The second exploratory pose is used briefly as
    // a passing pose; this is deliberately not described as a finished walk cycle.
    const walkBeat = Math.floor(frame.age * 5) % 4;
    const index = pose === 'walk' && walkBeat === 2 ? 2 : indices[pose];
    const sprite = this.sprites[index];
    if (!sprite) return [];
    const size = Math.min(244 / sprite.width, (pose === 'sit' || pose === 'pet' ? 190 : 154) / sprite.height);
    const w = sprite.width * size, h = sprite.height * size;
    const sleepy = pose === 'sleep' || pose === 'hideaway';
    const breath = Math.sin(frame.clock * (sleepy ? 1.5 : 2.1)) * (sleepy ? 0.009 : 0.004);
    const bob = pose === 'walk' ? Math.abs(Math.sin(frame.age * Math.PI * 5)) * 1.5 : 0;
    // Grounded bottom at 218 logical px keeps all poses at the same screen edge.
    ctx.translate(WIDTH / 2, HEIGHT - 2 - bob);
    // Both source walking poses face left; mirror them when moving right.
    ctx.scale(pose === 'walk' && frame.facing > 0 ? -1 : 1, 1 + breath);
    const top = -this.feet[index] * size;
    ctx.drawImage(sprite, -w / 2, top, w, h);
    if (frame.blep && (pose === 'sit' || pose === 'loaf')) {
      const mouth = pose === 'sit' ? [0.50, 0.355] : [0.50, 0.50];
      ctx.fillStyle = '#d67f8b'; ctx.beginPath();
      ctx.ellipse(-w / 2 + w * mouth[0], top + h * mouth[1], 1.7, 2.5, 0, 0, Math.PI * 2);ctx.fill();
    }
    const pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.lastMask = alphaMask(pixels.data, this.canvas.width, this.canvas.height);
    return this.lastMask;
  }
}
