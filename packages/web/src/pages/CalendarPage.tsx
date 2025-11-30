import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { clsx } from 'clsx';

export function CalendarPage() {
  const [events, setEvents] = React.useState<any[]>([]);
  const [loadingCal, setLoadingCal] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingCal(true);
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
        if (!cancelled) setLoadingCal(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingSoon = React.useMemo(
    () =>
      events.filter(
        (ev: any) => typeof ev?.daysUntil === 'number' && ev.daysUntil <= 3
      ),
    [events]
  );

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

  const getLink = (ev: any) => {
    const kind = String(ev.kind || 'series');
    const plural =
      kind === 'movie' ? 'movies' : kind === 'book' ? 'books' : kind;
    return `/library/${plural}/item/${encodeURIComponent(ev.itemId || '')}`;
  };

  return (
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">Calendar</h2>
      {error && <p className="mb-4 text-red-400">{error}</p>}

      {upcomingSoon.length > 0 && (
        <Card className="mb-8 border-indigo-500/30 bg-indigo-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-400 uppercase tracking-wider">
              Coming up soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {upcomingSoon.map((ev) => (
                <li
                  key={ev.key || ev.day || ev.title}
                  className="text-gray-200 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <Link
                    to={getLink(ev)}
                    className="hover:text-indigo-400 transition-colors font-medium"
                  >
                    {ev.title}
                  </Link>
                  <span className="text-gray-500 text-sm">
                    in {ev.daysUntil} day{ev.daysUntil === 1 ? '' : 's'} (
                    {formatDay(ev.day || ev.date)})
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {loadingCal && <p className="text-gray-400">Loading...</p>}

      {!loadingCal && events.length === 0 && (
        <div className="text-gray-500 text-center py-12 border border-dashed border-gray-800 rounded-xl">
          No upcoming episodes found.
        </div>
      )}

      {!loadingCal && events.length > 0 && (
        <div className="grid gap-4">
          {events.map((ev) => {
            const highlight =
              typeof ev?.daysUntil === 'number' && ev.daysUntil <= 3;
            return (
              <Card
                key={ev.key || `${ev.day}-${ev.title}`}
                className={clsx(
                  'transition-all hover:border-gray-600',
                  highlight ? 'border-indigo-500/50 bg-indigo-950/5' : ''
                )}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-gray-900 border border-gray-800 shrink-0">
                    <span className="text-xs text-gray-500 uppercase font-bold">
                      {new Date(ev.day || ev.date).toLocaleDateString(
                        undefined,
                        { month: 'short' }
                      )}
                    </span>
                    <span className="text-xl font-bold text-white">
                      {new Date(ev.day || ev.date).getDate()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-white truncate">
                      <Link
                        to={getLink(ev)}
                        className="hover:text-indigo-400 transition-colors"
                      >
                        {ev.title}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                      <span className="uppercase text-xs font-bold bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">
                        {ev.kind || 'item'}
                      </span>
                      <span>
                        in {ev.daysUntil} day{ev.daysUntil === 1 ? '' : 's'}
                      </span>
                    </div>
                    {ev.lastScan && (
                      <div className="text-xs text-gray-500 mt-1">
                        Last scan {new Date(ev.lastScan.at).toLocaleString()} —
                        Found {ev.lastScan.found}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
