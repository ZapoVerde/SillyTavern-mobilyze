/**
 * @file mobilyze/index.js
 * @version 0.2.0
 * @description
 * Mobilyze — a SillyTavern extension that forces a full-screen mobile layout
 * regardless of viewport width, and provides an auto-hiding top bar that
 * reappears on swipe-down from the top edge, upward chat scroll, or by
 * dragging the pull handle.
 *
 * Two root problems solved:
 *
 * 1. SHOULDER PANELS: SillyTavern's JS sets --sheldWidth as an inline style on
 *    document.documentElement (highest cascade priority), so @media rules in
 *    stylesheets cannot override it. A MutationObserver watches the style
 *    attribute and keeps --sheldWidth at 100dvw while the extension is active.
 *    CSS in style.css forces all affected elements to full width with !important
 *    as a belt-and-suspenders measure.
 *
 * 2. AUTO-HIDE TOP BAR: The top bar always occupies ~40-50px. Mobilyze hides it
 *    with a CSS transform (no layout reflow on the bar itself) and expands
 *    #sheld to fill the freed space. Reveal triggers:
 *      a. Dragging the pull handle down from the top of the screen.
 *      b. Swipe down starting within 30px of the top edge (no handle needed).
 *      c. Upward scroll in #chat (user reading back through history).
 *    The bar auto-hides again after a configurable delay.
 *
 * Bounce fix: hiding the bar triggers a CSS transition on #sheld (top: 0,
 * height: 100dvh), which resizes #chat and fires a synthetic scroll event.
 * Without suppression, onChatScroll sees a decreasing scrollTop and immediately
 * calls showBar(), causing the visible bounce. _suppressScroll blocks scroll
 * reactions for the duration of the transition.
 *
 * Drag handle: the pull tab supports real-time finger-following via touchmove.
 * During the drag the CSS transition is disabled (mobilyze-dragging class) so
 * the bar tracks the finger exactly. On release it snaps to shown or hidden
 * depending on how far it was dragged.
 */

'use strict';

import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings }    from '../../../extensions.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXT_NAME              = 'mobilyze';
const CLASS_ACTIVE          = 'mobilyze-active';
const CLASS_BAR_HIDDEN      = 'mobilyze-bar-hidden';
const CLASS_DRAGGING        = 'mobilyze-dragging';
const PULL_TAB_ID           = 'mobilyze-pull-tab';
const SWIPE_ORIGIN_MAX_Y    = 30;   // px from top edge to qualify as a screen-edge swipe
const SWIPE_MIN_DY          = 40;   // px downward movement to trigger screen-edge reveal
const SWIPE_MAX_DX          = 80;   // px horizontal drift allowed in screen-edge swipe
const DRAG_SNAP_THRESHOLD   = 0.35; // fraction of bar height to commit a reveal
const TRANSITION_DURATION   = 400;  // ms — slightly longer than the 0.25s CSS transition
const INITIAL_HIDE_DELAY    = 1500; // ms after activation before first auto-hide

const DEFAULTS = {
    enabled:       true,
    autoHideDelay: 4000,
};

// ─── State ────────────────────────────────────────────────────────────────────

let _observer       = null;   // MutationObserver on document.documentElement.style
let _hideTimer      = null;
let _touchStartY    = 0;
let _touchStartX    = 0;
let _lastScrollTop  = 0;
let _suppressScroll = false;  // blocks onChatScroll during #sheld resize transition
let _dragActive     = false;  // true while the pull handle is being dragged
let _dragStartY     = 0;
let _barHeight      = 0;      // cached offsetHeight of #top-settings-holder

// ─── Settings helper ──────────────────────────────────────────────────────────

function settings() {
    return extension_settings[EXT_NAME];
}

// ─── --sheldWidth override ────────────────────────────────────────────────────

function forceSheldWidth() {
    document.documentElement.style.setProperty('--sheldWidth', '100dvw');
}

function startSheldObserver() {
    if (_observer) return;
    _observer = new MutationObserver(() => {
        const v = document.documentElement.style.getPropertyValue('--sheldWidth');
        if (v !== '100dvw') forceSheldWidth();
    });
    _observer.observe(document.documentElement, {
        attributes:      true,
        attributeFilter: ['style'],
    });
}

