import React, { useEffect, useMemo, useState } from 'react';

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

  if (!open) return null;

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
      } catch {}
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,6,23,.7)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 80,
      }}
    >
      <div
        style={{
          width: 'min(820px,92vw)',
          background: 'linear-gradient(180deg,#0f1623,#0b1220)',
          border: '1px solid #1f2937',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderBottom: '1px solid #1f2937',
          }}
        >
          <strong>Artwork — {title}</strong>
          <div style={{ marginLeft: 'auto' }} />
          <button
            onClick={onClose}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #1f2937',
              background: '#0b1220',
              color: '#e5e7eb',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            {(['poster', 'background', 'banner', 'season'] as Tab[]).map(
              (t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setSelected(null);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid #1f2937',
                    background:
                      t === tab
                        ? 'linear-gradient(135deg,#8b5cf6,#6366f1)'
                        : '#0b1220',
                    color: '#e5e7eb',
                  }}
                >
                  {t}
                </button>
              )
            )}
            <div style={{ marginLeft: 'auto' }} />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#cbd5e1',
              }}
            >
              <input
                type="checkbox"
                checked={lockOnSelect}
                onChange={(e) => lockToggle(e.target.checked)}
              />{' '}
              Lock artwork
            </label>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5,minmax(0,1fr))',
              gap: 8,
            }}
          >
            {items.length === 0 ? (
              <div style={{ color: '#9aa4b2' }}>
                No images. Add by URL coming soon.
              </div>
            ) : (
              items.map(([key, url]) => (
                <button
                  key={key}
                  onClick={() => setSelected(url)}
                  aria-label={`select artwork ${key}`}
                  style={{
                    position: 'relative',
                    height: 140,
                    borderRadius: 10,
                    border: '1px solid #1f2937',
                    background: '#0b1220',
                    overflow: 'hidden',
                    outline: selected === url ? '2px solid #6366f1' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                </button>
              ))
            )}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            borderTop: '1px solid #1f2937',
          }}
        >
          <span style={{ fontSize: 12, color: '#9aa4b2' }}>
            Select an image, then Save. Revert restores the previous version.
          </span>
          <div>
            <button
              onClick={revert}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #1f2937',
                background: '#0b1220',
                color: '#e5e7eb',
                marginRight: 8,
              }}
            >
              Revert
            </button>
            <button
              onClick={save}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid transparent',
                background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
                color: '#fff',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
