// 빌드 후 dist/를 스캔해 서비스워커 프리캐시 목록을 sw.js에 주입한다.
// Phase 6에서 sw.js 템플릿과 함께 완성 — sw.js가 없으면 조용히 통과.
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const SW_SRC = new URL('../sw.js', import.meta.url).pathname;

if (!existsSync(SW_SRC)) {
  console.log('[sw] sw.js 없음 — 프리캐시 생성 건너뜀 (Phase 6에서 활성화)');
  process.exit(0);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push('./' + relative(DIST, p).replace(/\\/g, '/'));
  }
  return out;
}

const files = walk(DIST).filter((f) => !f.endsWith('sw.js'));
const version = Date.now().toString(36);
let sw = readFileSync(SW_SRC, 'utf8');
sw = sw
  .replace('__PRECACHE_MANIFEST__', JSON.stringify(files, null, 0))
  .replace('__CACHE_VERSION__', version);
writeFileSync(join(DIST, 'sw.js'), sw);
console.log(`[sw] 프리캐시 ${files.length}개 파일, 캐시 버전 ${version}`);
