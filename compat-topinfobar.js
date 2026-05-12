/**
 * @file mobilyze/compat-topinfobar.js
 * @stamp 2026-05-12T00:00:00Z
 * @architectural-role IO — Compatibility shim for Extension-TopInfoBar.
 * @description
 * Addresses layout issues caused by the TopInfoBar extension injecting
 * #extensionTopBar into #sheld after mobilyze has already activated.
 *
 * Problems handled here:
 *   1. Late injection — TopInfoBar injects asynchronously, after mobilyze's
 *      activation window. The initial syncSheldPreamble() reads 0px because
 *      #extensionTopBar doesn't exist yet. A MutationObserver on #sheld fires
 *      syncSheldPreamble() the moment the element appears.
 *
 *   2. Height changes on narrow screens — TopInfoBar uses flex-wrap: wrap on
 *      #extensionTopBar, which can cause it to grow taller than one row on
 *      narrow viewports. A ResizeObserver re-syncs the preamble whenever its
 *      rendered height changes.
 *
 * Known TopInfoBar bugs NOT fixed here (flagged for upstream):
 *   - #extensionTopBar has a fixed height: var(--bottomFormBlockSize) combined
 *     with flex-wrap: wrap, causing visual overflow rather than the element
 *     growing to contain wrapped content.
 *
 * @api-declaration
 * initTopInfoBarCompat()    — Starts observers. Safe to call if TopInfoBar is absent.
 * destroyTopInfoBarCompat() — Disconnects all observers.
 *
 * @contract
 *   assertions:
 *     purity:        IO (MutationObserver, ResizeObserver)
 *     state_ownership: [_sheldObserver, _resizeObserver]
 *     external_io:   [#sheld childList, #extensionTopBar resize]
 */

'use strict';

import { syncSheldPreamble } from './layout-manager.js';
import { log }               from './logger.js';

const MODULE = 'compat-tib';

let _sheldObserver  = null;
let _resizeObserver = null;

function attachResizeObserver() {
    const bar = document.getElementById('extensionTopBar');
    if (!bar || _resizeObserver) return;

    _resizeObserver = new ResizeObserver(() => {
        syncSheldPreamble();
        log(MODULE, '#extensionTopBar height changed — preamble re-synced');
    });
    _resizeObserver.observe(bar);
    log(MODULE, 'ResizeObserver attached to #extensionTopBar');
}

export function initTopInfoBarCompat() {
    const sheld = document.getElementById('sheld');
    if (!sheld) return;

    // TopInfoBar may have already injected before we activated
    if (document.getElementById('extensionTopBar')) {
        syncSheldPreamble();
        attachResizeObserver();
    }

    // Watch for late injection
    _sheldObserver = new MutationObserver(() => {
        if (!document.getElementById('extensionTopBar')) return;
        syncSheldPreamble();
        attachResizeObserver();
        log(MODULE, '#extensionTopBar detected — preamble synced and ResizeObserver attached');
    });

    _sheldObserver.observe(sheld, { childList: true });
    log(MODULE, 'TopInfoBar compat initialized');
}

export function destroyTopInfoBarCompat() {
    if (_sheldObserver) {
        _sheldObserver.disconnect();
        _sheldObserver = null;
    }
    if (_resizeObserver) {
        _resizeObserver.disconnect();
        _resizeObserver = null;
    }
    log(MODULE, 'TopInfoBar compat destroyed');
}
