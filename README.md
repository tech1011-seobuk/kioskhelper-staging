# PHOTOISM 헬퍼 — 개발 및 인수인계

이 저장소는 **테스트 서버**입니다. 테스트와 본 서버의 Supabase 사용자·진단·이용 기록은 분리되어 있습니다.

- 테스트: https://tech1011-seobuk.github.io/kioskhelper-staging/
- 테스트 저장소: https://github.com/tech1011-seobuk/kioskhelper-staging
- 본 서버 저장소: https://github.com/tech1011-seobuk/KIOSKHELPER

## 다른 컴퓨터에서 처음 시작

1. Git과 Node.js 22 이상을 설치합니다. Git 명령이 익숙하지 않다면 GitHub Desktop으로 위 테스트 저장소를 Clone해도 됩니다.
2. 이 저장소를 내 컴퓨터의 작업 폴더로 내려받습니다. GitHub 로그인에는 저장소를 수정할 권한이 필요합니다. Codex 로그인 계정과 GitHub 계정은 별개입니다.
3. Codex에서 내려받은 폴더를 프로젝트로 엽니다.
4. `START_HERE.md`의 요청문을 새 대화에 붙여넣습니다.
5. 터미널에서 아래 명령을 실행합니다.

```sh
git clone https://github.com/tech1011-seobuk/kioskhelper-staging.git
cd kioskhelper-staging
npm ci
npm test
npm run preview
```

브라우저에서 http://127.0.0.1:4174 를 엽니다. 로컬 미리보기도 **테스트 Supabase**에 접속합니다. 로그인과 클릭은 테스트 기록에 남을 수 있습니다. 자동 테스트는 실제 DB를 사용하지 않습니다. 다른 기기의 로그인 상태와 브라우저 임시 수정본은 옮겨지지 않습니다.

## 회사 ↔ 집에서 번갈아 작업

- 시작: 수정 중인 파일이 없는지 확인한 뒤 `git pull --ff-only`로 최신 버전을 받습니다.
- 끝: 변경 내용을 검토하고 테스트 후 commit/push합니다. staging의 main에 push하면 테스트 사이트가 배포됩니다.
- `PROJECT_HANDOFF.md`에 변경 사항·검증·남은 작업을 함께 갱신합니다.
- 두 컴퓨터에서 동시에 같은 파일을 수정하지 않습니다. 충돌이나 미저장 변경이 있으면 강제 덮어쓰기 대신 Codex에 해결을 요청합니다.
- 이 Git 저장소는 프로그램과 문서를 전달합니다. Codex의 기존 대화/작업 목록을 자동 복원하지는 않습니다.

## 파일과 수정 방법

| 파일 | 용도 |
|---|---|
| `index.html` | 실행되는 앱 전체. 진단·다이어그램·대시보드·화면 CSS와 내장 3D 코드 |
| `photoism-model.js` | 포토이즘 3D 형상, 재질, 회전, 부품 좌표 |
| `photoism-picker.js` | 앞뒤 버튼, 부품 항목, 연결선, 진단 연결 |
| `photoism-callouts.css` | 3D 부품 박스·연결선 전용 스타일 |
| `build-3d.cjs` | 위 3D 원본을 index.html에 반영하는 반복 실행 가능한 빌드 |
| `three.module.js`, `three.core.js` | 함께 보관한 Three.js 0.180.0; 라이선스는 THREE-LICENSE.txt |
| `sw.js` | PWA 캐시. 화면 변경 시 테스트 캐시 버전을 올릴 것 |
| `diagnosis-*.sql` | DB 설정/초기 데이터 참고. 초기화 목적으로 재실행하지 말 것 |
| `AGENTS.md`, `PROJECT_HANDOFF.md` | 다음 Codex 작업을 위한 지침/현재 상태 |

3D 원본 수정 후 `npm run build`를 실행합니다. 변경이 있으면 index.html과 sw.js가 갱신됩니다. 원본과 결과물을 함께 커밋하세요. 다른 앱 기능은 index.html을 수정합니다. 빌드는 3D 지정 영역만 교체합니다. 자동 배포는 결과물 index.html을 사용하므로 소스만 바꿔 올려서는 화면이 바뀌지 않습니다.

## 본 서버 적용

1. 테스트 서버에서 확인하고 GitHub Pages 배포 완료를 확인합니다.
2. 테스트 초기화면의 관리자 **본 서버 적용**은 진단 안내/미디어 변경 비교와 본 서버 계정 확인을 거쳐 적용하는 경로를 제공합니다.
3. 코드/UI는 본 서버 저장소 Actions의 **본 서버 적용** 워크플로에서 처리합니다. `check`는 검사만, `apply`는 본 서버에 반영합니다. 테스트 main의 코드를 가져와 본 서버 설정으로 변환합니다.
4. DB 적용과 코드 적용은 별도 단계이며 전체가 한 번에 원자적으로 처리되는 기능이 아닙니다. 실패/부분 성공 결과를 확인합니다.

본 서버는 GitHub Actions 배포 방식입니다. 본 서버 HTML 파일만 수동 업로드하는 것으로 사이트 배포가 완료됐다고 판단하지 마세요. 이 인수인계 작업에서는 본 서버 적용을 실행하지 않았습니다.
