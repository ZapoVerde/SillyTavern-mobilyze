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
import { log, warn }                from './logger.js';

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

    log(MODULE, 'Disabled states updated', { hasUp, hasDown });
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
    const anchorY = chatTop + VIEWPORT_TOP_THRESHOLD;
    const target  = mes.find(m => m.getBoundingClientRect().top > anchorY);
    if (!target) return;

    const top = chat.scrollTop + target.getBoundingClientRect().top - chatTop - SCROLL_PAD;
    log(MODULE, 'Step down', { index: mes.indexOf(target), top });
    chat.scrollTo({ top, behavior: 'smooth' });
}

// ─── DOM ─────────────────────────────────────────────────────────────────────

function buildPill() {
    const pill = document.createElement('div');
    pill.id = PILL_ID;
    pill.setAttribute('role', 'group');
    pill.setAttribute('aria-label', 'Jump between messages');

    const upBtn = document.createElement('button');
    upBtn.className = 'mobilyze-jump-btn';
    upBtn.dataset.direction = 'up';
    upBtn.setAttribute('aria-label', 'Jump to previous message');
    upBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    upBtn.addEventListener('click', stepUp);

    const downBtn = document.createElement('button');
    downBtn.className = 'mobilyze-jump-btn';
    downBtn.dataset.direction = 'down';
    downBtn.setAttribute('aria-label', 'Jump to next message');
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

    warn(MODULE, `[SYNC] enabled=${settings.enabled} showJumpPill=${settings.showJumpPill} pillExists=${!!_pill}`);

    if (!settings.enabled) {
        if (_pill) { _pill.remove(); _pill = null; }
        document.body.classList.remove('mobilyze-jump-pill-hidden');
        warn(MODULE, '[SYNC] returning early — extension disabled');
        return;
    }

    if (!_pill) {
        _pill = buildPill();
        document.body.appendChild(_pill);
        warn(MODULE, '[SYNC] pill created and appended to body');
    } else {
        warn(MODULE, '[SYNC] pill already exists — skipping creation');
    }

    const chat = document.getElementById('chat');
    if (chat) {
        // clientWidth excludes the scrollbar — this gives the content right edge
        const contentRight  = chat.getBoundingClientRect().left + chat.clientWidth;
        const rightOffset   = Math.max(0, window.innerWidth - contentRight);
        _pill.style.right   = `${rightOffset}px`;
        document.documentElement.style.setProperty('--mobilyze-pill-right', `${rightOffset}px`);
        warn(MODULE, `[SYNC] innerWidth=${window.innerWidth} contentRight=${contentRight} rightOffset=${rightOffset}`);
        const pr = _pill.getBoundingClientRect();
        warn(MODULE, `[SYNC] pill rect: left=${pr.left.toFixed(1)} right=${pr.right.toFixed(1)} top=${pr.top.toFixed(1)} bottom=${pr.bottom.toFixed(1)} inView=${pr.left>=0 && pr.right<=window.innerWidth}`);
        const rightD = chat.querySelector('.swipeRightBlock');
        if (rightD) {
            const dr = rightD.getBoundingClientRect();
            warn(MODULE, `[SYNC] rightD rect: left=${dr.left.toFixed(1)} right=${dr.right.toFixed(1)} top=${dr.top.toFixed(1)} bottom=${dr.bottom.toFixed(1)}`);
        } else {
            warn(MODULE, '[SYNC] rightD: not found (no messages or wrap disabled)');
        }
    }

    const willHide  = !settings.showJumpPill;
    const hasActive = document.body.classList.contains('mobilyze-active');
    document.body.classList.toggle('mobilyze-jump-pill-hidden', willHide);
    const computedDisplay = _pill ? getComputedStyle(_pill).display : 'n/a';
    warn(MODULE, `[SYNC] willHide=${willHide} hasActive=${hasActive} computedDisplay=${computedDisplay} right=${_pill?.style.right}`);

    recomputeDisabledStates();
}

export function activateJumpPill() {
    warn(MODULE, '[STEP] activateJumpPill() called');
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

    warn(MODULE, '[STEP] activateJumpPill() complete');
}

export function deactivateJumpPill() {
    warn(MODULE, '[STEP] deactivateJumpPill() called');

    if (_pill) { _pill.remove(); _pill = null; }

    if (_chatObserver) { _chatObserver.disconnect(); _chatObserver = null; }

    const chat = document.getElementById('chat');
    if (chat) chat.removeEventListener('scroll', scheduleRecompute);

    eventSource.removeListener(event_types.MESSAGE_RECEIVED, _onMessageMutation);
    eventSource.removeListener(event_types.MESSAGE_DELETED,  _onMessageMutation);
    eventSource.removeListener(event_types.MESSAGE_SWIPED,   _onMessageMutation);

    if (_rafToken !== null) { cancelAnimationFrame(_rafToken); _rafToken = null; }

    document.body.classList.remove('mobilyze-jump-pill-hidden');
    warn(MODULE, '[STEP] deactivateJumpPill() complete');
}
