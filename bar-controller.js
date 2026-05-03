/**
 * @file mobilyze/bar-controller.js
 * @stamp 2024-03-20T19:00:00Z
 * @architectural-role Stateful / IO — Manages top bar visibility and auto-hide logic.
 * @description
 * Controls the 'mobilyze-bar-hidden' state on the document body. Orchestrates 
 * the auto-hide timer and monitors SillyTavern's side drawers. Viewport 
 * detection is height-based logic has been removed to force a unified 
 * single-column experience on all devices.
 *
 * @api-declaration
 * showBar() — Reveals the top bar and schedules auto-hide.
 * hideBar() — Hides the top bar if no drawers are open.
 * isScrollSuppressed() — Returns true during the hide transition.
 * activateBar() — Starts drawer observers and initial timers.
 * deactivateBar() — Clears all timers and observers.
 * syncBarState() — Forces the bar visible and clears timers if logic is disabled.
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

let _hideTimer      = null;
let _drawerObserver = null;
let _suppressScroll = false;

/**
 * Mobilyze logic now applies to all viewports to maintain single-column layout.
 * @returns {boolean}
 */
function isMobileViewport() {
    return true;
}

/**
 * Checks if any main menu drawer is currently open.
 * @returns {boolean}
 */
function anyPanelOpen() {
    return document.querySelector('.drawer-content.openDrawer') !== null;
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
 * Aborts if navigation drawers are open.
 */
export function hideBar() {
    if (!isMobileViewport()) {
        log(MODULE, 'Hide aborted: viewport inactive');
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
 * Forces the bar visible and kills all timers if the viewport is reset.
 */
export function syncBarState() {
    if (!isMobileViewport()) {
        clearHideTimer();
        document.body.classList.remove(CLASS_BAR_HIDDEN);
        log(MODULE, 'State reset and bar forced visible');
    }
}

/**
 * Starts observing drawer panels to sync bar visibility with drawer state.
 */
function startDrawerObserver() {
    if (_drawerObserver) return;
    const panels = document.querySelectorAll('.drawer-content');
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