import { ASSIGNMENT_SELECTORS } from '../../adapters/quest/assignments';
import type { AssignmentSnapshot, LocalState } from '../../shared/models';
import { execute, subscribeLocal, type Execute } from '../../shared/client';
import type { Subscribe } from './section';
import { assignmentIsCompleted, assignmentPanelData, displayDeadline } from './view-model';

/** A sibling preview leaves Quest's collapse, tables, and DataTables untouched. */
export function createAssignmentGroupPreviews(root: Element, run: Execute = execute, subscribe: Subscribe = subscribeLocal) {
  const document = root.ownerDocument;
  const visibility = document.createElement('style');
  visibility.dataset.betterquest = 'assignment-group-preview-style';
  // Hide only while Bootstrap is mid-animation; an open category with pending
  // work keeps its preview visible (collapsed categories stay preview-free).
  visibility.textContent = '.collapsing + [data-betterquest="assignment-group-preview"] { display: none !important; }';
  root.append(visibility);
  const mounted = new Map<HTMLElement, { host: HTMLElement; content: HTMLElement; signature: string }>();
  let snapshot: AssignmentSnapshot | undefined;
  let disposed = false, generation = 0;
  let stop: (() => void) | undefined;

  function render(state: LocalState) {
    if (disposed || !snapshot) return;
    const courseIds = new Set(snapshot.courses.map(course => course.id));
    const assignments = new Map(state.cache.assignments.filter(item => courseIds.has(item.courseId)).map(item => [item.id, item]));
    // Fresh page values take precedence over a previous cache observation.
    for (const assignment of snapshot.assignments) assignments.set(assignment.id, assignment);
    const sorted = assignmentPanelData({ ...state.cache, assignments: [...assignments.values()] }).assignments;
    const panels = new Map<HTMLElement, string>();
    for (const table of root.querySelectorAll(ASSIGNMENT_SELECTORS.tables)) {
      const groupId = table.id.slice('instances-table-eh'.length);
      const panel = document.getElementById(`header-${groupId}`);
      if (panel && root.contains(panel) && panel.contains(table)) panels.set(panel, groupId);
    }
    for (const [panel, preview] of mounted) {
      if (!panels.has(panel) || !preview.host.isConnected || panel.nextElementSibling !== preview.host) {
        preview.host.remove(); mounted.delete(panel);
      }
    }
    for (const [panel, groupId] of panels) {
      let preview = mounted.get(panel);
      if (!preview) {
        const host = document.createElement('section');
        host.dataset.betterquest = 'assignment-group-preview';
        host.setAttribute('aria-label', 'Pending assignments');
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = `
          :host{display:block;color:var(--bq-text,#18253a);font:inherit;text-align:left}
          :host([hidden]){display:none}
          .content{padding:12px 18px;background:var(--bq-surface,#fff);border-top:1px solid var(--bq-border,#d7e2f0)}
          h3{margin:0 0 6px;font:600 12px/1.5 system-ui,sans-serif;color:var(--bq-muted,#607286)}
          ul{list-style:none;margin:0;padding:0}
          li{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:7px 0;font-size:13px;line-height:1.5}
          li+li{border-top:1px solid var(--bq-border,#d7e2f0)}
          a{color:var(--bq-accent,#227ab0);text-decoration:none;overflow-wrap:anywhere;font-weight:600}
          a:hover{text-decoration:underline}a:focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:3px}
          .deadline{flex-shrink:0;color:var(--bq-muted,#607286);font-size:12px}
          .overdue{color:var(--bq-warning,#a96645)}
          @media(max-width:600px){li{flex-wrap:wrap;gap:2px 12px}.deadline{flex-shrink:1}.content{padding:10px 12px}}
        `;
        const content = document.createElement('div'); content.className = 'content';
        shadow.append(style, content); panel.after(host);
        preview = { host, content, signature: '' }; mounted.set(panel, preview);
      }
      const pending = sorted.filter(item => item.group?.id === groupId && !assignmentIsCompleted(item, state.completionOverrides));
      const items = pending.map(assignment => ({ assignment, deadline: displayDeadline(assignment, Date.now(), state.completionOverrides) }));
      // Quest marks an open category with `.show`, and `.collapsing` while it animates.
      const open = panel.classList.contains('show') || panel.classList.contains('collapsing');
      // A closed category speaks for itself, and a category with nothing pending needs no
      // "0 pending" box — the native table already shows the work that is left.
      const visible = open && items.length > 0;
      if (preview.host.hidden === visible) preview.host.hidden = !visible;
      const signature = JSON.stringify({ items });
      if (signature === preview.signature) continue;
      preview.signature = signature;
      const heading = document.createElement('h3'); heading.textContent = `${items.length} pending`;
      const list = document.createElement('ul');
      for (const { assignment, deadline } of items) {
        const item = document.createElement('li');
        const link = document.createElement('a'); link.href = assignment.url; link.textContent = assignment.title;
        const due = document.createElement('span'); due.className = `deadline${deadline.overdue ? ' overdue' : ''}`;
        due.textContent = `${deadline.overdue ? 'Overdue · ' : ''}${deadline.date} · ${deadline.time}${assignment.completion === 'unknown' ? ' · Status unknown' : ''}`;
        if (assignment.deadline.iso) {
          const time = document.createElement('time'); time.dateTime = assignment.deadline.iso;
          time.textContent = due.textContent; due.replaceChildren(time);
        }
        item.append(link, due); list.append(item);
      }
      // Nothing to show leaves the box empty as well as hidden.
      preview.content.replaceChildren();
      if (items.length) preview.content.append(heading, list);
    }
  }

  async function refresh() {
    const current = ++generation;
    try {
      const state = await run({ kind: 'state:read' });
      if (!disposed && current === generation) render(state);
    } catch {
      if (!disposed && current === generation) {
        console.warn('[BetterQuest] Assignment previews could not initialize. Reload the extension and refresh Quest; check the extension service worker for storage errors.');
      }
      // Native tables remain available. Never log personal assignment data.
    }
  }

  return {
    async reconcile(value: AssignmentSnapshot) {
      if (disposed) return;
      snapshot = value;
      if (!stop) { try { stop = subscribe(() => { void refresh(); }); } catch { /* Page changes still refresh. */ } }
      await refresh();
    },
    dispose() {
      disposed = true; generation++; stop?.();
      visibility.remove();
      for (const preview of mounted.values()) preview.host.remove();
      mounted.clear();
    },
  };
}
