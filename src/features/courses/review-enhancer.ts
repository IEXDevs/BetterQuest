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

export function enhanceCourseReviewTab(document: Document): boolean {
  const reviewPane = findReviewPane(document);

  if (!reviewPane) return false;

  const existingDashboard = reviewPane.querySelector<HTMLElement>('[data-betterquest="review-dashboard"]');


  // Don't format if currently just a loading spinner without review content
  if (reviewPane.querySelector('.preloader-wrapper.active') && !reviewPane.textContent?.includes('Custom Reviews')) {
    return false;
  }

  const stats = extractReviewStats(reviewPane);
  const source = reviewPane.cloneNode(true) as HTMLElement;
  source.querySelectorAll('[data-betterquest]').forEach(node => node.remove());
  if (!stats && !/Custom Reviews allow|Our research shows/i.test(source.textContent || '')) return false;
  const signature = JSON.stringify(stats);
  if (existingDashboard?.dataset.stats === signature) {
    hideRawReviewElements(reviewPane, document);
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
      const existing = document.querySelector('[data-betterquest="review-dashboard"]');
      existing?.remove();
      document.querySelectorAll<HTMLElement>('[data-betterquest-review-raw]').forEach(el => {
        el.style.removeProperty('display');
        el.removeAttribute('data-betterquest-review-raw');
      });
    },
  };
}
