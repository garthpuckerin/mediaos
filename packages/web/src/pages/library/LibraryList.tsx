import React from 'react';
import type { KindKey } from '../../utils/routing';
import { pushToast } from '../../utils/toast';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

export function LibraryList({
  kind,
  onOpenArtwork,
}: {
  kind: KindKey;
  onOpenArtwork: (title: string) => void;
}) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = React.useState<number | null>(null);
  const [statusMap, setStatusMap] = React.useState<
    Record<string, { lastGrab?: any; lastVerify?: any }>
  >({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState<string>('');
  const [editKind, setEditKind] = React.useState<
    'movie' | 'series' | 'book' | 'music'
  >('series');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const toSingular = (k: KindKey) =>
    k === 'movies' ? 'movie' : k === 'books' ? 'book' : k;

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/library');
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
        }
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) {
          const t = await res.text();
          throw new Error(`Unexpected response (not JSON): ${t.slice(0, 120)}`);
        }
        const json = await res.json();
        const singular = toSingular(kind);
        const arr = Array.isArray(json.items) ? json.items : [];
        const filtered = arr.filter((it: any) => it && it.kind === singular);
        if (!cancelled) setItems(filtered);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  React.useEffect(() => {
    if (!items || items.length === 0) {
      setStatusMap({});
      return;
    }
    let cancelled = false;
    const singular = toSingular(kind);
    const run = async () => {
      const updates: Record<string, { lastGrab?: any; lastVerify?: any }> = {};
      await Promise.all(
        items.map(async (it) => {
          const key = it.id || it.title;
          if (!key) return;
          try {
            const [lastGrab, lastVerify] = await Promise.all([
              fetch(
                `/api/downloads/last?kind=${encodeURIComponent(
                  singular
                )}&id=${encodeURIComponent(key)}`
              )
                .then((r) => r.json())
                .catch(() => ({ last: null })),
              fetch(
                `/api/verify/last?kind=${encodeURIComponent(
                  singular
                )}&id=${encodeURIComponent(key)}`
              )
                .then((r) => r.json())
                .catch(() => ({ result: null })),
            ]);
            updates[key] = {
              lastGrab: lastGrab?.last || null,
              lastVerify: lastVerify?.result || null,
            };
          } catch (_e) {
            // ignore status fetch errors per item
          }
        })
      );
      if (!cancelled) setStatusMap(updates);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [items, kind]);

  React.useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = e.detail || {};
        if (!detail || !detail.id) return;
        if (detail.kind && toSingular(kind) !== detail.kind) return;
        setStatusMap((prev) => {
          const current = prev[detail.id] || {};
          return {
            ...prev,
            [detail.id]: {
              lastGrab:
                detail.lastGrab !== undefined
                  ? detail.lastGrab
                  : current.lastGrab,
              lastVerify:
                detail.lastVerify !== undefined
                  ? detail.lastVerify
                  : current.lastVerify,
            },
          };
        });
      } catch (_e) {
        // ignore
      }
    };
    window.addEventListener('library:status', handler as any);
    return () => window.removeEventListener('library:status', handler as any);
  }, [kind]);

  // Refresh list when artwork changes
  React.useEffect(() => {
    const handler = (e: any) => {
      try {
        const d = e.detail || {};
        if (!d || !d.title) return;
        setItems((prev) =>
          prev.map((it) =>
            it.title === d.title
              ? {
                  ...it,
                  ...(d.tab === 'poster' ? { posterUrl: d.url } : {}),
                  ...(d.tab === 'background' ? { backgroundUrl: d.url } : {}),
                }
              : it
          )
        );
      } catch (_e) {
        /* ignore */
      }
    };
    window.addEventListener('library:changed', handler as any);
    return () => window.removeEventListener('library:changed', handler as any);
  }, []);

  // Compute an estimated column count based on container width
  React.useEffect(() => {
    const el = gridRef.current;
    const RO: any = (window as any).ResizeObserver;
    if (!el || typeof RO === 'undefined') return;
    const gap = 12; // keep in sync with grid gap
    const minCard = 220; // minimum card width
    const ro = new RO((entries: any) => {
      const w = entries[0]?.contentRect?.width ?? el.clientWidth;
      const c = Math.max(1, Math.floor((w + gap) / (minCard + gap)));
      setCols(c);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const SkeletonCard = () => (
    <div
      aria-hidden
      style={{
        border: '1px solid #1f2937',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#0b1220',
      }}
    >
      <div
        style={{
          height: 300,
          background:
            'linear-gradient(90deg, #111827 0%, #0f172a 50%, #111827 100%)',
        }}
      />
      <div
        style={{
          padding: 10,
          height: 16,
          background:
            'linear-gradient(90deg, #0f172a 0%, #0b1220 50%, #0f172a 100%)',
        }}
      />
    </div>
  );

  const onEditStart = (it: any) => {
    const id = it.id || it.title;
    if (!id) return;
    setEditingId(String(id));
    setEditTitle(String(it.title || ''));
    const k = String(it.kind || 'series');
    setEditKind(
      k === 'movie' || k === 'series' || k === 'book' || k === 'music'
        ? (k as any)
        : 'series'
    );
  };
  const onEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
    setEditKind('series');
    setSavingEdit(false);
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onEditSave = async (it: any) => {
    try {
      setSavingEdit(true);
      const payload: any = {};
      if (editTitle && editTitle.trim() !== String(it.title || ''))
        payload.title = editTitle.trim();
      if (editKind && editKind !== String(it.kind || ''))
        payload.kind = editKind;
      const id = it.id || it.title;
      const res = await fetch(
        `/api/library/${encodeURIComponent(String(id))}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'update_failed');
      setItems((prev) => {
        const next = prev.map((x) =>
          x.id === it.id ? { ...x, ...j.item } : x
        );
        const singular = toSingular(kind);
        return next.filter((x) => x.kind === singular);
      });
      pushToast('success', 'Item updated');
      onEditCancel();
    } catch (e) {
      pushToast('error', (e as Error).message || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };
  const onDelete = async (it: any) => {
    try {
      const id = it.id || it.title;
      if (!id) return;
      if (!window.confirm('Delete this item from Library?')) return;
      setDeletingId(String(id));
      const res = await fetch(
        `/api/library/${encodeURIComponent(String(id))}`,
        { method: 'DELETE' }
      );
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'delete_failed');
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      const removed = j.item;
      pushToast('success', 'Item deleted', undefined, {
        label: 'Undo',
        run: async () => {
          try {
            const r = await fetch('/api/library', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: removed?.id,
                kind: removed?.kind,
                title: removed?.title,
                posterUrl: removed?.posterUrl,
                backgroundUrl: removed?.backgroundUrl,
              }),
            });
            const jj = await r.json();
            if (jj?.ok && jj.item) {
              setItems((prev) => [jj.item, ...prev]);
              pushToast('success', 'Item restored');
            } else {
              pushToast('error', 'Restore failed');
            }
          } catch (_e) {
            pushToast('error', 'Restore failed');
          }
        },
      });
    } catch (e) {
      pushToast('error', (e as Error).message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const renderCard = (it: any) => {
    const poster = typeof it.posterUrl === 'string' ? it.posterUrl : null;
    const itemKey = it.id || it.title || '';
    const status = itemKey ? statusMap[itemKey] || {} : {};
    const grabFailed = status.lastGrab && status.lastGrab.ok === false;
    const verifySeverity = status.lastVerify?.topSeverity;
    const verifyWarn = verifySeverity === 'warn' || verifySeverity === 'error';
    const detailHref = `#/library/${kind}/item/${encodeURIComponent(
      it.id || it.title || ''
    )}`;
    return (
      <div key={it.id || it.title} style={{ position: 'relative' }}>
        {/* Status badges & actions overlay */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'grid',
            gap: 6,
            justifyItems: 'end',
            zIndex: 2,
          }}
        >
          {grabFailed && (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 999,
                fontSize: 11,
                background: '#7f1d1d',
                color: '#f87171',
              }}
            >
              Grab Failed
            </span>
          )}
          {verifyWarn && (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 999,
                fontSize: 11,
                background: verifySeverity === 'error' ? '#7f1d1d' : '#78350f',
                color: '#fcd34d',
              }}
            >
              Verify {String(verifySeverity || '').toUpperCase()}
            </span>
          )}
          <button
            type="button"
            title="Manage Artwork"
            aria-label={`Manage artwork for ${it.title || 'item'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenArtwork(it.title || '');
            }}
            style={{
              padding: '4px 6px',
              borderRadius: 8,
              border: '1px solid #1f2937',
              background: '#0b1220',
              color: '#e5e7eb',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Art
          </button>
          <button
            type="button"
            title="Edit"
            aria-label={`Edit ${it.title || 'item'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditStart(it);
            }}
            style={{
              padding: '4px 6px',
              borderRadius: 8,
              border: '1px solid #1f2937',
              background: '#0b1220',
              color: '#e5e7eb',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            type="button"
            title="Delete"
            aria-label={`Delete ${it.title || 'item'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onDelete(it);
            }}
            disabled={deletingId === String(it.id || it.title)}
            style={{
              padding: '4px 6px',
              borderRadius: 8,
              border: '1px solid #7f1d1d',
              background: '#0b1220',
              color: '#f87171',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {deletingId === String(it.id || it.title) ? 'Del…' : 'Del'}
          </button>
        </div>
        {/* Card link */}
        <a
          href={detailHref}
          style={{
            display: 'block',
            width: '100%',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              border: '1px solid #1f2937',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#0b1220',
            }}
          >
            <div
              style={{
                height: 300,
                background: poster ? 'transparent' : '#111827',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {poster ? (
                <img
                  src={poster}
                  alt={it.title || 'Poster'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = 'none';
                    const parent = img.parentElement;
                    if (parent)
                      (parent as HTMLElement).style.background = '#111827';
                  }}
                />
              ) : (
                <span style={{ color: '#9aa4b2' }}>No artwork</span>
              )}
            </div>
            <div style={{ padding: 10 }}>
              <div>{it.title || 'Untitled'}</div>
              {(grabFailed || verifyWarn) && (
                <div style={{ color: '#9aa4b2', fontSize: 12, marginTop: 6 }}>
                  {grabFailed && (
                    <span>
                      Last grab failed
                      {status.lastGrab?.at
                        ? ` - ${new Date(status.lastGrab.at).toLocaleDateString()}`
                        : ''}
                    </span>
                  )}
                  {grabFailed && verifyWarn && <span> - </span>}
                  {verifyWarn && (
                    <span>
                      Verify {String(verifySeverity || '').toUpperCase()}
                      {status.lastVerify?.analyzedAt
                        ? ` - ${new Date(status.lastVerify.analyzedAt).toLocaleDateString()}`
                        : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </a>
      </div>
    );
  };

  // skeletons will use estimated column count

  return (
    <section>
      {error && <div style={{ color: '#f87171' }}>{error}</div>}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {loading &&
          Array.from({ length: (cols || 6) * 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        {!loading &&
          items.length === 0 &&
          Array.from({ length: Math.max(6, cols || 6) }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        {!loading && items.length > 0 && items.map(renderCard)}
      </div>
    </section>
  );
}

