/**
 * @file mobilyze/index.js
 * @version 0.1.0
 * @description
 * Mobilyze — a SillyTavern extension that forces a full-screen mobile layout
 * regardless of viewport width, and provides an auto-hiding top bar that
 * reappears on swipe-down from the top edge or on upward chat scroll.
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
 *      a. Swipe down starting within 30px of the top edge.
 *      b. Upward scroll in #chat (user reading back through history).
 *      c. Touch on the pull-tab indicator strip.
 *    The bar auto-hides again after a configurable delay. Touching the bar
 *    itself resets the hide timer. When any nav panel is open, the bar is
 *    pinned visible so navigation remains accessible.
 */

'use strict';

import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings }    from '../../../extensions.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXT_NAME            = 'mobilyze';
const CLASS_ACTIVE        = 'mobilyze-active';
const CLASS_BAR_HIDDEN    = 'mobilyze-bar-hidden';
const PULL_TAB_ID         = 'mobilyze-pull-tab';
const SWIPE_ORIGIN_MAX_Y  = 30;   // px from top edge to qualify as a pull gesture
const SWIPE_MIN_DY        = 40;   // px downward movement to trigger reveal
const SWIPE_MAX_DX        = 80;   // px horizontal drift allowed in pull gesture
const INITIAL_HIDE_DELAY  = 1500; // ms after activation before first auto-hide

const DEFAULTS = {
    enabled:       true,
    autoHideDelay: 4000,
};

// ─── State ────────────────────────────────────────────────────────────────────

let _observer    = null;  // MutationObserver watching document.documentElement.style
let _hideTimer   = null;
let _touchStartY = 0;
let _touchStartX = 0;
let _lastScrollTop = 0;

// ─── Settings helper ──────────────────────────────────────────────────────────

function settings() {
    return extension_settings[EXT_NAME];
}

// ─── --sheldWidth override ────────────────────────────────────────────────────
// SillyTavern's power-user.js writes --sheldWidth (e.g. "50vw") as an inline
// style on document.documentElement. Inline custom properties beat any
// stylesheet rule regardless of specificity or !important. We override it back
// after every write via a MutationObserver.

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
    document.body.classList.add(CLASS_BAR_HIDDEN);
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

// ─── Touch handlers ───────────────────────────────────────────────────────────

function onTouchStart(e) {
    _touchStartY = e.touches[0].clientY;
    _touchStartX = e.touches[0].clientX;
}

function onTouchEnd(e) {
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const dy   = endY - _touchStartY;
    const dx   = Math.abs(endX - _touchStartX);

    // Swipe down starting near the top edge → reveal bar
    if (_touchStartY < SWIPE_ORIGIN_MAX_Y && dy > SWIPE_MIN_DY && dx < SWIPE_MAX_DX) {
        showBar();
        return;
    }

    // Touch on the bar itself → reset the hide timer
    const holder = document.getElementById('top-settings-holder');
    if (holder && holder.contains(e.target)) {
        clearHideTimer();
        scheduleHide();
    }
}

// ─── Chat scroll handler ──────────────────────────────────────────────────────
// Scrolling up means the user is reading back — show the bar so they can
// navigate to another character / settings without needing a swipe gesture.

function onChatScroll() {
    const chat = document.getElementById('chat');
    if (!chat) return;
    const st = chat.scrollTop;
    if (st < _lastScrollTop - 10) showBar();
    _lastScrollTop = st;
}

// ─── Activate / Deactivate ────────────────────────────────────────────────────

function activate() {
    document.body.classList.add(CLASS_ACTIVE);
    forceSheldWidth();
    startSheldObserver();

    // Pull tab
    if (!document.getElementById(PULL_TAB_ID)) {
        const tab = document.createElement('div');
        tab.id = PULL_TAB_ID;
        tab.title = 'Pull down to show menu';
        tab.addEventListener('touchstart', showBar, { passive: true });
        tab.addEventListener('click', showBar);
        document.body.appendChild(tab);
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });

    const chat = document.getElementById('chat');
    if (chat) {
        _lastScrollTop = chat.scrollTop;
        chat.addEventListener('scroll', onChatScroll, { passive: true });
    }

    // Start visible, then auto-hide after INITIAL_HIDE_DELAY
    document.body.classList.remove(CLASS_BAR_HIDDEN);
    setTimeout(hideBar, INITIAL_HIDE_DELAY);
}

function deactivate() {
    clearHideTimer();
    stopSheldObserver();

    document.body.classList.remove(CLASS_ACTIVE, CLASS_BAR_HIDDEN);

    const tab = document.getElementById(PULL_TAB_ID);
    if (tab) tab.remove();

    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchend',   onTouchEnd);

    const chat = document.getElementById('chat');
    if (chat) chat.removeEventListener('scroll', onChatScroll);

    // Restore whatever sheldWidth power-user.js would have set
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
                Swipe down from top edge or scroll up in chat to show the menu bar.
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
