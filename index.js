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

import { eventSource, event_types }  from '../../../../script.js';
import { initSettings, getSettings, applyPullTabVisibility } from './settings.js';
import { log, warn, error, setVerbose } from './logger.js';
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
    syncGestures,
    isMobileViewport,
} from './gesture-handler.js';
import {
    activateJumpPill,
    deactivateJumpPill,
    syncJumpPill,
} from './jump-pill.js';

const MODULE             = 'core';
const CLASS_ACTIVE       = 'mobilyze-active';
const CLASS_WRAP         = 'mobilyze-wrap-active';
const CLASS_MOBILE_MODE  = 'mobilyze-mobile-mode';

let _lastScrollTop  = 0;

function syncWrapState() {
    const settings = getSettings();
    const shouldWrap = settings.enabled && settings.enableTextWrap;
    document.body.classList.toggle(CLASS_WRAP, !!shouldWrap);
    log(MODULE, 'Wrap state synced', { active: shouldWrap });
}

function onChatScroll() {
    const chat = document.getElementById('chat');
    if (!chat) return;

    const st = chat.scrollTop;
    if (!getSettings().enableScrollReveal || isScrollSuppressed()) {
        _lastScrollTop = st;
        return;
    }

    if (st < _lastScrollTop - 10) {
        showBar();
    }
    _lastScrollTop = st;
}

function syncMobileMode() {
    document.body.classList.toggle(CLASS_MOBILE_MODE, isMobileViewport());
}

function onResize() {
    syncMobileMode();
    syncBarState();
    syncGestures();
    syncJumpPill();
}

function activate() {
    document.body.classList.add(CLASS_ACTIVE);
    syncMobileMode();

    activateLayout();
    activateBar();

    syncWrapState();
    initGestures(showBar, scheduleHide);
    applyPullTabVisibility();
    activateJumpPill();

    const chat = document.getElementById('chat');
    if (chat) {
        _lastScrollTop = chat.scrollTop;
        chat.addEventListener('scroll', onChatScroll, { passive: true });
    }

    window.addEventListener('resize', onResize);
}

function deactivate() {
    try {
        document.body.classList.remove(CLASS_ACTIVE);
        document.body.classList.remove(CLASS_WRAP);
        document.body.classList.remove(CLASS_MOBILE_MODE);
        document.body.classList.remove('mobilyze-bar-hidden');
        document.body.removeAttribute('data-mobilyze-tab-viz');

        deactivateLayout();
        deactivateBar();
        destroyGestures();
        deactivateJumpPill();
    } catch (e) {
        error(MODULE, 'Deactivation failed mid-way', { error: e });
    } finally {
        window.dispatchEvent(new Event('resize'));
    }
}

jQuery(async () => {
    await initSettings(
        (enabled) => {
            enabled ? activate() : deactivate();
        },
        (debugEnabled) => {
            setVerbose(debugEnabled);
        },
        () => {
            syncMobileMode();
            syncBarState();
            syncWrapState();
            syncJumpPill();
            syncGestures();
        }
    );

    const settings = getSettings();
    setVerbose(settings.debugLogging);

    if (settings.enabled) {
        eventSource.once(event_types.APP_READY, () => {
            activate();
        });
    }
});
