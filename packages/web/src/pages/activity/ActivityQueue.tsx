import React from 'react';
import { pushToast } from '../../utils/toast';

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

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
  // const toPlural = (k: string) =>
  //   k === 'movie' ? 'movies' : k === 'book' ? 'books' : k;
  return (
    <section>
      <h2>Activity - Queue</h2>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {loading && <p style={{ color: '#9aa4b2' }}>Loading.</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>Queue is empty.</p>
      )}
      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
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
              <div
                key={i}
                style={{
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <div style={{ color: '#9aa4b2', fontSize: 12 }}>
                  {it.client || 'client'} • {it.protocol || '-'}{' '}
                  {it.category ? `• ${it.category}` : ''}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.title}
                  </div>
                  <div
                    style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                  >
                    {/* Verify (best-effort) */}
                    <button
                      style={buttonStyle}
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
                    </button>
                    {/* Open in SAB */}
                    {String(it.client || '') === 'sabnzbd' && it.clientUrl && (
                      <button
                        style={buttonStyle}
                        onClick={() => {
                          try {
                            window.open(String(it.clientUrl), '_blank');
                          } catch (_) {
                            /* ignore */
                          }
                        }}
                      >
                        Open
                      </button>
                    )}
                    <button
                      style={buttonStyle}
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
                          if (!j.ok) throw new Error(j.error || 'pause_failed');
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
                    </button>
                    <button
                      style={buttonStyle}
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
                    </button>
                    <button
                      style={{
                        ...buttonStyle,
                        borderColor: '#7f1d1d',
                        color: '#f87171',
                      }}
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
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 8, color: '#9aa4b2', fontSize: 12 }}>
                  <span>{it.status || ''}</span>
                  {speed && <span> • {speed}</span>}
                  {eta && <span> • ETA {eta}</span>}
                </div>
                {typeof progress === 'number' && (
                  <div
                    style={{
                      marginTop: 6,
                      height: 6,
                      borderRadius: 999,
                      background: '#111827',
                    }}
                  >
                    <div
                      style={{
                        width: `${(progress * 100).toFixed(0)}%`,
                        height: 6,
                        borderRadius: 999,
                        background: '#2563eb',
                      }}
                    />
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