function stopSheldObserver() {
    if (!_observer) return;
    _observer.disconnect();
    _observer = null;
}

// ─── Top bar show / hide ──────────────────────────────────────────────────────

function anyPanelOpen() {
    return document.querySelector('.fillLeft.openDrawer, .fillRight.openDrawer') !== null;
}

function showBar() {
    clearHideTimer();
    document.body.classList.remove(CLASS_BAR_HIDDEN);
    if (!anyPanelOpen()) scheduleHide();
}

function hideBar() {
    if (anyPanelOpen()) return;
    clearHideTimer();

    // Suppress scroll reactions while #sheld resizes during the CSS transition.
    // Without this, the layout shift fires a synthetic scroll event on #chat
    // that onChatScroll misreads as an upward scroll, immediately calling showBar().
    _suppressScroll = true;
    document.body.classList.add(CLASS_BAR_HIDDEN);
    setTimeout(() => { _suppressScroll = false; }, TRANSITION_DURATION);
}

function scheduleHide() {
    clearHideTimer();
    _hideTimer = setTimeout(hideBar, settings().autoHideDelay);
}

function clearHideTimer() {
    if (_hideTimer === null) return;
    clearTimeout(_hideTimer);
    _hideTimer = null;
}

// ─── Pull handle drag ─────────────────────────────────────────────────────────
// Moves the top bar in real time with the finger. The CSS transition is disabled
// during the drag so the bar tracks exactly. On release it snaps open or shut.

function getBarElements() {
    return [
        document.getElementById('top-settings-holder'),
        document.getElementById('top-bar'),
    ].filter(Boolean);
}

function setBarTranslatePx(px) {
    const style = `translateY(${px}px)`;
    getBarElements().forEach(el => { el.style.transform = style; });
}

function clearBarTranslate() {
    getBarElements().forEach(el => { el.style.transform = ''; });
}

function onHandleTouchStart(e) {
    _dragActive = true;
    _dragStartY = e.touches[0].clientY;
    _barHeight  = document.getElementById('top-settings-holder')?.offsetHeight ?? 45;
    document.body.classList.add(CLASS_DRAGGING);
    e.stopPropagation();
}

function onHandleTouchMove(e) {
    if (!_dragActive) return;
    e.preventDefault();
    const dy          = e.touches[0].clientY - _dragStartY;
    const translatePx = Math.min(0, dy - _barHeight); // clamp: can't go below fully visible
    setBarTranslatePx(translatePx);
}

function onHandleTouchEnd(e) {
    if (!_dragActive) return;
    _dragActive = false;
    document.body.classList.remove(CLASS_DRAGGING);
    clearBarTranslate();

    const dy = e.changedTouches[0].clientY - _dragStartY;
    if (dy >= _barHeight * DRAG_SNAP_THRESHOLD) {
        showBar();
    }
    // else: CLASS_BAR_HIDDEN stays; CSS transition snaps bar back to -100%

    e.stopPropagation();
}

// ─── Screen-edge swipe & bar-touch handlers ───────────────────────────────────

function onTouchStart(e) {
    if (_dragActive) return; // handle has priority
    _touchStartY = e.touches[0].clientY;
    _touchStartX = e.touches[0].clientX;
}

function onTouchEnd(e) {
    if (_dragActive) return;

    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const dy   = endY - _touchStartY;
    const dx   = Math.abs(endX - _touchStartX);

    // Swipe down from top edge (works even without the handle visible)
    if (_touchStartY < SWIPE_ORIGIN_MAX_Y && dy > SWIPE_MIN_DY && dx < SWIPE_MAX_DX) {
        showBar();
        return;
    }

    // Touch directly on the bar → reset hide timer
    const holder = document.getElementById('top-settings-holder');
    if (holder && holder.contains(e.target)) {
        clearHideTimer();
        scheduleHide();
    }
}

// ─── Chat scroll handler ──────────────────────────────────────────────────────

