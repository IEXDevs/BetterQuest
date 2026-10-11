export interface ReviewStats {
  completed: number;
  total: number;
  percent: number;
  remainingToGoal: number;
}

export function extractReviewStats(container: HTMLElement): ReviewStats | null {
  const text = container.textContent || '';
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
  const completed = stats ? stats.completed : 0;
  const total = stats ? stats.total : 0;
  const percent = stats ? stats.percent : 0;
  const toGo = stats ? stats.remainingToGoal : Math.max(0, 100 - completed);

  const dashboard = doc.createElement('div');
  dashboard.className = 'bq-review-dashboard';
  dashboard.dataset.betterquest = 'review-dashboard';

  // 1. Hero Section
  const hero = doc.createElement('div');
  hero.className = 'bq-review-hero';

  const heroText = doc.createElement('div');
  heroText.className = 'bq-review-hero-text';

  const badge = doc.createElement('div');
  badge.className = 'bq-review-badge';
  badge.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg><span>Custom Practice Hub</span>`;

  const title = doc.createElement('h2');
  title.className = 'bq-review-title';
  title.textContent = 'Custom Reviews';

  const lead = doc.createElement('p');
  lead.className = 'bq-review-lead';
  lead.textContent = 'Build non-graded practice sets from homework, learning modules, and exam questions to master concepts at your own pace.';

  heroText.append(badge, title, lead);
  hero.append(heroText);

  // 2. Stats & Progress Card
  const statsCard = doc.createElement('div');
  statsCard.className = 'bq-review-stats-card';

  const statsGrid = doc.createElement('div');
  statsGrid.className = 'bq-review-stats-grid';

  // Completed Count
  const statCompleted = doc.createElement('div');
  statCompleted.className = 'bq-review-stat';
  statCompleted.innerHTML = `
    <span class="bq-stat-label">Problems Completed</span>
    <div class="bq-stat-val-group">
      <span class="bq-stat-val">${completed}</span>
      <span class="bq-stat-denom">/ ${total}</span>
    </div>
    <span class="bq-stat-sub">${total > completed ? `${total - completed} remaining to practice` : 'All available practiced!'}</span>
  `;

  // Percentage
  const statPercent = doc.createElement('div');
  statPercent.className = 'bq-review-stat';
  statPercent.innerHTML = `
    <span class="bq-stat-label">Completion Rate</span>
    <div class="bq-stat-val-group">
      <span class="bq-stat-val bq-stat-accent">${percent}%</span>
    </div>
    <span class="bq-stat-sub">of available problem pool</span>
  `;

  // Goal Tracker (+6pt Boost)
  const statGoal = doc.createElement('div');
  statGoal.className = 'bq-review-stat';
  statGoal.innerHTML = `
    <span class="bq-stat-label">Goal for +6pt Boost</span>
    <div class="bq-stat-val-group">
      <span class="bq-stat-val ${toGo === 0 ? 'bq-stat-achieved' : 'bq-stat-good'}">${toGo === 0 ? 'Goal Achieved! 🎉' : `${toGo} to go`}</span>
    </div>
    <span class="bq-stat-sub">100 problem semester milestone</span>
  `;

  statsGrid.append(statCompleted, statPercent, statGoal);

  // Progress Bar Container
  const trackWrapper = doc.createElement('div');
  trackWrapper.className = 'bq-review-track-wrapper';

  const track = doc.createElement('div');
  track.className = 'bq-review-track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuenow', String(percent));
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-label', `Review completion: ${percent}%`);

  const fill = doc.createElement('div');
  fill.className = 'bq-review-fill';
  fill.style.width = `${Math.min(100, Math.max(percent, percent > 0 ? 3 : 0))}%`;

  const glow = doc.createElement('span');
  glow.className = 'bq-review-glow';
  fill.append(glow);
  track.append(fill);

  // Target marker tick on progress bar if total > 100
  if (total >= 100) {
    const targetPercent = Math.min(100, Math.round((100 / total) * 100));
    const targetTick = doc.createElement('div');
    targetTick.className = 'bq-review-target-tick';
    targetTick.style.left = `${targetPercent}%`;
    targetTick.title = '100 Problem Milestone (+6pt Grade Lift)';
    targetTick.innerHTML = `<span class="bq-target-tick-line"></span><span class="bq-target-tick-badge">🎯 100</span>`;
    track.append(targetTick);
  }

  // Milestones row below progress bar
  const milestones = doc.createElement('div');
  milestones.className = 'bq-review-milestones';
  milestones.innerHTML = `
    <span class="bq-milestone-item">0 start</span>
    <span class="bq-milestone-item bq-milestone-highlight">🎯 100 Target (+6pts Course Grade Lift)</span>
    <span class="bq-milestone-item">${total > 0 ? `${total} Total Available` : ''}</span>
  `;

  trackWrapper.append(track, milestones);
  statsCard.append(statsGrid, trackWrapper);

  // 3. Research Insights Grid (3 Cards)
  const insightsGrid = doc.createElement('div');
  insightsGrid.className = 'bq-review-insights-grid';

  // Insight 1: 100 Problems
  const insight1 = doc.createElement('div');
  insight1.className = 'bq-insight-card';
  insight1.innerHTML = `
    <div class="bq-insight-top">
      <div class="bq-insight-icon bq-icon-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      </div>
      <span class="bq-insight-pill bq-pill-accent">+6 Pts Avg Lift</span>
    </div>
    <h3 class="bq-insight-title">Target 100+ Problems</h3>
    <p class="bq-insight-desc">
      Students who successfully work 100 or more review questions over the semester see an average <strong>6-point lift</strong> in their final course grade.
    </p>
  `;

  // Insight 2: Deep Practice
  const insight2 = doc.createElement('div');
  insight2.className = 'bq-insight-card';
  insight2.innerHTML = `
    <div class="bq-insight-top">
      <div class="bq-insight-icon bq-icon-good">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <span class="bq-insight-pill bq-pill-good">&gt;90s Per Item</span>
    </div>
    <h3 class="bq-insight-title">Deep Practice Over Speed</h3>
    <p class="bq-insight-desc">
      Spend 90+ seconds working through each problem. Working through steps rather than treating them like flashcards builds durable retention.
    </p>
  `;

  // Insight 3: Daytime Consistency
  const insight3 = doc.createElement('div');
  insight3.className = 'bq-insight-card';
  insight3.innerHTML = `
    <div class="bq-insight-top">
      <div class="bq-insight-icon bq-icon-amber">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M12 8v8"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><circle cx="12" cy="12" r="4"/></svg>
      </div>
      <span class="bq-insight-pill bq-pill-amber">8 AM – 11 PM</span>
    </div>
    <h3 class="bq-insight-title">Daytime Consistency</h3>
    <p class="bq-insight-desc">
      Working a small number of items daily between 8 AM and 11 PM is significantly more effective than late-night cram sessions.
    </p>
  `;

  insightsGrid.append(insight1, insight2, insight3);

  dashboard.append(hero, statsCard, insightsGrid);
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
      if (el.dataset.betterquest) return;

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

export function enhanceCourseReviewTab(document: Document): boolean {
  const reviewPane = document.querySelector<HTMLElement>('#tabs-review') ||
    document.querySelector<HTMLElement>('.tab-pane#tabs-review') ||
    document.querySelector<HTMLElement>('[data-betterquest-page="review"]');

  if (!reviewPane) return false;

  const existingDashboard = reviewPane.querySelector<HTMLElement>('[data-betterquest="review-dashboard"]');
  if (existingDashboard) {
    // If stats are already present, return true
    return true;
  }

  // Don't format if currently just a loading spinner without review content
  if (reviewPane.querySelector('.preloader-wrapper.active') && !reviewPane.textContent?.includes('Custom Reviews')) {
    return false;
  }

  const stats = extractReviewStats(reviewPane);

  // Hide raw unstyled text elements safely while preserving buttons, tables, links
  hideRawReviewElements(reviewPane, document);

  // Create and mount the new dashboard
  const dashboard = createReviewDashboard(stats, document);
  reviewPane.prepend(dashboard);
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
