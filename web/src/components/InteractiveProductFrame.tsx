import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CourseArtBadge, type BackgroundStyle } from './CourseArtBadge';

type CourseId = 'm408d' | 'ch301' | 'phy303k';

type Task = {
  id: string;
  day: string;
  date: string;
  course: string;
  title: string;
  deadline: string;
  status: 'In progress' | 'Not started';
  priority?: boolean;
};

type Course = {
  id: CourseId;
  code: string;
  department: string;
  bgType: BackgroundStyle;
  name: string;
  unique: string;
  count: number;
  tasks: Task[];
  saved: { question: string; assignment: string; note: string };
};

const COURSES: Course[] = [
  {
    id: 'm408d',
    code: 'M408D',
    department: 'M',
    bgType: 'ether',
    name: 'Differential & Integral Calculus',
    unique: '58360',
    count: 4,
    // Listed in due order: the earlier sections were assigned first, so they
    // are the ones coming due now.
    tasks: [
      {
        id: 'm1',
        day: 'Fri',
        date: 'Oct 9',
        course: 'M408D',
        title: 'Section 12.5: Equations of Lines and Planes',
        deadline: 'Tonight, 10:00 PM',
        status: 'In progress',
        priority: true,
      },
      {
        id: 'm2',
        day: 'Mon',
        date: 'Oct 12',
        course: 'M408D',
        title: 'Section 12.6: Cylinders and Quadric Surfaces',
        deadline: 'Mon, 11:59 PM',
        status: 'Not started',
      },
      {
        id: 'm3',
        day: 'Wed',
        date: 'Oct 14',
        course: 'M408D',
        title: 'Section 13.1: Vector Functions and Space Curves',
        deadline: 'Wed, 10:00 PM',
        status: 'Not started',
      },
      {
        id: 'm4',
        day: 'Fri',
        date: 'Oct 16',
        course: 'M408D',
        title: 'Section 13.2: Derivatives and Integrals of Vector Functions',
        deadline: 'Fri, 11:59 PM',
        status: 'Not started',
        priority: true,
      },
    ],
    saved: {
      question: 'Question 4',
      assignment: 'Section 12.5',
      note: 'A line needs one point plus a direction vector; a plane needs the normal — plug the point in last.',
    },
  },
  {
    id: 'ch301',
    code: 'CH301',
    department: 'CH',
    bgType: 'light-fall',
    name: 'Chemistry I',
    unique: '51200',
    count: 2,
    tasks: [
      {
        id: 'c1',
        day: 'Mon',
        date: 'Oct 12',
        course: 'CH301',
        title: 'Thermochemistry & Enthalpy',
        deadline: 'Mon, 11:59 PM',
        status: 'Not started',
        priority: true,
      },
      {
        id: 'c2',
        day: 'Thu',
        date: 'Oct 15',
        course: 'CH301',
        title: 'Gas Laws & Partial Pressure',
        deadline: 'Thu, 11:59 PM',
        status: 'Not started',
      },
    ],
    saved: {
      question: 'Question 3',
      assignment: 'Quest 8',
      note: 'Enthalpy sign conventions: ΔH < 0 for exothermic reactions.',
    },
  },
  {
    id: 'phy303k',
    code: 'PHY303K',
    department: 'PHY',
    bgType: 'magic-rings',
    name: 'Physics I',
    unique: '56410',
    count: 3,
    tasks: [
      {
        id: 'p1',
        day: 'Tue',
        date: 'Oct 13',
        course: 'PHY303K',
        title: 'Rotational Dynamics & Torque',
        deadline: 'Tue, 9:00 PM',
        status: 'In progress',
        priority: true,
      },
      {
        id: 'p2',
        day: 'Fri',
        date: 'Oct 16',
        course: 'PHY303K',
        title: 'Angular Momentum Preflight',
        deadline: 'Fri, 5:00 PM',
        status: 'Not started',
      },
      {
        id: 'p3',
        day: 'Sun',
        date: 'Oct 18',
        course: 'PHY303K',
        title: 'Midterm Practice Set',
        deadline: 'Sun, 11:59 PM',
        status: 'Not started',
      },
    ],
    saved: {
      question: 'Question 12',
      assignment: 'Homework 4',
      note: 'Moment of inertia for hollow cylinder (I = MR²) — check axis.',
    },
  },
];

