import React from 'react';
import { Link } from 'react-router-dom';
import { pushToast } from '../../utils/toast';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

export function ActivityHistory() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch('/api/activity/history');
        const j = await r.json();
        if (!cancelled) setItems(Array.isArray(j.items) ? j.items : []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const id = setInterval(() => void run(), 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const toPlural = (k: string) =>
    k === 'movie' ? 'movies' : k === 'book' ? 'books' : k;

  return (
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">Activity - History</h2>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      {loading && items.length === 0 && (
        <p className="text-gray-400">Loading...</p>
      )}

      {!loading && items.length === 0 && (
        <div className="text-gray-500 text-center py-12 border border-dashed border-gray-800 rounded-xl">
          History is empty.
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-4">
          {items.map((it, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                    {new Date(it.at || Date.now()).toLocaleString()} •{' '}
                    {it.kind || '-'} • {it.client || 'client'}
                  </div>
                  <div
                    className="text-lg font-semibold text-white truncate"
                    title={it.title}
                  >
                    {it.title}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        const libRes = await fetch('/api/library');
                        const lib = await libRes.json();
                        const arr = Array.isArray(lib.items) ? lib.items : [];
                        const sanitize = (s: string) =>
                          String(s || '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, ' ')
                            .trim();
                        const titleSan = sanitize(String(it.title || ''));
                        const candidate = arr.find((x: any) =>
                          titleSan.includes(sanitize(String(x.title || '')))
                        );
                        if (!candidate)
                          throw new Error('No matching library item');
                        const r = await fetch('/api/verify/jobs', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            kind: candidate.kind,
                            id: candidate.id,
                            title: candidate.title,
                            phase: 'all',
                          }),
                        });
                        const j = await r.json();
                        if (!j.ok) throw new Error(j.error || 'verify_failed');
                        pushToast('success', 'Verify started');
                      } catch (e) {
                        pushToast(
                          'error',
                          (e as Error).message || 'Verify failed'
                        );
                      }
                    }}
                  >
                    Verify again
                  </Button>

                  {it.id && it.kind && (
                    <Link
                      to={`/library/${toPlural(String(it.kind))}/item/${encodeURIComponent(it.id)}`}
                    >
                      <Button variant="secondary" size="sm">
                        Open
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
