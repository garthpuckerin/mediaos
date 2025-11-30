import React from 'react';
import { pushToast } from '../../utils/toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';

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
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">
        Settings - Verification
      </h2>
      {!settings && <p className="text-gray-400">Loading…</p>}
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
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-1.5 block">
                <div className="text-xs text-gray-400">Min Duration (sec)</div>
                <Input
                  name="minDurationSec"
                  type="number"
                  min={1}
                  defaultValue={current.minDurationSec}
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs text-gray-400">
                  Allowed Containers (comma-separated)
                </div>
                <Input
                  name="allowedContainers"
                  defaultValue={(current.allowedContainers || []).join(', ')}
                  placeholder="mp4, mkv"
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Min Bitrate (kbps) by Height</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5 block">
                  <div className="text-xs text-gray-400">480p</div>
                  <Input
                    name="br480"
                    type="number"
                    defaultValue={bitrate['480']}
                  />
                </label>
                <label className="space-y-1.5 block">
                  <div className="text-xs text-gray-400">720p</div>
                  <Input
                    name="br720"
                    type="number"
                    defaultValue={bitrate['720']}
                  />
                </label>
                <label className="space-y-1.5 block">
                  <div className="text-xs text-gray-400">1080p</div>
                  <Input
                    name="br1080"
                    type="number"
                    defaultValue={bitrate['1080']}
                  />
                </label>
                <label className="space-y-1.5 block">
                  <div className="text-xs text-gray-400">2160p</div>
                  <Input
                    name="br2160"
                    type="number"
                    defaultValue={bitrate['2160']}
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Verification Settings'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
