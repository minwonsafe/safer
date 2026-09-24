// 민원세이프(특이민원 원터치 대응) 서비스워커 — https://minwonsafe.github.io/safer/ · 법ON 서비스워커 구조를 따름
// - 앱 화면(index.html): 네트워크 우선. 3초 안에 응답이 없거나 오프라인이면 저장본을 띄우고, 새 화면은 뒤에서 받아 저장
//   저장본을 띄운 뒤 받은 새 화면이 저장본과 다르면 열려 있는 화면에 알림 → 화면 쪽에서 쓰는 중이 아닐 때 새로고침
// - 아이콘·manifest: 저장본 우선, 뒤에서 새로 받아 둠
// index.html만 바꿀 때는 이 파일을 고칠 필요 없음. 이 파일·아이콘·manifest를 바꿀 때만 CACHE_NAME 숫자를 올림(safer-v1 → safer-v2). 이름은 반드시 safer- 로 시작
const CACHE_NAME = 'safer-v1';
const PAGE_KEY = './index.html';
const ASSETS = ['./manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const ASSET_PATHS = ASSETS.map(a => new URL(a, self.registration.scope).pathname);
const TIMEOUT_MS = 3000;

self.addEventListener('install', event => {
  // 파일 하나가 없어도 설치 전체가 실패하지 않도록 개별 처리
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.allSettled([PAGE_KEY].concat(ASSETS).map(f => cache.add(f)))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      // 캐시 저장소는 주소(계정.github.io) 단위로 공유되므로, 나중에 같은 계정에 다른 앱을 올려도 안전하도록
      // safer- 로 시작하는 '내 이전 캐시'만 지움
      .then(keys => Promise.all(keys.filter(k => k.startsWith('safer-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const tagOf = r => r ? (r.headers.get('ETag') || r.headers.get('Last-Modified') || '') : '';
const offline = () => new Response('오프라인 상태입니다. 인터넷에 연결한 뒤 다시 열어 주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
const notifyUpdated = () => self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage({ type: 'ONETOUCH_UPDATED' })));

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    const cachedP = caches.open(CACHE_NAME).then(c => c.match(PAGE_KEY));
    let servedStale = false;
    const net = fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }));   // GitHub Pages 10분 캐시를 건너뛰고 서버에 확인
    const saved = net.then(res => {
      if (!res || !res.ok) return;
      const copy = res.clone();
      return cachedP.then(old => caches.open(CACHE_NAME).then(c => c.put(PAGE_KEY, copy)).then(() => {
        if (servedStale && tagOf(old) && tagOf(res) && tagOf(old) !== tagOf(res)) return notifyUpdated();
      }));
    }).catch(() => {});
    event.waitUntil(saved);
    event.respondWith(cachedP.then(cached => {
      if (!cached) return net.catch(offline);
      const late = new Promise(resolve => setTimeout(() => resolve(null), TIMEOUT_MS));
      return Promise.race([net.then(res => (res && res.ok) ? res : null, () => null), late])
        .then(res => { if (res) return res; servedStale = true; return cached; });
    }));
    return;
  }

  if (!url.search && ASSET_PATHS.indexOf(url.pathname) >= 0) {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
