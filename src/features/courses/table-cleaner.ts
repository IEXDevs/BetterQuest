/**
 * Strips DataTables sort/filter controls and indicators from Quest's courses table
 * so that headers (Course, Name, Unique, Instructor, Meeting Time, Next Quest Assignment Due)
 * appear as clean, static column labels.
 */

export function createCoursesTableCleaner(table: HTMLTableElement) {
  let disposed = false;
  const document = table.ownerDocument;

  function findWrapper(): HTMLElement | null {
    return table.closest<HTMLElement>('.dataTables_wrapper, #courses-table_wrapper') ||
      document.querySelector<HTMLElement>('#courses-table_wrapper');
  }

  function cleanHeaderElement(th: HTMLTableCellElement) {
    th.classList.remove('sorting', 'sorting_asc', 'sorting_desc');
    th.classList.add('sorting_disabled');
    th.removeAttribute('tabindex');
    th.removeAttribute('aria-sort');
    const aria = th.getAttribute('aria-label');
    if (aria) {
      th.setAttribute('aria-label', aria.replace(/:\s*activate to sort.*/i, '').trim());
    }
    th.querySelectorAll('input, select, .column-filter').forEach(el => el.remove());
    th.style.setProperty('cursor', 'default', 'important');
    th.style.setProperty('background-image', 'none', 'important');
    th.style.setProperty('padding-right', '0.75rem', 'important');
    th.style.setProperty('pointer-events', 'none', 'important');
    th.style.setProperty('user-select', 'none', 'important');
    th.style.setProperty('-webkit-user-select', 'none', 'important');
  }

  function reconcile() {
    if (disposed) return;
    const wrapper = findWrapper();

    // Clean all <th> in the table's thead
    for (const th of table.querySelectorAll<HTMLTableCellElement>('thead th')) {
      cleanHeaderElement(th);
    }

    // Clean any clone/scroll thead if DataTables created one
    if (wrapper) {
      for (const th of wrapper.querySelectorAll<HTMLTableCellElement>('.dataTables_scrollHead thead th')) {
        cleanHeaderElement(th);
      }
      // Hide any filter rows
      wrapper.querySelectorAll<HTMLElement>('thead tr.filters, thead tr.filter-row').forEach(tr => {
        tr.style.display = 'none';
      });
      // Hide DataTables filter, length, info, paginate
      wrapper.querySelectorAll<HTMLElement>('.dataTables_filter, .dataTables_length, .dataTables_info, .dataTables_paginate').forEach(el => {
        el.style.display = 'none';
      });
      // Hide top row if it only has controls
      const firstRow = wrapper.querySelector<HTMLElement>(':scope > .row:first-child');
      if (firstRow && !firstRow.querySelector('table')) {
        firstRow.style.display = 'none';
      }
    }
  }

  // Intercept click on thead in capture phase to prevent DataTables sort events
  const stopSort = (e: MouseEvent) => {
    e.stopImmediatePropagation();
    e.preventDefault();
  };

  const activeTheads: HTMLElement[] = [];
  function bindTheadListeners() {
    const thead = table.querySelector('thead');
    if (thead && !activeTheads.includes(thead)) {
      thead.addEventListener('click', stopSort, true);
      activeTheads.push(thead);
    }
    const wrapper = findWrapper();
    const scrollThead = wrapper?.querySelector<HTMLElement>('.dataTables_scrollHead thead');
    if (scrollThead && !activeTheads.includes(scrollThead)) {
      scrollThead.addEventListener('click', stopSort, true);
      activeTheads.push(scrollThead);
    }
  }

  bindTheadListeners();
  reconcile();

  return {
    reconcile: () => {
      bindTheadListeners();
      reconcile();
    },
    dispose: () => {
      disposed = true;
      for (const th of activeTheads) {
        th.removeEventListener('click', stopSort, true);
      }
      activeTheads.length = 0;
    },
  };
}
