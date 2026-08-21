(() => {
  'use strict';

  const DEAD_ZONE = 0.28;
  const CURSOR_SPEED = 820;
  const REPEAT_DELAY = 320;
  const REPEAT_RATE = 110;
  const path = location.pathname;
  const cursorGames = new Set(['/2d/goblins.html', '/2d/goblins2.html']);
  const cursorEnabled = cursorGames.has(path);
  const held = new Map();
  let cursor;
  let notice;
  let cursorX = innerWidth / 2;
  let cursorY = innerHeight / 2;
  let lastFrame = performance.now();
  let connectedCount = 0;

  const profile = (() => {
    if (path === '/2d/pong.html') return { players: 2, primary: null, secondary: null, pause: 'p', restart: 'r' };
    if (path === '/2d/paper.html') return { primary: 'Enter', secondary: 'z', pause: null, restart: null };
    if (path === '/2d/minesweeper.html') return { primary: 'Enter', secondary: 'Control', pause: null, restart: 'r' };
    if (path === '/2d/tic-tac-toe.html') return { primary: 'Enter', secondary: null, pause: null, restart: 'r' };
    if (path.includes('asteroids')) return { primary: ' ', secondary: 'Shift', pause: 'p', restart: 'r' };
    if (path.includes('platformer')) return { primary: ' ', secondary: 'Control', pause: 'p', restart: 'r' };
    return { primary: ' ', secondary: 'Control', pause: 'p', restart: 'r' };
  })();

  function keyboard(type, key, repeat = false) {
    if (!key) return;
    const code = key === ' ' ? 'Space' : key === 'Control' ? 'ControlLeft'
      : key === 'Shift' ? 'ShiftLeft' : key.length === 1 ? `Key${key.toUpperCase()}` : key;
    dispatchEvent(new KeyboardEvent(type, { key, code, repeat, bubbles: true, cancelable: true }));
  }

  function setKey(id, key, pressed, now, repeatable = true) {
    if (!key) return;
    const state = held.get(id);
    if (pressed && !state) {
      keyboard('keydown', key);
      held.set(id, { key, nextRepeat: now + REPEAT_DELAY });
    } else if (!pressed && state) {
      keyboard('keyup', state.key);
      held.delete(id);
    } else if (pressed && repeatable && now >= state.nextRepeat) {
      keyboard('keydown', key, true);
      state.nextRepeat = now + REPEAT_RATE;
    }
  }

  function clickAtCursor(button = 0) {
    const target = document.elementFromPoint(cursorX, cursorY);
    if (!target || (!target.closest('canvas') && cursorGames.has(path))) return;
    const options = { bubbles: true, cancelable: true, clientX: cursorX, clientY: cursorY, button };
    target.dispatchEvent(new PointerEvent('pointerdown', { ...options, pointerId: -1, pointerType: 'mouse' }));
    target.dispatchEvent(new PointerEvent('pointerup', { ...options, pointerId: -1, pointerType: 'mouse' }));
    target.dispatchEvent(new MouseEvent(button === 0 ? 'click' : 'contextmenu', options));
  }

  function ensureUi() {
    if (notice) return;
    const style = document.createElement('style');
    style.textContent = `
      .gamepad-cursor{position:fixed;z-index:2147483646;width:20px;height:20px;border:3px solid #fff;border-radius:50%;pointer-events:none;display:none;box-shadow:0 0 0 2px #111,0 0 12px #42e8ff;transform:translate(-50%,-50%)}
      .gamepad-notice{position:fixed;z-index:2147483647;left:50%;bottom:18px;transform:translateX(-50%);padding:8px 13px;border-radius:999px;color:#fff;background:#101827ed;font:600 12px/1.3 system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .2s}.gamepad-notice.show{opacity:1}
      .games-home{position:fixed;z-index:2147483645;top:14px;left:14px;display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border:1px solid #ffffff30;border-radius:999px;color:#fff;background:#101827d9;text-decoration:none;font:700 12px/1.2 system-ui,sans-serif;backdrop-filter:blur(8px);box-shadow:0 6px 24px #0004}.games-home:hover,.games-home:focus-visible{border-color:#72e9ff;color:#72e9ff;outline:none}`;
    document.head.append(style);
    if (path !== '/') {
      const home = document.createElement('a');
      home.className = 'games-home';
      home.href = '/';
      home.setAttribute('aria-label', 'Вернуться к выбору игр');
      home.textContent = '← Все игры';
      document.body.append(home);
    }
    if (cursorEnabled) {
      cursor = document.createElement('div');
      cursor.className = 'gamepad-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      document.body.append(cursor);
    }
    notice = document.createElement('div');
    notice.className = 'gamepad-notice';
    notice.setAttribute('role', 'status');
    document.body.append(notice);
  }

  function announce(count) {
    ensureUi();
    connectedCount = count;
    document.documentElement.dataset.gamepad = count ? 'connected' : 'disconnected';
    if (cursor) cursor.style.display = count ? 'block' : 'none';
    notice.textContent = count
      ? `${count > 1 ? `${count} геймпада подключены` : 'Геймпад подключён'} · A — действие · Start — пауза`
      : 'Геймпад отключён';
    notice.classList.add('show');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => notice.classList.remove('show'), 2200);
  }

  function axis(pad, index) {
    const value = pad.axes[index] || 0;
    return Math.abs(value) > DEAD_ZONE ? value : 0;
  }

  function direction(pad, name) {
    const x = axis(pad, 0), y = axis(pad, 1);
    return ({ left: x < 0 || pad.buttons[14]?.pressed, right: x > 0 || pad.buttons[15]?.pressed,
      up: y < 0 || pad.buttons[12]?.pressed, down: y > 0 || pad.buttons[13]?.pressed })[name];
  }

  function processPad(pad, player, now) {
    if (profile.players === 2) {
      const up = player === 0 ? 'w' : 'ArrowUp';
      const down = player === 0 ? 's' : 'ArrowDown';
      setKey(`${player}:up`, up, direction(pad, 'up'), now);
      setKey(`${player}:down`, down, direction(pad, 'down'), now);
    } else {
      for (const [name, key] of Object.entries({ left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }))
        setKey(`${player}:${name}`, key, direction(pad, name), now);
    }
    setKey(`${player}:a`, profile.primary, Boolean(pad.buttons[0]?.pressed), now, false);
    setKey(`${player}:b`, profile.secondary, Boolean(pad.buttons[1]?.pressed), now, false);
    setKey(`${player}:pause`, profile.pause, Boolean(pad.buttons[9]?.pressed), now, false);
    setKey(`${player}:restart`, profile.restart, Boolean(pad.buttons[3]?.pressed), now, false);
    const home = Boolean(pad.buttons[7]?.pressed);
    const homeId = `${player}:home`;
    if (home && !held.has(homeId)) {
      held.set(homeId, { key: null, nextRepeat: Infinity });
      document.querySelector('.games-home')?.click();
    } else if (!home) held.delete(homeId);
    const click = Boolean(pad.buttons[0]?.pressed);
    const clickId = `${player}:cursor-click`;
    if (cursorEnabled && click && !held.has(clickId)) { held.set(clickId, { key: null, nextRepeat: Infinity }); clickAtCursor(); }
    else if (!click) held.delete(clickId);
  }

  function frame(now) {
    const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
    if (pads.length !== connectedCount) announce(pads.length);
    const dt = Math.min((now - lastFrame) / 1000, .05);
    if (pads[0] && cursorEnabled) {
      cursorX = Math.max(0, Math.min(innerWidth - 1, cursorX + axis(pads[0], 0) * CURSOR_SPEED * dt));
      cursorY = Math.max(0, Math.min(innerHeight - 1, cursorY + axis(pads[0], 1) * CURSOR_SPEED * dt));
      cursor.style.left = `${cursorX}px`; cursor.style.top = `${cursorY}px`;
    }
    pads.slice(0, profile.players || 1).forEach((pad, index) => processPad(pad, index, now));
    dispatchEvent(new CustomEvent('gamepad-controls:input', { detail: { pads } }));
    if (!pads.length && held.size) releaseAll();
    lastFrame = now;
    requestAnimationFrame(frame);
  }

  function releaseAll() {
    held.forEach((state) => { if (state.key) keyboard('keyup', state.key); });
    held.clear();
  }

  addEventListener('blur', releaseAll);
  addEventListener('DOMContentLoaded', () => { ensureUi(); requestAnimationFrame(frame); }, { once: true });
})();
