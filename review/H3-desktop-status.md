# H3 Desktop implementation — awaiting visual verification

Reference: user-supplied final H3 image, 2026-10-10.
Base HEAD: e73ce72a9be77f2c801115c28effa6b1057e07a3.
Branch: experiment/cui-workspace-interaction-v1.

Changed hero-h3.css only for Desktop >=981px. Independent existing DOM copy,
button, and cards are preserved. Pangu occupies the left grid column across two
rows; Xiaohongshu and NoteGuard occupy the right rows. No controller or Workspace
changes. Existing project assets are retained without generating UI imagery.

## Outstanding differences

- assets/cui-agent-4.png is the existing original asset, not the matching frozen
  character. Its pose, face, clothing and baked background differ. Some alpha
  exists, but it is not a clean matching transparent master. No CSS extraction or
  replacement character was attempted. Supply the matching transparent PNG/WebP
  (ideally original resolution) to complete fidelity; professional manual masking
  of the supplied image is another option, with edge/reflection limitations.
- The existing layered SVG/glass background remains an approximation. It is not
  the entire frozen composite used as a background. Matching background-only
  artwork would improve light and reflection fidelity.
- Existing source project imagery differs from the composite's illustrative
  crops. Pangu is labelled in HTML as a product prototype; NoteGuard retains its
  existing original screenshot. No new authenticity claims are made.

## Verification

- git diff --check: passed.
- All index.html assets references resolve locally.
- Workspace/controller files unchanged.
- Real 1440x900 browser verification: NOT performed. Chromium was absent and
  Playwright browser installation failed because downloads were invalid archives.
- Entry, back, close, Esc, overflow and fidelity: NOT runtime verified.
- No visual score or acceptance claim. No production deployment or main merge.
