import React from 'react';
import { Link, useParams } from 'react-router-dom';
import type { KindKey } from '../../utils/routing';
import { pushToast } from '../../utils/toast';
import { useArtwork } from '../../contexts/ArtworkContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { apiClient } from '../../api/client';

// View preferences types
type PosterSize = 'compact' | 'comfortable' | 'large';
type ViewMode = 'grid' | 'list';

interface ViewPreferences {
  posterSize: PosterSize;
  viewMode: ViewMode;
}

// Poster size configuration
const POSTER_SIZES: Record<PosterSize, number> = {
  compact: 160,
  comfortable: 220,
  large: 280,
};

// Shimmer animation keyframes
const shimmerAnimation = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

export function LibraryList() {
  const { kind: kindParam } = useParams<{ kind: string }>();
  const kind = (kindParam || 'series') as KindKey;
  const { openArtwork } = useArtwork();

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

  // View preferences state
  const [posterSize, setPosterSize] = React.useState<PosterSize>('comfortable');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  // Load preferences from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('library:viewPreferences');
      if (stored) {
        const prefs: ViewPreferences = JSON.parse(stored);
        if (prefs.posterSize) setPosterSize(prefs.posterSize);
        if (prefs.viewMode) setViewMode(prefs.viewMode);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }, []);

  // Save preferences to localStorage when they change
  React.useEffect(() => {
    try {
      const prefs: ViewPreferences = { posterSize, viewMode };
      localStorage.setItem('library:viewPreferences', JSON.stringify(prefs));
    } catch (e) {
      // Ignore storage errors
    }
  }, [posterSize, viewMode]);

  const toSingular = (k: KindKey) =>
    k === 'movies' ? 'movie' : k === 'books' ? 'book' : k;

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await apiClient.get('/api/library');
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
              apiClient
                .get(
                  `/api/downloads/last?kind=${encodeURIComponent(
                    singular
                  )}&id=${encodeURIComponent(key)}`
                )
                .catch(() => ({ last: null })),
              apiClient
                .get(
                  `/api/verify/last?kind=${encodeURIComponent(
                    singular
                  )}&id=${encodeURIComponent(key)}`
                )
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

  // Compute an estimated column count based on container width and poster size
  React.useEffect(() => {
    const el = gridRef.current;
    const RO: any = (window as any).ResizeObserver;
    if (!el || typeof RO === 'undefined') return;
    const gap = 12; // keep in sync with grid gap
    const minCard = POSTER_SIZES[posterSize];
    const ro = new RO((entries: any) => {
      const w = entries[0]?.contentRect?.width ?? el.clientWidth;
      const c = Math.max(1, Math.floor(w / (minCard + gap)));
      setCols(c);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [posterSize]);

  const SkeletonCard = () => (
    <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden animate-pulse">
      <div className="aspect-[2/3] bg-gray-800" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-800 rounded w-3/4" />
        <div className="h-3 bg-gray-800 rounded w-1/2" />
      </div>
    </div>
  );

  // Lazy loading image component
  const LazyImage = ({
    src,
    alt,
    onError,
  }: {
    src: string;
    alt: string;
    onError: () => void;
  }) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const imgRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' } // Start loading 200px before visible
      );

      if (imgRef.current) observer.observe(imgRef.current);
      return () => observer.disconnect();
    }, []);

    return (
      <div
        ref={imgRef}
        style={{
          aspectRatio: '2/3',
          background: '#111827',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {isVisible && src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={onError}
          />
        ) : null}
      </div>
    );
  };

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
      const j = await apiClient.patch(
        `/api/library/${encodeURIComponent(String(id))}`,
        payload
      );
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
      const j = await apiClient.delete(
        `/api/library/${encodeURIComponent(String(id))}`
      );
      if (!j.ok) throw new Error(j.error || 'delete_failed');
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      const removed = j.item;
      pushToast('success', 'Item deleted', undefined, {
        label: 'Undo',
        run: async () => {
          try {
            const jj = await apiClient.post('/api/library', {
              id: removed?.id,
              kind: removed?.kind,
              title: removed?.title,
              posterUrl: removed?.posterUrl,
              backgroundUrl: removed?.backgroundUrl,
            });
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
    const detailHref = `/library/${kind}/item/${encodeURIComponent(
      it.id || it.title || ''
    )}`;
    const isHovered = hoveredId === itemKey;

    return (
      <Card
        key={it.id || it.title}
        className="relative group overflow-hidden border-gray-800 bg-gray-900/50 hover:border-indigo-500/50 transition-colors"
        onMouseEnter={() => setHoveredId(itemKey)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <Link to={detailHref} className="block w-full h-full">
          <div className="aspect-[2/3] relative overflow-hidden rounded-t-xl bg-gray-950">
            {poster ? (
              <img
                src={poster}
                alt={it.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs">
                No Poster
              </div>
            )}
            {/* Status Badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {grabFailed && (
                <span
                  className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-gray-900"
                  title="Grab failed"
                />
              )}
              {verifyWarn && (
                <span
                  className="w-3 h-3 rounded-full bg-yellow-500 ring-2 ring-gray-900"
                  title="Verification issue"
                />
              )}
            </div>
          </div>
          <div className="p-3">
            <h3
              className="font-medium text-sm text-gray-200 truncate"
              title={it.title}
            >
              {it.title}
            </h3>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 capitalize">
                {it.kind}
              </span>
            </div>
          </div>
        </Link>
        {/* Quick Actions */}
        {isHovered && (
          <div className="absolute top-2 left-2 flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-7 p-0 rounded-full bg-gray-900/80 backdrop-blur"
              onClick={(e) => {
                e.preventDefault();
                onEditStart(it);
              }}
            >
              ✎
            </Button>
            <Button
              variant="danger" // Assuming danger variant exists or falls back
              size="sm"
              className="h-7 w-7 p-0 rounded-full bg-gray-900/80 backdrop-blur text-red-500 hover:bg-red-900/50"
              onClick={(e) => {
                e.preventDefault();
                onDelete(it);
              }}
            >
              🗑
            </Button>
          </div>
        )}
      </Card>
    );
  };

  // Render list view item
  const renderListItem = (it: any) => {
    // ...
    const detailHref = `/library/${kind}/item/${encodeURIComponent(
      it.id || it.title || ''
    )}`;

    return (
      <Link
        key={it.id || it.title}
        to={detailHref}
        className="flex items-center gap-4 p-3 rounded-xl border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 hover:border-gray-700 transition-colors group"
      >
        <div className="w-12 h-16 shrink-0 rounded-md overflow-hidden bg-gray-950 border border-gray-800">
          {typeof it.posterUrl === 'string' ? (
            <img
              src={it.posterUrl}
              alt={it.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-700">
              No
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-200 truncate">{it.title}</h3>
          <p className="text-xs text-gray-500 capitalize">{it.kind}</p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onEditStart(it);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={(e) => {
              e.preventDefault();
              onDelete(it);
            }}
          >
            Delete
          </Button>
        </div>
      </Link>
    );
  };

  const minCardWidth = POSTER_SIZES[posterSize];

  return (
    <section>
      {/* View Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-950 border border-gray-800 rounded-xl">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">View:</span>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>

        {/* Poster Size Controls (only show in grid mode) */}
        {viewMode === 'grid' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Size:</span>
            <Button
              variant={posterSize === 'compact' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPosterSize('compact')}
            >
              Compact
            </Button>
            <Button
              variant={posterSize === 'comfortable' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPosterSize('comfortable')}
            >
              Comfortable
            </Button>
            <Button
              variant={posterSize === 'large' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPosterSize('large')}
            >
              Large
            </Button>
          </div>
        )}

        <div className="flex-1" />
        <div className="text-xs text-gray-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {error && (
        <div style={{ color: '#f87171', marginBottom: 16 }}>{error}</div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div
          ref={gridRef}
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(${minCardWidth}px, 1fr))`,
          }}
        >
          {loading &&
            Array.from({ length: cols || 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          {!loading &&
            items.length === 0 &&
            Array.from({ length: cols || 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          {!loading && items.length > 0 && items.map(renderCard)}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {loading &&
            Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-gray-800 bg-gray-950 animate-pulse"
              />
            ))}
          {!loading && items.length > 0 && items.map(renderListItem)}
          {!loading && items.length === 0 && (
            <div className="p-10 text-center text-gray-500">
              No items to display
            </div>
          )}
        </div>
      )}

      {/* Inject shimmer animation */}
      <style>{shimmerAnimation}</style>
    </section>
  );
}
