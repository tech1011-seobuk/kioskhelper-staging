# 카메라 선택 3D 모델 참고 자료

2026-09-15. camera-models.js는 직접 작성한 경량 형상이다. 사진 텍스처/공식 CAD를 복제한 모델이 아니며, 기종 선택을 위한 근사 표현이다. 정밀 수리나 부품 위치 측정에 쓰지 않는다. 제품 사진은 앱에 재배포하지 않는다.

- M50 Mark II 공식 전면·측면·상단·후면 도면: https://cam.start.canon/en/C007/manual/html/UG-00_Before_0090.html
- 850D 공식 각부 도면: https://cam.start.canon/en/C002/manual/html/UG-00_Before_0090.html
- R10 공식 각부 도면: https://cam.start.canon/en/C006/manual/html/UG-00_Before_0090.html
- M50 Mark II 공식 제품 갤러리(전후좌우상하): https://www.canon.co.uk/store/canon-eos-m50-mark-ii-mirrorless-camera-body-black/4728C033/
- 850D 공식 제품 갤러리(전후좌우상하): https://www.canon.co.uk/store/canon-eos-850d-camera-body/3925C014/
- R10 공식 제품 갤러리(전후좌우상하): https://www.canon.co.uk/store/canon-eos-r10-mirrorless-camera-body/5331C044/

몸체 크기 차이, 그립 돌출, 뷰파인더 상단부, 마운트, 모드 다이얼과 셔터 버튼을 참고했다. 렌즈는 생략하고 마운트/센서 또는 미러를 표현했다. 조명·표면·세부 치수는 시각화를 위한 근사값이다. 모델 내부 ID m50은 기존 안내 데이터와의 호환을 위해 유지하고 표시명을 M50 Mark II로 변경했다.

수정: camera-models.js → photoism-model.js export → npm run build. index.html의 CAMERA_MODEL_HTML 및 CAMERA_SHOWROOM CSS가 선택 화면을 담당한다. WebGL 불가 시 모델명 선택은 계속 가능. 마우스 이동에만 소폭 회전하며 터치 스크롤을 차단하지 않는다. 렌더링은 변경 시에만 수행하고 화면 이탈 시 리소스를 해제한다.

## 사진 비교 후 형상 재작성 (2026-09-15)
Google 이미지 검색으로 공식 Canon 제품 갤러리를 찾고, 위 3개 갤러리에서 모델별 7장씩 총 21장을 로컬 참고 자료로 수집했다. 그중 모델별 정면/상단/측면/후면 4장씩 총 12장을 직접 시각 비교했다. 사진은 저장소나 앱에 포함하지 않았다.

camera-geometry.js에서 모델별 외곽 곡선과 그립 단면을 별도로 작성했다. M50의 얇은 몸체, 850D의 높은 둥근 상단과 깊은 그립/미러, R10의 큰 마운트 비율과 AF/MF 스위치/상단 다이얼 배치를 구분했다. 실제 제품과 완전히 일치하는 스캔 모델은 아니며 로고와 미세 부품도 근사 표현이다.

현재 수정 경로: camera-geometry.js(형상) + camera-models.js(렌더링) → photoism-model.js export → npm run build. 공식 사진 출처는 위 갤러리 링크를 사용한다.
