import { useMemo, useState } from 'react';

type DayId = 'today' | 'friday' | 'monday';

type Day = {
  id: DayId;
  label: string;
  date: string;
  tone: string;
  items: Array<{ course: string; title: string; when: string; status: 'due' | 'soon' | 'later' }>;
};

const DAYS: Day[] = [
  {
    id: 'today',
    label: 'Today',
    date: 'Oct 9',
    tone: 'Now',
    items: [
      { course: 'M 408D', title: 'Sequences & series', when: '10:00 PM', status: 'due' },
      { course: 'PHY 303K', title: 'Lab notebook check', when: '11:59 PM', status: 'due' },
    ],
  },
  {
    id: 'friday',
    label: 'Friday',
    date: 'Oct 10',
    tone: 'Tomorrow',
    items: [
      { course: 'CH 301', title: 'Thermochemistry', when: '11:59 PM', status: 'soon' },
    ],
  },
  {
    id: 'monday',
    label: 'Monday',
    date: 'Oct 13',
    tone: 'Next',
    items: [
      { course: 'M 408D', title: 'Power series review', when: '5:00 PM', status: 'later' },
    ],
  },
];

export function DeadlineTimeline() {
  const [active, setActive] = useState<DayId>('today');
  const day = useMemo(() => DAYS.find((item) => item.id === active) ?? DAYS[0], [active]);
  const total = DAYS.reduce((sum, item) => sum + item.items.length, 0);
  const activeIndex = DAYS.findIndex((item) => item.id === active);
  const progress = (activeIndex + 1) / DAYS.length;

  return (
    <div className="feature-visual deadline-timeline" aria-label="Interactive deadline overview">
      <div className="deadline-timeline__top">
        <div>
          <small>This week across visited courses</small>
          <strong>{total} assignments in view</strong>
        </div>
        <em>{day.tone}</em>
      </div>

      <div className="deadline-timeline__track" style={{ ['--progress' as string]: String(progress) }}>
        <span className="deadline-timeline__rail" aria-hidden="true" />
        <span className="deadline-timeline__fill" aria-hidden="true" />
        {DAYS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`deadline-timeline__stop${item.id === active ? ' is-active' : ''}${index < activeIndex ? ' is-past' : ''}`}
            onClick={() => setActive(item.id)}
            aria-pressed={item.id === active}
          >
            <i aria-hidden="true">{item.items.length}</i>
            <span>{item.label}</span>
            <small>{item.date}</small>
          </button>
        ))}
      </div>

      <div className="deadline-timeline__panel" key={day.id}>
        <div className="deadline-timeline__panel-head">
          <span>{day.label}</span>
          <b>{day.items.length} due</b>
        </div>
        <ul>
          {day.items.map((item) => (
            <li key={`${item.course}-${item.title}`} data-status={item.status}>
              <div>
                <small>{item.course}</small>
                <strong>{item.title}</strong>
              </div>
              <em>{item.when}</em>
            </li>
          ))}
        </ul>
        <p>Click a day to see what lands there. BetterQuest only lists pages you have already opened on Quest.</p>
      </div>
    </div>
  );
}
