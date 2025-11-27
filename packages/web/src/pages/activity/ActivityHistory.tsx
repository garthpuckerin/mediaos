import React from 'react';
import { pushToast } from '../../utils/toast';

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

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
    <section>
      <h2>Activity - History</h2>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {loading && <p style={{ color: '#9aa4b2' }}>Loading.</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>History is empty.</p>
      )}
      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 8,
              }}
            >
              <div style={{ color: '#9aa4b2', fontSize: 12 }}>
                {new Date(it.at || Date.now()).toLocaleString()} •{' '}
                {it.kind || '-'} • {it.client || 'client'}
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={buttonStyle}
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
                  </button>
                  {it.id && it.kind && (
                    <a
                      href={`#/library/${toPlural(String(it.kind))}/item/${encodeURIComponent(it.id)}`}
                      style={
                        {
                          ...buttonStyle,
                          textDecoration: 'none',
                          display: 'inline-block',
                        } as any
                      }
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
