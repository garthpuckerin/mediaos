import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const VERIFY_RESULTS = path.join(CONFIG_DIR, 'verify-results.json');

async function ensureDir(filePath: string) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (_e) {
    // ignore
  }
}

export async function loadVerifyResults(): Promise<any> {
  try {
    const raw = await fs.readFile(VERIFY_RESULTS, 'utf8');
    const json = JSON.parse(raw);
    return json && typeof json === 'object' ? json : {};
  } catch (_e) {
    return {};
  }
}

export async function saveVerifyResults(map: any) {
  await ensureDir(VERIFY_RESULTS);
  await fs.writeFile(VERIFY_RESULTS, JSON.stringify(map, null, 2), 'utf8');
}

export async function saveLastVerifyResult(key: string, value: any) {
  const map = await loadVerifyResults();
  map[key] = value;
  await saveVerifyResults(map);
}

