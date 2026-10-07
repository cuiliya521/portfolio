# AI-native portfolio / Phase 1

Branch: redesign/ai-native-final. Based on main d21ee6026c747e1f82315402ccce02c878758352. No merge or production promotion is authorized. Only Entry → Workspace → Pangu is open. Other objects are contextual previews with explicit availability labels.

## Reference study and attribution

- Kenna Kai: https://www.kennakai.online/ — studied the file sidebar / Lab files / work practice / built products organization. This implementation uses distinct working assets rather than a uniform project grid. Personal content, photos, brand and assets were not copied.
- Sibo Wang: https://about-sibowang.com/ — studied AI · Vibe Coding Builder · PM identity and separation of work history and built products. Our Where I Worked / What I Built / How I Work is the user's requested adaptation; Sibo's actual third section is What I Share.
- GGK SKY: https://github.com/bell-0211/ggk-web-portfolio — read scene2.js, scene-interactions.json and test_demo_contract.py. Studied explicit states, timer cleanup, step progression, replay and asset contracts. No code or personal content copied.
- Esther (不二): https://github.com/esthersjw/esther-website-1 — read src/lib/siteController.js and src/styles/site.css. Studied beginZoom viewport math, launch guard, window z-order and pointer dragging. Original work © 2026 Esther, https://hiesther.me; licensed CC BY-NC 4.0: https://creativecommons.org/licenses/by-nc/4.0/. The reference has not been copied, remixed or bundled. Our code independently implements one persistent workspace transform and routing, omits terminal / device / stars / personal assets / draggable windows, and has original visual identity and text. This credit acknowledges conceptual inspiration; it does not relicense our original files.

## Original implementation

Buildless semantic HTML, CSS and native ES modules; no runtime dependency or external font. Persistent workspace DOM is visible at depth in Entry, then expands to its reading scale. Route states: entry / entering / workspace / pangu. Cancelled transitions cannot finish a stale scene. Hash routes support browser Back and deep links. Reduced motion settles directly. Workspace is inert until entry completes. Tabs have arrow keys, Home/End and roving tabindex. Frozen iframe is read-only and removed from keyboard order.

Pangu prototypes/config.html and prototypes/manage.html, all existing assets and the PDF remain unchanged from main. The parent controls viewport framing and highlight only. Desktop scales original 1600×1000 UI to available width; mobile uses 90% scale, independently focused offsets and a touch-scroll viewport rather than shrinking the UI to phone width. Metrics retain the user's definitions; NoteGuard is explicitly an internal frozen test, not online accuracy. Content screenshots are marked missing rather than fabricated.

## QA

1440×900, 1280×800, 390×844, reduced motion, keyboard, loading, image decoding, viewport overflow and transition interruption are checked in a temporary Vercel Sandbox with Playwright. Actual results are recorded separately after execution. Deployment must remain Preview. Phase 2 requires user confirmation.
