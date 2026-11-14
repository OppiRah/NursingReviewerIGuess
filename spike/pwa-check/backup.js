// Export / import for SPIKE-001 (throwaway).
import { dumpAll, clearAll, putAll, checksum, STORES } from './db.js';

export const SCHEMA_VERSION = 1;

export async function buildExport() {
  const stores = await dumpAll();
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    checksum: await checksum(stores),
    stores,
  };
}

export function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportToFile() {
  const data = await buildExport();
  downloadText(`pwa-check-backup-${data.exportedAt.slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
  return data;
}

// Restore every store, then recompute the checksum and compare.
export async function restore(data) {
  if (!data || data.schemaVersion !== SCHEMA_VERSION || !data.stores) {
    throw new Error(`unsupported backup (schemaVersion ${data && data.schemaVersion})`);
  }
  await clearAll();
  for (const s of STORES) await putAll(s, data.stores[s] || []);
  const after = await checksum(await dumpAll());
  return { pass: after === data.checksum, expected: data.checksum, actual: after };
}

export async function importFromFile(file) {
  return restore(JSON.parse(await file.text()));
}
