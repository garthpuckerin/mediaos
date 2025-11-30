import React from 'react';
import { pushToast } from '../../utils/toast';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

export function ActivityQueue() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch('/api/activity/live');
        let j = await r.json();
        if (!j?.ok) {
          const r2 = await fetch('/api/activity/queue');
          j = await r2.json();
        }
        if (!cancelled) setItems(Array.isArray(j.items) ? j.items : []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const id = setInterval(() => void run(), 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">Activity - Queue</h2>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      {loading && items.length === 0 && (
        <p className="text-gray-400">Loading...</p>
      )}

      {!loading && items.length === 0 && (
        <div className="text-gray-500 text-center py-12 border border-dashed border-gray-800 rounded-xl">
          Queue is empty.
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-4">
          {items.map((it: any, i: number) => {
            const progress =
              typeof it.progress === 'number'
                ? Math.max(0, Math.min(1, it.progress))
                : undefined;
            const speed =
              typeof it.speedBps === 'number'
                ? `${(it.speedBps / 1024).toFixed(0)} KB/s`
                : '';
            const eta =
              typeof it.etaSec === 'number' && it.etaSec > 0
                ? `${Math.floor(it.etaSec / 60)}m`
                : it.eta || '';

            return (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        {it.client || 'client'} • {it.protocol || '-'}{' '}
                        {it.category ? `• ${it.category}` : ''}
                      </div>
                      <div
                        className="text-lg font-semibold text-white truncate"
                        title={it.title}
                      >
                        {it.title}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {/* Verify (best-effort) */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            const libRes = await fetch('/api/library');
                            const lib = await libRes.json();
                            const items = Array.isArray(lib.items)
                              ? lib.items
                              : [];
                            const sanitize = (s: string) =>
                              String(s || '')
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, ' ')
                                .trim();
                            const titleSan = sanitize(String(it.title || ''));
                            const candidate = items.find((x: any) =>
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
                            if (!j.ok)
                              throw new Error(j.error || 'verify_failed');
                            pushToast('success', 'Verify started');
                          } catch (e) {
                            pushToast(
                              'error',
                              (e as Error).message || 'Verify failed'
                            );
                          }
                        }}
                      >
                        Verify
                      </Button>

                      {/* Open in SAB */}
                      {String(it.client || '') === 'sabnzbd' &&
                        it.clientUrl && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              try {
                                window.open(String(it.clientUrl), '_blank');
                              } catch (_) {
                                /* ignore */
                              }
                            }}
                          >
                            Open
                          </Button>
                        )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            const r = await fetch('/api/activity/action', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                client: it.client,
                                op: 'pause',
                                id: it.clientId,
                              }),
                            });
                            const j = await r.json();
                            if (!j.ok)
                              throw new Error(j.error || 'pause_failed');
                            pushToast('success', 'Paused');
                          } catch (e) {
                            pushToast(
                              'error',
                              (e as Error).message || 'Pause failed'
                            );
                          }
                        }}
                      >
                        Pause
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            const r = await fetch('/api/activity/action', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                client: it.client,
                                op: 'resume',
                                id: it.clientId,
                              }),
                            });
                            const j = await r.json();
                            if (!j.ok)
                              throw new Error(j.error || 'resume_failed');
                            pushToast('success', 'Resumed');
                          } catch (e) {
                            pushToast(
                              'error',
                              (e as Error).message || 'Resume failed'
                            );
                          }
                        }}
                      >
                        Resume
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          if (!window.confirm('Remove from client queue?'))
                            return;
                          try {
                            const r = await fetch('/api/activity/action', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                client: it.client,
                                op: 'delete',
                                id: it.clientId,
                              }),
                            });
                            const j = await r.json();
                            if (!j.ok)
                              throw new Error(j.error || 'delete_failed');
                            pushToast('success', 'Removed');
                          } catch (e) {
                            pushToast(
                              'error',
                              (e as Error).message || 'Remove failed'
                            );
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div>{it.status || 'Unknown Status'}</div>
                    <div className="flex gap-3">
                      {speed && <span>{speed}</span>}
                      {eta && <span>ETA {eta}</span>}
                    </div>
                  </div>

                  {typeof progress === 'number' && (
                    <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${(progress * 100).toFixed(1)}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
