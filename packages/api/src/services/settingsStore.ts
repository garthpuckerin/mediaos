import * as fs from 'fs/promises';
import * as path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

interface MediaFolder {
  path: string;
  type: 'movies' | 'series';
  enabled: boolean;
}

interface AppSettings {
  setupCompleted: boolean;
  mediaFolders: MediaFolder[];
  lastScanDate?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  setupCompleted: false,
  mediaFolders: [],
};

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...data };
  } catch (_e) {
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings: AppSettings): Promise<void> {
  await ensureDir(SETTINGS_FILE);
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

export async function getSettings(): Promise<AppSettings> {
  return await loadSettings();
}

export async function isSetupCompleted(): Promise<boolean> {
  const settings = await loadSettings();
  return settings.setupCompleted;
}

export async function getMediaFolders(): Promise<MediaFolder[]> {
  const settings = await loadSettings();
  return settings.mediaFolders;
}

export async function saveMediaFolders(
  folders: { path: string; type: 'movies' | 'series' }[]
): Promise<void> {
  const settings = await loadSettings();
  settings.mediaFolders = folders.map((f) => ({
    ...f,
    enabled: true,
  }));
  await saveSettings(settings);
}

export async function markSetupComplete(): Promise<void> {
  const settings = await loadSettings();
  settings.setupCompleted = true;
  await saveSettings(settings);
}

export async function updateLastScanDate(): Promise<void> {
  const settings = await loadSettings();
  settings.lastScanDate = new Date().toISOString();
  await saveSettings(settings);
}
