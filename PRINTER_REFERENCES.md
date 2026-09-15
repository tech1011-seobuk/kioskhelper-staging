# 프린터 3D 선택 화면

2026-09-15. DNP RX1과 후지필름 ASK-400을 구분하기 위한 독자 제작 Blender 외형 모델입니다. 사진을 텍스처로 복제하거나 상용 모델을 재배포하지 않습니다. 정밀 CAD/분해 도면이 아니며 내부 기구, 배출 트레이 등 부속품과 일부 후면 세부 형상은 생략/근사했습니다.

## 참고 자료

- [DNP DS-RX1 공식 제품 사양](https://www.dnpphoto.eu/ru/produkciya/fotoprintery/item/223-ds-rx1): 폭322 × 깊이351 × 높이281mm. RX1HS가 아닌 RX1 이름으로 제공.
- [RX1 전면 제품 사진](https://www.arcenciel77.com/Files/20225/Img/23/DNP-DS-RX1-zoom.jpg): 흰색 높은 본체, 전면4개 표시등, 배출구, 검정 스크랩 박스, 상단 개폐 손잡이 참고. 공식 갤러리의 구형 사진 링크는 내려받기 실패하여 이 판매처 제품 사진을 외형 참고로 확인함.
- [FUJIFILM ASK-400 공식 제품 페이지](https://www.fujifilm.com/au/en/business/photofinishing/photo-printer/ask400), [공식 제품 사진](https://asset.fujifilm.com/www/au/files/2022-04/5a373b1a0c79f0aaa444bf983936fc62/pic_ask400_01.jpg): 낮고 긴 본체, 전면 검정 스크랩 박스, 왼쪽4개 표시등, 아래 개폐 레버와 오른쪽 스위치 참고.
- [ASK-400 공식 사용 설명서](https://asset.fujifilm.com/global/files/2022-04/fe8ffeed7ab0e5890f2aca06107ed47f/ask400_usersmanual_en_ver1.0.0.pdf): 부품 명칭/USB와 전원 연결부 참고. ASK-400의 ON/Standby 스위치는 주 전원을 차단하는 스위치와 다름. 이 작업에서는 교체 절차를 새로 작성하지 않음.
- [후지필름 공식 치수 소개](https://houseofphotography-th.fujifilm.com/en/blogs/news/ask400-%E0%B8%95%E0%B8%AD%E0%B8%9A%E0%B9%82%E0%B8%88%E0%B8%97%E0%B8%A2%E0%B9%8C%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%9B%E0%B8%A3%E0%B8%B4%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AB%E0%B8%A5%E0%B8%B2%E0%B8%81%E0%B8%AB%E0%B8%A5%E0%B8%B2%E0%B8%A2%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%87%E0%B8%B2%E0%B8%99): 幅275 × 깊이366 × 높이170mm.

## 다시 만들기

`blender --background --python printer-blender-build.py -- rx1 OUTPUT_DIRECTORY`

`ask400`으로도 실행. `--no-render`는 PNG 검토 이미지 생성을 생략합니다. 출력 `.blend`는 부품별 편집용, `printer-*.glb`는 재질별 메시를 합친 웹용입니다. GLB를 `assets`에 복사한 뒤 `npm run build`. 회전/부유/정지/해제 처리는 camera-models.js의 공통 mountProduct에서 관리합니다.

앱의 프린터 교체 진입점을 printerModel 화면으로 연결합니다. 선택된 기종은 교체 화면 제목과 최근 이용 기록에 남으며 다른 기종을 다시 선택할 수 있습니다. 기존 교체 내용은 준비 중 상태를 유지합니다. 새 안내 콘텐츠 작성은 별도 작업입니다.
