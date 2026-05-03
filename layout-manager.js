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

/**
 * Disconnects the observer and removes the inline style override.
 * This allows SillyTavern's native CSS and internal logic to 
 * resume control of the layout width.
 */
export function deactivateLayout() {
    if (_observer) {
        _observer.disconnect();
        _observer = null;
    }

    // Remove the inline style property entirely.
    // Setting it to a "restored" value (like 50vw) actually blocks 
    // ST's native mobile stylesheets from working correctly.
    document.documentElement.style.removeProperty('--sheldWidth');
    
    log(MODULE, 'Layout observer deactivated; inline override removed');
}