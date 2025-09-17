export interface TorrentClient {
  addMagnet(magnet: string, dest?: string): Promise<{ ok: boolean }>;
}
export const qbittorrent: TorrentClient = {
  async addMagnet(magnet) {
    console.log('qBittorrent addMagnet (stub):', magnet.slice(0, 40));
    return { ok: true };
  }
};
