/** Temporary visual check: renders the real artwork shadow DOM (CSS fallback
 *  art) for a roster of courses at card and hero size. Not part of the build. */

import { COURSE_EFFECT_CSS, courseArtKey, courseArtMood, courseEffect, palette, solidColor } from '../src/features/courses/effects';
import { departmentFromCourseCode } from '../src/adapters/quest/homepage';

const ROSTER: Array<[string, string]> = [
  ['M 408C', '58360'], ['M 408D', '58361'], ['CH 301', '58735'], ['CH 312', '51201'],
  ['CS 312', '54100'], ['CS 314', '54101'], ['BIO 311', '33010'], ['GOV 312', '32100'],
  ['PHY 303K', '56410'], ['UT 303', '47100'], ['ECON 304', '40200'], ['PSY 341', '21100'],
];

function build(code: string, unique: string, kind: 'card' | 'hero'): HTMLElement {
  const departmentCode = departmentFromCourseCode(code);
  const [deep, bright, paper] = palette(departmentCode);
  const solid = solidColor(departmentCode);
  const artKey = courseArtKey({ code, unique, departmentCode });
  const fx = courseEffect(artKey);
  const mood = courseArtMood(artKey);

  const host = document.createElement('div');
  host.style.cssText = kind === 'card'
    ? 'width:96px;height:96px'
    : 'width:520px;height:118px';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host{display:block}
    *{box-sizing:border-box}
    .art{
      position:relative;isolation:isolate;display:flex;width:100%;height:100%;
      align-items:flex-end;overflow:hidden;border-radius:10px;background:#09090d;
      box-shadow:0 10px 26px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.16);
      color:#fff;text-align:left;padding:${kind === 'card' ? '0 10px 9px' : '16px 20px'};
    }
    .fx-layer{position:absolute;top:-45%;left:-45%;width:190%;height:190%;z-index:1;overflow:hidden;pointer-events:none;filter:hue-rotate(var(--fx-hue,0deg))}
    .vignette{position:absolute;inset:0;z-index:2;pointer-events:none;
      background:linear-gradient(to top,rgba(6,8,12,.88) 0%,rgba(6,8,12,.28) 60%,transparent 100%)}
    .copy{position:relative;z-index:3;text-shadow:0 1px 4px rgba(0,0,0,.9),0 2px 10px rgba(0,0,0,.55)}
    .department{display:block;font:850 ${kind === 'card' ? '26px' : '30px'}/0.9 ui-rounded,'Avenir Next',sans-serif;letter-spacing:-.05em}
    .code{display:block;margin-top:5px;font:650 ${kind === 'card' ? '9px' : '12px'}/1.25 ui-rounded,'Avenir Next',sans-serif;letter-spacing:.02em;color:rgba(255,255,255,.88)}
    .unique{font:850 ${kind === 'card' ? '10px' : '28px'}/0.95 ui-rounded,sans-serif;color:rgba(255,255,255,.95)}
  ` + COURSE_EFFECT_CSS;

  const art = document.createElement('div');
  art.className = 'art';
  art.style.setProperty('--fx-deep', deep);
  art.style.setProperty('--fx-bright', bright);
  art.style.setProperty('--fx-paper', paper);
  art.style.setProperty('--fx-solid', solid);
  art.style.setProperty('--fx-hue', `${mood.hue}deg`);
  art.style.setProperty('--fx-delay', `${mood.delay}s`);

  const artBg = document.createElement('span');
  artBg.className = `art-bg fx-${fx}`;
  const fxLayer = document.createElement('div');
  fxLayer.className = 'fx-layer';
  const vignette = document.createElement('span');
  vignette.className = 'vignette';
  const copy = document.createElement('div');
  copy.className = 'copy';
  const dept = document.createElement('span');
  dept.className = 'department';
  dept.textContent = departmentCode;
  const nameEl = document.createElement('span');
  nameEl.className = 'code';
  nameEl.textContent = code.replace(/\s+/g, '');
  copy.append(dept, nameEl);
  if (kind === 'hero') {
    const u = document.createElement('span');
    u.className = 'unique';
    u.textContent = unique;
    copy.style.display = 'flex';
    copy.style.justifyContent = 'space-between';
    copy.style.alignItems = 'flex-end';
    copy.style.width = '100%';
    copy.append(u);
  }
  art.append(artBg, fxLayer, vignette, copy);
  shadow.append(style, art);
  return host;
}

const app = document.getElementById('app')!;
const heroGrid = document.getElementById('heroes')!;
const cardGrid = document.getElementById('cards')!;

for (const [code, unique] of ROSTER) {
  const cell = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.textContent = `${code} → ${courseEffect(courseArtKey({ code, unique, departmentCode: departmentFromCourseCode(code) }))}`;
  cell.append(cap, build(code, unique, 'hero'));
  heroGrid.append(cell);

  const cardCell = document.createElement('figure');
  cardCell.append(build(code, unique, 'card'));
  cardGrid.append(cardCell);
}
app.dataset.ready = '1';
