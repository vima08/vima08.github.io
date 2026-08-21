(() => {
  'use strict';

  const DEAD_ZONE = 0.28;
  const CURSOR_SPEED = 820;
  const REPEAT_DELAY = 320;
  const REPEAT_RATE = 110;
  const buttonKeys = new Map([
    [0, ' '],       // A: primary action / jump / fire
    [1, 'Control'], // B: secondary action / fire
    [2, 'Enter'],   // X: confirm
    [3, 'r'],       // Y: restart
    [4, 'z'],       // LB: undo
    [5, 'p'],       // RB: pause
    [8, 'Escape'],  // Back
    [9, 'Enter'],   // Start
  ]);
  const directionKeys = new Map([
    ['left', 'ArrowLeft'], ['right', 'ArrowRight'],
    ['up', 'ArrowUp'], ['down', 'ArrowDown'],
  ]);
  const held = new Map();
  let cursor;
  let notice;
  let cursorX = innerWidth / 2;
  let cursorY = innerHeight / 2;
  let lastFrame = performance.now();
  let connected = false;

  function keyboard(type, key, repeat = false) {
    const code = key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key;
    dispatchEvent(new KeyboardEvent(type, {
      key, code, repeat, bubbles: true, cancelable: true,
    }));
  }

  function setKey(key, pressed, now) {
    const state = held.get(key);
    if (pressed && !state) {
      keyboard('keydown', key);
      held.set(key, { nextRepeat: now + REPEAT_DELAY });
    } else if (!pressed && state) {
      keyboard('keyup', key);
      held.delete(key);
    } else if (pressed && now >= state.nextRepeat) {
      keyboard('keydown', key, true);
      state.nextRepeat = now + REPEAT_RATE;
    }
  }

  function clickAtCursor(button = 0) {
    const target = document.elementFromPoint(cursorX, cursorY);
    if (!target) return;
    const options = { bubbles: true, cancelable: true, clientX: cursorX, clientY: cursorY, button };
    target.dispatchEvent(new PointerEvent('pointerdown', { ...options, pointerId: -1, pointerType: 'mouse' }));
    target.dispatchEvent(new PointerEvent('pointerup', { ...options, pointerId: -1, pointerType: 'mouse' }));
    if (button === 0) target.dispatchEvent(new MouseEvent('click', options));
    else target.dispatchEvent(new MouseEvent('contextmenu', options));
  }

  function ensureUi() {
    if (cursor) return;
    const style = document.createElement('style');
    style.textContent = `
      .gamepad-cursor{position:fixed;z-index:2147483646;width:20px;height:20px;border:3px solid #fff;border-radius:50%;pointer-events:none;display:none;box-shadow:0 0 0 2px #111,0 0 12px #42e8ff;transform:translate(-50%,-50%)}
      .gamepad-notice{position:fixed;z-index:2147483647;left:50%;bottom:18px;transform:translateX(-50%);padding:8px 13px;border-radius:999px;color:#fff;background:#101827dc;font:600 12px/1.3 system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .2s}.gamepad-notice.show{opacity:1}`;
    document.head.append(style);
    cursor = document.createElement('div');
    cursor.className = 'gamepad-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    notice = document.createElement('div');
    notice.className = 'gamepad-notice';
    notice.setAttribute('role', 'status');
    document.body.append(cursor, notice);
  }

  function announce(isConnected) {
    ensureUi();
    connected = isConnected;
    document.documentElement.dataset.gamepad = isConnected ? 'connected' : 'disconnected';
    cursor.style.display = isConnected ? 'block' : 'none';
    notice.textContent = isConnected
      ? 'Геймпад подключён · A — действие · Y — рестарт'
      : 'Геймпад отключён';
    notice.classList.add('show');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => notice.classList.remove('show'), 2200);
  }

  function frame(now) {
    const pads = navigator.getGamepads?.() || [];
    const pad = Array.from(pads).find(Boolean);
    if (Boolean(pad) !== connected) announce(Boolean(pad));
    if (pad) {
      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      const axisX = Math.abs(pad.axes[0] || 0) > DEAD_ZONE ? pad.axes[0] : 0;
      const axisY = Math.abs(pad.axes[1] || 0) > DEAD_ZONE ? pad.axes[1] : 0;
      cursorX = Math.max(0, Math.min(innerWidth - 1, cursorX + axisX * CURSOR_SPEED * dt));
      cursorY = Math.max(0, Math.min(innerHeight - 1, cursorY + axisY * CURSOR_SPEED * dt));
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;

      const directions = {
        left: axisX < -DEAD_ZONE || pad.buttons[14]?.pressed,
        right: axisX > DEAD_ZONE || pad.buttons[15]?.pressed,
        up: axisY < -DEAD_ZONE || pad.buttons[12]?.pressed,
        down: axisY > DEAD_ZONE || pad.buttons[13]?.pressed,
      };
      directionKeys.forEach((key, direction) => setKey(key, Boolean(directions[direction]), now));
      buttonKeys.forEach((key, index) => {
        const wasHeld = held.has(key);
        const pressed = Boolean(pad.buttons[index]?.pressed);
        setKey(key, pressed, now);
        if (pressed && !wasHeld && index === 0) clickAtCursor();
      });
      const rightClick = Boolean(pad.buttons[6]?.pressed);
      if (rightClick && !held.has('gamepad-right-click')) {
        held.set('gamepad-right-click', { nextRepeat: Infinity });
        clickAtCursor(2);
      } else if (!rightClick) held.delete('gamepad-right-click');
    } else {
      [...held.keys()].filter((key) => key !== 'gamepad-right-click').forEach((key) => keyboard('keyup', key));
      held.clear();
    }
    lastFrame = now;
    requestAnimationFrame(frame);
  }

  addEventListener('gamepadconnected', () => announce(true));
  addEventListener('gamepaddisconnected', () => announce(false));
  addEventListener('blur', () => {
    held.forEach((_, key) => { if (key !== 'gamepad-right-click') keyboard('keyup', key); });
    held.clear();
  });
  addEventListener('DOMContentLoaded', () => { ensureUi(); requestAnimationFrame(frame); }, { once: true });
})();
