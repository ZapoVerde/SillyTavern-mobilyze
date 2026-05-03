/**
 * @file mobilyze/logger.js
 * @stamp 2024-03-20T10:00:00Z
 * @architectural-role IO — Centralizes and structures all diagnostic output.
 * @description
 * Implements a structured logging interface that replaces raw console calls. 
 * Supports verbose and error-only modes to maintain observability without 
 * polluting the production console unless necessary.
 *
 * @api-declaration
 * log(module, event, data) — Logs an informational event if verbose mode is enabled.
 * warn(module, event, data) — Logs a warning event.
 * error(module, event, data) — Logs a failure event.
 * setVerbose(boolean) — Toggles the visibility of informational logs.
 *
 * @contract
 *   assertions:
 *     purity:        IO (Console side effects)
 *     state_ownership: [internal log level]
 *     external_io:   [console]
 */

'use strict';

const PREFIX = 'Mobilyze';

let _verbose = false;

/**
 * Formats and outputs the log entry to the console.
 * @param {string} level - 'log' | 'warn' | 'error'
 * @param {string} module - The originating sub-module name
 * @param {string} event - Short description of the event
 * @param {any} data - Associated data or metadata
 */
function _emit(level, module, event, data) {
    const entry = {
        timestamp: new Date().toISOString(),
        extension: PREFIX,
        module:    module.toUpperCase(),
        event:     event,
        data:      data,
    };

    // Use standard console methods for the actual IO
    // eslint-disable-next-line no-console
    console[level](`[${PREFIX}:${entry.module}] ${event}`, entry);
}

/**
 * Sets whether informational logs are emitted.
 * @param {boolean} value 
 */
export function setVerbose(value) {
    _verbose = !!value;
}

/**
 * Emits an informational log if verbose mode is active.
 */
export function log(module, event, data = {}) {
    if (!_verbose) return;
    _emit('log', module, event, data);
}

/**
 * Emits a warning log.
 */
export function warn(module, event, data = {}) {
    _emit('warn', module, event, data);
}

/**
 * Emits an error log.
 */
export function error(module, event, data = {}) {
    _emit('error', module, event, data);
}