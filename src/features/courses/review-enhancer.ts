import { execute, type Execute } from '../../shared/client';
import { rememberStreakCredit } from '../streak/pending-credit';

export interface ReviewStats {
  completed: number;
  total: number;
  percent: number;
  remainingToGoal: number;
}

export function extractReviewStats(container: HTMLElement): ReviewStats | null {
  const source = container.cloneNode(true) as HTMLElement;
  source.querySelectorAll('[data-betterquest]').forEach(node => node.remove());
  const text = source.textContent || '';
  // Match "you have completed 46 / 121 review problems", "completed: 46 of 121", etc.
  const match = text.match(/(?:you have\s+)?completed[\s\S]{0,100}?(\d+)\s*(?:\/|of)\s*(\d+)/i) ||
    text.match(/(\d+)\s*(?:\/|of)\s*(\d+)\s*(?:review\s*problems|problems\s*completed)/i) ||
    text.match(/review\s*problems[\s\S]{0,100}?(\d+)\s*(?:\/|of)\s*(\d+)/i);

  if (!match) return null;
  const completed = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total < 0 || completed < 0) return null;
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const remainingToGoal = Math.max(0, 100 - completed);
  return { completed, total, percent, remainingToGoal };
}

export function createReviewDashboard(stats: ReviewStats | null, doc: Document): HTMLElement {
  const dashboard = doc.createElement('section');
  dashboard.className = 'bq-review-dashboard bq-review-summary';
  dashboard.dataset.betterquest = 'review-dashboard';
  dashboard.setAttribute('aria-label', 'Custom Reviews');
  const heading = doc.createElement('h2');
  heading.className = 'bq-review-title';
  heading.textContent = 'Custom Reviews';
  const lead = doc.createElement('p');
  lead.className = 'bq-review-lead';
  lead.textContent = 'Practice problems from your homework, learning modules, and exams. Custom Reviews are not graded.';
  dashboard.append(heading, lead);
  if (stats) {
    const progress = doc.createElement('div');
    progress.className = 'bq-review-progress';
    const count = doc.createElement('p');
    count.className = 'bq-review-count';
    const value = doc.createElement('strong');
    value.textContent = String(stats.completed);
    count.append(value, ' of ' + stats.total + ' review problems completed');
    const percentage = doc.createElement('span');
    percentage.textContent = stats.percent + '% complete';
    const track = doc.createElement('div');
    track.className = 'bq-review-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'Review completion');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(stats.percent));
    const fill = doc.createElement('div');
    fill.className = 'bq-review-fill';
    fill.style.width = stats.percent + '%';
    track.append(fill);
    const goal = doc.createElement('p');
    goal.className = 'bq-review-goal';
    goal.textContent = stats.remainingToGoal > 0
      ? stats.remainingToGoal + ' more to reach 100 problems this semester.'
      : 'You have reached 100 problems this semester.';
    progress.append(count, percentage, track, goal);
    dashboard.append(progress);
  }
  const tips = doc.createElement('details');
  tips.className = 'bq-review-tips';
  const summary = doc.createElement('summary');
  summary.textContent = 'Make your practice count';
  const research = doc.createElement('p');
  research.textContent = 'Quest reports an average final-grade lift of about 6 points among students who successfully work 100 or more review problems over a semester.';
  const list = doc.createElement('ul');
  for (const text of [
    'Spend more than 90 seconds working through each problem, instead of using it as a flashcard.',
    'Work a few problems each day instead of doing 100 in one sitting.',
    'Aim for 8 AM–11 PM; Quest found less benefit outside those hours.',
  ]) {
    const item = doc.createElement('li'); item.textContent = text; list.append(item);
  }
  tips.append(summary, research, list);
  dashboard.append(tips);
  return dashboard;
}

