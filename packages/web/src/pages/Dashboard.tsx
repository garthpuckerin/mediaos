import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Icons
const IconFilm = () => (
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
      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
    />
  </svg>
);

const IconTv = () => (
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
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const IconBook = () => (
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
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

const IconMusic = () => (
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
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
    />
  </svg>
);

const IconDownload = () => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
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

const IconActivity = () => (
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
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const IconClock = () => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconServer = () => (
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
      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
    />
  </svg>
);

const IconChevronRight = () => (
  <svg
    className="w-4 h-4"
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

const IconCheck = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const IconAlert = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

interface LibraryStats {
  series: number;
  movies: number;
  books: number;
  music: number;
}

interface RecentItem {
  id: string;
  title: string;
  kind: string;
  posterUrl?: string;
  addedAt?: string;
}

interface QueueItem {
  title: string;
  status: string;
  progress?: number;
  client?: string;
}

interface CalendarEvent {
  title: string;
  day: string;
  kind: string;
  daysUntil: number;
  itemId?: string;
}

export function Dashboard() {
  const [stats, setStats] = React.useState<LibraryStats>({
    series: 0,
    movies: 0,
    books: 0,
    music: 0,
  });
  const [recentItems, setRecentItems] = React.useState<RecentItem[]>([]);
  const [queueItems, setQueueItems] = React.useState<QueueItem[]>([]);
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>(
    []
  );
  const [loading, setLoading] = React.useState(true);
  const [systemHealth, setSystemHealth] = React.useState<{
    status: 'ok' | 'warning' | 'error';
    message: string;
  }>({ status: 'ok', message: 'All systems operational' });

  React.useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch library items for stats and recent
        const libraryRes = await fetch('/api/library');
        const libraryData = await libraryRes.json();
        const items = Array.isArray(libraryData.items) ? libraryData.items : [];

        if (!cancelled) {
          // Calculate stats
          const newStats = {
            series: items.filter((i: any) => i.kind === 'series').length,
            movies: items.filter((i: any) => i.kind === 'movie').length,
            books: items.filter((i: any) => i.kind === 'book').length,
            music: items.filter((i: any) => i.kind === 'music').length,
          };
          setStats(newStats);

          // Get recent items (last 10)
          const sorted = [...items].sort((a: any, b: any) => {
            const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            return dateB - dateA;
          });
          setRecentItems(sorted.slice(0, 10));
        }

        // Fetch queue
        try {
          const queueRes = await fetch('/api/activity/live');
          let queueData = await queueRes.json();
          if (!queueData?.ok) {
            const fallbackRes = await fetch('/api/activity/queue');
            queueData = await fallbackRes.json();
          }
          if (!cancelled) {
            setQueueItems(
              Array.isArray(queueData.items) ? queueData.items.slice(0, 5) : []
            );
          }
        } catch {
          if (!cancelled) setQueueItems([]);
        }

        // Fetch calendar
        try {
          const calRes = await fetch('/api/calendar');
          const calData = await calRes.json();
          if (!cancelled) {
            const events = Array.isArray(calData.events) ? calData.events : [];
            // Get upcoming events (next 7 days)
            const upcoming = events
              .filter(
                (e: any) => typeof e.daysUntil === 'number' && e.daysUntil <= 7
              )
              .slice(0, 5);
            setCalendarEvents(upcoming);
          }
        } catch {
          if (!cancelled) setCalendarEvents([]);
        }

        // Check system health (simplified)
        try {
          const healthRes = await fetch('/api/system/health');
          const healthData = await healthRes.json();
          if (!cancelled && healthData) {
            setSystemHealth({
              status: healthData.status || 'ok',
              message: healthData.message || 'All systems operational',
            });
          }
        } catch {
          // Default to OK if endpoint doesn't exist
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'movie':
        return <IconFilm />;
      case 'series':
        return <IconTv />;
      case 'book':
        return <IconBook />;
      case 'music':
        return <IconMusic />;
      default:
        return <IconFilm />;
    }
  };

  const toPlural = (k: string) =>
    k === 'movie' ? 'movies' : k === 'book' ? 'books' : k;

  const formatDay = (value?: string) => {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-800 rounded-xl" />
          <div className="h-80 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back to MediaOS</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              systemHealth.status === 'ok'
                ? 'bg-emerald-500/10 text-emerald-400'
                : systemHealth.status === 'warning'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-red-500/10 text-red-400'
            }`}
          >
            {systemHealth.status === 'ok' ? <IconCheck /> : <IconAlert />}
            {systemHealth.message}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/library/series">
          <Card className="group hover:border-indigo-500/50 transition-all cursor-pointer bg-gradient-to-br from-indigo-500/10 to-transparent border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Series</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats.series}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                  <IconTv />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/library/movies">
          <Card className="group hover:border-pink-500/50 transition-all cursor-pointer bg-gradient-to-br from-pink-500/10 to-transparent border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Movies</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats.movies}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                  <IconFilm />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/library/books">
          <Card className="group hover:border-amber-500/50 transition-all cursor-pointer bg-gradient-to-br from-amber-500/10 to-transparent border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Books</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats.books}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <IconBook />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/library/music">
          <Card className="group hover:border-emerald-500/50 transition-all cursor-pointer bg-gradient-to-br from-emerald-500/10 to-transparent border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Music</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats.music}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <IconMusic />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Library Additions */}
        <Card className="border-gray-800 bg-gray-900/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <IconClock />
                Recent Additions
              </CardTitle>
              <Link to="/library/series">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                  <IconChevronRight />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {recentItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items in library yet</p>
                <Link
                  to="/library/series/add"
                  className="text-indigo-400 text-sm hover:underline mt-2 inline-block"
                >
                  Add your first item →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentItems.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    to={`/library/${toPlural(item.kind)}/item/${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="w-10 h-14 shrink-0 rounded-md overflow-hidden bg-gray-800 border border-gray-700">
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          {getKindIcon(item.kind)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 capitalize">
                        {item.kind}
                      </p>
                    </div>
                    <IconChevronRight />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Queue */}
        <Card className="border-gray-800 bg-gray-900/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <IconDownload />
                Download Queue
              </CardTitle>
              <Link to="/activity/queue">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                  <IconChevronRight />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {queueItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <IconDownload />
                <p className="mt-2">Queue is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queueItems.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-200 truncate pr-4">
                        {item.title}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {item.status || 'Downloading'}
                      </span>
                    </div>
                    {typeof item.progress === 'number' && (
                      <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, item.progress * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Releases */}
        <Card className="border-gray-800 bg-gray-900/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <IconCalendar />
                Upcoming Releases
              </CardTitle>
              <Link to="/calendar">
                <Button variant="ghost" size="sm" className="text-xs">
                  View Calendar
                  <IconChevronRight />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {calendarEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <IconCalendar />
                <p className="mt-2">No upcoming releases</p>
              </div>
            ) : (
              <div className="space-y-2">
                {calendarEvents.map((event, idx) => (
                  <Link
                    key={idx}
                    to={
                      event.itemId
                        ? `/library/${toPlural(event.kind)}/item/${encodeURIComponent(event.itemId)}`
                        : '/calendar'
                    }
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 shrink-0">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        {new Date(event.day).toLocaleDateString(undefined, {
                          month: 'short',
                        })}
                      </span>
                      <span className="text-lg font-bold text-white leading-none">
                        {new Date(event.day).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-200 truncate">
                        {event.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {event.daysUntil === 0
                          ? 'Today'
                          : event.daysUntil === 1
                            ? 'Tomorrow'
                            : `In ${event.daysUntil} days`}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400 capitalize">
                      {event.kind}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-gray-800 bg-gray-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <IconActivity />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/library/series/add">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <IconTv />
                  Add Series
                </Button>
              </Link>
              <Link to="/library/movies/add">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <IconFilm />
                  Add Movie
                </Button>
              </Link>
              <Link to="/activity/wanted">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <IconClock />
                  Wanted List
                </Button>
              </Link>
              <Link to="/settings/indexers">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <IconServer />
                  Indexers
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
