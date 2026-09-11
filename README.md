# kioskhelper-staging

포토이즘 헬퍼 테스트 사이트입니다. 운영과 별도 HTML을 사용하며, 진단 다이어그램 편집기와 테스트 배너를 포함합니다.

**현재 Supabase 데이터베이스는 운영과 공유합니다.** 이 사이트에서 실제 로그인 후 클릭하면 운영 이용 기록에 포함됩니다.

로컬 검증: `node --test regression.test.mjs` (운영 DB에 접속하지 않습니다.)

로컬 미리보기: `node preview.mjs 4174`

2026-09-11: 오프라인 기록 시각·계정별 전송, 관리자 전체 데이터 조회, PWA 캐시 분리 수정을 적용했습니다. 다이어그램 편집기와 진단 콘텐츠는 보존했습니다. SQL 변경은 없습니다.

개발 및 배포 안내: https://github.com/tech1011-seobuk/KIOSKHELPER#readme
