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

export type SabConfig = {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  category?: string;
};

export interface UsenetClient {
  addUrl(url: string, cfg?: SabConfig): Promise<{ ok: boolean; status?: number; error?: string }>;
}

export const sabnzbd: UsenetClient = {
  async addUrl(url, cfg) {
    try {
      if (!cfg?.baseUrl || !cfg?.apiKey) {
        console.log('SABnzbd addUrl (stub):', url.slice(0, 60));
        return { ok: true };
      }
      const baseUrl = cfg.baseUrl.replace(/\/$/, '');
      const api = new URL(baseUrl + '/api');
      api.searchParams.set('mode', 'addurl');
      api.searchParams.set('name', url);
      api.searchParams.set('apikey', cfg.apiKey);
      api.searchParams.set('output', 'json');
      if (cfg.category) api.searchParams.set('cat', cfg.category);
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), Math.max(2000, Math.min(20000, cfg.timeoutMs || 8000)));
      try {
        const res = await fetch(api.toString(), { signal: controller.signal });
        clearTimeout(t);
        if (res.ok) return { ok: true, status: res.status };
        return { ok: false, status: res.status, error: 'add_failed' };
      } catch (e) {
        clearTimeout(t);
        return { ok: false, error: (e as Error).message };
      }
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

export type NzbgetConfig = {
  baseUrl?: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
};

export interface NzbClient {
  addUrl(url: string, cfg?: NzbgetConfig): Promise<{ ok: boolean; status?: number; error?: string }>;
}

export const nzbget: NzbClient = {
  async addUrl(url, _cfg) {
    console.log('NZBGet addUrl (stub):', url.slice(0, 60));
    return { ok: true };
  },
};
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
        if (resAdd.ok) return { ok: true, status: resAdd.status };
        return { ok: false, status: resAdd.status, error: 'add_failed' };
      } catch (e) {
        clearTimeout(t);
        return { ok: false, error: (e as Error).message };
      }
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
