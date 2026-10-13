import { mountAeroShards } from '../src/features/courses/reactbits/aero-shards';
import { COURSE_EFFECT_CSS } from '../src/features/courses/effects';

const host = document.createElement('div');
host.style.cssText = 'position:absolute;left:20px;top:20px;width:520px;height:118px;overflow:hidden;border-radius:10px';
const shadow = host.attachShadow({ mode: 'open' });

const style = document.createElement('style');
style.textContent = `
  *{box-sizing:border-box}
  .fx-layer{position:absolute;top:-45%;left:-45%;width:190%;height:190%;z-index:1;overflow:hidden;pointer-events:none;filter:hue-rotate(var(--fx-hue,0deg))}
` + COURSE_EFFECT_CSS;

const layer = document.createElement('div');
layer.className = 'fx-layer';
shadow.append(style, layer);
document.body.append(host);

let status = 'no-instance';
try {
  const instance = mountAeroShards(layer);
  if (instance) {
    status = 'live';
    (window as unknown as { __aero: unknown }).__aero = instance;
  }
} catch (error) {
  status = 'threw: ' + String(error);
}
document.title = 'aero-shards: ' + status;
(document.getElementById('log') as HTMLElement).textContent =
  `${status} | canvases=${layer.querySelectorAll('canvas').length}`;
