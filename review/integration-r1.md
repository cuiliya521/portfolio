# CUI Agent · Integration R1

## Source checkpoints
- Base: experiment/fig5-noteguard-visual / de2a292fbade81e1cfd46e5dd5ab3135a7d4cc08.
- Frozen Fig.07 source: experiment/fig7-about-contact / 0eea69d2ee3e05f886e0c8c2b0c64f1c1c56525a.
- Migration checkpoint: c318dae340b5e5dcb7216d8698c819212bd0855e.
- Focus/controller checkpoint: df156764f13cbf1abb17157f4c14420856737d99.
- Fig.05 retains the original four-stage page and its screenshots; Fig.07 is now available at about-contact/.

## Scope
- Four about-contact files imported from the frozen source.
- workspace-v6.js combines both route increments, stores the exact originating entry and scroll position, restores only after the existing transition settles, and handles pageshow/bfcache.
- cui-workspace-test.js preserves return metadata when initializing existing history state; no scene or camera behavior changed.
- about-contact/scene.js adds page-level Escape without overriding the native resume Dialog; its close handler does not steal a subsequent Tab stop.
- Desktop top Contact and Dock Contact have separate stable targets. The existing mobile CSS hides top Contact; only the visible Dock entry is exercised on mobile.
- index.html, all frozen CSS, assets, pangu-r1, content-archive, noteguard-case and capability-lab remain unchanged against their source baselines.

## Regression evidence
- Local real Chromium 153, deviceScaleFactor=1: 1440x900, 390x844, 360x780.
- 214 core checks pass; zero application JavaScript exceptions and zero failed page/asset responses.
- Before-fix focus evidence reproduces body focus for Fig.04/05/06 and an incorrect destination for Dock Contact. After-fix tests cover page return, Escape, Back, Forward/Back, reload and missing-origin fallback.
- Fig.03 original-image Dialog, Fig.04 note switching/reader/three-step guide, Fig.05 A/B/C/D/shared window/three decision records, Fig.06 three evidence nodes, Fig.07 identity/resume status/contact keyboard controls remain functional.
- Pangu screenshots wait for its existing opacity transition to reach 1; they are settled viewport captures, not animation-midpoint images.
- Runtime CJK font fallback was supplied in the local browser environment only. No project font or styling was replaced.
- Test script: .github/scripts/integration-r1.cjs. No CI run is claimed for these local captures.
- Online protected Preview verification is a separate gate; deployment readiness alone does not establish browser acceptance.

## Known release gates
- Fig.05 CUI remains the disclosed extracted placeholder; Fig.07 remains the same approved-role placeholder.
- Latest resume and current contact validity require user confirmation. Workspace still has the archived resume; Fig.07 presents an honest pending-resume Dialog.
- Fig.03 has its inherited R1 static step navigation and real image reader; this integration does not add the future three-stage camera.
- Earlier chapter source notes are historical records; this integration note supersedes statements that Fig.05/07 are absent from the integrated tree.

No main merge, Production deployment, domain/config change, NoteGuard product change, regenerated asset or advanced interaction development is authorized or performed in R1.
