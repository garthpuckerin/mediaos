import { PluginManifest } from '@mediaos/shared';

class PluginService {
  private plugins: PluginManifest[] = [
    {
      id: 'com.mediaos.trakt',
      name: 'Trakt Scrobbler',
      version: '1.0.0',
      description: 'Automatically sync watched status to Trakt.tv',
      author: 'MediaOS Team',
      enabled: true,
    },
    {
      id: 'com.community.theme-dark-plus',
      name: 'Dark+ Theme',
      version: '0.5.0',
      description: 'An enhanced dark theme with higher contrast.',
      author: 'Community',
      enabled: false,
    },
    {
      id: 'com.mediaos.discord',
      name: 'Discord Rich Presence',
      version: '1.1.2',
      description: 'Show what you are watching on Discord.',
      author: 'MediaOS Team',
      enabled: true,
    },
  ];

  async getPlugins(): Promise<PluginManifest[]> {
    return this.plugins;
  }

  async togglePlugin(id: string): Promise<PluginManifest | null> {
    const plugin = this.plugins.find((p) => p.id === id);
    if (plugin) {
      plugin.enabled = !plugin.enabled;
      return plugin;
    }
    return null;
  }
}

export const pluginService = new PluginService();