export function hideRawReviewElements(container: HTMLElement, doc: Document) {
  const isTargetText = (text: string) =>
    /Custom Reviews allow|Our research shows|you have completed|review problems/i.test(text);

  const processNode = (node: Node) => {
    if (node.nodeType === 3) {
      // Text node
      const text = (node.textContent || '').trim();
      if (isTargetText(text)) {
        const span = doc.createElement('span');
        span.dataset.betterquestReviewRaw = 'true';
        span.style.display = 'none';
        span.textContent = node.textContent;
        if (node.parentNode) {
          node.parentNode.replaceChild(span, node);
        }
      }
    } else if (node.nodeType === 1) {
      // Element node
      const el = node as HTMLElement;
      if (el.dataset.betterquest || el.dataset.betterquestReviewRaw) return;

      const hasInteractive = Boolean(
        el.querySelector('table, button, a, form, input, select, textarea')
      );

      const text = (el.textContent || '').trim();
      if (isTargetText(text)) {
        if (!hasInteractive) {
          el.dataset.betterquestReviewRaw = 'true';
          el.style.display = 'none';
        } else {
          // If the element has interactive children, process its child nodes recursively
          for (const child of [...el.childNodes]) {
            processNode(child);
          }
        }
      }
    }
  };

  for (const child of [...container.childNodes]) {
    processNode(child);
  }

  // Clean up orphan br tags between or near hidden elements
  for (const br of [...container.querySelectorAll('br')]) {
    const prev = br.previousElementSibling;
    const next = br.nextElementSibling;
    if (prev?.getAttribute('data-betterquest-review-raw') || next?.getAttribute('data-betterquest-review-raw')) {
      br.style.display = 'none';
      br.dataset.betterquestReviewRaw = 'true';
    }
  }
}

export function findReviewPane(document: Document): HTMLElement | null {
  return document.querySelector<HTMLElement>('#tabs-review') ||
    (document.querySelector('#student-review-a.active, #student-review-a[aria-selected="true"]')
      ? document.querySelector<HTMLElement>('#info-tab-data') : null) ||
    document.querySelector<HTMLElement>('#main-content [data-betterquest-page="review"]');
}

const REVIEW_SLIDER_STYLES = `
  [data-betterquest-sliders] .slidecontainer{position:relative;padding-bottom:34px}
  [data-betterquest-sliders] input[type="range"].bq-slider{-webkit-appearance:none;appearance:none;width:100%;height:26px;margin:0;background:transparent;cursor:pointer;--bq-fill:50%}
  [data-betterquest-sliders] input[type="range"].bq-slider::-webkit-slider-runnable-track{height:8px;border-radius:999px;background:linear-gradient(to right,var(--bq-accent,#227ab0) var(--bq-fill),var(--bq-raised,#e6ebf0) var(--bq-fill))}
  [data-betterquest-sliders] input[type="range"].bq-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;margin-top:-7px;border-radius:50%;background:#fff;border:3px solid var(--bq-accent,#227ab0);box-shadow:0 2px 8px #10203333;transition:transform .15s ease,box-shadow .15s ease}
  [data-betterquest-sliders] input[type="range"].bq-slider:active::-webkit-slider-thumb{transform:scale(1.15);box-shadow:0 0 0 5px color-mix(in srgb,var(--bq-accent,#227ab0) 22%,transparent)}
  [data-betterquest-sliders] input[type="range"].bq-slider::-moz-range-track{height:8px;border-radius:999px;background:var(--bq-raised,#e6ebf0)}
  [data-betterquest-sliders] input[type="range"].bq-slider::-moz-range-progress{height:8px;border-radius:999px;background:var(--bq-accent,#227ab0)}
  [data-betterquest-sliders] input[type="range"].bq-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--bq-accent,#227ab0);box-shadow:0 2px 8px #10203333}
  [data-betterquest-sliders] input[type="range"].bq-slider:focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:6px;border-radius:999px}
  [data-betterquest-sliders] .slidecontainer > .thumb{display:none!important}
  [data-betterquest-sliders] .bq-slider-value{display:block;text-align:center;font-weight:800;font-size:24px;margin:10px 0 0;color:var(--bq-text,#26384a);font-variant-numeric:tabular-nums;line-height:1.1}
  @media(prefers-reduced-motion:reduce){
    [data-betterquest-sliders] input[type="range"].bq-slider::-webkit-slider-thumb{transition:none}
  }
`;

