/**
 * Autonomous Robot Agent
 * Independently manages path planning, state broadcast, conflict resolution,
 * deadlock detection/recovery, and task execution.
 */

import { findTimeAwarePath } from '../../algorithms/astar.js';
import { ConflictDetector, calculateEffectivePriority } from '../../algorithms/conflict.js';
import { isWalkable } from '../../utils/grid.js';

export class Robot {
  constructor({ id, position, p2p, reservationManager, waitForGraph, deadlockRecovery }) {
    this.id = id;
    this.position = { ...position };
    this.nextPosition = null;
    this.battery = 100;
    this.status = 'IDLE'; // IDLE, MOVING, WAITING, PICKING_UP, DELIVERING, BLOCKED, RECOVERING, FAILED
    this.currentTask = null;
    this.stage = null; // 'TO_PICKUP' | 'TO_DELIVERY'
    this.path = [];
    this.urgency = 1;
    this.waitingTime = 0;
    this.history = [{ ...position }]; // for Level 2 backtracking
    this.knownRobots = new Map(); // peerId -> state

    this.p2p = p2p;
    this.reservationManager = reservationManager;
    this.waitForGraph = waitForGraph;
    this.deadlockRecovery = deadlockRecovery;

    if (this.p2p) {
      this.p2p.registerRobot(this);
    }
  }

  getEffectivePriority() {
    return calculateEffectivePriority(this.urgency, this.waitingTime);
  }

  /**
   * Receive incoming direct or broadcast message from another robot
   */
  receivePeerMessage(message) {
    if (this.status === 'FAILED') return;

    if (message.type === 'BROADCAST_STATE') {
      this.knownRobots.set(message.from, message.data);
    } else if (message.type === 'YIELD_REQUEST') {
      const myPriority = this.getEffectivePriority();
      if (message.data.priority > myPriority) {
        // Yield: attempt alternate path or step aside
        this.status = 'WAITING';
        this.waitingTime++;
        this.waitForGraph.setWaiting(this.id, message.from);
      }
    }
  }

  /**
   * Assign a new task dynamically
   */
  assignTask(task, currentTime, rows, cols, blockedCells) {
    if (this.status === 'FAILED') return false;

    this.currentTask = { ...task };
    this.urgency = task.urgency || 5;
    this.stage = 'TO_PICKUP';
    this.waitingTime = 0;
    this.status = 'MOVING';

    const planned = this.replan(currentTime, this.currentTask.pickup, rows, cols, blockedCells);
    this.broadcastState();
    return planned;
  }

  getAllPeers() {
    const peers = new Map();
    if (this.p2p && this.p2p.peers) {
      for (const [peerId, peer] of this.p2p.peers.entries()) {
        if (peerId !== this.id && peer) {
          peers.set(peerId, {
            id: peer.id,
            position: peer.position ? { ...peer.position } : null,
            nextPosition: peer.nextPosition ? { ...peer.nextPosition } : null,
            status: peer.status,
            urgency: peer.urgency,
            waitingTime: peer.waitingTime
          });
        }
      }
    }
    if (this.knownRobots) {
      for (const [peerId, peer] of this.knownRobots.entries()) {
        if (peerId !== this.id && !peers.has(peerId) && peer) {
          peers.set(peerId, peer);
        }
      }
    }
    return peers;
  }

  getStationaryPeers() {
    const stationary = [];
    const allPeers = this.getAllPeers();
    for (const [peerId, peer] of allPeers.entries()) {
      if (!peer.position) continue;
      // Peer is stationary if IDLE, FAILED, BLOCKED, or not moving away in next step
      const isMovingAway = peer.status === 'MOVING' && peer.nextPosition &&
        (peer.nextPosition.x !== peer.position.x || peer.nextPosition.y !== peer.position.y);
      if (!isMovingAway) {
        stationary.push({ x: peer.position.x, y: peer.position.y, id: peer.id });
      }
    }
    return stationary;
  }

