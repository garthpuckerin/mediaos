export type QbConfig = {
  baseUrl?: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
  category?: string;
};

export interface TorrentClient {
  addMagnet(
    magnet: string,
    dest?: string,
    cfg?: QbConfig
  ): Promise<{ ok: boolean; status?: number; error?: string }>;
  list(cfg?: QbConfig): Promise<
    | {
        ok: true;
        items: Array<{
          id: string;
          name: string;
          progress: number;
          state?: string;
          dlspeed?: number;
          eta?: number;
          category?: string;
        }>;
      }
    | { ok: false; error?: string; status?: number }
  >;
  action(
    op: 'pause' | 'resume' | 'delete',
    id: string,
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
  addUrl(
    url: string,
    cfg?: SabConfig
  ): Promise<{ ok: boolean; status?: number; error?: string }>;
  addFile(
    file: { base64: string; filename?: string; mimetype?: string },
    cfg?: SabConfig
  ): Promise<{ ok: boolean; status?: number; error?: string }>;
  queue(cfg?: SabConfig): Promise<
    | {
        ok: true;
        items: Array<{
          id: string;
          name: string;
          mb?: number;
          mbleft?: number;
          timeleft?: string;
          status?: string;
          category?: string;
        }>;
      }
    | { ok: false; error?: string; status?: number }
  >;
  action(
    op: 'pause' | 'resume' | 'delete',
    id: string,
    cfg?: SabConfig
  ): Promise<{ ok: boolean; status?: number; error?: string }>;
  history(cfg?: SabConfig): Promise<
    | {
        ok: true;
        items: Array<{
          id: string;
          name: string;
          status?: string;
          completed?: string;
          category?: string;
        }>;
      }
    | { ok: false; error?: string; status?: number }
  >;
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
      const t = setTimeout(
        () => controller.abort(),
        Math.max(2000, Math.min(20000, cfg.timeoutMs || 8000))
      );
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
  async addFile(file, cfg) {
    try {
      if (!cfg?.baseUrl || !cfg?.apiKey) {
        console.log('SABnzbd addFile (stub):', file?.filename || 'upload');
        return { ok: true };
      }
      const baseUrl = cfg.baseUrl.replace(/\/$/, '');
      const api = new URL(baseUrl + '/api');
      const FormDataAny: any = (globalThis as any).FormData;
      const BlobAny: any = (globalThis as any).Blob;
      if (!FormDataAny || !BlobAny) {
        const dataUrl =
          'data:application/x-nzb;base64,' + String(file.base64 || '');
        return await this.addUrl(dataUrl, cfg);
      }
      const buf = Buffer.from(String(file.base64 || ''), 'base64');
      const form = new FormDataAny();
      form.append('mode', 'addfile');
      form.append('output', 'json');
      form.append('apikey', String(cfg.apiKey));
      if (cfg.category) form.append('cat', String(cfg.category));
      const fname = file.filename || 'upload.nzb';
      const blob = new BlobAny([buf], {
        type: file.mimetype || 'application/x-nzb',
      });
      form.append('name', blob, fname);
      const controller = new AbortController();
      const t = setTimeout(
        () => controller.abort(),
        Math.max(2000, Math.min(20000, cfg.timeoutMs || 8000))
      );
      try {
        const res = await fetch(api.toString(), {
          method: 'POST',
          body: form as any,
          signal: controller.signal,
        });
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
  async queue(cfg) {
    try {
      if (!cfg?.baseUrl || !cfg?.apiKey) return { ok: true, items: [] };
      const url = new URL('/api', cfg.baseUrl.replace(/\/$/, ''));
      url.searchParams.set('mode', 'queue');
      url.searchParams.set('output', 'json');
      url.searchParams.set('apikey', String(cfg.apiKey));
      const res = await fetch(url.toString());
      if (!res.ok)
        return { ok: false, status: res.status, error: 'queue_failed' };
      const j = await res.json();
      const items = Array.isArray(j?.queue?.slots)
        ? j.queue.slots.map((s: any) => ({
            id: String(s.nzo_id || s.nzo_id || s.id || ''),
            name: String(s.filename || s.name || ''),
            mb: Number(s.mb || 0),
            mbleft: Number(s.mbleft || 0),
            timeleft: String(s.timeleft || ''),
            status: String(s.status || ''),
            category: String(s.cat || ''),
          }))
        : [];
      return { ok: true, items };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  async action(op, id, cfg) {
    try {
      if (!cfg?.baseUrl || !cfg?.apiKey)
        return { ok: false, error: 'not_configured' };
      const url = new URL('/api', cfg.baseUrl.replace(/\/$/, ''));
      url.searchParams.set('mode', 'queue');
      const name =
        op === 'pause' ? 'pause' : op === 'resume' ? 'resume' : 'delete';
      url.searchParams.set('name', name);
      url.searchParams.set('value', id);
      url.searchParams.set('apikey', String(cfg.apiKey));
      url.searchParams.set('output', 'json');
      const res = await fetch(url.toString());
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  async history(cfg) {
    try {
      if (!cfg?.baseUrl || !cfg?.apiKey) return { ok: true, items: [] };
      const url = new URL('/api', cfg.baseUrl.replace(/\/$/, ''));
      url.searchParams.set('mode', 'history');
      url.searchParams.set('output', 'json');
      url.searchParams.set('apikey', String(cfg.apiKey));
      const res = await fetch(url.toString());
      if (!res.ok)
        return { ok: false, status: res.status, error: 'history_failed' };
      const j = await res.json();
      const items = Array.isArray(j?.history?.slots)
        ? j.history.slots.map((s: any) => ({
            id: String(s.nzo_id || s.nzo_id || s.id || ''),
            name: String(s.name || s.filename || ''),
            status: String(s.status || ''),
            completed: s.completed || s.completedtime || undefined,
            category: String(s.cat || ''),
          }))
        : [];
      return { ok: true, items };
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
  addUrl(
    url: string,
    cfg?: NzbgetConfig
  ): Promise<{ ok: boolean; status?: number; error?: string }>;
}

export const nzbget: NzbClient = {
  async addUrl(url, cfg) {
    try {
      if (!cfg?.baseUrl) {
        console.log('NZBGet addUrl (stub):', url.slice(0, 60));
        return { ok: true };
      }
      const jrpc = new URL('/jsonrpc', cfg.baseUrl.replace(/\/$/, ''));
      const auth =
        cfg.username && (cfg.password || cfg.password === '')
          ? 'Basic ' +
            Buffer.from(`${cfg.username}:${cfg.password || ''}`).toString(
              'base64'
            )
          : undefined;
      const controller = new AbortController();
      const t = setTimeout(
        () => controller.abort(),
        Math.max(2000, Math.min(20000, cfg.timeoutMs || 8000))
      );
      try {
        const res = await fetch(jrpc.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(auth ? { Authorization: auth } : {}),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'appendurl',
            params: [url, '', 0, false, false, '', 0, false],
            id: 1,
          }),
          signal: controller.signal,
        });
        clearTimeout(t);
        if (!res.ok)
          return { ok: false, status: res.status, error: 'add_failed' };
        const json = await res.json().catch(() => ({}));
        const ok =
          json &&
          (json.result === true || json.result === 0 || json.ok === true);
        return { ok: !!ok, status: res.status };
      } catch (e) {
        clearTimeout(t);
        return { ok: false, error: (e as Error).message };
      }
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
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
            body: toForm({
              username: cfg.username || '',
              password: cfg.password || '',
            }),
            signal: controller.signal,
          });
          const setCookie = res.headers.get('set-cookie') || '';
          const m = setCookie.match(/SID=([^;]+)/);
          if (m) cookie = 'SID=' + m[1];
          if (!res.ok)
            return { ok: false, status: res.status, error: 'login_failed' };
        }
        const addUrl = baseUrl + '/api/v2/torrents/add';
        const resAdd = await fetch(addUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: toForm({
            urls: magnet,
            ...(cfg?.category ? { category: String(cfg.category) } : {}),
          }),
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
  async list(cfg) {
    try {
      if (!cfg?.baseUrl) return { ok: true, items: [] };
      const baseUrl = cfg.baseUrl.replace(/\/$/, '');
      const url = baseUrl + '/api/v2/torrents/info?filter=all';
      const res = await fetch(url);
      if (!res.ok)
        return { ok: false, status: res.status, error: 'list_failed' };
      const arr = await res.json();
      const items = Array.isArray(arr)
        ? arr.map((t: any) => ({
            id: String(t.hash || ''),
            name: String(t.name || ''),
            progress: typeof t.progress === 'number' ? t.progress : 0,
            state: String(t.state || ''),
            dlspeed: typeof t.dlspeed === 'number' ? t.dlspeed : undefined,
            eta: typeof t.eta === 'number' ? t.eta : undefined,
            category: t.category || undefined,
          }))
        : [];
      return { ok: true, items };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  async action(op, id, cfg) {
    try {
      if (!cfg?.baseUrl) return { ok: false, error: 'not_configured' };
      const baseUrl = cfg.baseUrl.replace(/\/$/, '');
      const toForm = (data: Record<string, string>) =>
        new URLSearchParams(data).toString();
      const path =
        op === 'pause'
          ? '/api/v2/torrents/pause'
          : op === 'resume'
            ? '/api/v2/torrents/resume'
            : '/api/v2/torrents/delete';
      const url = baseUrl + path;
      const deleteFiles = 'false';
      const body =
        op === 'delete'
          ? toForm({ hashes: id, deleteFiles })
          : toForm({ hashes: id });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