function onChatScroll() {
    const chat = document.getElementById('chat');
    if (!chat) return;
    const st = chat.scrollTop;
    if (_suppressScroll) {
        _lastScrollTop = st; // stay in sync; don't react
        return;
    }
    if (st < _lastScrollTop - 10) showBar();
    _lastScrollTop = st;
}

// ─── Activate / Deactivate ────────────────────────────────────────────────────

function buildPullTab() {
    const tab = document.createElement('div');
    tab.id        = PULL_TAB_ID;
    tab.title     = 'Drag down to show menu';
    tab.innerHTML = '<i class="fa-solid fa-grip-lines" aria-hidden="true"></i>';

    tab.addEventListener('touchstart',  onHandleTouchStart, { passive: true });
    tab.addEventListener('touchmove',   onHandleTouchMove,  { passive: false });
    tab.addEventListener('touchend',    onHandleTouchEnd,   { passive: true });
    tab.addEventListener('click', showBar);
    return tab;
}

function activate() {
    document.body.classList.add(CLASS_ACTIVE);
    forceSheldWidth();
    startSheldObserver();

    if (!document.getElementById(PULL_TAB_ID)) {
        document.body.appendChild(buildPullTab());
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });

    const chat = document.getElementById('chat');
    if (chat) {
        _lastScrollTop = chat.scrollTop;
        chat.addEventListener('scroll', onChatScroll, { passive: true });
    }

    document.body.classList.remove(CLASS_BAR_HIDDEN);
    setTimeout(hideBar, INITIAL_HIDE_DELAY);
}

function deactivate() {
    clearHideTimer();
    stopSheldObserver();
    _suppressScroll = false;
    _dragActive     = false;

    document.body.classList.remove(CLASS_ACTIVE, CLASS_BAR_HIDDEN, CLASS_DRAGGING);
    clearBarTranslate();

    const tab = document.getElementById(PULL_TAB_ID);
    if (tab) tab.remove();

    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchend',   onTouchEnd);

    const chat = document.getElementById('chat');
    if (chat) chat.removeEventListener('scroll', onChatScroll);

    const chatWidth = extension_settings?.power_user?.chat_width ?? 50;
    document.documentElement.style.setProperty('--sheldWidth', `${chatWidth}vw`);
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function injectSettingsPanel() {
    const html = `
<div id="mobilyze-settings" class="extension_settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Mobilyze</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <label class="checkbox_label flexGap5" title="Force full-screen mobile layout and auto-hiding top bar">
                <input type="checkbox" id="mobilyze-enabled">
                <span>Enable mobile layout</span>
            </label>
            <div class="range-block">
                <div class="range-block-title">Auto-hide delay</div>
                <div class="range-block-range">
                    <input type="range" id="mobilyze-delay" min="1000" max="10000" step="500">
                    <span id="mobilyze-delay-counter" class="range-block-counter"></span>
                    <span class="range-block-suffix">ms</span>
                </div>
            </div>
            <small class="mobilyze-hint">
                Drag the handle at the top of the screen, or scroll up in chat, to show the menu bar.
            </small>
        </div>
    </div>
</div>`;
    $('#extensions_settings').append(html);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

jQuery(async () => {
    extension_settings[EXT_NAME]               ??= {};
    extension_settings[EXT_NAME].enabled       ??= DEFAULTS.enabled;
    extension_settings[EXT_NAME].autoHideDelay ??= DEFAULTS.autoHideDelay;

    injectSettingsPanel();

    const $enabled      = $('#mobilyze-enabled');
    const $delay        = $('#mobilyze-delay');
    const $delayCounter = $('#mobilyze-delay-counter');

    $enabled.prop('checked', settings().enabled);
    $delay.val(settings().autoHideDelay);
    $delayCounter.text(settings().autoHideDelay);

    $enabled.on('change', function () {
        settings().enabled = this.checked;
        saveSettingsDebounced();
        this.checked ? activate() : deactivate();
    });

    $delay.on('input', function () {
        settings().autoHideDelay = Number(this.value);
        $delayCounter.text(this.value);
        saveSettingsDebounced();
    });

    if (settings().enabled) activate();
});