  /**
   * Plan or replan route using Time-Aware A*
   */
  replan(currentTime, customGoal = null, rows, cols, blockedCells) {
    const goal = customGoal || (this.stage === 'TO_PICKUP' ? this.currentTask?.pickup : this.currentTask?.delivery);
    if (!goal) return false;

    // Clear own previous reservations before search so we don't conflict with our own stale path
    if (this.reservationManager) {
      this.reservationManager.clearRobotReservations(this.id);
    }

    const stationaryRobots = this.getStationaryPeers();
    const plannedPath = findTimeAwarePath({
      start: this.position,
      goal,
      rows,
      cols,
      blockedCells,
      startTime: currentTime,
      reservationManager: this.reservationManager,
      currentRobotId: this.id,
      currentPriority: this.getEffectivePriority(),
      stationaryRobots
    });

    if (plannedPath && plannedPath.length > 0) {
      // Remove first element if it's the current position (action: START)
      const executablePath = plannedPath[0].action === 'START' ? plannedPath.slice(1) : plannedPath;
      this.path = executablePath;
      this.nextPosition = this.path[0] ? { x: this.path[0].x, y: this.path[0].y } : null;

      // Reserve future trajectory
      if (this.reservationManager) {
        this.reservationManager.reservePath(this.id, this.path, this.getEffectivePriority());
      }
      return true;
    } else {
      this.path = [];
      this.nextPosition = null;
      return false;
    }
  }

  /**
   * Opportunistic replanning: if unblocking a cell allows a shorter path to current goal, take it!
   */
  replanIfShorter(currentTime, rows, cols, blockedCells) {
    if (!this.currentTask || this.status === 'FAILED') return false;
    const goal = this.stage === 'TO_PICKUP' ? this.currentTask.pickup : this.currentTask.delivery;
    if (!goal) return false;

    // Temporarily clear own reservations so search has a clean slate
    const oldPath = [...this.path];
    if (this.reservationManager) {
      this.reservationManager.clearRobotReservations(this.id);
    }

    const stationaryRobots = this.getStationaryPeers();
    const plannedPath = findTimeAwarePath({
      start: this.position,
      goal,
      rows,
      cols,
      blockedCells,
      startTime: currentTime,
      reservationManager: this.reservationManager,
      currentRobotId: this.id,
      currentPriority: this.getEffectivePriority(),
      stationaryRobots
    });

    if (plannedPath && plannedPath.length > 0) {
      const executablePath = plannedPath[0].action === 'START' ? plannedPath.slice(1) : plannedPath;
      // If robot was blocked/waiting, or has no path, or new path is strictly shorter than current remaining path:
      if (this.status === 'BLOCKED' || this.status === 'WAITING' || oldPath.length === 0 || executablePath.length < oldPath.length) {
        this.path = executablePath;
        this.nextPosition = this.path[0] ? { x: this.path[0].x, y: this.path[0].y } : null;
        this.status = 'MOVING';
        this.waitingTime = 0;
        if (this.reservationManager) {
          this.reservationManager.reservePath(this.id, this.path, this.getEffectivePriority());
        }
        this.broadcastState();
        return true;
      }
    }

    // Restore old path if new path wasn't adopted
    this.path = oldPath;
    if (this.reservationManager && this.path.length > 0) {
      this.reservationManager.reservePath(this.id, this.path, this.getEffectivePriority());
    }
    return false;
  }

