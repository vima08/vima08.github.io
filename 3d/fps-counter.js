(() => {
  const counter = document.createElement('output');
  counter.id = 'fps-counter';
  counter.setAttribute('aria-label', 'Frames per second');
  counter.textContent = 'FPS: --';
  Object.assign(counter.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: '1000',
    minWidth: '68px',
    padding: '7px 9px',
    border: '1px solid rgba(255, 255, 255, .18)',
    borderRadius: '9px',
    background: 'rgba(4, 10, 20, .72)',
    color: '#fff',
    font: '700 12px/1 ui-monospace, SFMono-Regular, Consolas, monospace',
    textAlign: 'center',
    pointerEvents: 'none',
    backdropFilter: 'blur(8px)',
  });
  document.body.appendChild(counter);

  let frames = 0;
  let sampledAt = performance.now();
  function sample(now) {
    frames += 1;
    const elapsed = now - sampledAt;
    if (elapsed >= 500) {
      counter.textContent = `FPS: ${Math.round((frames * 1000) / elapsed)}`;
      frames = 0;
      sampledAt = now;
    }
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
})();
