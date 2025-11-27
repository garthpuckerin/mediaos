import React from 'react';
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

const fieldsetStyle: React.CSSProperties = {
  border: '1px solid #1f2937',
  borderRadius: 8,
  padding: 8,
};

export function VerifySettings() {
  const [settings, setSettings] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/settings/verify')
      .then((r) => r.json())
      .then((j) => setSettings(j.settings || {}))
      .catch(() => setSettings({}));
  }, []);

  const toNum = (v: string) => {
    const n = Number(String(v || '').trim());
    return Number.isFinite(n) ? Math.trunc(n) : undefined;
  };

  const current = settings || {};
  const bitrate = current.minBitrateKbpsByHeight || {};

  return (
    <section>
      <h2>Settings - Verification</h2>
      {!settings && <p style={{ color: '#9aa4b2' }}>Loading…</p>}
      {settings && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const f = e.target as HTMLFormElement;
              const d = new FormData(f);
              const allowed = String(d.get('allowedContainers') || '')
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean);
              const payload: any = {
                minDurationSec: toNum(String(d.get('minDurationSec') || '')),
                minBitrateKbpsByHeight: {
                  '480': toNum(String(d.get('br480') || '')),
                  '720': toNum(String(d.get('br720') || '')),
                  '1080': toNum(String(d.get('br1080') || '')),
                  '2160': toNum(String(d.get('br2160') || '')),
                },
                allowedContainers: allowed.length > 0 ? allowed : undefined,
              };
              const res = await fetch('/api/settings/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error(await res.text());
              const j = await res.json();
              setSettings(j.settings || {});
              pushToast('success', 'Saved');
            } catch (err) {
              pushToast('error', (err as Error).message || 'Save failed');
            } finally {
              setSaving(false);
            }
          }}
          style={{ display: 'grid', gap: 16, maxWidth: 520 }}
        >
          <fieldset style={fieldsetStyle}>
            <legend style={{ padding: '0 6px' }}>Basics</legend>
            <label>
              <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                Min Duration (sec)
              </div>
              <input
                name="minDurationSec"
                type="number"
                min={1}
                defaultValue={current.minDurationSec}
                style={inputStyle}
              />
            </label>
            <label>
              <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                Allowed Containers (comma-separated)
              </div>
              <input
                name="allowedContainers"
                defaultValue={(current.allowedContainers || []).join(', ')}
                placeholder="mp4, mkv"
                style={inputStyle}
              />
            </label>
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend style={{ padding: '0 6px' }}>
              Min Bitrate (kbps) by Height
            </legend>
            <div
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: '1fr 1fr',
              }}
            >
              <label>
                <div style={{ fontSize: 12, color: '#9aa4b2' }}>480p</div>
                <input
                  name="br480"
                  type="number"
                  defaultValue={bitrate['480']}
                  style={inputStyle}
                />
              </label>
              <label>
                <div style={{ fontSize: 12, color: '#9aa4b2' }}>720p</div>
                <input
                  name="br720"
                  type="number"
                  defaultValue={bitrate['720']}
                  style={inputStyle}
                />
              </label>
              <label>
                <div style={{ fontSize: 12, color: '#9aa4b2' }}>1080p</div>
                <input
                  name="br1080"
                  type="number"
                  defaultValue={bitrate['1080']}
                  style={inputStyle}
                />
              </label>
              <label>
                <div style={{ fontSize: 12, color: '#9aa4b2' }}>2160p</div>
                <input
                  name="br2160"
                  type="number"
                  defaultValue={bitrate['2160']}
                  style={inputStyle}
                />
              </label>
            </div>
          </fieldset>

          <div>
            <button type="submit" disabled={saving} style={buttonStyle}>
              {saving ? 'Saving…' : 'Save Verification Settings'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
