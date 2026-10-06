# Portfolio redesign — review branch only

Scope: homepage and Pangu case. Base: d21ee6026c747e1f82315402ccce02c878758352. Branch: redesign/portfolio-10. No main merge or production promotion.

## Reference research

- Jonas Reymondin: https://tympanus.net/codrops/2026/03/16/jonas-reymondins-portfolio-reclaiming-the-ui-eye-through-systems-code-and-pixel-motion/
  - Strict shared grid; neutral typography; work imagery supplies project color. Article documents Nuxt/Sanity/SCSS/GSAP architecture. Adopt layout discipline, not its WebGL and loading sequence.
  - Live: https://jonasreymondin.com/
- Bisous: https://tympanus.net/codrops/2026/06/29/inside-bisous-designing-an-editorial-experience-for-cinematic-cgi/
  - Four principal columns, sans + mono labels, large visual/concise text rhythm. WordPress/GSAP/Vimeo implementation. Adopt editorial grid, not cinematic loader or infinite slider.
  - Live: https://bisous-production.com/
- Reform: https://tympanus.net/codrops/2025/07/24/reform-collective-a-new-website-designed-to-be-seen/
  - Direct visual browsing, reduced copy and motion. Article includes CSS subgrid and notes on sticky behavior. Adopt clear hierarchy and shallow navigation, not pointer effects or 3D blocks.
  - Live: https://www.reformcollective.com/

## Tokens

| Token | Desktop | Mobile |
|---|---|---|
| Content | 1280px maximum, 4.5vw gutter | 20px gutter |
| Grid | 12-unit proportions: 8/4 hero, 3/9 case | Single column; evidence becomes paired label/value rows |
| Main heading | 72–88px, weight 600, 1.19 line-height | 36–45px, intentional phrase breaks |
| Section heading | 32–40px | 26–29px |
| Body | 16–18px, 1.7–1.95 | 14–16px, 1.85 |
| Labels | 12px monospace | 10–12px |
| Rhythm | 8px base; 64–96px section spacing | 40–56px |
| Canvas / text | #f5f5f0 / #20251f | same |
| Secondary / rule | #646b62 / #ccd0c5 | same |
| Interaction | #2459dc | same |
| Radius | 0–6px | same |
| Motion | Reveal 12px / 550ms; image hover 1.012 | Reveal only; reduced-motion respected |

## Architecture and preservation

Static HTML/CSS/JS; no framework, runtime dependency, external font, GSAP or React Bits required. index.html and pangu.html share redesign.css and redesign.js. legacy.html is a byte-identical copy of original index.html: all prior case studies, metrics, resources and interactions remain available. Original assets and prototypes are untouched. Existing #xhs/#noteguard entry links route to the original cases; #pangu routes to new case.

assets/pangu-hero-approved.png is a byte-identical copy of the user-frozen PNG. No UI regeneration, recomposition or data edits. Product image remains a conceptual reconstruction, labeled as such. Mobile zoom is a site-level image viewer, not an invented product feature.

## Evidence boundaries

Only user-confirmed Pangu figures: 15+ interviews, 200+ questionnaires, 9 industries, 230+ scenarios, 2500+ prompts, 3 A/B rounds. Outcomes moved below opening narrative: 6h→1.2h, reuse +35%, compliance +23%, adoption +16pct after three months. Team-level outcomes are not attributed solely to the structured-input change. No fabricated experiment lift, sample-level causal claim, user quotation or new feature.

## Local preview

Run `python -m http.server 8765` at repository root. No build/install step. Production URL and settings must stay unchanged pending user approval.