const CALENDAR_FEED = [
  { date: 'Fri, Oct 9', time: '10:00 PM', course: 'M408D', title: 'Section 12.5: Equations of Lines and Planes' },
  { date: 'Mon, Oct 12', time: '11:59 PM', course: 'M408D', title: 'Section 12.6: Cylinders and Quadric Surfaces' },
  { date: 'Mon, Oct 12', time: '11:59 PM', course: 'CH301', title: 'Thermochemistry & Enthalpy' },
  { date: 'Tue, Oct 13', time: '9:00 PM', course: 'PHY303K', title: 'Rotational Dynamics & Torque' },
  { date: 'Wed, Oct 14', time: '10:00 PM', course: 'M408D', title: 'Section 13.1: Vector Functions and Space Curves' },
  { date: 'Thu, Oct 15', time: '11:59 PM', course: 'CH301', title: 'Gas Laws & Partial Pressure' },
  { date: 'Fri, Oct 16', time: '5:00 PM', course: 'PHY303K', title: 'Angular Momentum Preflight' },
  { date: 'Fri, Oct 16', time: '11:59 PM', course: 'M408D', title: 'Section 13.2: Derivatives and Integrals of Vector Functions' },
];

export function InteractiveProductFrame() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [activeCourse, setActiveCourse] = useState<CourseId>('m408d');
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [savedOpen, setSavedOpen] = useState(true);
  const [frameDark, setFrameDark] = useState(true);
  const [viewMode, setViewMode] = useState<'queue' | 'calendar'>('queue');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackerSetting, setTrackerSetting] = useState(true);
  const [bookmarksSetting, setBookmarksSetting] = useState(true);
  const [animSetting, setAnimSetting] = useState(true);
  const [whimsySetting, setWhimsySetting] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.frame-menu-wrap')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [menuOpen]);

  const course = useMemo(
    () => COURSES.find((item) => item.id === activeCourse) ?? COURSES[0],
    [activeCourse],
  );

  const toggleTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - py) * 2.5,
      y: (px - 0.5) * 3,
    });
  };

  const onPointerLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={frameRef}
      className="product-frame is-interactive"
      data-frame-mode={frameDark ? 'dark' : 'light'}
      aria-label="Interactive preview of BetterQuest's assignment overview"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        transform: `perspective(1400px) rotateY(${tilt.y}deg) rotateX(${tilt.x}deg)`,
      }}
    >
      {/* Sleek App Window Header */}
      <div className="frame-window-bar">
        <div className="window-dots" aria-hidden="true">
          <span className="dot dot-1" />
          <span className="dot dot-2" />
          <span className="dot dot-3" />
        </div>

        <div className="window-location">
          <svg className="window-lock-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="window-path">quest.cns.utexas.edu</span>
          <span className="path-slash">/</span>
          <span className="window-subpath">student/courses</span>
        </div>

        <div className="window-actions">
          <div className="view-mode-tabs">
            <button
              type="button"
              className={`view-tab-btn ${viewMode === 'queue' ? 'is-active' : ''}`}
              onClick={() => setViewMode('queue')}
            >
              Assignments
            </button>
            <button
              type="button"
              className={`view-tab-btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              Calendar Feed
              <span className="tab-progress-chip">In progress</span>
            </button>
          </div>

          <div className="frame-menu-wrap">
            <button
              type="button"
              className={`frame-menu-btn ${menuOpen ? 'is-open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              aria-label="Toggle BetterQuest preview settings"
            >
              <span className="frame-menu-btn-label">BetterQuest</span>
              <svg
                className="frame-menu-chevron"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {menuOpen && (
              <div className="frame-dropdown-popup" role="dialog" aria-label="BetterQuest settings">
                <div className="dropdown-popup-header">
                  <strong>BetterQuest</strong>
                  <span className="dropdown-popup-sub">A calmer workspace for Quest.</span>
                </div>
                <div className="dropdown-popup-options">
                  <label className="dropdown-popup-label">
                    <span>
                      Assignment tracker
                      <small>Homepage overview and course summaries.</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="Assignment tracker"
                      checked={trackerSetting}
                      onChange={() => setTrackerSetting((v) => !v)}
                    />
                  </label>
                  <label className="dropdown-popup-label">
                    <span>
                      Question bookmarks
                      <small>Show save icons; saved questions remain available.</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="Question bookmarks"
                      checked={bookmarksSetting}
                      onChange={() => setBookmarksSetting((v) => !v)}
                    />
                  </label>
                  <label className="dropdown-popup-label">
                    <span>
                      Animations
                      <small>Fluid backgrounds, celebration walls, and motion.</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="Animations"
                      checked={animSetting}
                      onChange={() => setAnimSetting((v) => !v)}
                    />
                  </label>
                  <label className="dropdown-popup-label">
                    <span>
                      Whimsy mode
                      <small>Random funny pictures celebrate right and wrong answers.</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="Whimsy mode"
                      checked={whimsySetting}
                      onChange={() => setWhimsySetting((v) => !v)}
                    />
                  </label>
                  <label className="dropdown-popup-label">
                    <span>
                      Dark mode
                      <small>Quest components only; original PDF colors are preserved.</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="Dark mode"
                      checked={frameDark}
                      onChange={() => setFrameDark((v) => !v)}
                    />
                  </label>
                </div>
                <div className="dropdown-popup-quick">
                  <button
                    type="button"
                    onClick={() => {
                      setSavedOpen((v) => !v);
                      setMenuOpen(false);
                    }}
                  >
                    {savedOpen ? 'Hide Bookmark' : 'Show Bookmark'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode(viewMode === 'queue' ? 'calendar' : 'queue');
                      setMenuOpen(false);
                    }}
                  >
                    Switch View
                  </button>
                </div>
                <div className="dropdown-popup-footer">
                  <span>Saved to this device</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout - Fixed Height */}
      <div className="frame-body">
        {/* Clean, Non-Gaudy Sidebar */}
        <aside className="frame-sidebar">
          <div className="sidebar-brand-pill">
            <img src="/brand/BetterQuestFavicon.svg" alt="" className="sidebar-brand-glyph" width="28" height="28" />
            <span className="sidebar-brand-name">BetterQuest</span>
          </div>

          <div className="sidebar-heading">COURSES</div>

          <nav className="course-nav-list" aria-label="Course list">
            {COURSES.map((item) => {
              const isSelected = item.id === activeCourse;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`course-nav-item ${isSelected ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveCourse(item.id);
                    if (viewMode === 'calendar') setViewMode('queue');
                  }}
                >
                  <CourseArtBadge
                    department={item.department}
                    code={item.code}
                    bgType={item.bgType}
                    size="sm"
                  />
                  <div className="course-item-main">
                    <span className="course-item-code">{item.code}</span>
                    <span className="course-item-name">{item.name}</span>
                  </div>
                  <span className="course-item-count">{item.count}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-bottom-meta">
            <div className="storage-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Local storage only</span>
            </div>
            <span className="storage-sub">Zero telemetry on Quest answers</span>
          </div>
        </aside>

        {/* Content Viewport */}
        <div className="frame-content">
          {viewMode === 'queue' ? (
            <>
              {/* Hero Course Art Banner with Swirl / Pixel / Aurora and Typography on Top */}
              <div className="course-hero-banner-wrap">
                <CourseArtBadge
                  department={course.department}
                  code={course.code}
                  name={course.name}
                  unique={course.unique}
                  bgType={course.bgType}
                  size="hero"
                />
              </div>

              {/* Subheader with Streak & Sync */}
              <div className="course-content-header">
                <div className="header-titles">
                  <div className="header-eyebrow-row">
                    <span className="streak-indicator">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 23c-4.97 0-9-3.8-9-8.5 0-3.37 2.13-6.52 4.45-8.78.36-.35.94-.13.98.37.16 2.05 1.55 3.73 3.07 3.91.24.03.46-.14.48-.38.16-1.92 1.35-4.48 3.52-6.62.33-.33.88-.13.93.33.28 2.62 1.95 4.67 3.57 6.67 1 1.25 1 3.5 1 4.5 0 4.7-4.03 8.5-9 8.5z" />
                      </svg>
                      <span>12-day streak</span>
                    </span>
                    <span className="unique-chip">Quest Verified · Local Cache</span>
                  </div>
                </div>

                {/* Calendar Sync Pill — work in progress */}
                <div
                  className="calendar-sync-pill is-pending"
                  title="Calendar feed — not final UI, currently in progress"
                >
                  <svg
                    className="sync-icon-glyph"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <div className="sync-pill-text">
                    <span className="sync-title">GCal Sync</span>
                    <span className="sync-meta">
                      <span className="status-progress-dot" />
                      In progress
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Tasks Viewport */}
              <div className="course-tasks-viewport">
                <div className="tasks-rows">
                  {course.tasks.map((task) => {
                    const isDone = !!completedTasks[task.id];

                    return (
                      <div
                        key={task.id}
                        className={`task-row ${isDone ? 'is-done' : ''}`}
                        onClick={(e) => toggleTask(task.id, e)}
                      >
                        <button
                          type="button"
                          className={`task-check-circle ${isDone ? 'is-checked' : ''}`}
                          onClick={(e) => toggleTask(task.id, e)}
                          aria-label={`Mark ${task.title} as ${isDone ? 'incomplete' : 'complete'}`}
                        >
                          {isDone ? (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                        </button>

                        <div className="task-body">
                          <div className="task-title-line">
                            <span className="task-name">{task.title}</span>
                          </div>
                          <div className="task-meta-line">
                            <span className={`task-status-label ${isDone ? 'is-done' : ''}`}>
                              {isDone ? 'Completed (manual)' : task.status}
                            </span>
                            <span className="meta-sep">•</span>
                            <span className="task-due-time">{task.deadline}</span>
                          </div>
                        </div>

                        <div className="task-action-cell">
                          <button
                            type="button"
                            className={`task-mark-btn ${isDone ? 'is-done' : ''}`}
                            onClick={(e) => toggleTask(task.id, e)}
                            title={isDone ? 'Marked complete. Click to undo.' : 'Mark complete'}
                            aria-label={isDone ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                          >
                            {isDone ? '✓ Completed' : 'Mark done'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Clean Up-To-Date Placeholder when fewer tasks */}
                {course.tasks.length < 3 ? (
                  <div className="tasks-clear-placeholder">
                    <div className="placeholder-icon">✓</div>
                    <div className="placeholder-text">
                      <strong>All other {course.code} work completed</strong>
                      <p>No remaining open assignments for this week. Synchronizes on Quest visits.</p>
                    </div>
                  </div>
                ) : null}

                {/* Pinned Question / Bookmark */}
                <div className="pinned-question-module">
                  <div
                    className="pinned-question-bar"
                    onClick={() => setSavedOpen((v) => !v)}
                  >
                    <div className="pinned-left">
                      <span className="pinned-glyph">📌</span>
                      <div className="pinned-text-block">
                        <div className="pinned-label-row">
                          <span className="pinned-tag">Pinned Bookmark</span>
                          <span className="pinned-target">{course.code} · {course.saved.question}</span>
                        </div>
                        <p className="pinned-note-text">
                          {savedOpen ? course.saved.note : 'Question note hidden (click to expand)'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="pinned-jump-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSavedOpen((v) => !v);
                      }}
                    >
                      {savedOpen ? 'Jump to Question ↗' : 'Restore'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Google Calendar Live ICS View */
            <div className="calendar-feed-view">
              <div className="feed-header">
                <div className="feed-header-left">
                  <div className="feed-status-badge">
                    <span className="feed-dot" />
                    <span>In progress</span>
                  </div>
                  <h4>Google Calendar · Quest Feed</h4>
                  <p>Subscribe once in Google Calendar. Visited assignments update daily automatically.</p>
                  <p className="feed-progress-note">(not final UI — currently in progress)</p>
                </div>

                <button
                  type="button"
                  className="feed-copy-btn is-pending"
                  disabled
                  title="Not ready yet — currently in progress"
                >
                  Copy .ics Link · In progress
                </button>
              </div>

              <div className="feed-events-list">
                <div className="feed-list-head">
                  <span>DATE & TIME</span>
                  <span>COURSE & ASSIGNMENT</span>
                  <span>STATUS</span>
                </div>
                <div className="feed-events-scroll">
                  {CALENDAR_FEED.map((event, idx) => (
                    <div key={`${event.title}-${idx}`} className="feed-event-item">
                      <div className="event-time-col">
                        <b>{event.date}</b>
                        <small>{event.time}</small>
                      </div>
                      <div className="event-name-col">
                        <strong>{event.title}</strong>
                        <span className="event-course-pill">{event.course}</span>
                      </div>
                      <div className="event-status-col is-pending">
                        <span className="status-progress-dot" />
                        <span>In progress</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="feed-footer">
                <span>URL: <code>webcal://betterquest.iexdevs.com/feed.ics</code></span>
                <button type="button" className="feed-back-btn" onClick={() => setViewMode('queue')}>
                  ← Back to Assignments
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
