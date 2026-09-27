/**
 * Grid utilities for the Decentralized Multi-Robot Warehouse System
 */

export function coordKey(x, y) {
  return `${x},${y}`;
}

export function parseKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isWithinBounds(x, y, rows, cols) {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

export function isWalkable(x, y, rows, cols, blockedCells) {
  if (!isWithinBounds(x, y, rows, cols)) return false;
  const key = coordKey(x, y);
  if (blockedCells instanceof Set) {
    return !blockedCells.has(key);
  }
  if (Array.isArray(blockedCells)) {
    return !blockedCells.some(c => (Array.isArray(c) ? c[0] === x && c[1] === y : c.x === x && c.y === y || c === key));
  }
  return true;
}

export function getOrthogonalNeighbors(x, y, rows, cols, blockedCells) {
  const dirs = [
    { x: 0, y: -1 }, // North
    { x: 1, y: 0 },  // East
    { x: 0, y: 1 },  // South
    { x: -1, y: 0 }  // West
  ];

  const neighbors = [];
  for (const d of dirs) {
    const nx = x + d.x;
    const ny = y + d.y;
    if (isWalkable(nx, ny, rows, cols, blockedCells)) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

export function canResizeGrid(newRows, newCols, blockedCells, robotPositions, taskPoints = []) {
  if (newRows < 5 || newCols < 5) return { allowed: false, reason: 'Grid dimensions must be at least 5x5' };
  
  // Check robots
  for (const r of robotPositions) {
    if (r.x >= newCols || r.y >= newRows) {
      return { allowed: false, reason: `Robot at (${r.x},${r.y}) is outside new grid bounds (${newCols}x${newRows})` };
    }
  }

  // Check tasks
  for (const t of taskPoints) {
    if (t.x >= newCols || t.y >= newRows) {
      return { allowed: false, reason: `Task location (${t.x},${t.y}) is outside new grid bounds (${newCols}x${newRows})` };
    }
  }

  return { allowed: true };
}
