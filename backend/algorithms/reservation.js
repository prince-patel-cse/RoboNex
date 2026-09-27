/**
 * Space-Time Reservation Manager: (cell, time) -> { robotId, priority }
 * Manages spatial-temporal claims on grid cells with deterministic tie-breaking.
 */

export class ReservationManager {
  constructor(maxHorizon = 50) {
    // Map of "x,y@time" -> { robotId, priority, x, y, t, action }
    this.table = new Map();
    this.maxHorizon = maxHorizon;
  }

  static makeKey(x, y, time) {
    return `${x},${y}@${time}`;
  }

  /**
   * Deterministic tie-breaking rule:
   * 1. Higher effective priority wins.
   * 2. If priorities are equal, lower lexicographical robot ID wins (e.g. 'R1' wins over 'R2').
   * Returns true if candidateId beats existingId.
   */
  static beats(candidatePriority, candidateId, existingPriority, existingId) {
    if (candidatePriority > existingPriority) return true;
    if (candidatePriority < existingPriority) return false;
    // Tie-breaker: deterministic string comparison
    return candidateId.localeCompare(existingId) < 0;
  }

  /**
   * Reserves a sequence of future space-time steps for a robot.
   * Releases previous future reservations for this robot before reserving new path.
   */
  reservePath(robotId, path, priority = 0) {
    this.clearRobotReservations(robotId);

    for (const step of path) {
      const key = ReservationManager.makeKey(step.x, step.y, step.t);
      const existing = this.table.get(key);

      if (!existing || ReservationManager.beats(priority, robotId, existing.priority, existing.robotId)) {
        this.table.set(key, {
          robotId,
          priority,
          x: step.x,
          y: step.y,
          t: step.t,
          action: step.action || 'MOVE'
        });
      }
    }
  }

  /**
   * Reserves stationary presence for an idle, waiting, or failed robot at (x, y)
   * across [startTime, startTime + duration] with max priority so moving robots avoid it.
   */
  reserveStationary(robotId, position, startTime = 0, duration = 50) {
    this.clearRobotReservations(robotId);
    if (!position) return;
    for (let t = startTime; t <= startTime + duration; t++) {
      const key = ReservationManager.makeKey(position.x, position.y, t);
      this.table.set(key, {
        robotId,
        priority: 999, // Stationary robots physically occupy the cell
        x: position.x,
        y: position.y,
        t,
        action: 'STATIONARY'
      });
    }
  }

  getReservation(x, y, time) {
    const key = ReservationManager.makeKey(x, y, time);
    return this.table.get(key) || null;
  }

  /**
   * Checks if another robot holds a reservation at (x, y, t) that beats the current robot
   */
  hasPriorityConflict(x, y, time, currentRobotId, currentPriority) {
    const res = this.getReservation(x, y, time);
    if (!res || res.robotId === currentRobotId) return false;
    // If the existing reservation beats current robot, there is a conflict
    return !ReservationManager.beats(currentPriority, currentRobotId, res.priority, res.robotId);
  }

  /**
   * Explicitly release all future reservations for a robot
   */
  clearRobotReservations(robotId) {
    for (const [key, res] of this.table.entries()) {
      if (res.robotId === robotId) {
        this.table.delete(key);
      }
    }
  }

  /**
   * Prunes reservations strictly before current simulation tick
   */
  prunePast(currentTime) {
    for (const [key, res] of this.table.entries()) {
      if (res.t < currentTime) {
        this.table.delete(key);
      }
    }
  }

  getSnapshot() {
    return Array.from(this.table.values());
  }
}
