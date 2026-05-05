/**
 * @file mobilyze/index.js
 * @stamp 2024-05-05T18:00:00Z
 * @architectural-role Orchestrator — Entry point and event coordinator.
 * @description
 * Wires together specialized modules for settings, layout management, 
 * bar control, and gesture handling. Coordinates the SillyTavern lifecycle 
 * and synchronizes optional layout features like avatar text-wrapping 
 * (reflow) based on user configuration.
 *
 * @api-declaration
 * activate() — Enables all extension features and event listeners.
 * deactivate() — Disables all features and restores native ST state.
 *
 * @contract
 *   assertions:
 *     purity:        IO / Stateful (Orchestration)
 *     state_ownership: [Scroll state]
 *     external_io:   [document events, #chat scroll, window resize, body classes]
 */

'use strict';

import { initSettings, getSettings } from './settings.js';
import { log, setVerbose }          from './logger.js';
import { 
    activateLayout, 
    deactivateLayout 
} from './layout-manager.js';
import { 
    activateBar, 
    deactivateBar, 
    showBar, 
    scheduleHide, 
    isScrollSuppressed,
    syncBarState
} from './bar-controller.js';
import { 
    initGestures, 
    destroyGestures,
    syncGestures
} from './gesture-handler.js';

const MODULE        = 'core';
const CLASS_ACTIVE  = 'mobilyze-active';
const CLASS_WRAP    = 'mobilyze-wrap-active';

let _lastScrollTop  = 0;

/**
 * Toggles the CSS class that controls text reflow behind portraits.
 */
function syncWrapState() {
    const settings = getSettings();
    const shouldWrap = settings.enabled && settings.enableTextWrap;
    document.body.classList.toggle(CLASS_WRAP, !!shouldWrap);
    log(MODULE, 'Wrap state synced', { active: shouldWrap });
}

/**
 * Monitors the chat container for upward scrolling to trigger the top bar.
 * Scroll logic remains relative to content and is unaffected by width centering.
 */
function onChatScroll() {
    const chat = document.getElementById('chat');
    if (!chat) return;

    const st = chat.scrollTop;
    if (isScrollSuppressed()) {
        _lastScrollTop = st;
        return;
    }

    // Reveal bar if user scrolls up more than 10px
    if (st < _lastScrollTop - 10) {
        showBar();
    }
    _lastScrollTop = st;
}

/**
 * Handles window resize events to sync UI state between mobile and desktop.
 */
function onResize() {
    syncBarState();
    syncGestures();
}

/**
 * Enables all Mobilyze functionality.
 */
function activate() {
    log(MODULE, 'Activating Mobilyze');
    document.body.classList.add(CLASS_ACTIVE);

    activateLayout();
    activateBar();
    syncWrapState();
    initGestures(showBar, scheduleHide);

    const chat = document.getElementById('chat');
    if (chat) {
        _lastScrollTop = chat.scrollTop;
        chat.addEventListener('scroll', onChatScroll, { passive: true });
    }

    window.addEventListener('resize', onResize);
}

/**
 * Disables all Mobilyze functionality and cleans up the environment.
 */
// index.js deactivation wrapper
function deactivate() {
    try {
        log(MODULE, 'Deactivating Mobilyze');
        // REMOVE CLASSES FIRST before logic, so if logic fails, CSS is still gone
        document.body.classList.remove(CLASS_ACTIVE);
        document.body.classList.remove(CLASS_WRAP);
        document.body.classList.remove('mobilyze-bar-hidden');

        deactivateLayout();
        deactivateBar();
        destroyGestures();
    } catch (e) {
        console.error("Mobilyze Deactivation failed mid-way:", e);
    } finally {
        window.dispatchEvent(new Event('resize'));
    }
}
/**
 * Entry point: SillyTavern initialization.
 */
jQuery(async () => {
    // Bootstrap settings and UI
    await initSettings(
        (enabled) => {
            enabled ? activate() : deactivate();
        },
        (debugEnabled) => {
            setVerbose(debugEnabled);
        },
        () => {
            syncWrapState();
        }
    );

    const settings = getSettings();

    // Sync initial logger state
    setVerbose(settings.debugLogging);

    // Initial activation
    if (settings.enabled) {
        activate();
    }
});