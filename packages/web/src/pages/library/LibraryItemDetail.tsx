import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { KindKey } from '../../utils/routing';
import { pushToast } from '../../utils/toast';
import { useArtwork } from '../../contexts/ArtworkContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';

// Icons as simple SVG components for better visuals
const IconEdit = () => (
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
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const IconTrash = () => (
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
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const IconImage = () => (
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
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const IconSearch = () => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const IconShield = () => (
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
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const IconPlus = () => (
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
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const IconDownload = () => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const IconRefresh = () => (
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
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const IconUpload = () => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
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

const IconX = () => (
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
      d="M6 18L18 6M6 6l12 12"
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

const IconExternalLink = () => (
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
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

export function LibraryItemDetail() {
  const { kind: kindParam, id: idParam } = useParams<{
    kind: string;
    id: string;
  }>();
  const kind = (kindParam || 'series') as KindKey;
  const id = idParam || '';
  const navigate = useNavigate();
  const { openArtwork } = useArtwork();

  const [settings, setSettings] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/settings/downloaders')
      .then((r) => r.json())
      .then((j) => setSettings(j.downloaders || {}))
      .catch(() => {});
  }, []);

  const [item, setItem] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [serverFilter, setServerFilter] = React.useState(false);
  const [lastVerify, setLastVerify] = React.useState<any | null>(null);
  const [verifyJob, setVerifyJob] = React.useState<{
    id: string;
    status: string;
  } | null>(null);
  const [profiles, setProfiles] = React.useState<any | null>(null);
  const [lastGrab, setLastGrab] = React.useState<any | null>(null);
  const [nzbFile, setNzbFile] = React.useState<File | null>(null);
  const [nzbUploading, setNzbUploading] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newKind, setNewKind] = React.useState<
    'movie' | 'series' | 'book' | 'music'
  >('series');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'files' | 'history'
  >('overview');

  const singularKind =
    kind === 'movies' ? 'movie' : kind === 'books' ? 'book' : kind;

  const refreshLastGrab = React.useCallback(() => {
    fetch(
      `/api/downloads/last?kind=${encodeURIComponent(
        singularKind
      )}&id=${encodeURIComponent(id)}`
    )
      .then((r) => r.json())
      .then((j) => {
        const next = j.last || null;
        setLastGrab(next);
        window.dispatchEvent(
          new CustomEvent('library:status', {
            detail: { kind: singularKind, id, lastGrab: next ?? null },
          })
        );
      })
      .catch(() => {
        setLastGrab(null);
        window.dispatchEvent(
          new CustomEvent('library:status', {
            detail: { kind: singularKind, id, lastGrab: null },
          })
        );
      });
  }, [singularKind, id]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/library/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'not_found');
        if (!cancelled) {
          setItem(json.item);
          setNewTitle(String(json.item?.title || ''));
          const k = String(json.item?.kind || 'series');
          setNewKind(
            k === 'movie' || k === 'series' || k === 'book' || k === 'music'
              ? (k as any)
              : 'series'
          );
        }
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
  }, [id]);

  React.useEffect(() => {
    fetch('/api/settings/quality')
      .then((r) => r.json())
      .then((j) => setProfiles(j.profiles || {}))
      .catch(() => setProfiles({}));
  }, []);

  React.useEffect(() => {
    fetch(
      `/api/verify/last?kind=${encodeURIComponent(
        singularKind
      )}&id=${encodeURIComponent(id)}`
    )
      .then((r) => r.json())
      .then((j) => {
        const next = j.result || null;
        setLastVerify(next);
        window.dispatchEvent(
          new CustomEvent('library:status', {
            detail: { kind: singularKind, id, lastVerify: next ?? null },
          })
        );
      })
      .catch(() => {
        setLastVerify(null);
        window.dispatchEvent(
          new CustomEvent('library:status', {
            detail: { kind: singularKind, id, lastVerify: null },
          })
        );
      });
    // Auto-refresh a few times to catch background verify completions
    let cancelled = false;
    let ticks = 0;
    const maxTicks = 8;
    const poll = async () => {
      try {
        const r = await fetch(
          `/api/verify/last?kind=${encodeURIComponent(singularKind)}&id=${encodeURIComponent(id)}`
        );
        const j = await r.json();
        if (!cancelled) setLastVerify(j.result || null);
      } catch {
        /* ignore */
      }
    };
    const int = setInterval(async () => {
      if (cancelled) return;
      ticks++;
      await poll();
      if (ticks >= maxTicks) clearInterval(int);
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(int);
    };
  }, [singularKind, id]);

  React.useEffect(() => {
    refreshLastGrab();
  }, [refreshLastGrab]);

  const title = item?.title || 'Item';
  const poster = item?.posterUrl || null;
  const background = item?.backgroundUrl || poster;

  const toPlural = (k: string) =>
    k === 'movie' ? 'movies' : k === 'book' ? 'books' : k;

  const onSaveEdit = async () => {
    if (!item) return;
    setSavingEdit(true);
    try {
      const payload: any = {};
      if (newTitle && newTitle.trim() !== String(item.title || ''))
        payload.title = newTitle.trim();
      if (newKind && newKind !== String(item.kind || ''))
        payload.kind = newKind;
      if (Object.keys(payload).length === 0) {
        setEditMode(false);
        return;
      }
      const res = await fetch(`/api/library/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'update_failed');
      setItem(j.item);
      setEditMode(false);
      pushToast('success', 'Item updated');
      if (payload.kind && toPlural(payload.kind) !== kind) {
        navigate(
          `/library/${toPlural(payload.kind)}/item/${encodeURIComponent(id)}`,
          { replace: true }
        );
      }
    } catch (e) {
      pushToast('error', (e as Error).message || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };

  const onDelete = async () => {
    if (!item || deleting) return;
    if (!window.confirm('Delete this item? This removes it from Library.'))
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/library/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'delete_failed');
      const removed = j.item;
      pushToast('success', 'Item deleted', undefined, {
        label: 'Undo',
        run: async () => {
          try {
            await fetch('/api/library', {
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
            pushToast('success', 'Item restored');
          } catch (_e) {
            pushToast('error', 'Restore failed');
          }
        },
      });
      navigate(`/library/${kind}/list`);
    } catch (e) {
      pushToast('error', (e as Error).message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const qualityRank: Record<string, number> = {
    '2160p': 4,
    '1080p': 3,
    '720p': 2,
    '480p': 1,
    sd: 1,
  };

  const detectQuality = (t: string): string | null => {
    const s = (t || '').toLowerCase();
    let best: string | null = null;
    for (const q of Object.keys(qualityRank)) {
      if (s.includes(q)) {
        const curRank = best ? (qualityRank[best] ?? -Infinity) : -Infinity;
        const qRank = (qualityRank as any)[q] ?? -Infinity;
        if (qRank > curRank) best = q;
      }
    }
    return best;
  };

  const handleRegrab = async () => {
    if (!lastGrab || !lastGrab.link) return;
    try {
      const res = await fetch('/api/downloads/grab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          id,
          title: lastGrab.title || title,
          link: lastGrab.link,
          protocol: lastGrab.protocol || 'torrent',
        }),
      });
      const j = await res.json();
      if (j.ok) {
        pushToast('success', 'Re-grab queued');
        refreshLastGrab();
      } else {
        pushToast('error', 'Re-grab failed: ' + (j.error || 'unknown'));
      }
    } catch (e) {
      pushToast('error', (e as Error).message || 'Re-grab failed');
    }
  };

  const handleVerify = async () => {
    try {
      const res = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, title }),
      });
      const j = await res.json();
      if (j.ok) {
        const count = Array.isArray(j.result?.issues)
          ? j.result.issues.length
          : 0;
        pushToast('success', `Verification complete: ${count} issues`);
      } else {
        pushToast('error', 'Verification failed');
      }
    } catch (e) {
      pushToast('error', (e as Error).message || 'Verification failed');
    }
  };

  const handleAsyncVerify = async () => {
    try {
      setVerifyJob({ id, status: 'queued' });
      const res = await fetch('/api/verify/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, title, phase: 'all' }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'failed');
      const jobId = j.jobId as string;
      setVerifyJob({ id: jobId, status: 'queued' });
      const start = Date.now();
      const poll = async () => {
        try {
          const r2 = await fetch(
            `/api/verify/jobs/${encodeURIComponent(jobId)}`
          );
          const j2 = await r2.json();
          if (j2.ok && j2.job) {
            setVerifyJob({ id: jobId, status: j2.job.status });
            if (j2.job.status === 'completed' || j2.job.status === 'failed') {
              const r3 = await fetch(
                `/api/verify/last?kind=${encodeURIComponent(singularKind)}&id=${encodeURIComponent(id)}`
              );
              const j3 = await r3.json();
              const nextVerify = j3.result || null;
              setLastVerify(nextVerify);
              window.dispatchEvent(
                new CustomEvent('library:status', {
                  detail: {
                    kind: singularKind,
                    id,
                    lastVerify: nextVerify ?? null,
                  },
                })
              );
              return;
            }
          }
        } catch (_e) {
          void 0;
        }
        if (Date.now() - start < 15000) setTimeout(poll, 1000);
        else setVerifyJob((v) => (v ? { ...v, status: 'failed' } : v));
      };
      setTimeout(poll, 500);
    } catch (e) {
      pushToast('error', (e as Error).message || 'Failed');
    }
  };

  const handleAddToWanted = async () => {
    try {
      const res = await fetch('/api/wanted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, title }),
      });
      const j = await res.json();
      if (j.ok) pushToast('success', 'Added to Wanted');
      else pushToast('error', 'Failed to add to Wanted');
    } catch (e) {
      pushToast('error', (e as Error).message || 'Failed to add');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-80 bg-gray-900 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-4">
            <div className="aspect-[2/3] bg-gray-900 rounded-xl" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-900 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-900 rounded w-1/3" />
            <div className="h-4 bg-gray-900 rounded w-1/4" />
            <div className="h-32 bg-gray-900 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <IconX />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Error Loading Item
        </h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <section className="relative -m-6">
      {/* Hero Section with Background */}
      <div className="relative h-80 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          {background ? (
            <img
              src={background}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950" />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f16] via-[#0b0f16]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f16]/90 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative h-full flex items-end p-6">
          <div className="flex items-end gap-6 max-w-6xl">
            {/* Poster */}
            <div className="hidden md:block w-44 shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden border-2 border-gray-800 shadow-2xl bg-gray-950 transform translate-y-16">
                {poster ? (
                  <img
                    src={poster}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <IconImage />
                  </div>
                )}
              </div>
            </div>

            {/* Title & Meta */}
            <div className="flex-1 min-w-0 pb-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                <Link
                  to={`/library/${kind}`}
                  className="hover:text-white transition-colors"
                >
                  {kind.charAt(0).toUpperCase() + kind.slice(1)}
                </Link>
                <IconChevronRight />
                <span className="text-gray-500 truncate">{title}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 truncate">
                {title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-400 font-medium capitalize">
                  {singularKind}
                </span>
                {lastVerify && (
                  <span
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      lastVerify.topSeverity === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : lastVerify.topSeverity === 'warn'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {lastVerify.topSeverity === 'error'
                      ? `${(lastVerify.issues || []).length} Issues`
                      : lastVerify.topSeverity === 'warn'
                        ? 'Warnings'
                        : 'Verified'}
                  </span>
                )}
                {lastGrab && (
                  <span
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      lastGrab.ok
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {lastGrab.ok ? 'Downloaded' : 'Grab Failed'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-4 lg:pt-16">
            {/* Mobile Poster */}
            <div className="md:hidden aspect-[2/3] w-40 mx-auto rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
              {poster ? (
                <img
                  src={poster}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <IconImage />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                className="w-full justify-start gap-3"
                variant="secondary"
                onClick={() => openArtwork(title)}
              >
                <IconImage />
                Manage Artwork
              </Button>

              <Button
                className="w-full justify-start gap-3"
                variant="secondary"
                onClick={() => setQuery(title)}
              >
                <IconSearch />
                Manual Search
              </Button>

              <Button
                className="w-full justify-start gap-3"
                variant="secondary"
                onClick={handleVerify}
              >
                <IconShield />
                Verify Quality
              </Button>

              <Button
                className="w-full justify-start gap-3"
                variant="secondary"
                disabled={
                  !!verifyJob &&
                  verifyJob.status !== 'completed' &&
                  verifyJob.status !== 'failed'
                }
                onClick={handleAsyncVerify}
              >
                {verifyJob &&
                verifyJob.status !== 'completed' &&
                verifyJob.status !== 'failed' ? (
                  <>
                    <IconRefresh />
                    Verifying...
                  </>
                ) : (
                  <>
                    <IconShield />
                    Verify (Async)
                  </>
                )}
              </Button>

              <Button
                className="w-full justify-start gap-3"
                variant="secondary"
                onClick={handleAddToWanted}
              >
                <IconPlus />
                Add to Wanted
              </Button>

              <div className="pt-2 border-t border-gray-800">
                <Button
                  className="w-full justify-start gap-3"
                  variant="secondary"
                  onClick={() => setEditMode(true)}
                >
                  <IconEdit />
                  Edit Details
                </Button>

                <Button
                  className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  variant="ghost"
                  disabled={deleting}
                  onClick={onDelete}
                >
                  <IconTrash />
                  {deleting ? 'Deleting...' : 'Delete Item'}
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {lastVerify?.issues?.length ?? '-'}
                    </div>
                    <div className="text-xs text-gray-500">Issues</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {lastGrab ? (lastGrab.ok ? '✓' : '✗') : '-'}
                    </div>
                    <div className="text-xs text-gray-500">Last Grab</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Area */}
          <div className="space-y-6">
            {/* Edit Mode */}
            {editMode && (
              <Card className="border-indigo-500/50 bg-indigo-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Edit Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
                    <label className="space-y-1.5">
                      <div className="text-xs font-medium text-gray-400">
                        Title
                      </div>
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="bg-gray-950"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <div className="text-xs font-medium text-gray-400">
                        Kind
                      </div>
                      <select
                        value={newKind}
                        onChange={(e) => setNewKind(e.target.value as any)}
                        className="flex h-10 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      >
                        <option value="series">Series</option>
                        <option value="movie">Movie</option>
                        <option value="book">Book</option>
                        <option value="music">Music</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={savingEdit} onClick={onSaveEdit}>
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditMode(false);
                        setNewTitle(String(item?.title || ''));
                        setNewKind(String(item?.kind || 'series') as any);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-900/50 rounded-lg w-fit">
              {(['overview', 'files', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quality Verification Card */}
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconShield />
                        Quality Verification
                      </CardTitle>
                      <span className="text-xs text-gray-500">
                        {lastVerify?.analyzedAt
                          ? new Date(lastVerify.analyzedAt).toLocaleString()
                          : 'No result'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {lastVerify ? (
                      <>
                        <div className="flex items-center gap-4 mb-4">
                          <span
                            className={`px-3 py-1.5 rounded-lg font-medium text-sm ${
                              lastVerify.topSeverity === 'error'
                                ? 'bg-red-500/20 text-red-400'
                                : lastVerify.topSeverity === 'warn'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {(lastVerify.issues || []).length} issues —{' '}
                            {lastVerify.topSeverity || 'none'}
                          </span>
                        </div>
                        {Array.isArray(lastVerify.issues) &&
                          lastVerify.issues.length > 0 && (
                            <div className="space-y-2">
                              {lastVerify.issues.map((it: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-950/50 border border-gray-800"
                                >
                                  <span
                                    className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                      it.severity === 'error'
                                        ? 'bg-red-700 text-red-100'
                                        : it.severity === 'warn'
                                          ? 'bg-amber-700 text-amber-100'
                                          : 'bg-gray-700 text-gray-300'
                                    }`}
                                  >
                                    {it.severity || 'info'}
                                  </span>
                                  <div>
                                    <span className="font-medium text-gray-200">
                                      {String(it.kind || 'unknown')}
                                    </span>
                                    <p className="text-sm text-gray-400 mt-0.5">
                                      {String(it.message || '')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                      </>
                    ) : (
                      <p className="text-gray-500">
                        Run Verify Quality to generate a report.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Last Grab Card */}
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconDownload />
                        Last Grab
                      </CardTitle>
                      <span className="text-xs text-gray-500">
                        {lastGrab?.at
                          ? new Date(lastGrab.at).toLocaleString()
                          : 'No grab yet'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {lastGrab ? (
                      <>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span
                            className={`px-3 py-1.5 rounded-lg font-medium text-sm ${
                              lastGrab.ok
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {lastGrab.ok ? 'Success' : 'Failed'}
                          </span>
                          <span className="text-sm text-gray-400">
                            Client: {lastGrab.client || 'unknown'}
                          </span>
                          <span className="text-sm text-gray-400">
                            Protocol: {lastGrab.protocol || '-'}
                          </span>
                          {lastGrab.status && (
                            <span className="text-sm text-gray-400">
                              Status: {lastGrab.status}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!lastGrab || !lastGrab.link}
                            onClick={handleRegrab}
                          >
                            <IconRefresh />
                            Re-grab Last
                          </Button>
                          {String(lastGrab.client || '') === 'sabnzbd' &&
                            settings?.sabnzbd?.baseUrl && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  try {
                                    window.open(
                                      String(settings?.sabnzbd?.baseUrl || ''),
                                      '_blank'
                                    );
                                  } catch (_) {
                                    /* ignore */
                                  }
                                }}
                              >
                                <IconExternalLink />
                                Open in SAB
                              </Button>
                            )}
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500">
                        Once a grab is queued, details will appear here.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Content Type Specific */}
                {kind === 'series' && (
                  <Card className="border-gray-800 bg-gray-900/30">
                    <CardHeader>
                      <CardTitle className="text-base">Seasons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[1, 2, 3].map((s) => (
                          <div
                            key={s}
                            className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-950/30 hover:bg-gray-950/50 transition-colors"
                          >
                            <div>
                              <h4 className="font-medium text-white">
                                Season {s}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Episodes (placeholder)
                              </p>
                            </div>
                            <IconChevronRight />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {kind === 'movies' && (
                  <Card className="border-gray-800 bg-gray-900/30">
                    <CardHeader>
                      <CardTitle className="text-base">Releases</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500">
                        Releases list (placeholder)
                      </p>
                    </CardContent>
                  </Card>
                )}

                {kind === 'music' && (
                  <Card className="border-gray-800 bg-gray-900/30">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Albums / Tracks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500">
                        Albums/tracks (placeholder)
                      </p>
                    </CardContent>
                  </Card>
                )}

                {kind === 'books' && (
                  <Card className="border-gray-800 bg-gray-900/30">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Volumes / Chapters
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500">
                        Volumes/chapters (placeholder)
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-6">
                {/* NZB Upload Section */}
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <IconUpload />
                      NZB Upload (SAB)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Input
                        type="file"
                        accept=".nzb,application/x-nzb"
                        onChange={(e) =>
                          setNzbFile(
                            e.target.files && e.target.files[0]
                              ? e.target.files[0]
                              : null
                          )
                        }
                        className="flex-1 p-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer"
                      />
                      <Button
                        disabled={!nzbFile || nzbUploading}
                        onClick={async () => {
                          if (!nzbFile) return;
                          setNzbUploading(true);
                          try {
                            const fd = new FormData();
                            fd.append('kind', singularKind);
                            fd.append('id', id);
                            fd.append('title', title);
                            fd.append('protocol', 'usenet');
                            fd.append('nzbUpload', nzbFile);
                            const r = await fetch('/api/downloads/grab', {
                              method: 'POST',
                              body: fd,
                            });
                            const j = await r.json();
                            if (!j.ok)
                              throw new Error(j.error || 'upload_failed');
                            pushToast(
                              'success',
                              j.queued ? 'Uploaded and queued' : 'Uploaded'
                            );
                            setNzbFile(null);
                            refreshLastGrab();
                          } catch (e) {
                            pushToast(
                              'error',
                              (e as Error).message || 'Upload failed'
                            );
                          } finally {
                            setNzbUploading(false);
                          }
                        }}
                      >
                        {nzbUploading ? 'Uploading...' : 'Upload NZB'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Manual Search Section */}
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <IconSearch />
                      Manual Search
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!query || query.trim().length < 2) return;
                        setSearching(true);
                        try {
                          const r = await fetch('/api/indexers/search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              q: query.trim(),
                              kind,
                              serverFilter,
                            }),
                          });
                          const j = await r.json();
                          setResults(Array.isArray(j.results) ? j.results : []);
                        } catch (e2) {
                          pushToast(
                            'error',
                            (e2 as Error).message || 'Search failed'
                          );
                        } finally {
                          setSearching(false);
                        }
                      }}
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search releases for ${title}`}
                        className="flex-1"
                      />
                      <Button disabled={searching}>
                        {searching ? 'Searching…' : 'Search'}
                      </Button>
                    </form>

                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={serverFilter}
                        onChange={(e) => setServerFilter(e.target.checked)}
                        className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500/50"
                      />
                      <span className="text-sm text-gray-400">
                        Server filter by Quality
                      </span>
                    </label>

                    {/* Results Table */}
                    <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950/50">
                      <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px] gap-4 p-3 border-b border-gray-800 text-xs text-gray-500 font-medium uppercase tracking-wider">
                        <div>Title</div>
                        <div>Size</div>
                        <div>Seeders</div>
                        <div>Action</div>
                      </div>
                      <div className="divide-y divide-gray-800">
                        {results.map((r, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_100px] gap-2 sm:gap-4 p-3 sm:items-center hover:bg-gray-900/50 transition-colors"
                          >
                            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-300">
                              {(() => {
                                const t = r.title || 'N/A';
                                const q = detectQuality(String(t));
                                const prof = (profiles || {})[kind as any] || {
                                  allowed: [],
                                  cutoff: '',
                                };
                                const allowedList = Array.isArray(prof.allowed)
                                  ? prof.allowed.map((x: any) =>
                                      String(x).toLowerCase()
                                    )
                                  : [];
                                const cutoff = String(
                                  prof.cutoff || ''
                                ).toLowerCase();
                                const allowed =
                                  allowedList.length === 0 ||
                                  (q ? allowedList.includes(q) : false);
                                const meetsCutoff =
                                  q && cutoff
                                    ? (qualityRank[q] || 0) >=
                                      (qualityRank[cutoff] || 0)
                                    : true;
                                return (
                                  <>
                                    <span title={t}>{t}</span>
                                    {q && (
                                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                                        {q.toUpperCase()}
                                      </span>
                                    )}
                                    {allowed && q && cutoff && !meetsCutoff && (
                                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-amber-900/50 text-amber-400">
                                        below cutoff
                                      </span>
                                    )}
                                    {!allowed && (
                                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-red-900/50 text-red-400">
                                        not allowed
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <div className="text-sm text-gray-500">
                              <span className="sm:hidden text-gray-600 mr-2">
                                Size:
                              </span>
                              {r.size || '-'}
                            </div>
                            <div className="text-sm text-gray-500">
                              <span className="sm:hidden text-gray-600 mr-2">
                                Seeders:
                              </span>
                              {typeof r.seeders === 'number' ? r.seeders : '-'}
                            </div>
                            <div>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(
                                      '/api/downloads/grab',
                                      {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          kind,
                                          id,
                                          title: r.title,
                                          link: (r as any).link,
                                          protocol:
                                            (r as any).protocol || 'torrent',
                                        }),
                                      }
                                    );
                                    const j = await res.json();
                                    if (j.ok)
                                      pushToast(
                                        'success',
                                        'Queued for download'
                                      );
                                    else
                                      pushToast(
                                        'error',
                                        'Grab failed: ' + (j.error || 'unknown')
                                      );
                                    if (j.ok) refreshLastGrab();
                                  } catch (e) {
                                    pushToast(
                                      'error',
                                      (e as Error).message || 'Grab failed'
                                    );
                                  }
                                }}
                                disabled={(() => {
                                  const t = r.title || '';
                                  const q = detectQuality(String(t));
                                  const prof = (profiles || {})[
                                    kind as any
                                  ] || {
                                    allowed: [],
                                    cutoff: '',
                                  };
                                  const allowedList = Array.isArray(
                                    prof.allowed
                                  )
                                    ? prof.allowed.map((x: any) =>
                                        String(x).toLowerCase()
                                      )
                                    : [];
                                  if (allowedList.length === 0) return false;
                                  return !(q && allowedList.includes(q));
                                })()}
                              >
                                Grab
                              </Button>
                            </div>
                          </div>
                        ))}
                        {results.length === 0 && (
                          <div className="p-8 text-center text-gray-500 text-sm">
                            No results found. Try searching above.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'history' && (
              <Card className="border-gray-800 bg-gray-900/30">
                <CardHeader>
                  <CardTitle className="text-base">Activity History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 text-center py-8">
                    Activity history for this item will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