function ensureSliderStyles(doc: Document) {
  if (doc.querySelector('[data-betterquest="review-slider-styles"]')) return;
  const style = doc.createElement('style');
  style.dataset.betterquest = 'review-slider-styles';
  style.textContent = REVIEW_SLIDER_STYLES;
  doc.head.append(style);
}

function sliderInputAlive(pane: HTMLElement, output: HTMLElement): boolean {
  const key = output.dataset.sliderFor;
  if (!key) return false;
  const doc = pane.ownerDocument;
  const byId = doc.getElementById(key);
  if (byId && byId.tagName === 'INPUT' && (byId as HTMLInputElement).type === 'range' && pane.contains(byId)) return true;
  return Boolean(pane.querySelector(`input[type="range"][name="${key.replace(/"/g, '')}"]`));
}

function paintSlider(input: HTMLInputElement) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  const pct = max > min ? Math.min(100, Math.max(0, (value - min) / (max - min) * 100)) : 0;
  const fill = `${pct}%`;
  if (input.style.getPropertyValue('--bq-fill') !== fill) input.style.setProperty('--bq-fill', fill);
  const key = input.id || input.name;
  const host = input.closest('.slidecontainer') || input.parentElement;
  const existing = host?.querySelectorAll<HTMLElement>(
    `:scope > [data-betterquest="slider-value"][data-slider-for="${key}"]`) || [];
  existing.forEach((el, index) => { if (index > 0) el.remove(); });
  let output = existing[0] || null;
  if (!output && host) {
    output = input.ownerDocument.createElement('output');
    output.dataset.betterquest = 'slider-value';
    output.dataset.sliderFor = key;
    output.setAttribute('aria-label', `${input.getAttribute('aria-label') || 'Slider'} value`);
    host.append(output);
  }
  if (output && output.textContent !== input.value) output.textContent = input.value;
}

export function enhanceReviewSliders(pane: HTMLElement): void {
  const doc = pane.ownerDocument;
  ensureSliderStyles(doc);
  pane.dataset.betterquestSliders = 'true';
  for (const input of pane.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
    if (input.closest('[data-betterquest="review-dashboard"]')) continue;
    if (input.dataset.betterquestSlider !== 'true') {
      input.dataset.betterquestSlider = 'true';
      input.dataset.betterquestOriginalStep = input.getAttribute('step') || '';
      // Free values within Quest's min/max instead of snapping between notches.
      input.setAttribute('step', '1');
      input.classList.add('bq-slider');
    }
    paintSlider(input);
    if (!input.dataset.betterquestSliderBound) {
      input.dataset.betterquestSliderBound = 'true';
      const repaint = () => paintSlider(input);
      input.addEventListener('input', repaint);
      input.addEventListener('change', repaint);
    }
  }
  // Drop readouts whose inputs Quest re-rendered away.
  for (const output of [...pane.querySelectorAll<HTMLElement>('[data-betterquest="slider-value"]')]) {
    if (!sliderInputAlive(pane, output)) output.remove();
  }
  // Leftover bubbles from before the bubble was removed.
  pane.querySelectorAll('[data-betterquest="slider-bubble"]').forEach(el => el.remove());
}

export function disposeReviewSliders(document: Document): void {
  document.querySelector('[data-betterquest="review-slider-styles"]')?.remove();
  document.querySelectorAll<HTMLElement>('[data-betterquest-sliders]').forEach(el => {
    el.removeAttribute('data-betterquest-sliders');
  });
  for (const input of document.querySelectorAll<HTMLInputElement>('input[type="range"][data-betterquest-slider]')) {
    const original = input.dataset.betterquestOriginalStep;
    if (original) input.setAttribute('step', original);
    else input.removeAttribute('step');
    input.classList.remove('bq-slider');
    input.style.removeProperty('--bq-fill');
    delete input.dataset.betterquestSlider;
    delete input.dataset.betterquestOriginalStep;
    delete input.dataset.betterquestSliderBound;
  }
  document.querySelectorAll('[data-betterquest="slider-value"]').forEach(el => el.remove());
}

