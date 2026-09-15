# PHOTOISM kiosk — Blender model

2026-09-15. Original approximate model reconstructed from the user's kiosk drawing (850 × 500 × 1982 mm including castors), earlier exterior references, and the ten photographs supplied on 2026-09-15. The blurred floor photograph is not used. Photographs, serial numbers and QR labels are not embedded or published.

## Geometry and scope

- Stepped black sheet-metal shell, black touch display, upper and vertical diffusers, camera aperture, remote, payment openings, door seams, hinges and castors.
- Open rear view: camera tilt bracket, LED guards, upper light housing, monitor rear enclosure with buttons/vents, rails and shelves, industrial PC with ports, labelled power adapters (cables omitted for clarity).
- Existing original R10 and DNP RX1 Blender assets are reused inside the cabinet. These are visual approximations, not manufacturer CAD. Other installed camera/printer variants are not dynamically substituted in this overview.
- Small clearances, concealed dimensions are inferred from photographs. This model is for locating parts in the helper, not assembly, electrical servicing or dimensional inspection.

## Rebuild

Run Blender 5.2 in background with `--python kiosk-blender-build.py -- <output-directory>`. The output directory is resolved absolutely. Add `--no-render` to omit review PNGs. The script reads the existing `assets/camera-r10.glb` and `assets/printer-rx1.glb` relative to itself.

Outputs: editable `photoism-kiosk.blend`, web `photoism-kiosk.glb`, a generated powder-coat normal map and front/inside review PNGs. Copy the GLB to `assets/photoism-kiosk.glb`, then run `npm run build` and `npm test`.

The web export merges geometry by material and parent, preserving the `kiosk_rear_doors` group for the rear view. The native Blender file retains individually named components. No external image URLs are needed.

## Runtime

`photoism-model.js` loads the GLB asynchronously. View requests made while loading retain the latest requested direction; callouts appear after loading and rotation. Removing the view releases geometry, textures and the renderer. Failure retains the existing part-menu / 2D fallback. The canvas accepts no pointer gestures, so mobile page scrolling remains available. Front/back rotation and reduced-motion support remain unchanged.

2026-09-15: 사용자 요청으로 케이블, 배선 묶음, 연결 플러그와 케이블 고정물을 제거했습니다. 부품·포트·어댑터·기구 고정대는 유지합니다. 모델 변경은 로컬 미리보기에 반영하며 공개 업로드 승인은 아직 대기 중입니다.
