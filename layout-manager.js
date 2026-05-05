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

// layout-manager.js

export function deactivateLayout() {
    if (_observer) {
        _observer.disconnect();
        _observer = null;
    }

    log(MODULE, 'Performing Nuclear UI Reset...');

    // 1. Remove the "Orphaned" styles from the root
    const root = document.documentElement;
    root.style.removeProperty('--sheldWidth');
    root.style.removeProperty('--topBarBlockSize');
    
    // 2. Clear SillyTavern's "Moving UI" internal caches 
    // ST sometimes sticks in "movingUI" mode if deactivated during a drag
    document.body.classList.remove('movingUI');

    // 3. TRIGGER INTERNAL ST RECALCULATION
    // We fire the specific event SillyTavern's 'power-user' and 'ui' modules 
    // listen to for 'hard' layout refreshes.
    $(document).trigger('settingsApplied');
    $(document).trigger('layoutChanged');

    // 4. The "Double-Bounce" Resize
    // A single resize event is often debounced/ignored. 
    // We fire one immediately, and one after a frame.
    window.dispatchEvent(new Event('resize'));
    
    requestAnimationFrame(() => {
        // Force browser to acknowledge the removal of properties
        const width = window.innerWidth;
        log(MODULE, 'Resetting ST Chassis for width: ' + width);
        window.dispatchEvent(new Event('resize'));
        
        // V2: If ST still hasn't reset, we manually trigger the specific 
        // function SillyTavern uses to set sheld width from the slider.
        if (window.printMessages) { 
            // printMessages is a core ST function; calling it often triggers 
            // a logic check on message container widths.
            window.printMessages(); 
        }
    });
}