export function enhanceCourseReviewTab(document: Document, options: { run?: Execute } = {}): boolean {
  const run = options.run || execute;
  const reviewPane = findReviewPane(document);

  if (!reviewPane) return false;

  const existingDashboard = reviewPane.querySelector<HTMLElement>('[data-betterquest="review-dashboard"]');


  // Don't format if currently just a loading spinner without review content
  if (reviewPane.querySelector('.preloader-wrapper.active') && !reviewPane.textContent?.includes('Custom Reviews')) {
    return false;
  }

  const stats = extractReviewStats(reviewPane);
  if (stats && stats.completed > 0 && existingDashboard?.dataset.stats) {
    try {
      const prevStats = JSON.parse(existingDashboard.dataset.stats);
      if (typeof prevStats?.completed === 'number' && stats.completed > prevStats.completed) {
        rememberStreakCredit(document, run);
      }
    } catch {
      /* ignore */
    }
  }
  const source = reviewPane.cloneNode(true) as HTMLElement;
  source.querySelectorAll('[data-betterquest]').forEach(node => node.remove());
  if (!stats && !/Custom Reviews allow|Our research shows/i.test(source.textContent || '')) return false;
  const signature = JSON.stringify(stats);
  if (existingDashboard?.dataset.stats === signature) {
    hideRawReviewElements(reviewPane, document);
    enhanceReviewSliders(reviewPane);
    return true;
  }

  // Hide raw unstyled text elements safely while preserving buttons, tables, links
  hideRawReviewElements(reviewPane, document);

  // Create and mount the new dashboard
  const dashboard = createReviewDashboard(stats, document);
  dashboard.dataset.stats = signature;
  if (existingDashboard) {
    const wasOpen = existingDashboard.querySelector('details')?.open;
    dashboard.querySelector('details')!.open = Boolean(wasOpen);
    existingDashboard.replaceWith(dashboard);
  } else reviewPane.prepend(dashboard);
  reviewPane.dataset.betterquestReviewEnhanced = 'true';

  // Elevate any native action buttons or tables inside the review pane
  const createBtns = reviewPane.querySelectorAll<HTMLElement>('a.btn, button.btn');
  for (const btn of createBtns) {
    if (!btn.classList.contains('bq-review-btn-elevated')) {
      btn.classList.add('bq-review-btn-elevated');
    }
  }

  const reviewTables = reviewPane.querySelectorAll<HTMLTableElement>('table');
  for (const tbl of reviewTables) {
    if (!tbl.classList.contains('bq-reviews-table')) {
      tbl.classList.add('bq-reviews-table');
    }
  }

  enhanceReviewSliders(reviewPane);
  return true;
}

export function createCourseReviewObserver(document: Document) {
  let disposed = false;

  const tryEnhance = () => {
    if (disposed) return;
    enhanceCourseReviewTab(document);
  };

  tryEnhance();

  const observer = new (document.defaultView?.MutationObserver || MutationObserver)(() => {
    tryEnhance();
  });

  const target = document.querySelector('#info-tab-data') ||
    document.querySelector('#tabs-review') ||
    document.body;

  if (target) {
    observer.observe(target, { childList: true, subtree: true });
  }

  return {
    reconcile: tryEnhance,
    dispose() {
      disposed = true;
      observer.disconnect();
      disposeReviewSliders(document);
      const existing = document.querySelector('[data-betterquest="review-dashboard"]');
      existing?.remove();
      document.querySelectorAll<HTMLElement>('[data-betterquest-review-raw]').forEach(el => {
        el.style.removeProperty('display');
        el.removeAttribute('data-betterquest-review-raw');
      });
    },
  };
}
