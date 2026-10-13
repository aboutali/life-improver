// Only one swipe row is open at a time. An open row registers how to close
// itself; opening another row (or a context menu) closes the first.

let current = null; // { id, close }

export function registerOpenRow(id, close) {
  if (current && current.id !== id) current.close();
  current = { id, close };
}

export function unregisterRow(id) {
  if (current && current.id === id) current = null;
}

export function closeSwipeRows() {
  if (!current) return;
  const { close } = current;
  current = null;
  close();
}

export function openRowId() {
  return current ? current.id : null;
}
