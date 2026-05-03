<!--
@file principles.md
@stamp 2026-05-03T01:56:00Z
@architectural-role Documentation
@description
Core architectural principles and philosophy for the Mobilyze extension. Guides all future development and refactoring.
@api-declaration
N/A - Documentation file
@contract
N/A - Documentation file
-->

# Mobilyze — Project Principles
*Read before writing any code. Applies to every session.*

---

## 1. The Core Philosophy: The Screen is Premium Real Estate

Mobilyze exists to maximize usable chat area on restricted viewports. It forces a mobile-first paradigm onto an interface originally scaled for desktops. The chat canvas is the primary focus; everything else is secondary, ephemeral, and should only consume pixels when actively summoned. Every pixel permanently occupied by non-essential UI is a bug.

---

## 2. ST Native Machinery is the Default Answer

Before building anything, ask: does ST already do this?

Mobilyze is an override layer, not a replacement. We do not rebuild the top navigation bar, the settings panels, or the message blocks. We manipulate the existing DOM structure. We hook into ST's native extension settings framework. A custom implementation is only justified when ST's surface firmly resists CSS overrides or native configuration.

---

## 3. Intervention is Surgical and CSS-First

Performance matters on mobile devices. Interventions must use the lightest touch possible:

- **CSS over JS:** Overriding layout behavior should always be done via injected CSS (even using `!important` to smash ST inline styles) before resorting to JavaScript manipulation.
- **GPU-Composited Animations:** The top bar is hidden using `transform: translateY(-100%)` because it relies on GPU compositing and causes no layout reflows on the bar itself. 
- **Observers as Last Resort:** `MutationObserver` is used strictly for inline styles that cannot be targeted by the cascade (e.g., ST rewriting `--sheldWidth` continuously).

---

## 4. Unconditional Reversibility

Mobilyze's primary mechanical responsibility outside of layout overrides is managing a clean, reversible environment. The user must always be able to disable Mobilyze and find their ST exactly as they left it.

This means:
- Deactivation strips all extension-injected CSS classes.
- All event listeners (touch, scroll) are detached.
- All `MutationObserver` instances are disconnected.
- All custom DOM elements (like the pull-tab) are removed.
- Overridden CSS properties (like the fallback `--sheldWidth`) are restored to ST's expected default.

Entry and exit state transitions must be perfectly symmetrical.

---

## 5. Gestures are Native-Feeling and Interruptible

Mobile gestures must respect physics and user expectations. The pull tab and swipe gestures must feel like OS-level interactions, not clunky web hacks.

This means:
- A drag tracks the finger perfectly (1:1 translation via `touchmove`).
- CSS transitions are strictly disabled during active touch interactions to prevent rubber-banding or visual lag.
- The UI snaps cleanly to a binary open/closed state only on release (`touchend`), based on definitive thresholds.

---

## 6. The Three Kinds of Code

All code belongs to exactly one of three categories. No module mixes these responsibilities. If a module is hard to categorise, it needs to be split.

1. **Pure:** Takes data in, returns derived data out. No side effects. No knowledge of the UI or external services. Deterministic and testable in isolation.
2. **Stateful:** Owns a bounded domain of runtime state. Is the single authoritative writer for that domain. Other modules request state changes through the stateful owner; they do not mutate shared state directly.
3. **IO:** Performs work with external consequences — DOM manipulation, styling overrides, event binding. Contains no state derivation logic and no business logic. It does what it is told by the stateful and pure layers.

---

## 7. Every Module is Self-Describing

Every source file opens with a structured preamble declaring:

- Its architectural role (Pure / Stateful / IO, and what it owns or does)
- Its public API surface (what it exports and what those exports do)
- Its contracts (what it reads, what it writes, what it must never do)
- A timestamp marking the last intentional architectural change

This preamble is a forcing function. A module whose role cannot be stated clearly in a preamble has not been designed clearly enough to be implemented. Write the preamble first.

Example form:

```javascript
/**
 * @file mobilyze/filename.js
 * @stamp {utc timestamp}
 * @architectural-role {Pure | Stateful | IO} — {one line describing what this module owns or does}
 * @description
 * {Two to four sentences. What problem does this module solve? What is it not responsible for?}
 *
 * @api-declaration
 * functionName(args) — what it does and what it returns
 *
 * @contract
 *   assertions:
 *     purity:        {classification}
 *     state_ownership: [{domains owned, or none}]
 *     external_io:[{services touched, or none}]
 */
```

---

## 8. File Size is a Design Signal

No source file exceeds 300 lines. Proximity to this limit is a signal — not that the code needs to be compressed, but that responsibilities need to be separated. When a file approaches the limit, name the split explicitly before making it.

A file that is hard to split is a file whose concerns were not separated cleanly enough at design time. The limit surfaces this early.

---

## 9. All Output Routes Through the Logger

No raw console calls anywhere in the codebase. All diagnostic output routes through a single logging utility that supports at minimum two modes:

- **Verbose:** Structured entries for all operations — state transitions, observer triggers, gesture starts/ends.
- **Error only:** Suppresses informational output. Only failures surface.

The logger is not a debugging afterthought. It is the observability layer. It is written first and used consistently.

---

## 10. Known Deferred Features are Documented, Not Hidden

Features explicitly deferred from MVP scope are recorded here and marked in code with a consistent tag so they remain visible and intentional:

- **Customizable gesture thresholds** — hardcoded pixel values (e.g., 40px swipe trigger) work for standard devices, but user configuration is deferred.
- **Animation timing controls** — currently tied to fixed CSS transitions; custom speeds deferred.
- **Selective panel overrides** — currently an all-or-nothing toggle for the entire 100dvw layout override.

Tag deferred boundaries in code with `// V2: {reason}`. A future implementer must be able to find every deferred boundary without reading the full codebase.