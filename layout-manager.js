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

import { extension_settings } from '../../../extensions.js';
import { warn }               from './logger.js';

const MODULE = 'layout';
const COMFORT_WIDTH = 'min(100dvw, 800px)';

let _observer = null;

function readSheldWidth(label) {
    const inline   = document.documentElement.style.getPropertyValue('--sheldWidth') || '(unset)';
    const computed = getComputedStyle(document.documentElement).getPropertyValue('--sheldWidth').trim() || '(unset)';
    const sheld    = document.getElementById('sheld');
    const sheldW   = sheld ? (sheld.getBoundingClientRect().width + 'px actual / ' + (sheld.style.width || '(no inline)') + ' inline') : '(no #sheld)';
    warn(MODULE, `[SHELD-WIDTH] ${label}`, { inline, computed, sheld: sheldW });
}

/**
 * Force-writes the clamped width variable to the root element.
 */
function forceSheldWidth() {
    document.documentElement.style.setProperty('--sheldWidth', COMFORT_WIDTH);
    readSheldWidth('after forceSheldWidth');
}

/**
 * Starts observing documentElement for style changes to prevent ST 
 * from overwriting our mobile layout width.
 */
export function activateLayout() {
    warn(MODULE, '[STEP] activateLayout() called', { alreadyActive: !!_observer });
    if (_observer) return;

    readSheldWidth('before forceSheldWidth');
    forceSheldWidth();

    _observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const v = document.documentElement.style.getPropertyValue('--sheldWidth');
                if (v !== COMFORT_WIDTH) {
                    warn(MODULE, '[OBSERVER] --sheldWidth deviation detected — correcting', { was: v, restoringTo: COMFORT_WIDTH });
                    forceSheldWidth();
                }
            }
        }
    });

    _observer.observe(document.documentElement, {
        attributes:      true,
        attributeFilter: ['style'],
    });

    warn(MODULE, '[STEP] Layout observer activated (Comfort Width: 800px max)');
}

export function deactivateLayout() {
    warn(MODULE, '[STEP] deactivateLayout() called');
    readSheldWidth('deactivate start');

    if (_observer) {
        _observer.disconnect();
        _observer = null;
        warn(MODULE, '[STEP] Observer disconnected');
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
        '--mes-right-spacing'
    ];

    targets.forEach(el => {
        variables.forEach(v => el.style.removeProperty(v));
        el.style.removeProperty('top');
        el.style.removeProperty('height');
        el.style.removeProperty('max-height');
        el.style.removeProperty('width');
    });

    readSheldWidth('after CSS variable removal');

    try {
        $(document).trigger('smarttheme_changed');
        warn(MODULE, '[STEP] smarttheme_changed triggered');
        readSheldWidth('after smarttheme_changed');

        if (typeof window.adjustSheldWidth === 'function') {
            window.adjustSheldWidth();
            warn(MODULE, '[STEP] adjustSheldWidth() called');
            readSheldWidth('after adjustSheldWidth');
        } else {
            warn(MODULE, '[STEP] adjustSheldWidth() not available');
        }
    } catch (e) {
        warn(MODULE, '[STEP] Soft trigger failed, using resize fallback', { error: String(e) });
    }

    window.dispatchEvent(new Event('resize'));
    readSheldWidth('after immediate resize');
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        readSheldWidth('after delayed resize (200ms)');
        warn(MODULE, '[STEP] SillyTavern layout re-primed.');
    }, 200);
}