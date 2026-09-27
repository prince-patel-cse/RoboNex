/**
 * Deadlock Detection & Multi-Level Recovery
 * Uses Wait-For Graph with DFS cycle detection and hierarchical recovery:
 * Level 1: Dynamic Rerouting
 * Level 2: Backtracking to safe junction
 * Level 3: Temporary Choke-Point Priority Lock
 * Level 4: Task Reassignment
 */

export class WaitForGraph {
  constructor() {
    // Map of waiterRobotId -> Set of heldByRobotIds
    this.edges = new Map();
  }

  setWaiting(waiterId, heldById) {
    if (!waiterId || !heldById || waiterId === heldById) return;
    if (!this.edges.has(waiterId)) {
      this.edges.set(waiterId, new Set());
    }
    this.edges.get(waiterId).add(heldById);
  }

  clearWaiting(waiterId) {
    this.edges.delete(waiterId);
  }

  removeRobot(robotId) {
    this.edges.delete(robotId);
    for (const holders of this.edges.values()) {
      holders.delete(robotId);
    }
  }

  /**
   * Find cycles in the wait-for graph using DFS
   * Returns array of cycle paths, e.g. [ ['R1', 'R2', 'R1'] ]
   */
  detectCycles() {
    const visited = new Set();
    const recStack = new Set();
    const path = [];
    const detectedCycles = [];

    const dfs = (node) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = this.edges.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          // Cycle found! Extract subpath
          const cycleStartIndex = path.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            const cycle = path.slice(cycleStartIndex);
            cycle.push(neighbor); // Close loop
            detectedCycles.push(cycle);
          }
        }
      }

      recStack.delete(node);
      path.pop();
    };

    for (const node of this.edges.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return detectedCycles;
  }
}

export class DeadlockRecoveryManager {
  constructor() {
    this.priorityLocks = new Map(); // cellKey -> { robotId, expiresAtStep }
    this.recoveryAttempts = new Map(); // robotId -> count
  }

  /**
   * Grant a temporary priority lock on a critical choke cell
   */
  grantLock(cellKey, robotId, durationTicks = 5, currentStep = 0) {
    this.priorityLocks.set(cellKey, {
      robotId,
      expiresAtStep: currentStep + durationTicks
    });
  }

  hasLock(cellKey, robotId, currentStep) {
    const lock = this.priorityLocks.get(cellKey);
    if (!lock) return false;
    if (lock.expiresAtStep < currentStep) {
      this.priorityLocks.delete(cellKey);
      return false;
    }
    return lock.robotId === robotId;
  }

  clearExpiredLocks(currentStep) {
    for (const [key, lock] of this.priorityLocks.entries()) {
      if (lock.expiresAtStep <= currentStep) {
        this.priorityLocks.delete(key);
      }
    }
  }

  /**
   * Get the recommended recovery strategy based on past attempts
   */
  getRecoveryLevel(robotId) {
    const attempts = this.recoveryAttempts.get(robotId) || 0;
    this.recoveryAttempts.set(robotId, attempts + 1);

    if (attempts === 0) return { level: 1, action: 'REPLAN' };
    if (attempts === 1) return { level: 2, action: 'BACKTRACK' };
    if (attempts === 2) return { level: 3, action: 'PRIORITY_LOCK' };
    return { level: 4, action: 'REASSIGN_TASK' };
  }

  resetRecoveryAttempts(robotId) {
    this.recoveryAttempts.delete(robotId);
  }
}
