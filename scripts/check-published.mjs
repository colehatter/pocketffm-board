const siteUrl = process.env.POCKETFFM_BOARD_SITE_URL || 'https://pocketffm-board.vercel.app/board.json';
const mainUrl = process.env.POCKETFFM_BOARD_MAIN_URL || 'https://raw.githubusercontent.com/colehatter/pocketffm-board/main/board.json';

function cacheBusted(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('board_sync_check', Date.now().toString());
  return parsed;
}

async function fetchBoard(url, label) {
  const response = await fetch(cacheBusted(url), { headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  const board = await response.json();
  const updatedMs = Date.parse(board.updated);
  if (!Number.isFinite(updatedMs)) throw new Error(`${label} has an invalid updated timestamp`);
  return { board, updatedMs };
}

const [published, main] = await Promise.all([
  fetchBoard(siteUrl, 'Published board'),
  fetchBoard(mainUrl, 'GitHub main board')
]);

if (published.updatedMs < main.updatedMs) {
  throw new Error(`Published board lags GitHub main: ${published.board.updated} < ${main.board.updated}`);
}

if (published.board.updated === main.board.updated && JSON.stringify(published.board) !== JSON.stringify(main.board)) {
  throw new Error('Published board and GitHub main share a timestamp but differ in content');
}

console.log(`PUBLISHED BOARD CURRENT: ${published.board.updated} >= ${main.board.updated}`);
