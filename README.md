# Mobilyze

A SillyTavern extension that forces a proper full-screen mobile layout and provides an auto-hiding top bar to maximise usable chat area on phones.

## The problems it solves

SillyTavern has built-in mobile CSS (`mobile-styles.css`) that kicks in below 1000px viewport width. Two things prevent it from working reliably:

**1. The shoulder panels don't collapse**

SillyTavern's JS sets `--sheldWidth` as an *inline style* on `document.documentElement`. Inline CSS custom properties have the highest possible cascade priority — no stylesheet rule, including ones with `!important`, can override a CSS variable set this way. The result is that the left and right drawer panels are sized using a 50vw calculation that the mobile stylesheet can never touch, so the three-column layout (shoulders + chat) persists even on a phone.

Mobilyze runs a `MutationObserver` on `document.documentElement` and re-writes `--sheldWidth` to `100dvw` every time SillyTavern's slider code changes it. It also applies `!important` overrides on the concrete `width` properties of all affected elements as a belt-and-suspenders measure, covering cases where the viewport exceeds the 1000px breakpoint entirely.

**2. The top bar permanently consumes 40–50px**

The top navigation bar is always visible and always takes up space, which on a small screen is a significant portion of the usable area.

Mobilyze hides the bar using `transform: translateY(-100%)` (GPU-composited, causes no layout reflow on the bar itself) and simultaneously expands `#sheld` upward to reclaim the freed space.

## Revealing the top bar

The bar reappears on any of:

- **Swipe down from the top edge** — start a touch within 30px of the top of the screen and drag down at least 40px
- **Scroll up in chat** — scrolling back through message history shows the bar so navigation stays reachable
- **Tap the pull-tab** — a small pill indicator appears at the top-centre of the screen whenever the bar is hidden

The bar auto-hides again after a configurable delay (default 4 seconds). Touching the bar itself resets the timer. When either nav panel is open the bar is pinned visible until the panel closes.

## Settings

Found in the Extensions drawer under **Mobilyze**:

| Setting | Default | Description |
|---|---|---|
| Enable mobile layout | On | Activates both the shoulder fix and the auto-hiding bar |
| Auto-hide delay | 4000 ms | How long the bar stays visible before hiding again |

## Files

| File | Purpose |
|---|---|
| `index.js` | MutationObserver shoulder fix, touch/scroll gesture handling, settings panel |
| `style.css` | Full-width layout overrides, bar slide animation, pull-tab indicator |
| `manifest.json` | Extension metadata loaded by SillyTavern |
