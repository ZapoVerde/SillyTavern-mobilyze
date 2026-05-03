/**
 * @file mobilyze/settings.js
 * @stamp 2024-03-20T10:30:00Z
 * @architectural-role Stateful / IO — Manages configuration state and settings UI.
 * @description
 * Handles the lifecycle of extension settings, including default merging, 
 * UI injection into the ST settings drawer, and persistence via SillyTavern's
 * native save mechanism.
 *
 * @api-declaration
 * initSettings(onToggle, onDebugToggle) — Bootstraps settings and UI; handles state change callbacks.
 * getSettings() — Returns the current configuration object.
 *
 * @contract
 *   assertions:
 *     purity:        Stateful (wraps extension_settings)
 *     state_ownership: [extension_settings.mobilyze]
 *     external_io:   [DOM injection, saveSettingsDebounced]
 */

'use strict';

import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings }    from '../../../extensions.js';
import { log }                   from './logger.js';

const MODULE    = 'settings';
const EXT_NAME  = 'mobilyze';

const DEFAULTS = {
    enabled:       true,
    autoHideDelay: 4000,
    debugLogging:  false,
};

/**
 * Returns the authoritative settings object for this extension.
 * @returns {object}
 */
export function getSettings() {
    return extension_settings[EXT_NAME];
}

/**
 * Injects the HTML settings panel into the SillyTavern extensions drawer.
 */
function injectSettingsPanel() {
    const html = `
<div id="mobilyze-settings" class="extension_settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Mobilyze</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <label class="checkbox_label flexGap5" title="Force full-screen mobile layout and auto-hiding top bar">
                <input type="checkbox" id="mobilyze-enabled">
                <span>Enable mobile layout</span>
            </label>
            <div class="range-block">
                <div class="range-block-title">Auto-hide delay</div>
                <div class="range-block-range">
                    <input type="range" id="mobilyze-delay" min="1000" max="10000" step="500">
                    <span id="mobilyze-delay-counter" class="range-block-counter"></span>
                    <span class="range-block-suffix">ms</span>
                </div>
            </div>
            <label class="checkbox_label flexGap5" title="Enable verbose logging in the browser console">
                <input type="checkbox" id="mobilyze-debug">
                <span>Enable debug logging</span>
            </label>
            <small class="mobilyze-hint">
                Drag the handle at the top of the screen, or scroll up in chat, to show the menu bar.
            </small>
        </div>
    </div>
</div>`;
    $('#extensions_settings').append(html);
    log(MODULE, 'Settings panel injected');
}

/**
 * Initializes settings state and binds UI event listeners.
 * @param {Function} onToggle - Callback triggered when the 'enabled' state changes.
 * @param {Function} onDebugToggle - Callback triggered when 'debugLogging' state changes.
 */
export async function initSettings(onToggle, onDebugToggle) {
    // Merge defaults
    extension_settings[EXT_NAME]               ??= {};
    extension_settings[EXT_NAME].enabled       ??= DEFAULTS.enabled;
    extension_settings[EXT_NAME].autoHideDelay ??= DEFAULTS.autoHideDelay;
    extension_settings[EXT_NAME].debugLogging  ??= DEFAULTS.debugLogging;

    injectSettingsPanel();

    const $enabled      = $('#mobilyze-enabled');
    const $delay        = $('#mobilyze-delay');
    const $delayCounter = $('#mobilyze-delay-counter');
    const $debug        = $('#mobilyze-debug');
    const settings      = getSettings();

    // Sync UI to state
    $enabled.prop('checked', settings.enabled);
    $delay.val(settings.autoHideDelay);
    $delayCounter.text(settings.autoHideDelay);
    $debug.prop('checked', settings.debugLogging);

    // Bind listeners
    $enabled.on('change', function () {
        settings.enabled = this.checked;
        log(MODULE, 'Extension toggled', { enabled: settings.enabled });
        saveSettingsDebounced();
        if (typeof onToggle === 'function') {
            onToggle(settings.enabled);
        }
    });

    $delay.on('input', function () {
        const val = Number(this.value);
        settings.autoHideDelay = val;
        $delayCounter.text(val);
        saveSettingsDebounced();
    });

    $debug.on('change', function () {
        settings.debugLogging = this.checked;
        saveSettingsDebounced();
        if (typeof onDebugToggle === 'function') {
            onDebugToggle(settings.debugLogging);
        }
    });
}