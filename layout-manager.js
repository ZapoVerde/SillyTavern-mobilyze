/**
 * @file mobilyze/layout-manager.js
 * @stamp 2024-03-20T10:10:00Z
 * @architectural-role IO — Manages root CSS variables and layout MutationObservers.
 * @description
 * Responsible for ensuring the --sheldWidth CSS variable remains at 100dvw 
 * regardless of SillyTavern's internal slider logic. Handles the setup 
 * and teardown of the MutationObserver on the root element.
 *
 * @api-declaration
 * activateLayout() — Starts the observer and forces mobile width.
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
let _observer = null;

/**
 * Force-writes the mobile width variable to the root element.
 */
function forceSheldWidth() {
    document.documentElement.style.setProperty('--sheldWidth', '100dvw');
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
                if (v !== '100dvw') {
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

    log(MODULE, 'Layout observer activated');
}

/**
 * Disconnects the observer and restores the sheld width to the value 
 * defined in SillyTavern's Power User settings.
 */
export function deactivateLayout() {
    if (_observer) {
        _observer.disconnect();
        _observer = null;
    }

    // Restore ST default behavior
    const chatWidth = extension_settings?.power_user?.chat_width ?? 50;
    document.documentElement.style.setProperty('--sheldWidth', `${chatWidth}vw`);
    
    log(MODULE, 'Layout observer deactivated; width restored', { restored: `${chatWidth}vw` });
}