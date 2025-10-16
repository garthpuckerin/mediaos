import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const GRABS_FILE = path.join(CONFIG_DIR, 'grabs.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch {}
}

export async function loadGrabs(): Promise<any> {
  try {
    const raw = await fs.readFile(GRABS_FILE, 'utf8');
    const json = JSON.parse(raw);
    return json && typeof json === 'object' ? json : {};
  } catch {
    return {};
  }
}

export async function saveGrab(key: string, grab: any) {
  const map = await loadGrabs();
  map[key] = grab;
  await ensureDir(GRABS_FILE);
  await fs.writeFile(GRABS_FILE, JSON.stringify(map, null, 2), 'utf8');
}

