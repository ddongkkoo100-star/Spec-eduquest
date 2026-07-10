// EduQuest 서비스워커 — 캐시 우선(오프라인 전체 동작).
// 프리캐시 목록과 캐시 버전은 빌드 후 scripts/gen-sw-manifest.mjs가 주입한다.
const CACHE = 'eduquest-__CACHE_VERSION__';
const ASSETS = __PRECACHE_MANIFEST__;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['./', ...ASSETS]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // ignoreVary: cors 모드 모듈 요청도 프리캐시와 매칭되도록
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true, ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return res;
          })
          .catch(() => {
            // 오프라인 폴백은 페이지 이동 요청에만 (JS/CSS에 HTML을 주면 안 됨)
            if (e.request.mode === 'navigate') return caches.match('./index.html', { ignoreVary: true });
            return Response.error();
          })
    )
  );
});
