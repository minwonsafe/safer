# 민원세이프 (특이민원 원터치 대응)

특이민원 발생 시 **고지 멘트·조치 사항·적용법조**를 바로 확인하는 직원용 모바일 웹앱(PWA)입니다.
근거자료: 「특이민원 예방 및 대응요령」(2025. 8., 고용노동부 민원운영팀)

- 주소: **https://minwonsafe.github.io/safer/**
- 홈 화면 이름: 민원세이프 / 앱 안 제목: 특이민원 원터치 대응

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 앱 본체 (화면·데이터·기능 전부) |
| `manifest.json` | 홈 화면 설치 정보 (앱 이름·아이콘·색) |
| `service-worker.js` | 오프라인 동작·자동 업데이트 |
| `icon-192.png`, `icon-512.png` | 앱 아이콘 — 파란 바탕 은빛 방패 |
| `icon-maskable-512.png` | 안드로이드 원형·둥근 사각 아이콘용 (방패가 잘리지 않도록 여백 확보) |
| `apple-touch-icon.png` | 아이폰 홈 화면 아이콘 |
| `tests/check_app.js` | 배포 전 자동 검사 (173개 항목) |
| `.github/workflows/deploy.yml` | 검사 통과 시에만 자동 배포 |

## 처음 배포하기

1. **계정 이름 바꾸기** — Settings → Account → Change username → `minwonsafe` (저장소를 만들기 **전에**)
2. 오른쪽 위 **＋ → New repository** → 이름 `safer`, **Public**, "Add a README file" 체크하지 않음 → Create repository
3. 압축 푼 폴더에서 **숨김 파일 보이기** (Windows 탐색기: 보기 → 표시 → 숨긴 항목 / Mac Finder: Cmd + Shift + .)
4. 저장소 화면의 **uploading an existing file** → 폴더 안 **모든 파일과 폴더**(`.github`, `tests` 포함) 끌어다 놓기 → Commit changes
5. 파일 목록에 `.github` 폴더가 있는지 확인. 없으면 **Add file → Create new file**, 이름 칸에 `.github/workflows/deploy.yml` 입력 후 내용 붙여넣기 → Commit
6. **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 변경
7. **Actions** 탭 → "검사 후 배포" → **Run workflow**
8. 초록 체크가 뜨면 완료. 1~2분 뒤 https://minwonsafe.github.io/safer/ 접속

## 휴대폰에 설치하기

**갤럭시 (Chrome·삼성 인터넷)** — 첫 화면의 **"앱으로 설치 → 설치"** 카드, 또는 오른쪽 위 **설정 → 홈 화면 설치**. 버튼이 안 보이면 브라우저 메뉴(⋮) → **앱 설치** 또는 **홈 화면에 추가**

**아이폰 (Safari)** — 화면 아래 **공유 버튼(□↑)** → **홈 화면에 추가**. 설치하면 주소창 없이 앱처럼 전체 화면으로 열림

설치 후에는 인터넷이 끊겨도 열립니다 (한 번 이상 접속해 저장된 상태에서).

## 설정 (첫 화면 오른쪽 위)

- **글자 크기**: 보통·크게 (크게는 12% 확대, 기기에 저장)
- **내 전화기**: 흰색·검정 — 조치 사항에 보여줄 전화기
- **홈 화면 설치**: 설치 버튼 또는 방법 안내

## 수정·업데이트

- **`index.html`만 고칠 때**: Add file → Upload files로 같은 이름 파일을 올리고 Commit. 자동 검사 후 배포되고, 앱을 다시 열 때 반영
  - 통화 타이머가 돌거나 보고서를 쓰는 중이면 새로고침하지 않고 "새 버전이 준비됐습니다" 안내만 띄움 (작업 내용 보호)
- **`service-worker.js`·아이콘·`manifest.json`을 고칠 때**: `service-worker.js`의 `CACHE_NAME` 숫자를 올림 (`safer-v1` → `safer-v2`). 이름은 반드시 `safer-`로 시작
- 검사에 실패하면 배포가 멈추고 **기존 화면이 그대로 유지**됨. Actions 탭의 빨간 항목을 열면 ✗ 표시로 원인이 나옴

## 화면 크기 대응

「법ON」과 같은 방식으로, 모든 크기를 글자 기준값의 배수(rem)로 지정하고 기준값을 화면 폭에 연동했습니다. 어느 폰에서나 화면 폭 대비 글자 비율이 같고(344~430px 9개 기종 측정), 높이가 짧은 폰(아이폰 SE 등)은 여백을 줄여 홈 버튼이 한 화면에 들어옵니다. 두 손가락 확대는 막지 않습니다.

## 주의

- GitHub Pages는 **주소만 알면 누구나 열 수 있는 공개 웹**입니다. 검색엔진에는 나오지 않도록 설정(noindex)했지만, 주소가 외부로 퍼지면 막을 수 없습니다. 주소는 내부 채널로만 공유하세요.
- 발생 경위 정리 기능의 입력 내용은 **기기 밖으로 나가지 않으며 저장되지 않습니다**. 통화 기록·전화기 선택·글자 크기만 해당 기기에 저장됩니다.
