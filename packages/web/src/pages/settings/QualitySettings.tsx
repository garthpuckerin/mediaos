import React from 'react';
import { pushToast } from '../../utils/toast';
import type { KindKey } from '../../utils/routing';

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

const fieldsetStyle: React.CSSProperties = {
  border: '1px solid #1f2937',
  borderRadius: 8,
  padding: 8,
};

export function QualitySettings() {
  const [profiles, setProfiles] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/settings/quality')
      .then((r) => r.json())
      .then((j) => setProfiles(j.profiles || {}))
      .catch(() => setProfiles({}));
  }, []);

  const kinds: { key: KindKey; label: string }[] = [
    { key: 'series', label: 'Series' },
    { key: 'movies', label: 'Movies' },
    { key: 'books', label: 'Books' },
    { key: 'music', label: 'Music' },
  ];

  return (
    <section>
      <h2>Settings - Quality</h2>
      {!profiles && <p style={{ color: '#9aa4b2' }}>Loading...</p>}
      {profiles && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const form = e.target as HTMLFormElement;
              const data = new FormData(form);
              const toArray = (s: string) =>
                s
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean);
              const payload: any = { profiles: {} };
              for (const k of kinds) {
                const allowed = String(data.get(`q.${k.key}.allowed`) || '');
                const cutoff = String(
                  data.get(`q.${k.key}.cutoff`) || ''
                ).trim();
                if (allowed || cutoff) {
                  payload.profiles[k.key] = {
                    allowed: toArray(allowed),
                    cutoff,
                  };
                }
              }
              const res = await fetch('/api/settings/quality', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error(await res.text());
              const j = await res.json();
              setProfiles(j.profiles || {});
              pushToast('success', 'Saved');
            } catch (err) {
              pushToast('error', (err as Error).message || 'Save failed');
            } finally {
              setSaving(false);
            }
          }}
          style={{ display: 'grid', gap: 16 }}
        >
          {kinds.map((k) => {
            const p = (profiles as any)[k.key] || { allowed: [], cutoff: '' };
            return (
              <fieldset key={k.key} style={fieldsetStyle}>
                <legend style={{ padding: '0 6px' }}>{k.label}</legend>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label>
                    <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                      Allowed (comma-separated)
                    </div>
                    <input
                      name={`q.${k.key}.allowed`}
                      defaultValue={(p.allowed || []).join(', ')}
                      placeholder="720p, 1080p, 2160p"
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: 12, color: '#9aa4b2' }}>Cutoff</div>
                    <input
                      name={`q.${k.key}.cutoff`}
                      defaultValue={p.cutoff || ''}
                      placeholder="1080p"
                      style={inputStyle}
                    />
                  </label>
                </div>
              </fieldset>
            );
          })}
          <div>
            <button type="submit" disabled={saving} style={buttonStyle}>
              {saving ? 'Saving...' : 'Save Quality'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
