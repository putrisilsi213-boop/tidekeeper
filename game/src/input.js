// Tidekeeper — keyboard and mouse state, plus the canvas-space aim point.
// One file, one job: raw input only; the game decides what it means.
export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouseX: 640, mouseY: 300,
    mouseDown: false,
    clicked: false, // set on mousedown, consumed by the game loop
    anyKey: false,
    moveX: 0, moveY: 0,
    dashPressed: false,
    fireHeld: false,
  };
  function scale(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  }
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) {
      keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (e.key === 'Shift') input.dashPressed = true;
      input.anyKey = true;
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
  canvas.addEventListener('mousemove', (e) => { const p = scale(e); input.mouseX = p.x; input.mouseY = p.y; });
  canvas.addEventListener('mousedown', (e) => {
    const p = scale(e); input.mouseX = p.x; input.mouseY = p.y;
    input.mouseDown = true; input.clicked = true;
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  input.poll = () => {
    const k = keys;
    const x = (k.has('d') || k.has('ArrowRight') ? 1 : 0) - (k.has('a') || k.has('ArrowLeft') ? 1 : 0);
    const y = (k.has('s') || k.has('ArrowDown') ? 1 : 0) - (k.has('w') || k.has('ArrowUp') ? 1 : 0);
    const len = Math.hypot(x, y) || 1;
    input.moveX = x / len; input.moveY = y / len;
    input.fireHeld = input.mouseDown || k.has(' ') || k.has('j');
  };
  input.consumeClick = () => { const c = input.clicked; input.clicked = false; return c; };
  input.consumeDash = () => { const d = input.dashPressed; input.dashPressed = false; return d; };
  input.consumeAnyKey = () => { const a = input.anyKey; input.anyKey = false; return a; };
  input.pressed = (key) => keys.has(key);
  return input;
}
