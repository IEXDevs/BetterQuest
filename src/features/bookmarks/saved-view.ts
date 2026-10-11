import { BookmarkService, bookmarkUrl } from './service';
import type { Subscribe } from '../assignments/section';

/** A grouped, metadata-only in-page view. No new extension page or PDF viewer. */
export function createSavedQuestionsView(document: Document, service: BookmarkService, subscribe: Subscribe, onClose: (restoreFocus: boolean) => void, focusUpcoming: () => boolean) {
  document.querySelectorAll('[data-betterquest="saved-questions"]').forEach(node => node.remove());
  const host = document.createElement('div'); host.dataset.betterquest = 'saved-questions'; host.hidden = true;
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.addEventListener('click', event => event.stopPropagation());
  const style = document.createElement('style');
  style.textContent = `
    :host{display:block;margin:12px 18px;color:var(--bq-text,#26384a);scroll-margin-top:80px;font-family:inherit}
    :host([hidden]){display:none}
    section{background:var(--bq-surface,#fff);border:1px solid var(--bq-border,#e1e7ed);border-radius:7px;padding:16px 18px;font:inherit;font-size:13px;line-height:1.5}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px}
    h2{font:inherit;font-size:17px;font-weight:600;margin:0}h2:focus-visible{outline:2px solid #2563eb;outline-offset:4px}
    .actions{display:flex;gap:8px;align-items:center}button{font:inherit;cursor:pointer;background:transparent;color:var(--bq-accent,#227ab0);border:0;border-radius:4px;padding:5px 7px}
    button:hover{background:var(--bq-raised,#eff6ff)}button:disabled{opacity:.5;cursor:wait}
    button:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--bq-accent,#2563eb);outline-offset:2px}
    .caption,.empty{color:var(--bq-muted,#71808c);font-size:12px;margin:8px 0}.error{color:var(--bq-warning,#a3453c)}
    .groups{max-height:420px;overflow:auto;margin-top:12px}
    details{border-top:1px solid var(--bq-border,#edf1f4);padding:10px 0;transition:background .22s cubic-bezier(0.16,1,0.3,1),border-radius .22s ease}
    details[open]{background:color-mix(in srgb,var(--bq-surface,#fff) 94%,var(--bq-raised,#eff6ff));border-radius:7px;padding:10px 10px}
    details[open]>*:not(summary){animation:details-fluid-slide .24s cubic-bezier(0.16,1,0.3,1) both}
    @keyframes details-fluid-slide{0%{opacity:0;transform:translateY(-6px)}100%{opacity:1;transform:translateY(0)}}
    summary{cursor:pointer;font-weight:650;display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:5px;transition:background .2s cubic-bezier(0.16,1,0.3,1),transform .2s cubic-bezier(0.16,1,0.3,1),color .18s ease;user-select:none;list-style:none}
    summary::-webkit-details-marker{display:none}
    summary:hover{background:var(--bq-raised,#eff6ff);color:var(--bq-accent,#227ab0);transform:translateX(3px)}
    summary::after{content:'›';font-size:19px;line-height:1;display:inline-block;transition:transform .3s cubic-bezier(0.34,1.56,0.64,1);transform:rotate(90deg)}
    details[open] summary::after{transform:rotate(-90deg);color:var(--bq-accent,#818cf8)}
    h3{font:inherit;font-size:13px;font-weight:600;margin:12px 0 6px}ul{padding:0;margin:0;list-style:none}
    li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0}a{color:var(--bq-accent,#227ab0);text-decoration:none}a:hover{text-decoration:underline}
    .question-note{display:block;color:var(--bq-muted,#71808c);font-size:11px}.remove{font-size:11px}
  `;
  const section = document.createElement('section'); section.setAttribute('aria-labelledby', 'bq-saved-title');
  const header = document.createElement('header');
  const title = document.createElement('h2'); title.id = 'bq-saved-title'; title.textContent = 'Saved Questions'; title.tabIndex = -1;
  const actions = document.createElement('div'); actions.className = 'actions';
  const upcoming = document.createElement('button'); upcoming.type = 'button'; upcoming.textContent = 'Upcoming'; upcoming.title = 'Jump to the course assignment summary';
  upcoming.addEventListener('click', () => { focusUpcoming(); });
  const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.textContent = '×'; closeButton.setAttribute('aria-label', 'Close Saved Questions');
  actions.append(upcoming, closeButton); header.append(title, actions);
  const caption = document.createElement('p'); caption.className = 'caption';
  caption.textContent = 'Saved on this device. Links open the original assignment; the question number is your reference. No PDF text or page position is extracted.';
  const groups = document.createElement('div'); groups.className = 'groups'; groups.setAttribute('aria-live', 'polite');
  section.append(header, caption, groups); shadow.append(style, section);
  let disposed = false;
  let generation = 0;
  let stop: (() => void) | undefined;

  function close(restoreFocus = true) {
    host.hidden = true; generation++; stop?.(); stop = undefined; onClose(restoreFocus);
  }
  closeButton.addEventListener('click', () => close());
  shadow.addEventListener('keydown', event => {
    if ((event as KeyboardEvent).key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  });
  async function refresh() {
    const current = ++generation;
    try {
      const organized = await service.organized();
      if (disposed || host.hidden || current !== generation) return;
      const expanded = new Set([...groups.querySelectorAll<HTMLDetailsElement>('details[open]')].map(detail => detail.dataset.courseId));
      groups.replaceChildren();
      if (!organized.size) {
        const empty = document.createElement('p'); empty.className = 'empty';
        empty.textContent = 'No saved questions yet. Bookmark questions on any assignment to view them here.';
        groups.append(empty); return;
      }
      for (const [courseId, assignments] of organized) {
        const first = [...assignments.values()][0][0];
        const count = [...assignments.values()].reduce((total, rows) => total + rows.length, 0);
        const course = document.createElement('details'); course.dataset.courseId = courseId; course.open = expanded.has(courseId) || organized.size === 1;
        const summary = document.createElement('summary'); summary.textContent = `${first.course.title} (${count})`; course.append(summary);
        for (const rows of assignments.values()) {
          const heading = document.createElement('h3'); heading.textContent = rows[0].assignment.title;
          const list = document.createElement('ul');
          for (const bookmark of [...rows].sort((a, b) => (a.question.number || '').localeCompare(b.question.number || '', undefined, { numeric: true }))) {
            const item = document.createElement('li'); item.dataset.bookmarkId = bookmark.id;
            const info = document.createElement('div');
            const link = document.createElement('a'); link.href = bookmarkUrl(bookmark); link.textContent = `Question ${bookmark.question.number || bookmark.question.sourceId} ↗`;
            info.append(link);
            if (bookmark.note) { const note = document.createElement('span'); note.className = 'question-note'; note.textContent = bookmark.note; info.append(note); }
            const remove = document.createElement('button'); remove.className = 'remove'; remove.type = 'button'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove saved question ${bookmark.question.number || bookmark.question.sourceId} from ${bookmark.assignment.title}`);
            remove.addEventListener('click', () => {
              remove.disabled = true;
              void service.remove(bookmark.id).then(() => refresh()).catch(error => { remove.disabled = false; remove.title = error instanceof Error ? error.message : 'Could not remove question.'; });
            });
            item.append(info, remove); list.append(item);
          }
          course.append(heading, list);
        }
        groups.append(course);
      }
    } catch (error) {
      if (!disposed && !host.hidden && current === generation) {
        const message = document.createElement('p'); message.className = 'error'; message.setAttribute('role', 'alert');
        message.textContent = error instanceof Error ? error.message : 'Could not load Saved Questions.'; groups.replaceChildren(message);
      }
    }
  }
  return {
    position(navbar: HTMLElement) { if (navbar.nextSibling !== host) navbar.after(host); },
    open(navbar: HTMLElement, showUpcoming: boolean) {
      if (disposed) return;
      if (navbar.nextSibling !== host) navbar.after(host);
      host.hidden = false; upcoming.hidden = !showUpcoming;
      if (!stop) { try { stop = subscribe(() => { void refresh(); }); } catch { /* Reopening still reads persisted state. */ } }
      groups.textContent = 'Loading saved questions…'; void refresh();
      host.scrollIntoView?.({ block: 'start' }); title.focus({ preventScroll: true });
    },
    close,
    isOpen: () => !host.hidden && !disposed,
    dispose() { disposed = true; generation++; stop?.(); stop = undefined; host.remove(); },
  };
}