  /**
   * Backtracking Recovery (Level 2)
   * Moves back to a previous safe position to clear a narrow aisle/choke point
   */
  executeBacktrack(rows, cols, blockedCells) {
    if (this.history.length > 1) {
      // Find a safe previous position in history
      for (let i = this.history.length - 2; i >= 0; i--) {
        const candidate = this.history[i];
        if (isWalkable(candidate.x, candidate.y, rows, cols, blockedCells)) {
          this.position = { ...candidate };
          this.status = 'RECOVERING';
          this.waitingTime = 0;
          this.path = [];
          this.nextPosition = null;
          this.waitForGraph.clearWaiting(this.id);
          this.broadcastState();
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Main Autonomous Decision Loop (Invoked on each simulation tick)
   */
  step(currentTime, rows, cols, blockedCells, onTaskComplete, onTaskReassign) {
    if (this.status === 'FAILED') {
      this.waitForGraph.removeRobot(this.id);
      return;
    }

    // Battery drain simulation
    this.battery = Math.max(0, +(this.battery - 0.05).toFixed(2));

    // If IDLE and no task, nothing to move
    if (!this.currentTask && this.status === 'IDLE') {
      this.nextPosition = null;
      this.waitForGraph.clearWaiting(this.id);
      if (this.reservationManager) {
        this.reservationManager.reserveStationary(this.id, this.position, currentTime, 30);
      }
      return;
    }

    // 1. Path Validity Check: Did environment change make current path hit a wall?
    const hasPathObstacle = this.path.some(step => !isWalkable(step.x, step.y, rows, cols, blockedCells));
    if (hasPathObstacle || (this.path.length === 0 && this.currentTask)) {
      const replanned = this.replan(currentTime, null, rows, cols, blockedCells);
      if (!replanned) {
        this.status = 'BLOCKED';
        this.waitingTime++;
      }
    }

    // 2. Deadlock Detection Check
    if (this.waitingTime >= 3) {
      const cycles = this.waitForGraph.detectCycles();
      const inCycle = cycles.some(cycle => cycle.includes(this.id));

      if (inCycle || this.waitingTime >= 5) {
        const recovery = this.deadlockRecovery.getRecoveryLevel(this.id);
        
        if (recovery.action === 'REPLAN') {
          this.replan(currentTime, null, rows, cols, blockedCells);
        } else if (recovery.action === 'BACKTRACK') {
          this.executeBacktrack(rows, cols, blockedCells);
          return;
        } else if (recovery.action === 'PRIORITY_LOCK') {
          // Temporary priority boost
          this.urgency += 10;
          this.replan(currentTime, null, rows, cols, blockedCells);
        } else if (recovery.action === 'REASSIGN_TASK') {
          // Level 4: Task handoff
          if (this.currentTask && onTaskReassign) {
            const taskToHandoff = this.currentTask;
            this.currentTask = null;
            this.status = 'IDLE';
            this.path = [];
            this.nextPosition = null;
            this.waitingTime = 0;
            this.waitForGraph.clearWaiting(this.id);
            this.deadlockRecovery.resetRecoveryAttempts(this.id);
            onTaskReassign(taskToHandoff);
            return;
          }
        }
      }
    }

    // 3. If no steps available, wait
    if (this.path.length === 0) {
      if (this.currentTask) {
        this.status = 'WAITING';
        this.waitingTime++;
      } else {
        this.status = 'IDLE';
        this.waitingTime = 0;
      }
      this.broadcastState();
      return;
    }

    const nextStep = this.path[0];
    this.nextPosition = { x: nextStep.x, y: nextStep.y };

    // 4. Conflict Detection before entering nextStep
    const peersToCheck = this.getAllPeers();
    const conflict = ConflictDetector.detectConflict({
      robot: this,
      nextStep,
      knownRobots: peersToCheck,
      reservationManager: this.reservationManager,
      rows,
      cols,
      blockedCells
    });

    if (conflict) {
      if (conflict.recommendedAction === 'REPLAN') {
        this.replan(currentTime, null, rows, cols, blockedCells);
        return;
      }

      if (conflict.recommendedAction === 'YIELD' || conflict.recommendedAction === 'WAIT' || conflict.recommendedAction === 'WAIT_FOR_CLEAR') {
        this.status = 'WAITING';
        this.waitingTime++;
        if (conflict.peerId) {
          this.waitForGraph.setWaiting(this.id, conflict.peerId);
        }
        this.broadcastState();
        return;
      }

      if (conflict.recommendedAction === 'PROCEED') {
        // I have priority: request peer to yield
        if (conflict.peerId && this.p2p) {
          this.p2p.sendDirect(this.id, conflict.peerId, 'YIELD_REQUEST', {
            priority: this.getEffectivePriority(),
            cell: nextStep
          });
        }
      }
    }

    // 5. Hard Physical Occupancy Guard:
    // Under NO circumstances can two robots occupy the same physical cell!
    const blockerPeer = Array.from(peersToCheck.values()).find(
      p => p.position && p.position.x === nextStep.x && p.position.y === nextStep.y
    );
    if (blockerPeer) {
      if (blockerPeer.status === 'IDLE' || blockerPeer.status === 'FAILED' || blockerPeer.status === 'BLOCKED') {
        // Blocker is stationary: replan immediately around it
        this.replan(currentTime, null, rows, cols, blockedCells);
        return;
      } else {
        // Blocker is moving/waiting: wait for cell to clear
        this.status = 'WAITING';
        this.waitingTime++;
        this.waitForGraph.setWaiting(this.id, blockerPeer.id);
        this.broadcastState();
        return;
      }
    }

    // 6. Execute Movement to next cell
    this.path.shift(); // Consume step
    this.position = { x: nextStep.x, y: nextStep.y };
    this.history.push({ ...this.position });
    if (this.history.length > 20) this.history.shift();

    this.nextPosition = this.path[0] ? { x: this.path[0].x, y: this.path[0].y } : null;
    this.status = 'MOVING';
    this.waitingTime = 0;
    this.waitForGraph.clearWaiting(this.id);
    this.deadlockRecovery.resetRecoveryAttempts(this.id);

    // 6. Task Progress Checking
    if (this.currentTask) {
      // Check Pickup reached
      if (this.stage === 'TO_PICKUP' && this.position.x === this.currentTask.pickup.x && this.position.y === this.currentTask.pickup.y) {
        this.stage = 'TO_DELIVERY';
        this.status = 'PICKING_UP';
        // Plan next stage to delivery
        this.replan(currentTime, this.currentTask.delivery, rows, cols, blockedCells);
      }
      // Check Delivery reached
      else if (this.stage === 'TO_DELIVERY' && this.position.x === this.currentTask.delivery.x && this.position.y === this.currentTask.delivery.y) {
        this.status = 'DELIVERING';
        const finishedTask = this.currentTask;
        this.currentTask = null;
        this.stage = null;
        this.path = [];
        this.nextPosition = null;
        this.status = 'IDLE';
        this.urgency = 1;
        if (this.reservationManager) {
          this.reservationManager.reserveStationary(this.id, this.position, currentTime, 50);
        }
        if (onTaskComplete) {
          onTaskComplete(finishedTask, this.id);
        }
      }
    }

    // 7. Broadcast updated state to peers
    this.broadcastState();
  }

  broadcastState() {
    if (!this.p2p) return;

    const payload = {
      id: this.id,
      position: { ...this.position },
      nextPosition: this.nextPosition ? { ...this.nextPosition } : null,
      battery: this.battery,
      status: this.status,
      stage: this.stage,
      taskId: this.currentTask?.id || null,
      task: this.currentTask,
      urgency: this.urgency,
      effectivePriority: this.getEffectivePriority(),
      waitingTime: this.waitingTime,
      path: this.path.map(p => ({ x: p.x, y: p.y, t: p.t, action: p.action })),
      timestamp: Date.now()
    };

    this.p2p.broadcast(this.id, payload);
  }

  /**
   * Simulate a physical breakdown or recovery
   */
  setFailed(failed) {
    if (failed) {
      this.status = 'FAILED';
      this.path = [];
      this.nextPosition = null;
      if (this.reservationManager) {
        this.reservationManager.reserveStationary(this.id, this.position, 0, 100);
      }
      this.waitForGraph.removeRobot(this.id);
    } else {
      this.status = 'IDLE';
      this.waitingTime = 0;
      if (this.reservationManager) {
        this.reservationManager.reserveStationary(this.id, this.position, 0, 50);
      }
    }
    this.broadcastState();
  }
}
