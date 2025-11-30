export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  permissions?: string[];
  entryPoint?: string; // Path to main script if applicable
}
