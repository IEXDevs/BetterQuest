import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type CourseId = 'm408d' | 'ch301' | 'phy303k';

type Task = {
  id: string;
  day: string;
  date: string;
  course: string;
  title: string;
  meta: string;
  status: string;
  priority?: boolean;
};

type Course = {
  id: CourseId;
  code: string;
  count: number;
  heading: string;
  tasks: Task[];
  saved: { question: string; note: string };
};

const COURSES: Course[] = [
  {
    id: 'm408d',
    code: 'M 408D',
    count: 4,
    heading: 'Four things need your attention.',
    tasks: [
      { id: 'm1', day: 'FRI', date: '09', course: 'M 408D', title: 'Sequences & series', meta: 'Homework 5 · 10:00 PM', status: 'In progress', priority: true },
      { id: 'm2', day: 'MON', date: '12', course: 'M 408D', title: 'Power series review', meta: 'Quiz prep · 5:00 PM', status: 'Not started' },
      { id: 'm3', day: 'WED', date: '14', course: 'M 408D', title: 'Taylor approximations', meta: 'Homework 6 · 10:00 PM', status: 'Not started' },
    ],
    saved: { question: 'Question 7', note: 'Return to Question 7 without hunting through the assignment.' },
  },
  {
    id: 'ch301',
    code: 'CH 301',
    count: 2,
    heading: 'Two chem deadlines this week.',
    tasks: [
      { id: 'c1', day: 'MON', date: '12', course: 'CH 301', title: 'Thermochemistry', meta: 'Quest 8 · 11:59 PM', status: 'Not started', priority: true },
      { id: 'c2', day: 'THU', date: '15', course: 'CH 301', title: 'Gas laws worksheet', meta: 'Homework · 11:59 PM', status: 'Not started' },
    ],
    saved: { question: 'Question 3', note: 'Enthalpy sign convention — check before the quiz.' },
  },
  {
    id: 'phy303k',
    code: 'PHY 303K',
    count: 3,
    heading: 'Three physics items still open.',
    tasks: [
      { id: 'p1', day: 'TUE', date: '13', course: 'PHY 303K', title: 'Rotational dynamics', meta: 'Homework 4 · 9:00 PM', status: 'In progress', priority: true },
      { id: 'p2', day: 'FRI', date: '16', course: 'PHY 303K', title: 'Angular momentum', meta: 'Lab preflight · 5:00 PM', status: 'Not started' },
      { id: 'p3', day: 'SUN', date: '18', course: 'PHY 303K', title: 'Midterm practice set', meta: 'Practice · open', status: 'Not started' },
    ],
    saved: { question: 'Question 12', note: 'Moment of inertia for the hollow cylinder — redraw the free-body.' },
  },
];

export function InteractiveProductFrame() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [activeCourse, setActiveCourse] = useState<CourseId>('m408d');
  const [selectedTask, setSelectedTask] = useState<string | null>('m1');
  const [savedOpen, setSavedOpen] = useState(true);
  const [tilt, setTilt] = useState({ x: 1, y: -2.5 });

  const course = useMemo(
    () => COURSES.find((item) => item.id === activeCourse) ?? COURSES[0],
    [activeCourse],
  );

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - py) * 6,
      y: (px - 0.5) * 8,
    });
  };

  const onPointerLeave = () => setTilt({ x: 1, y: -2.5 });

  return (
    <div
      ref={frameRef}
      className="product-frame is-interactive"
      aria-label="Interactive preview of BetterQuest's assignment overview"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        transform: `perspective(1200px) rotateY(${tilt.y}deg) rotateX(${tilt.x}deg)`,
      }}
    >
      <div className="frame-bar">
        <span /><span /><span />
        <code>quest.cns.utexas.edu/student</code>
        <em className="frame-live">Live preview</em>
      </div>
      <div className="frame-body">
        <aside className="frame-sidebar">
          <div className="mini-brand">BQ</div>
          <p>Courses</p>
          {COURSES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activeCourse ? 'active' : undefined}
              onClick={() => {
                setActiveCourse(item.id);
                setSelectedTask(item.tasks[0]?.id ?? null);
                setSavedOpen(true);
              }}
            >
              {item.code}
              <i>{item.count}</i>
            </button>
          ))}
          <small>Synced from pages you visit</small>
        </aside>
        <div className="frame-content" key={course.id}>
          <div className="frame-heading">
            <div>
              <small>Streak · day 12 · {course.code}</small>
              <strong>{course.heading}</strong>
            </div>
            <span className="frame-calendar-chip">Calendar sync</span>
          </div>
          {course.tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className={[
                'task',
                task.priority ? 'task-priority' : '',
                selectedTask === task.id ? 'task-selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelectedTask(task.id)}
            >
              <span className="task-date">{task.day}<br /><b>{task.date}</b></span>
              <div>
                <small>{task.course}</small>
                <strong>{task.title}</strong>
                <p>{task.meta}</p>
              </div>
              <em>{task.status}</em>
            </button>
          ))}
          <button
            type="button"
            className={`saved-question${savedOpen ? ' is-open' : ' is-closed'}`}
            onClick={() => setSavedOpen((value) => !value)}
            aria-pressed={savedOpen}
          >
            <span>{savedOpen ? '◆' : '◇'}</span>
            <div>
              <small>{savedOpen ? 'Saved question' : 'Bookmark cleared'}</small>
              <strong>{savedOpen ? course.saved.note : 'Click to restore the local bookmark.'}</strong>
            </div>
            <b>{savedOpen ? 'Open ↗' : 'Restore'}</b>
          </button>
        </div>
      </div>
    </div>
  );
}
