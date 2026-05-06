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
import { log }                from './logger.js';

const MODULE = 'layout';
const COMFORT_WIDTH = 'min(100dvw, 800px)';

let _observer = null;

/**
 * Force-writes the clamped width variable to the root element.
 */
function forceSheldWidth() {
    document.documentElement.style.setProperty('--sheldWidth', COMFORT_WIDTH);
}

/**
 * Starts observing documentElement for style changes to prevent ST 
 * from overwriting our mobile layout width.
 */
export function activateLayout() {
    if (_observer) return;

    forceSheldWidth();

    _observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const v = document.documentElement.style.getPropertyValue('--sheldWidth');
                if (v !== COMFORT_WIDTH) {
                    log(MODULE, 'Correcting --sheldWidth deviation', { detected: v });
                    forceSheldWidth();
                }
            }
        }
    });

    _observer.observe(document.documentElement, {
        attributes:      true,
        attributeFilter: ['style'],
    });

    log(MODULE, 'Layout observer activated (Comfort Width: 800px max)');
}

export function deactivateLayout() {
    if (_observer) {
        _observer.disconnect();
        _observer = null;
    }

    log(MODULE, 'Reverting to SillyTavern Native State...');

    // 1. Identify the core ST elements that ST hard-codes during boot
    const targets = [
        document.documentElement,
        document.body,
        document.getElementById('sheld'),
        document.getElementById('top-bar'),
        document.getElementById('top-settings-holder'),
        document.getElementById('form_sheld'),
        document.getElementById('chat')
    ].filter(Boolean);

    // 2. Clear every variable Mobilyze touches from every element
    const variables = [
        '--sheldWidth', 
        '--topBarBlockSize', 
        '--bottomFormBlockSize', 
        '--mes-right-spacing'
    ];

    targets.forEach(el => {
        variables.forEach(v => el.style.removeProperty(v));
        // Also clear hard-coded positioning ST might have tried to fight us on
        el.style.removeProperty('top');
        el.style.removeProperty('height');
        el.style.removeProperty('max-height');
        el.style.removeProperty('width');
    });

    // 3. THE "SECRET SAUCE": Re-trigger SillyTavern's Internal Smart Theme
    // This forces ST to re-read 'settings.sheld_width' and re-inject it into the CSS
    try {
        // This is the global event that triggers ST's "poweruser.js" layout refresh
        $(document).trigger('smarttheme_changed'); 
        
        // v1.16+ specific: Refresh the "Sheld" specifically
        if (typeof window.adjustSheldWidth === 'function') {
            window.adjustSheldWidth();
        }
    } catch (e) {
        log(MODULE, 'Soft trigger failed, using resize fallback');
    }

    // 4. Force a resize twice (Immediate and Delayed)
    // The delay is necessary because ST's own resize listeners are debounced.
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        log(MODULE, 'SillyTavern layout re-primed.');
    }, 200);
}