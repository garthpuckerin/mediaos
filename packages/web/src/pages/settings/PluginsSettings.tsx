import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PluginManifest } from '@mediaos/shared';
import { clsx } from 'clsx';

// Mock Data
const MOCK_PLUGINS: PluginManifest[] = [
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

export function PluginsSettings() {
  const [plugins, setPlugins] = useState<PluginManifest[]>(MOCK_PLUGINS);

  const togglePlugin = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plugins</CardTitle>
          <p className="text-gray-400 text-sm">
            Extend MediaOS with community plugins.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className="flex items-start justify-between p-4 rounded-lg border border-gray-800 bg-gray-900/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{plugin.name}</h3>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                      v{plugin.version}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{plugin.description}</p>
                  <p className="text-xs text-gray-500">By {plugin.author}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'text-xs',
                        plugin.enabled ? 'text-green-400' : 'text-gray-500'
                      )}
                    >
                      {plugin.enabled ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => togglePlugin(plugin.id)}
                      className={clsx(
                        'w-10 h-5 rounded-full transition-colors relative',
                        plugin.enabled ? 'bg-indigo-600' : 'bg-gray-700'
                      )}
                    >
                      <div
                        className={clsx(
                          'absolute top-1 w-3 h-3 rounded-full bg-white transition-transform',
                          plugin.enabled ? 'left-6' : 'left-1'
                        )}
                      />
                    </button>
                  </div>
                  <Button variant="ghost" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-sm mb-4">
              Want to build your own plugin?
            </p>
            <Button variant="secondary">Read Developer Docs</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
