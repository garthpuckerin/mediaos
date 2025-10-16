export type QbConfig = {
  baseUrl?: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
};

export interface TorrentClient {
  addMagnet(
    magnet: string,
    dest?: string,
    cfg?: QbConfig
  ): Promise<{ ok: boolean; status?: number; error?: string }>;
}

function toForm(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

export const qbittorrent: TorrentClient = {
  async addMagnet(magnet, _dest, cfg) {
    try {
      if (!cfg?.baseUrl) {
        console.log('qBittorrent addMagnet (stub):', magnet.slice(0, 40));
        return { ok: true };
      }
      const baseUrl = cfg.baseUrl.replace(/\/$/, '');
      const timeout = Math.max(2000, Math.min(20000, cfg.timeoutMs || 8000));
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeout);
      let cookie: string | undefined;

      try {
        if (cfg.username) {
          const loginUrl = baseUrl + '/api/v2/auth/login';
          const res = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: toForm({ username: cfg.username || '', password: cfg.password || '' }),
            signal: controller.signal,
          });
          const setCookie = res.headers.get('set-cookie') || '';
          const m = setCookie.match(/SID=([^;]+)/);
          if (m) cookie = 'SID=' + m[1];
          if (!res.ok) return { ok: false, status: res.status, error: 'login_failed' };
        }
        const addUrl = baseUrl + '/api/v2/torrents/add';
        const resAdd = await fetch(addUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: toForm({ urls: magnet }),
          signal: controller.signal,
        });
        clearTimeout(t);
        return { ok: resAdd.ok, status: resAdd.status, error: resAdd.ok ? undefined : 'add_failed' };
      } catch (e) {
        clearTimeout(t);
        return { ok: false, error: (e as Error).message };
      }
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
