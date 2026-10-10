# R3 — Background repair, character replacement blocked

Base: 65d4b4d68718acbb76b429944184c6d441187e98.
Only experiment/cui-workspace-interaction-v1; no main/Production changes.

The supplied black-background JPEG is the sole attempted character source.
The image-editor candidate changed glow details and was rejected. Deterministic
black-matte candidates retained the face but showed dark fringes on paper, or
lost/transformed weak light and translucent edges. No rejected candidate was
integrated or presented as a finished transparent asset. Existing original
cui-agent-4.png is unchanged. A clean original Alpha export or a layered source
is still needed for reliable faithful integration. This is an explicit partial
completion, not a successful character replacement.

Changes: independent h3-space.svg lighting/floor layers, Desktop-only background
and subtle card reflections in hero-h3.css. Existing HTML, screenshots, controller,
Workspace and all project interactions unchanged. The whole H3 composite was not
used as a new background.

Real 1440x900 Chromium checks run in the existing GitHub Actions workflow.
The final delivery report supersedes this pre-test note.
