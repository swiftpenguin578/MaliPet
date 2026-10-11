import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Renderer, initialFrame, type Frame, type Pose, WIDTH, HEIGHT } from './render';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#cat')!;
const renderer = new Renderer(canvas);
const error = document.querySelector<HTMLParagraphElement>('#error')!;
function fail(e: unknown) { console.error(e); error.hidden = false; error.textContent = `MaliPet could not load: ${String(e)}`; }

async function desktop() {
  let inFlight = false, latest: number[] | null = null, previous = '';
  async function sendMask(mask: number[]) {
    latest = mask;
    if (inFlight) return;
    inFlight = true;
    try {
      while (latest) {
        const next = latest; latest = null;
        const key = next.join('');
        if (key !== previous) { await invoke('hit_mask', { mask: next }); previous = key; }
      }
    } catch (e) { fail(e); } finally { inFlight = false; }
  }
  await listen<Frame>('pet-frame', ({ payload }) => { void sendMask(renderer.draw(payload)); });
  await sendMask(renderer.draw(initialFrame));
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault(); void invoke('press').catch(fail);
  });
  canvas.addEventListener('pointerup', e => { if (e.button === 0) void invoke('release').catch(fail); });
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); void invoke('context_menu').catch(fail); });
  await invoke('ready');
}

// Browser-only animation review, deliberately absent from the desktop pet window.
function preview() {
  document.body.classList.add('preview');
  document.title = 'MaliPet · Motion study';
  const frame = { ...initialFrame };
  const header = document.createElement('header');
  header.innerHTML = '<span class="eyebrow">MALIPET / FIRST MOTION STUDY</span><h1>A little company.</h1><p>Pet her with a click. Pick her up and let her land softly.</p>';
  const controls = document.createElement('nav');
  const poses: Pose[] = ['sit', 'loaf', 'walk', 'stretch', 'pet', 'sleep', 'hideaway'];
  const select = (pose: Pose) => { frame.pose = pose; frame.age = 0; controls.querySelectorAll('button[data-pose]').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.pose === pose)); };
  poses.forEach(pose => {
    const button = document.createElement('button'); button.textContent = ({pet: 'Petting', hideaway: 'Paws over face'} as Record<string,string>)[pose] ?? pose[0].toUpperCase()+pose.slice(1);
    button.dataset.pose = pose; button.onclick = () => select(pose); controls.append(button);
  });
  const pause = document.createElement('button'); pause.textContent = 'Pause'; pause.onclick = () => {frame.paused=!frame.paused;pause.textContent=frame.paused?'Resume':'Pause';};
  const blep = document.createElement('button'); blep.textContent='Blep';blep.onclick=()=>{select('sit');frame.blep=true;setTimeout(()=>{frame.blep=false;},1800);};
  const theme = document.createElement('button');theme.textContent='Light / dark';theme.onclick=()=>document.body.classList.toggle('dark');
  controls.append(pause,blep,theme);
  const note = document.createElement('footer');note.textContent='Animation timing preview · Walking uses two exploratory poses; the final cycle is still to be drawn.';
  document.body.append(header,controls,note);
  let x=innerWidth*0.6-WIDTH/2,y=innerHeight-HEIGHT-36,velocity=0;
  let pointer: {x:number;y:number;ox:number;oy:number;moved:boolean}|null=null;
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    pointer={x:e.clientX,y:e.clientY,ox:e.clientX-x,oy:e.clientY-y,moved:false};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointer)return;if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)pointer.moved=true;
    if(pointer.moved){frame.dragging=true;frame.falling=false;x=e.clientX-pointer.ox;y=Math.min(e.clientY-pointer.oy,innerHeight-HEIGHT-36);}
  });
  canvas.addEventListener('pointerup',()=>{
    if(!pointer)return;frame.dragging=false;
    if(pointer.moved){frame.falling=true;velocity=0;}else select('pet');pointer=null;
  });
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();pause.click();});
  select('sit');let last=performance.now();
  function tick(now:number){
    const dt=Math.min((now-last)/1000,0.05);last=now;const floor=innerHeight-HEIGHT-36;
    if(frame.falling){velocity=Math.min(velocity+420*dt,260);y=Math.min(y+velocity*dt,floor);if(y>=floor){frame.falling=false;select('loaf');}}
    if(!frame.paused&&!frame.dragging&&!frame.falling){frame.clock+=dt;frame.age+=dt;if(frame.pose==='walk'){x+=frame.facing*26*dt;if(x<0){x=0;frame.facing=1;}if(x>innerWidth-WIDTH){x=innerWidth-WIDTH;frame.facing=-1;}}}
    x=Math.max(0,Math.min(x,innerWidth-WIDTH));y=Math.max(0,Math.min(y,floor));
    canvas.style.left=`${x}px`;canvas.style.top=`${y}px`;renderer.draw(frame);requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

renderer.load().then(() => isTauri() ? desktop() : preview()).catch(fail);
