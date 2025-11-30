import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { clsx } from 'clsx';

type Tab = 'poster' | 'background' | 'banner' | 'season';

export function ArtworkModal({
  open,
  onClose,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  const [tab, setTab] = useState<Tab>('poster');
  const [selected, setSelected] = useState<string | null>(null);
  const [lockOnSelect, setLockOnSelect] = useState(true);
  const keep = 10;

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setTab('poster');
    }
  }, [open]);

  const pool = useMemo(() => {
    // Placeholder URL pool (replace with real provider later)
    const base = (txt: string) =>
      `https://via.placeholder.com/300x450?text=${encodeURIComponent(txt)}`;
    return {
      poster: { p1: base(`${title}+P1`), p2: base(`${title}+P2`) },
      background: { b1: base(`${title}+BG1`) },
      banner: {},
      season: {},
    } as Record<Tab, Record<string, string>>;
  }, [title]);

  const items = Object.entries(pool[tab]);

  const save = async () => {
    if (!selected || !title) return;
    try {
      await fetch('/api/artwork/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tab, key: selected, keep, lockOnSelect }),
      });
      if (tab === 'poster' || tab === 'background') {
        await fetch('/api/library/artwork', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, tab, url: selected }),
        });
      }
      try {
        (window as any).dispatchEvent(
          new CustomEvent('library:changed', {
            detail: { title, tab, url: selected },
          })
        );
      } catch (_e) {
        /* ignore */
      }
    } finally {
      onClose();
    }
  };

  const revert = async () => {
    await fetch('/api/artwork/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, tab }),
    });
    onClose();
  };

  const lockToggle = async (locked: boolean) => {
    setLockOnSelect(locked);
    await fetch('/api/artwork/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, locked }),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Artwork — ${title}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(['poster', 'background', 'banner', 'season'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setSelected(null);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-gray-800',
                t === tab
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-gray-950 text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <div className="ml-auto">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lockOnSelect}
                onChange={(e) => lockToggle(e.target.checked)}
                className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500/50"
              />
              Lock artwork
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
          {items.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500 text-sm">
              No images found. Add by URL coming soon.
            </div>
          ) : (
            items.map(([key, url]) => (
              <button
                key={key}
                onClick={() => setSelected(url)}
                aria-label={`select artwork ${key}`}
                className={clsx(
                  'relative aspect-[2/3] rounded-lg overflow-hidden border transition-all',
                  selected === url
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                    : 'border-gray-800 hover:border-gray-600'
                )}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${url})` }}
                />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            Select an image, then Save.
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={revert}>
              Revert
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
