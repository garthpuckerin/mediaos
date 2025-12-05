import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import clsx from 'clsx';

// Icons
const IconChevronLeft = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const IconChevronRight = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const IconCalendar = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

type ViewMode = 'week' | 'month';

interface CalendarEvent {
  key?: string;
  title: string;
  day: string;
  date?: string;
  kind: string;
  daysUntil?: number;
  itemId?: string;
  lastScan?: {
    at: string;
    found: number;
  };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Helper to get the start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to get all days in a month view (including prev/next month padding)
function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - i - 1);
    days.push(d);
  }

  // Add all days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add days from next month to complete the last week
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

// Helper to format date as YYYY-MM-DD
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to check if two dates are the same day
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function CalendarPage() {
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Load view preference from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('calendar:viewPreferences');
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.viewMode) setViewMode(prefs.viewMode);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save view preference
  React.useEffect(() => {
    try {
      localStorage.setItem(
        'calendar:viewPreferences',
        JSON.stringify({ viewMode })
      );
    } catch {
      // Ignore
    }
  }, [viewMode]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/calendar');
        const j = await res.json();
        if (!cancelled) setEvents(Array.isArray(j.events) ? j.events : []);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Navigation handlers
  const goToPrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate((d) => {
        const newDate = new Date(d);
        newDate.setDate(newDate.getDate() - 7);
        return newDate;
      });
    } else {
      setCurrentDate((d) => {
        const newDate = new Date(d);
        newDate.setMonth(newDate.getMonth() - 1);
        return newDate;
      });
    }
  };

  const goToNext = () => {
    if (viewMode === 'week') {
      setCurrentDate((d) => {
        const newDate = new Date(d);
        newDate.setDate(newDate.getDate() + 7);
        return newDate;
      });
    } else {
      setCurrentDate((d) => {
        const newDate = new Date(d);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
      });
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((ev) => {
      const eventDate = new Date(ev.day || ev.date || '');
      return isSameDay(eventDate, date);
    });
  };

  // Generate days to display
  const displayDays = React.useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      });
    } else {
      return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    }
  }, [currentDate, viewMode]);

  const getLink = (ev: CalendarEvent) => {
    const kind = String(ev.kind || 'series');
    const plural =
      kind === 'movie' ? 'movies' : kind === 'book' ? 'books' : kind;
    return `/library/${plural}/item/${encodeURIComponent(ev.itemId || '')}`;
  };

  // Header text
  const headerText = React.useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        return `${MONTHS[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()} - ${MONTHS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
      }
    } else {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  }, [currentDate, viewMode]);

  // Upcoming events (next 3 days) for sidebar
  const upcomingSoon = React.useMemo(
    () =>
      events
        .filter(
          (ev: CalendarEvent) =>
            typeof ev?.daysUntil === 'number' &&
            ev.daysUntil >= 0 &&
            ev.daysUntil <= 3
        )
        .slice(0, 5),
    [events]
  );

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'series':
        return 'bg-indigo-500';
      case 'movie':
        return 'bg-pink-500';
      case 'book':
        return 'bg-amber-500';
      case 'music':
        return 'bg-emerald-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <section className="max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <IconCalendar />
            Calendar
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex p-1 bg-gray-900 rounded-lg">
            <button
              onClick={() => setViewMode('week')}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'week'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'month'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main Calendar */}
        <Card className="border-gray-800 bg-gray-900/30 overflow-hidden">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <Button variant="ghost" size="sm" onClick={goToPrevious}>
              <IconChevronLeft />
            </Button>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{headerText}</h3>
              <Button variant="secondary" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={goToNext}>
              <IconChevronRight />
            </Button>
          </div>

          {/* Calendar Grid */}
          <CardContent className="p-0">
            {loading && (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            )}

            {!loading && (
              <>
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-gray-800">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="p-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div
                  className={clsx(
                    'grid grid-cols-7',
                    viewMode === 'week' ? 'min-h-[400px]' : ''
                  )}
                >
                  {displayDays.map((date, idx) => {
                    const dayEvents = getEventsForDate(date);
                    const isToday = isSameDay(date, today);
                    const isCurrentMonth =
                      date.getMonth() === currentDate.getMonth();
                    const isPast = date < today;

                    return (
                      <div
                        key={idx}
                        className={clsx(
                          'border-b border-r border-gray-800 min-h-[100px] p-2 transition-colors',
                          viewMode === 'week'
                            ? 'min-h-[400px]'
                            : 'min-h-[100px]',
                          isToday && 'bg-indigo-950/20',
                          !isCurrentMonth &&
                            viewMode === 'month' &&
                            'bg-gray-950/50',
                          isPast && 'opacity-60'
                        )}
                      >
                        {/* Day Number */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={clsx(
                              'text-sm font-medium',
                              isToday
                                ? 'text-indigo-400'
                                : isCurrentMonth || viewMode === 'week'
                                  ? 'text-gray-300'
                                  : 'text-gray-600'
                            )}
                          >
                            {date.getDate()}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                              Today
                            </span>
                          )}
                        </div>

                        {/* Events */}
                        <div className="space-y-1">
                          {dayEvents
                            .slice(0, viewMode === 'week' ? 10 : 3)
                            .map((ev, evIdx) => (
                              <Link
                                key={ev.key || evIdx}
                                to={getLink(ev)}
                                className={clsx(
                                  'block p-1.5 rounded text-xs truncate hover:ring-1 hover:ring-white/20 transition-all',
                                  getKindColor(ev.kind),
                                  'text-white font-medium'
                                )}
                                title={ev.title}
                              >
                                {ev.title}
                              </Link>
                            ))}
                          {dayEvents.length >
                            (viewMode === 'week' ? 10 : 3) && (
                            <span className="text-xs text-gray-500">
                              +
                              {dayEvents.length -
                                (viewMode === 'week' ? 10 : 3)}{' '}
                              more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar - Upcoming Events */}
        <div className="space-y-6">
          {/* Coming Up Soon */}
          <Card className="border-indigo-500/30 bg-indigo-950/10">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                Coming Up Soon
              </h3>
              {upcomingSoon.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming events</p>
              ) : (
                <ul className="space-y-3">
                  {upcomingSoon.map((ev, idx) => (
                    <li key={ev.key || idx}>
                      <Link
                        to={getLink(ev)}
                        className="flex items-start gap-3 group"
                      >
                        <div
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full mt-2 shrink-0',
                            getKindColor(ev.kind)
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-200 truncate group-hover:text-indigo-400 transition-colors">
                            {ev.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ev.daysUntil === 0
                              ? 'Today'
                              : ev.daysUntil === 1
                                ? 'Tomorrow'
                                : `In ${ev.daysUntil} days`}
                            <span className="mx-1">•</span>
                            <span className="capitalize">{ev.kind}</span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="border-gray-800 bg-gray-900/30">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Legend
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-indigo-500" />
                  <span className="text-sm text-gray-400">Series</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-pink-500" />
                  <span className="text-sm text-gray-400">Movies</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-500" />
                  <span className="text-sm text-gray-400">Books</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-sm text-gray-400">Music</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Upcoming (scroll list) */}
          <Card className="border-gray-800 bg-gray-900/30">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                All Upcoming
              </h3>
              {events.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming episodes found.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {events.slice(0, 20).map((ev, idx) => (
                    <Link
                      key={ev.key || idx}
                      to={getLink(ev)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors group"
                    >
                      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 shrink-0">
                        <span className="text-[9px] text-gray-500 uppercase font-bold leading-none">
                          {new Date(ev.day || ev.date || '').toLocaleDateString(
                            undefined,
                            { month: 'short' }
                          )}
                        </span>
                        <span className="text-sm font-bold text-white leading-none">
                          {new Date(ev.day || ev.date || '').getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-200 truncate group-hover:text-white">
                          {ev.title}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {ev.kind}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
