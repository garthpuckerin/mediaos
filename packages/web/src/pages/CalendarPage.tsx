import React from 'react';

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

export 
function CalendarPage() {
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

  return (
    <section>
      <h2>Calendar</h2>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {upcomingSoon.length > 0 && (
        <div
          style={{
            border: '1px solid #1f2937',
            borderRadius: 8,
            padding: 8,
            marginBottom: 12,
            background: '#0b1220',
          }}
        >
          <div style={{ color: '#9aa4b2', fontSize: 12 }}>Coming up soon</div>
          <ul style={{ margin: 0, padding: '6px 0 0 18px' }}>
            {upcomingSoon.map((ev) => (
              <li
                key={ev.key || ev.day || ev.title}
                style={{ color: '#e5e7eb', marginBottom: 4 }}
              >
                {ev.title}{' '}
                <span style={{ color: '#9aa4b2' }}>
                  in {ev.daysUntil} day{ev.daysUntil === 1 ? '' : 's'} (
                  {formatDay(ev.day || ev.date)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {loadingCal && <p style={{ color: '#9aa4b2' }}>Loading.</p>}
      {!loadingCal && events.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>No upcoming episodes.</p>
      )}
      {!loadingCal && events.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {events.map((ev) => {
            const highlight =
              typeof ev?.daysUntil === 'number' && ev.daysUntil <= 3;
            return (
              <div
                key={ev.key || `${ev.day}-${ev.title}`}
                style={{
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: 10,
                  background: highlight ? '#132952' : '#0b1220',
                  boxShadow: highlight
                    ? '0 0 0 1px rgba(59,130,246,0.4)'
                    : 'none',
                }}
              >
                <div style={{ color: '#9aa4b2', fontSize: 12 }}>
                  {formatDay(ev.day || ev.date)}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  <a
                    href={`#/library/${String(ev.kind || 'series') === 'movie' ? 'movies' : String(ev.kind || 'series') === 'book' ? 'books' : String(ev.kind || 'series')}/item/${encodeURIComponent(ev.itemId || '')}`}
                    style={{ color: '#e5e7eb', textDecoration: 'none' }}
                  >
                    {ev.title}
                  </a>
                </div>
                <div style={{ color: '#9aa4b2', fontSize: 12, marginTop: 4 }}>
                  {ev.kind ? ev.kind.toUpperCase() : 'item'} - in {ev.daysUntil}{' '}
                  day{ev.daysUntil === 1 ? '' : 's'}
                </div>
                {ev.lastScan && (
                  <div style={{ color: '#9aa4b2', fontSize: 12, marginTop: 4 }}>
                    Last scan {new Date(ev.lastScan.at).toLocaleString()} -
                    Found {ev.lastScan.found}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

