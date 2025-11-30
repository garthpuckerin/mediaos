import React from 'react';
import { pushToast } from '../../utils/toast';
import type { KindKey } from '../../utils/routing';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';

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
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">Settings - Quality</h2>
      {!profiles && <p className="text-gray-400">Loading...</p>}
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
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {kinds.map((k) => {
              const p = (profiles as any)[k.key] || { allowed: [], cutoff: '' };
              return (
                <Card key={k.key}>
                  <CardHeader>
                    <CardTitle>{k.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="space-y-1.5 block">
                      <div className="text-xs text-gray-400">
                        Allowed (comma-separated)
                      </div>
                      <Input
                        name={`q.${k.key}.allowed`}
                        defaultValue={(p.allowed || []).join(', ')}
                        placeholder="720p, 1080p, 2160p"
                      />
                    </label>
                    <label className="space-y-1.5 block">
                      <div className="text-xs text-gray-400">Cutoff</div>
                      <Input
                        name={`q.${k.key}.cutoff`}
                        defaultValue={p.cutoff || ''}
                        placeholder="1080p"
                      />
                    </label>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Quality'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
