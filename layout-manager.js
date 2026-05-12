/**
 * @file mobilyze/layout-manager.js
 * @stamp 2024-03-20T14:30:00Z
 * @architectural-role IO — Manages root CSS variables and layout MutationObservers.
 * @description
 * Responsible for ensuring the --sheldWidth CSS variable remains at a comfortable 
 * mobile-first width (clamped at 800px) regardless of SillyTavern's internal 
 * slider logic. Handles the setup and teardown of the MutationObserver.
 *
 * @api-declaration
 * activateLayout() — Starts the observer and forces clamped mobile width.
 * deactivateLayout() — Disconnects the observer and restores native width.
 *
 * @contract
 *   assertions:
 *     purity:        IO (DOM mutation)
 *     state_ownership: [MutationObserver instance]
 *     external_io:   [document.documentElement.style]
 */

'use strict';

import { power_user }         from '../../../../scripts/power-user.js';
import { log }                from './logger.js';

const MODULE = 'layout';
const COMFORT_WIDTH = 'min(100dvw, 800px)';

let _observer = null;

function readSheldWidth(label) {
    const inline   = document.documentElement.style.getPropertyValue('--sheldWidth') || '(unset)';
    const computed = getComputedStyle(document.documentElement).getPropertyValue('--sheldWidth').trim() || '(unset)';
    const sheld    = document.getElementById('sheld');
    const px       = sheld ? Math.round(sheld.getBoundingClientRect().width) + 'px' : '(no #sheld)';
    log(MODULE, `[SHELD-WIDTH] ${label} | inline="${inline}" | computed="${computed}" | rendered=${px}`);
}

/**
 * Force-writes the clamped width variable to the root element.
 */
function forceSheldWidth() {
    document.documentElement.style.setProperty('--sheldWidth', COMFORT_WIDTH);
    readSheldWidth('after forceSheldWidth');
}

/**
 * Measures the total rendered height of all #sheld children that appear
 * before #chat (i.e. extension-injected top bars), and writes it to
 * --mobilyze-sheld-preamble so nav panels can be positioned below them.
 */
export function syncSheldPreamble() {
    // Skip while bar is hidden — extension bars are display:none in that state,
    // so getBoundingClientRect().height === 0. Writing that would corrupt the
    // variable; the CSS rule in .mobilyze-bar-hidden already owns the 0px state.
    if (document.body.classList.contains('mobilyze-bar-hidden')) return;

    const sheld = document.getElementById('sheld');
    const chat  = document.getElementById('chat');
    if (!sheld || !chat) return;

    let height = 0;
    for (const child of sheld.children) {
        if (child === chat) break;
        height += child.getBoundingClientRect().height;
    }

    document.documentElement.style.setProperty('--mobilyze-sheld-preamble', `${height}px`);
    log(MODULE, `[SHELD-PREAMBLE] ${height}px above #chat`);
}

/**
 * Starts observing documentElement for style changes to prevent ST 
 * from overwriting our mobile layout width.
 */
export function activateLayout() {
    log(MODULE, '[STEP] activateLayout() called', { alreadyActive: !!_observer });
    if (_observer) return;

    readSheldWidth('before forceSheldWidth');
    forceSheldWidth();

    _observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const v = document.documentElement.style.getPropertyValue('--sheldWidth');
                if (v !== COMFORT_WIDTH) {
                    log(MODULE, '[OBSERVER] --sheldWidth deviation detected — correcting', { was: v, restoringTo: COMFORT_WIDTH });
                    forceSheldWidth();
                }
            }
        }
    });

    _observer.observe(document.documentElement, {
        attributes:      true,
        attributeFilter: ['style'],
    });

    // Measure on next tick (sync) and again after 500ms to catch late-loading extensions
    setTimeout(() => syncSheldPreamble(), 0);
    setTimeout(() => syncSheldPreamble(), 500);

    log(MODULE, '[STEP] Layout observer activated (Comfort Width: 800px max)');
}

export function deactivateLayout() {
    log(MODULE, '[STEP] deactivateLayout() called');
    readSheldWidth('deactivate start');

    if (_observer) {
        _observer.disconnect();
        _observer = null;
        log(MODULE, '[STEP] Observer disconnected');
    }

    const targets = [
        document.documentElement,
        document.body,
        document.getElementById('sheld'),
        document.getElementById('top-bar'),
        document.getElementById('top-settings-holder'),
        document.getElementById('form_sheld'),
        document.getElementById('chat')
    ].filter(Boolean);

    const variables = [
        '--sheldWidth',
        '--topBarBlockSize',
        '--bottomFormBlockSize',
        '--mes-right-spacing',
        '--mobilyze-sheld-preamble',
    ];

    targets.forEach(el => {
        variables.forEach(v => el.style.removeProperty(v));
        el.style.removeProperty('top');
        el.style.removeProperty('height');
        el.style.removeProperty('max-height');
        el.style.removeProperty('width');
    });

    readSheldWidth('after CSS variable removal');

    // Restore ST's native width from its own setting (mirrors what applyChatWidth('forced') does)
    const nativeWidth = power_user.chat_width ? `${power_user.chat_width}vw` : '50vw';
    document.documentElement.style.setProperty('--sheldWidth', nativeWidth);
    log(MODULE, `[STEP] Restored native --sheldWidth = ${nativeWidth}`);
    readSheldWidth('after native width restore');

    window.dispatchEvent(new Event('resize'));
    log(MODULE, '[STEP] SillyTavern layout re-primed.');
}