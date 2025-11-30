import React, { useEffect, useState } from 'react';
import { pushToast } from '../../utils/toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';

type DownloaderSettingsResponse = {
  qbittorrent: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
    category?: string;
  };
  nzbget: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
  };
  sabnzbd: {
    enabled: boolean;
    baseUrl: string;
    timeoutMs: number;
    hasApiKey: boolean;
    category?: string;
  };
};

export function DownloadClientsSettings() {
  const [settings, setSettings] = useState<DownloaderSettingsResponse | null>(
    null
  );
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetch('/api/settings/downloaders')
      .then((r) => r.json())
      .then((payload: DownloaderSettingsResponse) => setSettings(payload))
      .catch(() => setSettings(null));
  }, []);

  if (!settings) {
    return <p className="text-gray-400">Loading settings...</p>;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const form = e.currentTarget;
      const data = new FormData(form);
      const b = (n: string) => data.get(n) === 'on';
      const s = (n: string) => String(data.get(n) || '').trim();
      const n = (name: string) => {
        const v = Number(String(data.get(name) || '').trim());
        return Number.isFinite(v) ? Math.trunc(v) : undefined;
      };

      const payload = {
        qbittorrent: {
          enabled: b('qb.enabled'),
          baseUrl: s('qb.baseUrl') || undefined,
          username: s('qb.username') || undefined,
          password: s('qb.password') || undefined,
          timeoutMs: n('qb.timeoutMs'),
          category: s('qb.category') || undefined,
        },
        nzbget: {
          enabled: b('nz.enabled'),
          baseUrl: s('nz.baseUrl') || undefined,
          username: s('nz.username') || undefined,
          password: s('nz.password') || undefined,
          timeoutMs: n('nz.timeoutMs'),
        },
        sabnzbd: {
          enabled: b('sab.enabled'),
          baseUrl: s('sab.baseUrl') || undefined,
          apiKey: s('sab.apiKey') || undefined,
          timeoutMs: n('sab.timeoutMs'),
          category: s('sab.category') || undefined,
        },
      };

      const res = await fetch('/api/settings/downloaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSettings(json.downloaders as DownloaderSettingsResponse);
      pushToast('success', 'Settings saved');
    } catch (err) {
      pushToast('error', (err as Error).message || 'Save failed');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTest = async (
    e: React.MouseEvent<HTMLButtonElement>,
    key: 'qbittorrent' | 'nzbget' | 'sabnzbd'
  ) => {
    e.preventDefault();
    const form = e.currentTarget.form as HTMLFormElement;
    const data = new FormData(form);
    const b = (n: string) => data.get(n) === 'on';
    const str = (n: string) => String(data.get(n) || '').trim();
    const num = (n: string) => {
      const v = Number(String(data.get(n) || '').trim());
      return Number.isFinite(v) ? Math.trunc(v) : undefined;
    };

    let payload: any;
    if (key === 'qbittorrent') {
      payload = {
        enabled: b('qb.enabled'),
        baseUrl: str('qb.baseUrl') || undefined,
        username: str('qb.username') || undefined,
        password: str('qb.password') || undefined,
        timeoutMs: num('qb.timeoutMs'),
        category: str('qb.category') || undefined,
      };
    } else if (key === 'nzbget') {
      payload = {
        enabled: b('nz.enabled'),
        baseUrl: str('nz.baseUrl') || undefined,
        username: str('nz.username') || undefined,
        password: str('nz.password') || undefined,
        timeoutMs: num('nz.timeoutMs'),
      };
    } else {
      payload = {
        enabled: b('sab.enabled'),
        baseUrl: str('sab.baseUrl') || undefined,
        apiKey: str('sab.apiKey') || undefined,
        timeoutMs: num('sab.timeoutMs'),
        category: str('sab.category') || undefined,
      };
    }

    try {
      const r = await fetch('/api/settings/downloaders/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: key, settings: payload }),
      });
      const j = await r.json();
      if (j.ok) {
        pushToast(
          'success',
          `${key} reachable${j.status ? ` (status ${j.status})` : ''}`
        );
      } else {
        pushToast('error', `${key} failed: ${j.error || 'unknown error'}`);
      }
    } catch (err) {
      pushToast('error', (err as Error).message || 'Test failed');
    }
  };

  return (
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">
        Settings - Download Clients
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {(['qbittorrent', 'nzbget', 'sabnzbd'] as const).map((key) => {
          const label =
            key === 'qbittorrent' ? 'qBittorrent' : key.toUpperCase();
          const s = (settings as any)[key];
          const prefix =
            key === 'qbittorrent' ? 'qb' : key === 'nzbget' ? 'nz' : 'sab';

          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`${prefix}.enabled`}
                    defaultChecked={s.enabled}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500/50"
                  />
                  <span className="text-sm text-gray-300">Enabled</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5">
                    <div className="text-xs text-gray-400">Base URL</div>
                    <Input
                      name={`${prefix}.baseUrl`}
                      defaultValue={s.baseUrl || ''}
                      placeholder="http://localhost:8080"
                    />
                  </label>

                  {key !== 'sabnzbd' && (
                    <label className="space-y-1.5">
                      <div className="text-xs text-gray-400">Username</div>
                      <Input
                        name={`${prefix}.username`}
                        defaultValue={(s.username || '') as string}
                      />
                    </label>
                  )}

                  {key === 'qbittorrent' && (
                    <label className="space-y-1.5">
                      <div className="text-xs text-gray-400">Password</div>
                      <Input
                        name="qb.password"
                        type="password"
                        placeholder={s.hasPassword ? '******' : ''}
                      />
                    </label>
                  )}

                  {key === 'qbittorrent' && (
                    <label className="space-y-1.5">
                      <div className="text-xs text-gray-400">Category</div>
                      <Input
                        name="qb.category"
                        placeholder="tv"
                        defaultValue={s.category || ''}
                      />
                    </label>
                  )}

                  {key === 'nzbget' && (
                    <label className="space-y-1.5">
                      <div className="text-xs text-gray-400">Password</div>
                      <Input
                        name="nz.password"
                        type="password"
                        placeholder={s.hasPassword ? '******' : ''}
                      />
                    </label>
                  )}

                  {key === 'sabnzbd' && (
                    <label className="space-y-1.5">
                      <div className="text-xs text-gray-400">API Key</div>
                      <Input
                        name="sab.apiKey"
                        type="password"
                        placeholder={s.hasApiKey ? '******' : ''}
                      />
                    </label>
                  )}

                  {key === 'sabnzbd' && (
                    <label className="space-y-1.5">
                      <div className="text-xs text-gray-400">Category</div>
                      <Input
                        name="sab.category"
                        placeholder="tv"
                        defaultValue={s.category || ''}
                      />
                    </label>
                  )}

                  <label className="space-y-1.5">
                    <div className="text-xs text-gray-400">Timeout (ms)</div>
                    <Input
                      name={`${prefix}.timeoutMs`}
                      type="number"
                      min={1000}
                      max={60000}
                      defaultValue={s.timeoutMs}
                    />
                  </label>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => handleTest(e, key)}
                  >
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <div>
          <Button type="submit" disabled={savingSettings}>
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </section>
  );
}
