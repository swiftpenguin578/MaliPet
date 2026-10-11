import { CatRig } from './rig';
import { chapters, DURATION, FLOOR, sample } from './model';
import './preview.css';

export async function motionPreview() {
  document.title = 'MaliPet · One continuous movement';
  document.body.className = 'motion-study';
  document.body.innerHTML = `
    <main class="motion-shell">
      <header class="motion-header"><a href="/" class="wordmark">MaliPet<span> / motion atelier</span></a><span class="version">STUDY 02 · 2D RIG</span></header>
      <section class="motion-intro"><p class="kicker">ONE CAT. EVERY FRAME.</p><h1>A walk. A little rest.<br>And back to her day.</h1><p>One set of illustrated parts, moving together.<br>Scrub slowly to inspect her face, scale, and posture.</p></section>
      <section class="stage" aria-label="Animation preview">
        <div class="stage-top"><span id="phase">Walk</span><span id="time">00.0 / 24.0 s</span></div>
        <canvas id="rig" width="1200" height="840" aria-label="Mali walking, sitting, curling up to sleep, waking and stretching"></canvas>
        <div class="stage-bottom"><span>Same head · same coat palette · fixed ground line</span><button id="background">Dark background</button></div>
      </section>
      <section class="transport" aria-label="Animation controls">
        <div class="transport-main"><button id="play" class="primary">Pause</button><button id="replay">Replay</button><label class="speed-label">Speed <select id="speed"><option value="0.5">½×</option><option value="1" selected>1×</option><option value="1.5">1½×</option></select></label><label class="guide-label"><input type="checkbox" id="guides"> Show size guides</label></div>
        <input id="timeline" type="range" min="0" max="24" step="0.01" value="0" aria-label="Animation time">
        <div class="chapters">${chapters.map((c, i) => `<button data-chapter="${i}">${c.label}</button>`).join('')}</div>
      </section>
      <footer class="motion-notes"><p><strong>A movement test, ready for your eye.</strong> The same head and textures are reused throughout. The sleeping silhouette and joint bends are still a first rig pass; the approved sleeping illustrations remain the reference.</p><a href="/">View approved pose study ↗</a></footer>
      <p id="motion-error" role="alert" hidden></p>
    </main>`;
  const canvas = document.querySelector<HTMLCanvasElement>('#rig')!;
  const ctx = canvas.getContext('2d')!;
  const rig = new CatRig();
  try { await rig.load(); } catch (e) { const error = document.querySelector<HTMLElement>('#motion-error')!; error.hidden = false; error.textContent = `Could not load the animation: ${String(e)}`; return; }
  const slider = document.querySelector<HTMLInputElement>('#timeline')!;
  const play = document.querySelector<HTMLButtonElement>('#play')!;
  const phase = document.querySelector<HTMLElement>('#phase')!;
  const timeLabel = document.querySelector<HTMLElement>('#time')!;
  const speed = document.querySelector<HTMLSelectElement>('#speed')!;
  const guides = document.querySelector<HTMLInputElement>('#guides')!;
  const chapterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-chapter]'));
  const requestedTime = new URLSearchParams(location.search).get('t');
  let time = requestedTime !== null && Number.isFinite(Number(requestedTime)) ? Math.max(0, Math.min(DURATION, Number(requestedTime))) : 0;
  let running = requestedTime === null && !matchMedia('(prefers-reduced-motion: reduce)').matches, dark = false, previous = performance.now();
  const setRunning = (value: boolean) => { running = value; play.textContent = running ? 'Pause' : time >= DURATION ? 'Play again' : 'Play'; };
  setRunning(running);
  play.onclick = () => { if (time >= DURATION) time = 0; setRunning(!running); };
  document.querySelector<HTMLButtonElement>('#replay')!.onclick = () => { time = 0; setRunning(true); };
  slider.oninput = () => { time = Number(slider.value); setRunning(false); };
  chapterButtons.forEach((button, i) => button.onclick = () => { time = chapters[i].at; setRunning(false); });
  document.querySelector<HTMLButtonElement>('#background')!.onclick = event => {
    dark = !dark; document.querySelector('.stage')!.classList.toggle('night', dark);
    (event.target as HTMLButtonElement).textContent = dark ? 'Light background' : 'Dark background';
  };
  function tick(now: number) {
    const dt = Math.min(0.05, (now - previous) / 1000); previous = now;
    if (running && !document.hidden) { time = Math.min(DURATION, time + dt * Number(speed.value)); if (time >= DURATION) setRunning(false); }
    slider.value = String(time);
    const current = chapters.reduce((found, c, i) => time >= c.at ? i : found, 0);
    phase.textContent = chapters[current].label;
    timeLabel.textContent = `${time.toFixed(1).padStart(4, '0')} / 24.0 s`;
    chapterButtons.forEach((button, i) => { button.classList.toggle('selected', i === current); button.setAttribute('aria-pressed', String(i === current)); });
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.scale(3, 2.8);
    ctx.strokeStyle = dark ? '#4b544b' : '#c3c6bc'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(22, FLOOR + 1); ctx.lineTo(378, FLOOR + 1); ctx.stroke();
    rig.draw(ctx, sample(time), time, guides.checked); ctx.restore();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
