/**
 * @file mobilyze/jump-pill.js
 * @stamp 2026-05-11T00:00:00Z
 * @architectural-role IO / Stateful — Owns the jump-pill DOM and scroll-stepping state.
 * @description
 * Provides a persistent floating pill on the right edge of the chat that lets
 * users step sequentially through message boundaries. The up button scrolls to
 * the top of the previous message; the down button to the top of the next.
 * Disabled states are recomputed on every scroll, resize, and message mutation.
 *
 * @api-declaration
 * activateJumpPill()   — Creates the pill, attaches listeners, runs initial state sync.
 * deactivateJumpPill() — Removes the pill, detaches listeners, disconnects observer.
 * syncJumpPill()       — Re-evaluates whether the pill should exist (settings + viewport gating).
 *
 * @contract
 *   assertions:
 *     purity:        IO / Stateful (DOM and event state)
 *     state_ownership: [pill DOM, chat MutationObserver, rAF token]
 *     external_io:   [document.body, #chat scroll, window resize, eventSource]
 */

'use strict';

import { eventSource, event_types } from '../../../../script.js';
import { getSettings }              from './settings.js';
import { log }                      from './logger.js';
import { translate }                from '../../../i18n.js';

const MODULE             = 'pill';
const PILL_ID            = 'mobilyze-jump-pill';
const SCROLL_PAD         = 8;
const VIEWPORT_TOP_THRESHOLD = 4;

let _pill         = null;
let _chatObserver = null;
let _rafToken     = null;

// ─── Disabled State ──────────────────────────────────────────────────────────

function scheduleRecompute() {
    if (_rafToken !== null) return;
    _rafToken = requestAnimationFrame(() => {
        _rafToken = null;
        recomputeDisabledStates();
    });
}

function recomputeDisabledStates() {
    if (!_pill) return;
    const chat = document.getElementById('chat');
    if (!chat) return;

    const mes     = [...chat.querySelectorAll('.mes')];
    const chatTop = chat.getBoundingClientRect().top;
    const anchorY = chatTop + VIEWPORT_TOP_THRESHOLD;

    const hasUp   = mes.some(m => m.getBoundingClientRect().top < chatTop);
    const hasDown = mes.some(m => m.getBoundingClientRect().top > anchorY);

    _pill.querySelector('[data-direction="up"]').toggleAttribute('disabled', !hasUp);
    _pill.querySelector('[data-direction="down"]').toggleAttribute('disabled', !hasDown);
}

// ─── Stepping ────────────────────────────────────────────────────────────────

function stepUp() {
    const chat = document.getElementById('chat');
    if (!chat) return;

    const mes     = [...chat.querySelectorAll('.mes')];
    const chatTop = chat.getBoundingClientRect().top;
    let   target  = null;

    for (let i = mes.length - 1; i >= 0; i--) {
        if (mes[i].getBoundingClientRect().top < chatTop) { target = mes[i]; break; }
    }
    if (!target) return;

    const top = chat.scrollTop + target.getBoundingClientRect().top - chatTop - SCROLL_PAD;
    log(MODULE, 'Step up', { index: mes.indexOf(target), top });
    chat.scrollTo({ top, behavior: 'smooth' });
}

function stepDown() {
    const chat = document.getElementById('chat');
    if (!chat) return;

    const mes     = [...chat.querySelectorAll('.mes')];
    const chatTop = chat.getBoundingClientRect().top;

    // Find the last message whose top is at or near chatTop (the "current" top message).
    // +1px tolerance absorbs sub-pixel rendering drift from stepUp's snap target.
    // Without this, a message snapped to chatTop+SCROLL_PAD at 8.2px re-selects itself
    // and produces a ~0px scroll.
    let atTopIdx = -1;
    for (let i = 0; i < mes.length; i++) {
        if (mes[i].getBoundingClientRect().top <= chatTop + SCROLL_PAD + 1) atTopIdx = i;
        else break;
    }

    const target = mes[atTopIdx + 1];
    if (!target) {
        chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
        return;
    }

    const top = chat.scrollTop + target.getBoundingClientRect().top - chatTop - SCROLL_PAD;
    log(MODULE, 'Step down', { index: atTopIdx + 1, top });
    chat.scrollTo({ top, behavior: 'smooth' });
}

