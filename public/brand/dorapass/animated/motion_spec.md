# DoraPass — motion specification

## Brand reading

- Business: easy, friendly access to digital subscriptions and entertainment.
- Visual evidence: rounded blue monogram, cat-ear silhouette, compact yellow access symbol.
- Energy: medium-high.
- Tone: playful, but trustworthy enough for checkout and support.
- Motion personality: **friendly / approachable** with a small playful accent.
- Three-word test: **ágil, amigable, confiable**.

## Tokens

- Reveal duration: 1,200 ms.
- Enter easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- Settle easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Squash allowance: 8%.
- Overshoot: 1.04.
- Hover duration: 220 ms.
- Idle accent cycle: 1,800 ms.

## Choreography

1. **Staging / anticipation (0–180 ms):** empty stage; the mark coils at 92% scale and 0 opacity.
2. **Primary action (180–650 ms):** the DP/cat mark rises 22 px on a soft arc, reaches 104%, then settles.
3. **Overlap (410–980 ms):** the wordmark wipes left-to-right while drifting 14 px into place.
4. **Secondary action (760–1,100 ms):** the yellow access disc drops 8 px, compresses 8%, then rebounds.
5. **Final settle (1,100–1,200 ms):** all geometry lands on the exact static logo.

Reading order: symbol → wordmark → yellow access cue.

## Principles used

- Anticipation: brief 15% coil before the mark enters.
- Staging: the symbol leads, wordmark follows, accent closes.
- Slow in / slow out: literal brand easings, no linear entrance.
- Follow-through: 4% overshoot on the mark and delayed yellow accent.
- Squash & stretch: limited to 8% on the yellow disc only.
- Secondary action: a single access-disc bounce; no confetti or competing effects.
- Appeal: the access disc behaves like a friendly confirmation seal.

## Variants

- Reveal: 1,200 ms, once per first page load.
- Hover: 2 px lift with the access disc rising 3 px.
- Idle/loading: yellow disc pulse only, 1,800 ms; stop after loading completes.
- Reduced motion and `?static=1`: immediate final static pose.

## Final Frame Contract

At 1,200 ms every animated property equals the static SVG: opacity 1, translation 0, scale 1, no clipping, no filter. `?t=1200` and `?static=1` must render identically.
