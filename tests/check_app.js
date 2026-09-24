// 민원세이프(특이민원 원터치 대응) — 배포 전 자동 검사 (외부 패키지 없이 node만으로 실행)
// 하나라도 실패하면 exit 1 → GitHub Actions가 배포를 멈추고 기존 화면을 유지함
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + msg); } };
const section = t => console.log('\n■ ' + t);

section('파일 구성');
['index.html','manifest.json','service-worker.js','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png']
  .forEach(f => ok(fs.existsSync(path.join(ROOT, f)), f + ' 없음'));

section('HTML 머리말 (설치·비례·검색 차단)');
const head = html.slice(0, html.indexOf('<style>'));
ok(/<link rel="manifest" href="manifest\.json">/.test(head), 'manifest.json 연결 없음');
ok(/rel="apple-touch-icon" href="apple-touch-icon\.png"/.test(head), '아이폰 아이콘 연결 없음');
ok(/viewport-fit=cover/.test(head), 'viewport-fit=cover 없음 (노치 대응)');
ok(!/maximum-scale|user-scalable=no/.test(head), '확대 금지 설정이 들어 있음 (접근성)');
ok(/name="robots" content="noindex, nofollow"/.test(head), '검색엔진 차단(noindex) 없음');
ok(!/data:image\/png;base64/.test(head), '머리말에 내장 아이콘이 남아 있음 (파일 참조여야 함)');

