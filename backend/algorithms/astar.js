/**
 * Space-Time A* Path Planner (x, y, t)
 * Explores state space (x, y, t) with actions: MOVE and WAIT.
 * Bounded by a configurable temporal horizon to ensure bounded computation.
 */

import { manhattan, isWalkable, getOrthogonalNeighbors } from '../utils/grid.js';

const MAX_TIME_HORIZON = 50;

class MinPriorityQueue {
  constructor() {
    this.elements = [];
  }
  push(item, priority) {
    this.elements.push({ item, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }
  pop() {
    return this.elements.shift()?.item;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
}

export function findTimeAwarePath({
  start,
  goal,
  rows,
  cols,
  blockedCells,
  startTime = 0,
  reservationManager = null,
  currentRobotId = 'R_SELF',
  currentPriority = 0,
  maxHorizon = MAX_TIME_HORIZON,
  allowWait = true,
  stationaryRobots = []
}) {
  if (start.x === goal.x && start.y === goal.y) {
    return [{ x: start.x, y: start.y, t: startTime, action: 'WAIT' }];
  }

  const openSet = new MinPriorityQueue();
  const cameFrom = new Map();
  const gScore = new Map();

  const startKey = `${start.x},${start.y}@${startTime}`;
  gScore.set(startKey, 0);

  openSet.push({ x: start.x, y: start.y, t: startTime, consecutiveWaits: 0 }, manhattan(start, goal));

  while (!openSet.isEmpty()) {
    const current = openSet.pop();
    const currentKey = `${current.x},${current.y}@${current.t}`;

    // Target cell reached
    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, current);
    }

    // Guardrail: bounded temporal planning horizon
    if (current.t - startTime >= maxHorizon) {
      continue;
    }

    const nextT = current.t + 1;
    const candidates = [];

    // Action 1: MOVE to 4-orthogonal neighbors
    const neighbors = getOrthogonalNeighbors(current.x, current.y, rows, cols, blockedCells);
    for (const nb of neighbors) {
      candidates.push({
        x: nb.x,
        y: nb.y,
        t: nextT,
        action: 'MOVE',
        consecutiveWaits: 0,
        cost: 1
      });
    }

    // Action 2: WAIT in place (only if allowed and consecutive wait limit not exceeded)
    if (allowWait && current.consecutiveWaits < 4) {
      candidates.push({
        x: current.x,
        y: current.y,
        t: nextT,
        action: 'WAIT',
        consecutiveWaits: current.consecutiveWaits + 1,
        cost: 1.15 // Slight waiting penalty so robot moves when equal
      });
    }

    for (const cand of candidates) {
      if (!isWalkable(cand.x, cand.y, rows, cols, blockedCells)) {
        continue;
      }

      // Check stationary / idle robots: cannot step on or pass through a parked robot
      const isStationaryRobotCell = stationaryRobots.some(sr => sr.id !== currentRobotId && sr.x === cand.x && sr.y === cand.y);
      if (isStationaryRobotCell) {
        continue;
      }

      // Check space-time reservations & swap conflicts
      if (reservationManager) {
        if (reservationManager.hasPriorityConflict(cand.x, cand.y, nextT, currentRobotId, currentPriority)) {
          continue;
        }

        // Swap conflict check
        const otherAtTarget = reservationManager.getReservation(cand.x, cand.y, current.t);
        const otherAtOrigin = reservationManager.getReservation(current.x, current.y, nextT);
        if (
          otherAtTarget &&
          otherAtOrigin &&
          otherAtTarget.robotId !== currentRobotId &&
          otherAtTarget.robotId === otherAtOrigin.robotId
        ) {
          continue;
        }
      }

      const candKey = `${cand.x},${cand.y}@${cand.t}`;
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + cand.cost;

      if (tentativeG < (gScore.get(candKey) ?? Infinity)) {
        cameFrom.set(candKey, { parent: current, node: cand, action: cand.action });
        gScore.set(candKey, tentativeG);
        const fScore = tentativeG + manhattan(cand, goal);
        openSet.push(cand, fScore);
      }
    }
  }

  return null;
}

function reconstructPath(cameFrom, endNode) {
  const path = [];
  let curr = endNode;
  let currKey = `${curr.x},${curr.y}@${curr.t}`;

  while (cameFrom.has(currKey)) {
    const entry = cameFrom.get(currKey);
    path.unshift({
      x: curr.x,
      y: curr.y,
      t: curr.t,
      action: entry.action
    });
    curr = entry.parent;
    currKey = `${curr.x},${curr.y}@${curr.t}`;
  }

  path.unshift({
    x: curr.x,
    y: curr.y,
    t: curr.t,
    action: 'START'
  });

  return path;
}

export function findSpatialDistance(start, goal, rows, cols, blockedCells) {
  if (!start || !goal) return Infinity;
  if (start.x === goal.x && start.y === goal.y) return 0;

  const queue = [{ x: start.x, y: start.y, dist: 0 }];
  const visited = new Set([`${start.x},${start.y}`]);

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.x === goal.x && curr.y === goal.y) return curr.dist;

    const neighbors = getOrthogonalNeighbors(curr.x, curr.y, rows, cols, blockedCells);
    for (const nb of neighbors) {
      const key = `${nb.x},${nb.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ x: nb.x, y: nb.y, dist: curr.dist + 1 });
      }
    }
  }
  // Return Infinity if target is unreachable (blocked by walls/obstacles)
  return Infinity;
}
