# Responsive QA matrix — Shammah

## Scope and honest status

This is the release checklist for Prompt 16. The branch includes container-query-driven section layouts, desktop/tablet framing, media capture styles and cross-promotion styles. The latest previously inspected Vercel preview build reached **READY** and compiled successfully; a follow-up build is required after the promo query fix. No claim is made that the browser/device matrix below has already been manually exercised.

## Viewport matrix

| Label | CSS viewport | Primary checks |
|---|---:|---|
| Small phone | 360 × 800 | no horizontal page scroll; bottom navigation doesn't cover actions; dialogs fit and scroll internally |
| Typical phone | 390 × 844 | media previews, composer toolbar, reels rail, promo card and text wrapping |
| Large phone | 430 × 932 | card width and responsive spacing; portrait video controls remain reachable |
| Tablet portrait | 768 × 1024 | desktop frame transition; side rails do not squeeze center content |
| Tablet portrait (narrow) | 820 × 1180 | container-query breakpoints, card density and panel widths |
| Tablet landscape / small laptop | 1024 × 768 | navigation, columns, modals and dense toolbars |
| Desktop (small) | 1280 × 800 | two/three-column transition, sidebar collisions and sticky regions |
| Desktop | 1440 × 900 | three-column layout, readable line lengths, sticky regions and cards |
| Wide desktop | 1920 × 1080 | content max-width, centered layout, no stretched media or oversized whitespace |

Run every viewport in **dark and light themes**. Use browser zoom at 100%; then check 200% zoom for essential navigation and dialogs.

## Page-family acceptance matrix

| Page / component family | Mobile | Tablet | Desktop | Dark + light |
|---|---|---|---|---|
| Home feed, post cards, shelves and Reels rail | pending | pending | pending | pending |
| Create-post modal, comments and status composer | pending | pending | pending | pending |
| Camera capture, voice recorder and GIF picker | device check pending | device check pending | device check pending | pending |
| Videos, Reels viewer and audio player | pending | pending | pending | pending |
| Polls, courses, fundraisers and faith challenges | pending | pending | pending | pending |
| Arcade and Bible reader | pending | pending | pending | pending |
| Live host/join/moderation and chat | device / token check pending | pending | pending | pending |
| Profile, settings, messages and notifications | pending | pending | pending | pending |
| Layout Kit playground and all layout modes | pending | pending | pending | pending |

## Test steps

1. Visit the branch preview URL for the latest READY deployment and test each viewport/theme pair above.
2. Check the browser for horizontal overflow at the document and component level; confirm rails scroll internally rather than expanding the page.
3. Open and close every modal, picker and media viewer. Verify close controls remain visible, long content scrolls inside the dialog, and the focused control remains visible.
4. Confirm buttons and touch targets are at least 44px where practical, keyboard focus is visible, and reduced-motion preference removes nonessential animations.
5. Test portrait and landscape images/video, long titles, empty/loading/error states, and signed-out behavior.
6. On a real supported device, grant and deny camera/microphone permissions; verify a useful fallback if permission is denied or the API is unavailable.
7. Record any failures with viewport, theme, page, expected result and screenshot/console error. Fix only observed issues, then repeat the affected cells.

## Release gate

Do not mark Prompt 16 complete until the preview is manually checked at minimum at 360px, 768px, 820px, 1280px, 1440px and 1920px in both themes, and the media/device flows have been tested on a supported device. A successful Next.js build alone does not prove responsive behavior.