section('CSS');
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [,''])[1];
ok((css.match(/{/g)||[]).length === (css.match(/}/g)||[]).length, 'CSS 중괄호 짝이 맞지 않음');
ok(/html\{font-size:clamp\(13px,calc\(100vw \/ 24\.375\),18px\)/.test(css), '화면 비례 기준값(html font-size clamp) 없음');
ok(!/color-mix\(/.test(css.replace(/\/\*[\s\S]*?\*\//g,'')), 'color-mix() 사용 (구형 iOS 호환 문제)');
ok(!/@media \(max-width:370px\)|@media \(max-width:340px\)/.test(css), '폐지된 계단식 폭 규칙이 되살아남');
ok(/@media \(max-height:700px\)/.test(css), '짧은 화면(700px) 대응 없음');
ok(/html\[data-fs="l"\]\{font-size:clamp\(/.test(css), '글자 크기 크게 모드 기준값 없음');
ok(/html\[data-fs="l"\] \.mtile b\{/.test(css) && /html\[data-fs="l"\] \.brandapp\{/.test(css), '크게 모드에서 메인 제목·기관 바 보호 규칙 없음 (줄바꿈·넘침 위험)');

section('삭제·변경된 문구가 되살아나지 않았는지');
['지금 말할 것','지금 누를 것','이 행위의 처벌','몰라서 손해','피소가 곧','82건','공식 발생보고서 서식이 아님',
 '고용관리과 승인','발생보고서(초안)','직원 업무지원','법령 확인 전']
  .forEach(w => ok(html.indexOf(w) < 0, `'${w}' 문구가 남아 있음`));

section('스크립트 문법·데이터');
const js = (html.match(/<script>([\s\S]*?)<\/script>/) || [,''])[1];
try { new vm.Script(js); ok(true); } catch (e) { ok(false, '스크립트 문법 오류: ' + e.message); }
// 화면 없이 데이터만 평가
const stubEl = () => ({ style:{}, setAttribute(){}, getAttribute(){return null}, classList:{add(){},remove(){},contains(){return false}}, querySelector(){return null}, querySelectorAll(){return []}, set innerHTML(v){}, addEventListener(){}, appendChild(){} });
const sandbox = { window:{ localStorage:{getItem(){return null},setItem(){},removeItem(){}}, addEventListener(){} },
  document:{ documentElement:stubEl(), getElementById(){return null}, querySelector(){return null}, querySelectorAll(){return []}, addEventListener(){}, createElement:stubEl, body:stubEl(), head:stubEl(), visibilityState:'visible' },
  navigator:{ userAgent:'node' }, location:{ protocol:'file:', hostname:'' }, setInterval(){}, clearInterval(){}, setTimeout(){}, console };
sandbox.window.window = sandbox.window;
let ctx;
try { ctx = vm.createContext(sandbox); vm.runInContext(js.replace(/\nrender\(\);\s*$/, '\n') + '\n;this.__D={SITU,LAW,KEYS,CASES,MAIN,HELP,TABS,HTABS,ICON,PR,ACTI};', ctx); }
catch (e) { ok(false, '데이터 평가 실패: ' + e.message); }
const D = ctx && ctx.__D;
if (D) {
  const all = [].concat(D.SITU.phone, D.SITU.visit, D.SITU.etc);
  ok(all.length === 10, `상황 10개여야 함 (현재 ${all.length})`);
  const ids = new Set(all.map(s => s.id)); ok(ids.size === all.length, '상황 id 중복');
  const lawIds = new Set(D.LAW.map(l => l.id));
  ok(D.LAW.length === 11, `적용 법률 11개여야 함 (현재 ${D.LAW.length})`);
  all.forEach(s => s.law.forEach(n => ok(lawIds.has(n), `${s.id}의 적용법조 ${n}번이 없음`)));
  all.forEach(s => ok(D.ICON[s.pic] !== undefined, `${s.id}의 그림 '${s.pic}' 없음`));
  all.forEach(s => (s.say||[]).forEach(y => ok(y.x && y.x.length > 10, `${s.id} 멘트 비어 있음`)));
  D.LAW.forEach(L => L.l.forEach(x => ok(!x.pr || D.PR[x.pr], `${L.t} 소추요건 값 '${x.pr}' 잘못됨`)));
  const GROUPS = ['phone','evid','report','safety','resp'];
  all.forEach(s => { if (!s.act || !s.act.length) return;
    const a = D.ACTI[s.id]; ok(a && a.length === s.act.length, `${s.id} 조치 아이콘 수가 조치 수와 다름`);
    (a||[]).forEach(k => { ok(D.ICON[k[0]] !== undefined, `${s.id} 조치 아이콘 '${k[0]}' 없음`); ok(GROUPS.includes(k[1]), `${s.id} 조치 색 묶음 '${k[1]}' 잘못됨`); }); });
  ok(D.KEYS.length === 4, '전화기 기능버튼 4개여야 함');
  D.KEYS.forEach(k => ['w','b'].forEach(c => ok(k[c][0] > 0 && k[c][0] < 100 && k[c][1] > 0 && k[c][1] < 100, `기능버튼 ${k.n} ${c} 좌표 범위 밖`)));
  ok(D.CASES.length === 4, '참고 대응 사례 4건이어야 함');
  ok(['위기 상황 대응','직원 보호·지원','관련 법적 근거','참고 대응 사례'].every((t,i) => Object.values(D.MAIN)[i].t === t), '메인 4개 메뉴 명칭이 바뀜');
  ok(Object.keys(D.HELP).length === 4, '직원 보호·지원 탭 4개여야 함');
}

section('manifest.json');
let man = {};
try { man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')); ok(true); } catch (e) { ok(false, 'manifest.json 형식 오류'); }
ok(man.name && man.short_name === '민원세이프', '앱 이름 없음 또는 홈 화면 이름이 민원세이프가 아님');
ok(man.start_url && man.scope && man.display === 'standalone', 'start_url·scope·display 설정 누락');
const sizes = (man.icons || []).map(i => i.sizes);
ok(sizes.includes('192x192') && sizes.includes('512x512'), '192·512 아이콘 누락 (안드로이드 설치 조건)');
ok((man.icons || []).some(i => /maskable/.test(i.purpose || '')), '안드로이드 원형 아이콘(maskable) 누락');
(man.icons || []).forEach(i => ok(fs.existsSync(path.join(ROOT, i.src)), `아이콘 파일 없음: ${i.src}`));

section('서비스워커');
const sw = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
try { new vm.Script(sw); ok(true); } catch (e) { ok(false, '서비스워커 문법 오류: ' + e.message); }
ok(/const CACHE_NAME = 'safer-[\w-]+'/.test(sw), 'CACHE_NAME이 없거나 safer- 로 시작하지 않음');
ok(/k\.startsWith\('safer-'\) && k !== CACHE_NAME/.test(sw), '이전 캐시 삭제가 safer- 로 한정되지 않음 (같은 계정의 다른 앱 캐시를 지울 위험)');
const assets = ((sw.match(/const ASSETS = \[([^\]]*)\]/) || [,''])[1].match(/'\.\/([^']+)'/g) || []).map(s => s.slice(3, -1));
assets.forEach(a => ok(fs.existsSync(path.join(ROOT, a)), `서비스워커가 저장할 파일 없음: ${a}`));
ok(/serviceWorker\.register\('\.\/service-worker\.js'\)/.test(js), 'index.html에서 서비스워커 등록 안 함');

section('설정');
ok(/id=\\?"m-set\\?"/.test(js) && /function openSettings\(/.test(js), '첫 화면 설정 버튼 또는 설정 창 없음');
ok(/data-fs/.test(js) && /sm_fs/.test(js), '글자 크기 설정 저장 없음');

console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
