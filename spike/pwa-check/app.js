// SPIKE-001 UI wiring (throwaway).
import { putAll, get, getAll, dumpAll, clearAll, checksum, makeSeed } from './db.js';
import { buildIcs, validateIcs } from './ics.js';
import { buildExport, exportToFile, importFromFile, restore, downloadText } from './backup.js';

const $ = (id) => document.getElementById(id);

function row(dl, label, value) {
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = value;
  dl.append(dt, dd);
}

function setResult(el, pass, text) {
  el.className = `result ${pass ? 'pass' : 'fail'}`;
  el.textContent = text;
}

async function renderEnvironment() {
  const dl = $('env');
  dl.replaceChildren();
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  row(dl, 'Installed app', standalone ? 'yes (standalone)' : 'no (browser tab)');
  row(dl, 'User agent', navigator.userAgent);
  if (navigator.storage && navigator.storage.persist) {
    try { row(dl, 'persist()', String(await navigator.storage.persist())); }
    catch (e) { row(dl, 'persist()', `error: ${e.message}`); }
  } else row(dl, 'persist()', 'not available');
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    row(dl, 'estimate()', `usage ${est.usage} B / quota ${est.quota} B`);
  } else row(dl, 'estimate()', 'not available');
}

async function recordOpen() {
  await putAll('opens', [{ at: new Date().toISOString(), standalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true }]);
}

async function renderStorage() {
  const dl = $('storage');
  dl.replaceChildren();
  const data = await dumpAll();
  const seed = await get('meta', 'seed');
  const opens = (await getAll('opens')).map((o) => o.at).sort();
  if (seed) {
    const days = Math.floor((Date.now() - Date.parse(seed.seededAt)) / 86400000);
    row(dl, 'seededAt', seed.seededAt);
    row(dl, 'Days since seed', String(days));
  } else row(dl, 'seededAt', 'not seeded yet');
  row(dl, 'Item count', String(data.items.length));
  row(dl, 'Checksum', (await checksum(data)).slice(0, 16) + '…');
  row(dl, 'Last opened', opens.length > 1 ? opens[opens.length - 2] : '(first open)');
  row(dl, 'Opens logged', String(opens.length));
}

async function seed() {
  const s = makeSeed();
  await putAll('meta', s.meta);
  await putAll('items', s.items);
  await renderStorage();
}

function addReminder() {
  const [hour, minute] = $('time').value.split(':').map(Number);
  const text = buildIcs({ hour, minute });
  downloadText('review-reminder.ics', text, 'text/calendar');
}

function askConfirm() {
  return new Promise((resolve) => {
    const box = $('confirm');
    box.hidden = false;
    const finish = (answer) => { box.hidden = true; resolve(answer); };
    $('confirm-yes').onclick = () => finish(true);
    $('confirm-no').onclick = () => finish(false);
  });
}

async function wipe() {
  if (!(await askConfirm())) return;
  await clearAll();
  setResult($('backup-result'), true, 'Local data wiped.');
  await renderStorage();
}

async function doImport(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const r = await importFromFile(file);
    setResult($('backup-result'), r.pass, `${r.pass ? 'PASS' : 'FAIL'}: checksum ${r.pass ? 'matches' : 'differs'}\nexpected ${r.expected}\nactual   ${r.actual}`);
  } catch (e) {
    setResult($('backup-result'), false, `FAIL: ${e.message}`);
  }
  ev.target.value = '';
  await renderStorage();
}

// Export -> wipe -> restore in IndexedDB, plus .ics validation. Restores user data afterwards.
async function selfTest() {
  const lines = [];
  let ok = true;
  try {
    if (!(await get('meta', 'seed'))) { await seed(); lines.push('seeded test data first'); }
    const before = await buildExport();
    await clearAll();
    const emptyCount = (await getAll('items')).length;
    const r = await restore(JSON.parse(JSON.stringify(before)));
    lines.push(`wipe left ${emptyCount} items`);
    lines.push(`round-trip: ${r.pass ? 'PASS' : 'FAIL'} (${r.actual.slice(0, 12)}…)`);
    ok = ok && r.pass && emptyCount === 0;
  } catch (e) {
    ok = false;
    lines.push(`round-trip: FAIL (${e.message})`);
  }
  const v = validateIcs(buildIcs({ hour: 20, minute: 0 }));
  lines.push(`.ics: ${v.ok ? 'PASS' : 'FAIL ' + v.errors.join('; ')}`);
  ok = ok && v.ok;
  setResult($('selftest-result'), ok, `${ok ? 'PASS' : 'FAIL'}\n${lines.join('\n')}`);
  await renderStorage();
}

async function main() {
  $('seed').onclick = seed;
  $('ics').onclick = addReminder;
  $('export').onclick = () => exportToFile();
  $('wipe').onclick = wipe;
  $('import').onchange = doImport;
  $('selftest').onclick = selfTest;
  await recordOpen();
  await Promise.all([renderEnvironment(), renderStorage()]);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
  }
}

main().catch((e) => {
  document.body.insertAdjacentText('afterbegin', `Startup error: ${e.message}`);
});
