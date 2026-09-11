# kioskhelper-staging

포토이즘 헬퍼 테스트 사이트입니다. 운영과 별도 HTML을 사용하며, 진단 다이어그램 편집기와 테스트 배너를 포함합니다.

**현재 Supabase 데이터베이스는 운영과 공유합니다.** 이 사이트에서 실제 로그인 후 클릭하면 운영 이용 기록에 포함됩니다.

로컬 검증: `node --test regression.test.mjs diagnosis.test.mjs` (운영 DB에 접속하지 않습니다.)

로컬 미리보기: `node preview.mjs 4174`

2026-09-11: 오프라인 기록 시각·계정별 전송, 관리자 전체 데이터 조회, PWA 캐시 분리 수정을 적용했습니다. 다이어그램 편집기와 진단 콘텐츠는 보존했습니다. SQL 변경은 없습니다.

개발 및 배포 안내: https://github.com/tech1011-seobuk/KIOSKHELPER#readme

## 진단 저장과 환경 분리

운영 Supabase는 `lsetixbyarexggxsihen`, 테스트 Supabase는 `mjzhljlhjsbnnxyekmwy`입니다. 테스트 DB 지역은 Sydney입니다. 사용자·이용 기록·진단 안내가 분리되어 있습니다. 테스트 코드를 운영에 옮길 때 환경별 URL, 공개 키, 테스트 배너, 오프라인 큐 이름, 서비스 워커 캐시 이름을 유지하세요.

`diagnosis-storage.sql`과 `diagnosis-seed.sql`은 양쪽 DB에 적용되어 있습니다. 초기값은 기존 저장본을 덮어쓰지 않습니다. 관리자의 저장은 revision 비교 후 적용되며 이력은 `diagnosis_tree_revisions`에 남습니다. 직원은 저장할 수 없습니다.

저장 전 수정본은 해당 기기와 계정에 임시 보관됩니다. 저장 성공 후 로그인 또는 새 진단 시작 시 최신 안내를 읽습니다. 동시 수정 충돌은 덮어쓰지 않고 수정본을 유지합니다. 오프라인에서는 최근 캐시 또는 기본 안내임을 표시합니다. 테스트 안내가 자동으로 운영 안내로 승격되지는 않습니다.
