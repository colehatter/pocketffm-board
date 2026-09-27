const siteUrl = process.env.POCKETFFM_BOARD_SITE_URL || 'https://pocketffm-board.vercel.app/board.json';
const mainUrl = process.env.POCKETFFM_BOARD_MAIN_URL || 'https://api.github.com/repos/colehatter/pocketffm-board/contents/board.json?ref=main';
const mainCommitUrl = process.env.POCKETFFM_BOARD_MAIN_COMMIT_URL || 'https://api.github.com/repos/colehatter/pocketffm-board/commits/main';
const snapshotBaseUrl = process.env.POCKETFFM_BOARD_SNAPSHOT_BASE_URL || 'https://pocketffm-board.vercel.app/snapshots';

function cacheBusted(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('board_sync_check', Date.now().toString());
  return parsed;
}

async function fetchBoard(url, label) {
  const headers = { 'Cache-Control': 'no-cache' };
  if (url.includes('api.github.com/')) {
    headers.Accept = 'application/vnd.github.raw+json';
    headers['User-Agent'] = 'pocketffm-board-sync-check';
  }
  const response = await fetch(cacheBusted(url), { headers });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  const board = await response.json();
  const updatedMs = Date.parse(board.updated);
  if (!Number.isFinite(updatedMs)) throw new Error(`${label} has an invalid updated timestamp`);
  return { board, updatedMs };
}

async function fetchMainCommit() {
  const response = await fetch(cacheBusted(mainCommitUrl), {
    headers: { Accept: 'application/vnd.github+json', 'Cache-Control': 'no-cache', 'User-Agent': 'pocketffm-board-sync-check' }
  });
  if (!response.ok) throw new Error(`GitHub main commit returned HTTP ${response.status}`);
  const payload = await response.json();
  if (!/^[0-9a-f]{40}$/.test(payload.sha || '')) throw new Error('GitHub main commit has an invalid SHA');
  return payload.sha;
}

const [published, main, mainCommit] = await Promise.all([
  fetchBoard(siteUrl, 'Published board'),
  fetchBoard(mainUrl, 'GitHub main board'),
  fetchMainCommit()
]);
const snapshot = await fetchBoard(`${snapshotBaseUrl}/${mainCommit.slice(0, 7)}.json`, 'Commit-stamped snapshot');

if (published.updatedMs !== main.updatedMs) {
  throw new Error(`Published board timestamp does not match GitHub main commit ${mainCommit}: ${published.board.updated} != ${main.board.updated}`);
}

if (JSON.stringify(published.board) !== JSON.stringify(main.board)) {
  throw new Error(`Published board content does not match GitHub main commit ${mainCommit}`);
}

if (snapshot.updatedMs !== main.updatedMs || JSON.stringify(snapshot.board) !== JSON.stringify(main.board)) {
  throw new Error(`Commit-stamped snapshot does not match GitHub main commit ${mainCommit}`);
}

console.log(`PUBLISHED BOARD EXACT: ${published.board.updated} at GitHub main ${mainCommit}; snapshot ${snapshotBaseUrl}/${mainCommit.slice(0, 7)}.json`);
