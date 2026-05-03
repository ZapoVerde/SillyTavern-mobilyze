/**
 * @file mobilyze/index.js
 * @stamp 2024-03-20T11:10:00Z
 * @architectural-role Orchestrator — Entry point and event coordinator.
 * @description
 * Wires together specialized modules for settings, layout management, 
 * bar control, and gesture handling. Manages the SillyTavern lifecycle, 
 * routes scroll events, and handles window resizing for responsive behavior.
 *
 * @api-declaration
 * activate() — Enables all extension features and event listeners.
 * deactivate() — Disables all features and restores native ST state.
 *
 * @contract
 *   assertions:
 *     purity:        IO / Stateful (Orchestration)
 *     state_ownership: [Scroll state]
 *     external_io:   [document events, #chat scroll, window resize]
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

let _lastScrollTop  = 0;

/**
 * Monitors the chat container for upward scrolling to trigger the top bar.
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
function deactivate() {
    log(MODULE, 'Deactivating Mobilyze');
    document.body.classList.remove(CLASS_ACTIVE);

    deactivateLayout();
    deactivateBar();
    destroyGestures();

    const chat = document.getElementById('chat');
    if (chat) {
        chat.removeEventListener('scroll', onChatScroll);
    }

    window.removeEventListener('resize', onResize);
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