/**
 * @file mobilyze/bar-controller.js
 * @stamp 2024-03-20T12:15:00Z
 * @architectural-role Stateful / IO — Manages top bar visibility and auto-hide logic.
 * @description
 * Controls the 'mobilyze-bar-hidden' state on the document body. Orchestrates 
 * the auto-hide timer and monitors SillyTavern's side drawers. Viewport 
 * detection is height-based to prioritize vertical chat space.
 *
 * @api-declaration
 * showBar() — Reveals the top bar and schedules auto-hide (if mobile).
 * hideBar() — Hides the top bar if no drawers are open and on mobile viewport.
 * isScrollSuppressed() — Returns true during the hide transition.
 * activateBar() — Starts drawer observers and initial timers.
 * deactivateBar() — Clears all timers and observers.
 * syncBarState() — Forces the bar visible and clears timers if the viewport is desktop-sized.
 *
 * @contract
 *   assertions:
 *     purity:        Stateful (visibility and timers)
 *     state_ownership: [visibility state, timers, drawer observer]
 *     external_io:   [DOM class manipulation, MutationObserver, window.innerHeight]
 */

'use strict';

import { getSettings } from './settings.js';
import { log }         from './logger.js';

const MODULE               = 'bar';
const CLASS_BAR_HIDDEN     = 'mobilyze-bar-hidden';
const TRANSITION_DURATION  = 400; 
const INITIAL_HIDE_DELAY   = 1500;
const HEIGHT_BREAKPOINT    = 1000; // Triggers auto-hide if screen height is below this

let _hideTimer      = null;
let _drawerObserver = null;
let _suppressScroll = false;

/**
 * Checks if the current viewport is considered "mobile" based on height.
 * @returns {boolean}
 */
function isMobileViewport() {
    return window.innerHeight < HEIGHT_BREAKPOINT;
}

/**
 * Checks if either the left or right navigation drawer is currently open.
 * @returns {boolean}
 */
function anyPanelOpen() {
    return document.querySelector('.fillLeft.openDrawer, .fillRight.openDrawer') !== null;
}

/**
 * Blocks scroll reactions during layout-shifting transitions.
 * @returns {boolean}
 */
export function isScrollSuppressed() {
    return _suppressScroll;
}

/**
 * Clears the active auto-hide timer.
 */
export function clearHideTimer() {
    if (_hideTimer === null) return;
    clearTimeout(_hideTimer);
    _hideTimer = null;
}

/**
 * Schedules the top bar to hide after the configured delay.
 * Only triggers if the screen height is within the mobile threshold.
 */
export function scheduleHide() {
    clearHideTimer();
    if (!isMobileViewport()) return;

    const delay = getSettings().autoHideDelay;
    _hideTimer = setTimeout(hideBar, delay);
}

/**
 * Removes the hidden class to reveal the top bar.
 */
export function showBar() {
    clearHideTimer();
    document.body.classList.remove(CLASS_BAR_HIDDEN);
    log(MODULE, 'Bar shown');
    if (!anyPanelOpen()) scheduleHide();
}

/**
 * Adds the hidden class to slide the bar out of view.
 * Aborts if navigation drawers are open OR if the viewport height is large.
 */
export function hideBar() {
    if (!isMobileViewport()) {
        log(MODULE, 'Hide aborted: viewport height too large');
        syncBarState();
        return;
    }

    if (anyPanelOpen()) {
        log(MODULE, 'Hide aborted: panels open');
        return;
    }

    clearHideTimer();

    _suppressScroll = true;
    document.body.classList.add(CLASS_BAR_HIDDEN);
    log(MODULE, 'Bar hidden');

    setTimeout(() => {
        _suppressScroll = false;
    }, TRANSITION_DURATION);
}

/**
 * Forces the bar visible and kills all timers if the viewport height is large.
 */
export function syncBarState() {
    if (!isMobileViewport()) {
        clearHideTimer();
        document.body.classList.remove(CLASS_BAR_HIDDEN);
        log(MODULE, 'Large viewport height detected: state reset and bar forced visible');
    }
}

/**
 * Starts observing drawer panels to sync bar visibility with drawer state.
 */
function startDrawerObserver() {
    if (_drawerObserver) return;
    const panels = document.querySelectorAll('.fillLeft, .fillRight');
    if (!panels.length) return;

    _drawerObserver = new MutationObserver(() => {
        if (anyPanelOpen()) {
            log(MODULE, 'Drawer opened; pinning bar');
            clearHideTimer();
            showBar();
        } else {
            log(MODULE, 'Drawers closed; resuming auto-hide');
            scheduleHide();
        }
    });

    panels.forEach(el => _drawerObserver.observe(el, {
        attributes:      true,
        attributeFilter: ['class'],
    }));
}

/**
 * Activates bar management logic.
 */
export function activateBar() {
    startDrawerObserver();
    document.body.classList.remove(CLASS_BAR_HIDDEN);
    
    // Only schedule initial hide if we are in the mobile height range
    if (isMobileViewport()) {
        setTimeout(hideBar, INITIAL_HIDE_DELAY);
    }
    log(MODULE, 'Bar controller activated');
}

/**
 * Deactivates bar management and cleans up.
 */
export function deactivateBar() {
    clearHideTimer();
    if (_drawerObserver) {
        _drawerObserver.disconnect();
        _drawerObserver = null;
    }
    _suppressScroll = false;
    document.body.classList.remove(CLASS_BAR_HIDDEN);
    log(MODULE, 'Bar controller deactivated');
}