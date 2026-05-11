/**
 * @file mobilyze/settings.js
 * @stamp 2024-03-20T18:00:00Z
 * @architectural-role Stateful / IO — Manages configuration state and settings UI.
 * @description
 * Handles the lifecycle of extension settings, including default merging, 
 * UI injection into the ST settings drawer, and persistence. Supports 
 * the toggle for avatar text-wrapping (reflow).
 *
 * @api-declaration
 * initSettings(onToggle, onDebugToggle, onSync) — Bootstraps settings and UI; handles state change callbacks.
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
    enabled:                true,
    autoHideDelay:          4000,
    debugLogging:           false,
    enableTextWrap:         true,
    showJumpPill:           true,
    autoHideOnTallScreens:  true,
    pullTabVisibility:      'standard',
    enableScrollReveal:     true,
    enableEdgeSwipe:        true,
    enablePullTab:          true,
};

/**
 * Returns the authoritative settings object for this extension.
 * @returns {object}
 */
export function getSettings() {
    return extension_settings[EXT_NAME];
}

/**
 * Writes the current pullTabVisibility value to the body attribute so CSS
 * can react immediately. Safe to call before the pull-tab element exists.
 */
export function applyPullTabVisibility() {
    document.body.setAttribute('data-mobilyze-tab-viz', getSettings().pullTabVisibility);
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
            <label class="checkbox_label flexGap5" title="Allow message text to flow under avatars">
                <input type="checkbox" id="mobilyze-wrap">
                <span>Enable text wrapping under avatars</span>
            </label>
            <label class="checkbox_label flexGap5" title="Floating up/down buttons on the side of the chat that let you step through messages one at a time">
                <input type="checkbox" id="mobilyze-jumppill">
                <span>Show message navigation buttons</span>
            </label>
            <small class="mobilyze-hint" style="margin-top:8px;margin-bottom:2px;opacity:0.8;font-weight:bold;">At least one reveal method is required</small>
            <label class="checkbox_label flexGap5" title="Scroll up in chat to show the menu bar">
                <input type="checkbox" id="mobilyze-scroll-reveal">
                <span>Scroll up to reveal</span>
            </label>
            <label class="checkbox_label flexGap5" title="Swipe down from the top edge of the screen to show the menu bar (touch only)">
                <input type="checkbox" id="mobilyze-edge-swipe">
                <span>Edge swipe to reveal</span>
            </label>
            <label class="checkbox_label flexGap5" title="Show a drag handle at the top of the screen when the menu bar is hidden">
                <input type="checkbox" id="mobilyze-pull-tab-enable">
                <span>Show pull-tab</span>
            </label>
            <label class="checkbox_label flexGap5" title="Apply the auto-hiding menu bar behavior even on tall (desktop-sized) screens">
                <input type="checkbox" id="mobilyze-tall-autohide">
                <span>Auto-hide Menu on tall screens</span>
            </label>
            <div class="range-block">
                <div class="range-block-title">Auto-hide delay</div>
                <div class="range-block-range">
                    <input type="range" id="mobilyze-delay" min="1000" max="10000" step="500">
                    <span id="mobilyze-delay-counter" class="range-block-counter"></span>
                    <span class="range-block-suffix">ms</span>
                </div>
            </div>
            <div class="flex-container flexFlowColumn flexGap5" style="margin-top: 8px;">
                <label for="mobilyze-tab-visibility" class="flexGap5">
                    <span>Pull-tab visibility</span>
                </label>
                <select id="mobilyze-tab-visibility" class="text_pole">
                    <option value="standard">Standard</option>
                    <option value="subtle">Subtle</option>
                </select>                
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
 * Returns the number of menu reveal triggers that are currently enabled.
 * Used to enforce the lockout rule: at least one trigger must stay on.
 * @param {object} s
 * @returns {number}
 */
function enabledTriggerCount(s) {
    return (s.enableScrollReveal ? 1 : 0)
         + (s.enableEdgeSwipe   ? 1 : 0)
         + (s.enablePullTab     ? 1 : 0);
}

/**
 * Initializes settings state and binds UI event listeners.
 * @param {Function} onToggle - Callback triggered when the 'enabled' state changes.
 * @param {Function} onDebugToggle - Callback triggered when 'debugLogging' state changes.
 * @param {Function} onSync - Callback triggered when layout-affecting toggles (like wrap) change.
 */
export async function initSettings(onToggle, onDebugToggle, onSync) {
    // Merge defaults
    extension_settings[EXT_NAME]                          ??= {};
    extension_settings[EXT_NAME].enabled                  ??= DEFAULTS.enabled;
    extension_settings[EXT_NAME].autoHideDelay            ??= DEFAULTS.autoHideDelay;
    extension_settings[EXT_NAME].debugLogging             ??= DEFAULTS.debugLogging;
    extension_settings[EXT_NAME].enableTextWrap           ??= DEFAULTS.enableTextWrap;
    extension_settings[EXT_NAME].showJumpPill             ??= DEFAULTS.showJumpPill;
    extension_settings[EXT_NAME].autoHideOnTallScreens    ??= DEFAULTS.autoHideOnTallScreens;
    extension_settings[EXT_NAME].pullTabVisibility        ??= DEFAULTS.pullTabVisibility;
    extension_settings[EXT_NAME].enableScrollReveal       ??= DEFAULTS.enableScrollReveal;
    extension_settings[EXT_NAME].enableEdgeSwipe          ??= DEFAULTS.enableEdgeSwipe;
    extension_settings[EXT_NAME].enablePullTab            ??= DEFAULTS.enablePullTab;

    injectSettingsPanel();

    const $enabled       = $('#mobilyze-enabled');
    const $wrap          = $('#mobilyze-wrap');
    const $jumppill      = $('#mobilyze-jumppill');
    const $scrollReveal  = $('#mobilyze-scroll-reveal');
    const $edgeSwipe     = $('#mobilyze-edge-swipe');
    const $pullTabEnable = $('#mobilyze-pull-tab-enable');
    const $delay         = $('#mobilyze-delay');
    const $delayCounter  = $('#mobilyze-delay-counter');
    const $tallAutohide  = $('#mobilyze-tall-autohide');
    const $tabViz        = $('#mobilyze-tab-visibility');
    const $debug         = $('#mobilyze-debug');
    const settings       = getSettings();

    // Sync UI to state
    $enabled.prop('checked', settings.enabled);
    $wrap.prop('checked', settings.enableTextWrap);
    $jumppill.prop('checked', settings.showJumpPill);
    $scrollReveal.prop('checked', settings.enableScrollReveal);
    $edgeSwipe.prop('checked', settings.enableEdgeSwipe);
    $pullTabEnable.prop('checked', settings.enablePullTab);
    $delay.val(settings.autoHideDelay);
    $delayCounter.text(settings.autoHideDelay);
    $tallAutohide.prop('checked', settings.autoHideOnTallScreens);
    $tabViz.val(settings.pullTabVisibility);
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

    $wrap.on('change', function () {
        settings.enableTextWrap = this.checked;
        log(MODULE, 'Text wrap toggled', { enabled: settings.enableTextWrap });
        saveSettingsDebounced();
        if (typeof onSync === 'function') onSync();
    });

    $jumppill.on('change', function () {
        settings.showJumpPill = this.checked;
        log(MODULE, 'Jump pill toggled', { enabled: settings.showJumpPill });
        saveSettingsDebounced();
        if (typeof onSync === 'function') onSync();
    });

    $scrollReveal.on('change', function () {
        if (!this.checked && enabledTriggerCount(settings) <= 1) {
            this.checked = true;
            return;
        }
        settings.enableScrollReveal = this.checked;
        log(MODULE, 'Scroll reveal toggled', { enabled: settings.enableScrollReveal });
        saveSettingsDebounced();
        if (typeof onSync === 'function') onSync();
    });

    $edgeSwipe.on('change', function () {
        if (!this.checked && enabledTriggerCount(settings) <= 1) {
            this.checked = true;
            return;
        }
        settings.enableEdgeSwipe = this.checked;
        log(MODULE, 'Edge swipe toggled', { enabled: settings.enableEdgeSwipe });
        saveSettingsDebounced();
        if (typeof onSync === 'function') onSync();
    });

    $pullTabEnable.on('change', function () {
        if (!this.checked && enabledTriggerCount(settings) <= 1) {
            this.checked = true;
            return;
        }
        settings.enablePullTab = this.checked;
        log(MODULE, 'Pull-tab enable toggled', { enabled: settings.enablePullTab });
        saveSettingsDebounced();
        if (typeof onSync === 'function') onSync();
    });

    $delay.on('input', function () {
        const val = Number(this.value);
        settings.autoHideDelay = val;
        $delayCounter.text(val);
        saveSettingsDebounced();
    });

    $tallAutohide.on('change', function () {
        settings.autoHideOnTallScreens = this.checked;
        log(MODULE, 'Tall-screen auto-hide toggled', { enabled: settings.autoHideOnTallScreens });
        saveSettingsDebounced();
        if (typeof onSync === 'function') onSync();
    });

    $tabViz.on('change', function () {
        settings.pullTabVisibility = this.value;
        log(MODULE, 'Pull-tab visibility changed', { value: settings.pullTabVisibility });
        saveSettingsDebounced();
        applyPullTabVisibility();
    });

    $debug.on('change', function () {
        settings.debugLogging = this.checked;
        saveSettingsDebounced();
        if (typeof onDebugToggle === 'function') {
            onDebugToggle(settings.debugLogging);
        }
    });
}