// ─── DOM ─────────────────────────────────────────────────────────────────────

function buildPill() {
    const pill = document.createElement('div');
    pill.id = PILL_ID;
    pill.setAttribute('role', 'group');
    pill.setAttribute('aria-label', translate('Jump between messages', 'mobilyze.jump_pill.group_label'));

    const upBtn = document.createElement('button');
    upBtn.className = 'mobilyze-jump-btn';
    upBtn.dataset.direction = 'up';
    upBtn.setAttribute('aria-label', translate('Jump to previous message', 'mobilyze.jump_pill.btn_up'));
    upBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    upBtn.addEventListener('click', stepUp);

    const downBtn = document.createElement('button');
    downBtn.className = 'mobilyze-jump-btn';
    downBtn.dataset.direction = 'down';
    downBtn.setAttribute('aria-label', translate('Jump to next message', 'mobilyze.jump_pill.btn_down'));
    downBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    downBtn.addEventListener('click', stepDown);

    pill.append(upBtn, downBtn);
    return pill;
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function _onMessageMutation() { scheduleRecompute(); }

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export function syncJumpPill() {
    const settings = getSettings();

    if (!settings.enabled) {
        if (_pill) { _pill.remove(); _pill = null; }
        document.body.classList.remove('mobilyze-jump-pill-hidden');
        return;
    }

    if (!_pill) {
        _pill = buildPill();
        document.body.appendChild(_pill);
    }

    const chat = document.getElementById('chat');
    if (chat) {
        // clientWidth excludes the scrollbar — this gives the content right edge
        const contentRight  = chat.getBoundingClientRect().left + chat.clientWidth;
        const rightOffset   = Math.max(0, window.innerWidth - contentRight);
        _pill.style.right   = `${rightOffset}px`;
        document.documentElement.style.setProperty('--mobilyze-pill-right', `${rightOffset}px`);

        // CSS `top: 50%` breaks when a CSS transform on <body>/<html> creates a new
        // containing block for position:fixed. Fix: compute the Y position in JS and
        // correct for the containing block's actual viewport offset.
        const PILL_HEIGHT   = 58;
        const targetVpTop   = Math.round(window.innerHeight * 0.5 - PILL_HEIGHT / 2);
        const bodyTop       = document.body.getBoundingClientRect().top;
        _pill.style.top     = `${Math.round(targetVpTop - bodyTop)}px`;
        _pill.style.bottom  = 'auto';
    }

    document.body.classList.toggle('mobilyze-jump-pill-hidden', !settings.showJumpPill);

    recomputeDisabledStates();
}

export function activateJumpPill() {
    syncJumpPill();

    const chat = document.getElementById('chat');
    if (chat) {
        chat.addEventListener('scroll', scheduleRecompute, { passive: true });

        _chatObserver = new MutationObserver(scheduleRecompute);
        _chatObserver.observe(chat, { childList: true, subtree: false });
    }

    eventSource.on(event_types.MESSAGE_RECEIVED, _onMessageMutation);
    eventSource.on(event_types.MESSAGE_DELETED,  _onMessageMutation);
    eventSource.on(event_types.MESSAGE_SWIPED,   _onMessageMutation);
}

export function deactivateJumpPill() {
    if (_pill) { _pill.remove(); _pill = null; }

    if (_chatObserver) { _chatObserver.disconnect(); _chatObserver = null; }

    const chat = document.getElementById('chat');
    if (chat) chat.removeEventListener('scroll', scheduleRecompute);

    eventSource.removeListener(event_types.MESSAGE_RECEIVED, _onMessageMutation);
    eventSource.removeListener(event_types.MESSAGE_DELETED,  _onMessageMutation);
    eventSource.removeListener(event_types.MESSAGE_SWIPED,   _onMessageMutation);

    if (_rafToken !== null) { cancelAnimationFrame(_rafToken); _rafToken = null; }

    document.body.classList.remove('mobilyze-jump-pill-hidden');
}
