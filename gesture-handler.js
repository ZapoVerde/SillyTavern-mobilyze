/**
 * @file mobilyze/gesture-handler.js
 * @stamp 2024-03-20T12:20:00Z
 * @architectural-role IO — Manages touch gestures and the pull-tab UI element.
 * @description
 * Handles screen-edge swipes and pull-tab dragging interactions. Viewport 
 * detection is height-based to match the bar-controller logic: gestures 
 * and the pull-tab are disabled on screens taller than 1000px.
 *
 * @api-declaration
 * initGestures(onShow, onResetTimer) — Binds gesture listeners and creates the pull-tab.
 * destroyGestures() — Cleans up listeners and removes the pull-tab.
 * syncGestures() — Adds or removes the pull-tab based on current window height.
 *
 * @contract
 *   assertions:
 *     purity:        IO (DOM events and element manipulation)
 *     state_ownership: [Pull-tab DOM, touch/drag state]
 *     external_io:   [document body listeners, window.innerHeight]
 */

'use strict';

import { log } from './logger.js';

const MODULE            = 'gesture';
const PULL_TAB_ID       = 'mobilyze-pull-tab';
const CLASS_DRAGGING    = 'mobilyze-dragging';
const HEIGHT_BREAKPOINT = 1000;

// Gesture Thresholds
const SWIPE_ORIGIN_MAX_Y  = 30;
const SWIPE_MIN_DY        = 40;
const SWIPE_MAX_DX        = 80;
const DRAG_SNAP_THRESHOLD = 0.35;

// State
let _touchStartY = 0;
let _touchStartX = 0;
let _dragActive  = false;
let _dragStartY  = 0;
let _barHeight   = 0;

// Callbacks
let _onShow       = null;
let _onResetTimer = null;

/**
 * Checks if the current viewport is considered "mobile" based on height.
 * @returns {boolean}
 */
function isMobileViewport() {
    return window.innerHeight < HEIGHT_BREAKPOINT;
}

/**
 * Identifies the DOM elements affected by bar translation.
 * @returns {HTMLElement[]}
 */
function getBarElements() {
    return [
        document.getElementById('top-settings-holder'),
        document.getElementById('top-bar'),
    ].filter(Boolean);
}

/**
 * Applies a raw pixel translation to the bar elements.
 * @param {number} px 
 */
function setBarTranslatePx(px) {
    const style = `translateY(${px}px)`;
    getBarElements().forEach(el => { el.style.transform = style; });
}

/**
 * Removes custom translation styles.
 */
function clearBarTranslate() {
    getBarElements().forEach(el => { el.style.transform = ''; });
}

// ─── Pull Tab Event Handlers ────────────────────────────────────────────────

function onHandleTouchStart(e) {
    if (!isMobileViewport()) return;
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
    const translatePx = Math.min(0, dy - _barHeight);
    setBarTranslatePx(translatePx);
}

function onHandleTouchEnd(e) {
    if (!_dragActive) return;
    _dragActive = false;
    document.body.classList.remove(CLASS_DRAGGING);
    clearBarTranslate();

    const dy = e.changedTouches[0].clientY - _dragStartY;
    if (dy >= _barHeight * DRAG_SNAP_THRESHOLD) {
        if (_onShow) _onShow();
    }
    e.stopPropagation();
}

// ─── Global Touch Event Handlers ─────────────────────────────────────────────

function onTouchStart(e) {
    if (_dragActive || !isMobileViewport()) return;
    _touchStartY = e.touches[0].clientY;
    _touchStartX = e.touches[0].clientX;
}

function onTouchEnd(e) {
    if (_dragActive || !isMobileViewport()) return;

    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const dy   = endY - _touchStartY;
    const dx   = Math.abs(endX - _touchStartX);

    if (_touchStartY < SWIPE_ORIGIN_MAX_Y && dy > SWIPE_MIN_DY && dx < SWIPE_MAX_DX) {
        log(MODULE, 'Edge swipe detected');
        if (_onShow) _onShow();
        return;
    }

    const holder = document.getElementById('top-settings-holder');
    if (holder && holder.contains(e.target)) {
        if (_onResetTimer) _onResetTimer();
    }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

/**
 * Builds the pull-tab DOM element.
 */
function buildPullTab() {
    const tab = document.createElement('div');
    tab.id        = PULL_TAB_ID;
    tab.title     = 'Drag down to show menu';
    tab.innerHTML = '<i class="fa-solid fa-grip-lines" aria-hidden="true"></i>';

    tab.addEventListener('touchstart',  onHandleTouchStart, { passive: true });
    tab.addEventListener('touchmove',   onHandleTouchMove,  { passive: false });
    tab.addEventListener('touchend',    onHandleTouchEnd,   { passive: true });
    tab.addEventListener('click', () => _onShow?.());
    return tab;
}

/**
 * Ensures the pull-tab only exists when the viewport height is mobile-sized.
 */
export function syncGestures() {
    const tab = document.getElementById(PULL_TAB_ID);
    if (isMobileViewport()) {
        if (!tab) {
            document.body.appendChild(buildPullTab());
            log(MODULE, 'Pull-tab created (small height detected)');
        }
    } else {
        if (tab) {
            tab.remove();
            log(MODULE, 'Pull-tab removed (large height detected)');
        }
    }
}

/**
 * Initializes gesture detection and manages the pull-tab.
 */
export function initGestures(onShow, onResetTimer) {
    _onShow       = onShow;
    _onResetTimer = onResetTimer;

    syncGestures();

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });
    log(MODULE, 'Gestures initialized');
}

/**
 * Cleans up gesture listeners and removes the pull-tab.
 */
export function destroyGestures() {
    const tab = document.getElementById(PULL_TAB_ID);
    if (tab) tab.remove();

    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchend',   onTouchEnd);
    
    _onShow       = null;
    _onResetTimer = null;
    log(MODULE, 'Gestures destroyed');
}