/**
 * Simulation Manager & Fleet Launcher
 * Runs the live decentralized multi-robot warehouse simulation.
 * Manages the environment, task pool, and observer telemetry.
 */

import { Robot } from './robots/robot.js';
import { globalP2PNetwork } from '../communication/p2p.js';
import { ReservationManager } from '../algorithms/reservation.js';
import { WaitForGraph, DeadlockRecoveryManager } from '../algorithms/deadlock.js';
import { TaskAllocator } from '../algorithms/taskAllocator.js';
import { coordKey, canResizeGrid } from '../utils/grid.js';

export class SimulationLauncher {
  constructor() {
    this.rows = 12;
    this.cols = 16;
    this.blockedCells = new Set([
      // Default warehouse shelf blocks (aisles)
      '3,3', '3,4', '3,5', '3,7', '3,8',
      '7,3', '7,4', '7,5', '7,7', '7,8',
      '11,3', '11,4', '11,5', '11,7', '11,8'
    ]);

    this.reservationManager = new ReservationManager();
    this.waitForGraph = new WaitForGraph();
    this.deadlockRecovery = new DeadlockRecoveryManager();
    this.p2p = globalP2PNetwork;

    this.currentTick = 0;
    this.tickIntervalMs = 600;
    this.isRunning = true;
    this.timer = null;

    this.robots = new Map();
    this.tasks = []; // { id, pickup, delivery, urgency, status, assignedTo }
    this.taskCounter = 1;
    this.robotCounter = 5;
    this.events = []; // Telemetry event logs

    this.stats = {
      tasksCompleted: 0,
      conflictsResolved: 0,
      deadlocksRecovered: 0
    };

    this.onTelemetryUpdate = null;

    this.initFleet();
    this.startLoop();
  }

  initFleet() {
    const initialFleet = [
      { id: 'R1', position: { x: 1, y: 1 } },
      { id: 'R2', position: { x: 14, y: 1 } },
      { id: 'R3', position: { x: 1, y: 10 } },
      { id: 'R4', position: { x: 14, y: 10 } }
    ];

    for (const conf of initialFleet) {
      const robot = new Robot({
        id: conf.id,
        position: conf.position,
        p2p: this.p2p,
        reservationManager: this.reservationManager,
        waitForGraph: this.waitForGraph,
        deadlockRecovery: this.deadlockRecovery
      });
      this.robots.set(robot.id, robot);
    }

    // Immediately register stationary reservations and broadcast state to all peers
    for (const robot of this.robots.values()) {
      if (this.reservationManager) {
        this.reservationManager.reserveStationary(robot.id, robot.position, 0, 50);
      }
      robot.broadcastState();
    }

    this.logEvent('SYSTEM', 'Fleet initialized with 4 autonomous robots');
  }

  /**
   * Live User Action: Add Robot dynamically at specified (x, y)
   */
  addRobot({ id, position }) {
    if (!position || position.x === undefined || position.y === undefined) {
      return { success: false, reason: 'Coordinates required' };
    }

    const x = Number(position.x);
    const y = Number(position.y);

    // 1. Boundary check
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
      this.logEvent('WARNING', `Cannot place robot: (${x},${y}) is outside grid dimensions (${this.cols}x${this.rows})`, 'warning');
      return { success: false, reason: 'Coordinates out of bounds' };
    }

    // 2. Obstacle / Block check
    const key = coordKey(x, y);
    if (this.blockedCells.has(key)) {
      this.logEvent('WARNING', `Cannot place robot: cell (${x},${y}) is blocked by an obstacle`, 'warning');
      return { success: false, reason: 'Cell is blocked' };
    }

    // 3. Existing Robot check
    for (const r of this.robots.values()) {
      if (r.position.x === x && r.position.y === y) {
        this.logEvent('WARNING', `Cannot place robot: cell (${x},${y}) is occupied by ${r.id}`, 'warning');
        return { success: false, reason: `Cell occupied by ${r.id}` };
      }
    }

    let robotId = id;
    if (!robotId || this.robots.has(robotId)) {
      while (this.robots.has(`R${this.robotCounter}`)) {
        this.robotCounter++;
      }
      robotId = `R${this.robotCounter++}`;
    }

    const robot = new Robot({
      id: robotId,
      position: { x, y },
      p2p: this.p2p,
      reservationManager: this.reservationManager,
      waitForGraph: this.waitForGraph,
      deadlockRecovery: this.deadlockRecovery
    });

    this.robots.set(robot.id, robot);
    if (this.reservationManager) {
      this.reservationManager.reserveStationary(robot.id, robot.position, this.currentTick, 50);
    }
    robot.broadcastState();
    this.logEvent('FLEET', `Robot ${robot.id} dynamically deployed at (${x},${y})`, 'success');

    // Re-check pending task allocation
    this.allocatePendingTasks();
    this.broadcastTelemetry();

    return {
      success: true,
      robot: {
        id: robot.id,
        position: robot.position,
        battery: robot.battery,
        status: robot.status
      }
    };
  }

  logEvent(source, message, type = 'info') {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString(),
      tick: this.currentTick,
      source,
      message,
      type
    };
    this.events.unshift(entry);
    if (this.events.length > 50) this.events.pop();
  }

  startLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.isRunning) {
        this.stepSimulation();
      }
    }, this.tickIntervalMs);
  }

  setSpeed(ms) {
    this.tickIntervalMs = Math.max(100, Math.min(2000, ms));
    this.startLoop();
    this.logEvent('SYSTEM', `Simulation speed set to ${this.tickIntervalMs}ms per tick`);
  }

  togglePause() {
    this.isRunning = !this.isRunning;
    this.logEvent('SYSTEM', this.isRunning ? 'Simulation resumed' : 'Simulation paused');
    this.broadcastTelemetry();
  }

  /**
   * Live User Action: Add Task
   */
  addTask({ pickup, delivery, urgency = 5 }) {
    if (!pickup || !delivery) {
      return { success: false, error: 'Pickup and delivery coordinates required' };
    }

    const px = Number(pickup.x);
    const py = Number(pickup.y);
    const dx = Number(delivery.x);
    const dy = Number(delivery.y);

    // 1. Bounds check
    if (px < 0 || px >= this.cols || py < 0 || py >= this.rows) {
      this.logEvent('ERROR', `Pickup cell (${px},${py}) is outside grid dimensions (${this.cols}x${this.rows})`, 'error');
      this.broadcastTelemetry();
      return { success: false, error: `Pickup cell (${px},${py}) is outside grid dimensions` };
    }
    if (dx < 0 || dx >= this.cols || dy < 0 || dy >= this.rows) {
      this.logEvent('ERROR', `Delivery cell (${dx},${dy}) is outside grid dimensions (${this.cols}x${this.rows})`, 'error');
      this.broadcastTelemetry();
      return { success: false, error: `Delivery cell (${dx},${dy}) is outside grid dimensions` };
    }

    // 2. Blocked cell check for Pickup
    const pickupKey = coordKey(px, py);
    if (this.blockedCells.has(pickupKey)) {
      this.logEvent('ERROR', `Cannot create task: Pickup cell (${px},${py}) is blocked by a wall or obstacle!`, 'error');
      this.broadcastTelemetry();
      return { success: false, error: `Pickup cell (${px},${py}) is blocked by a wall or obstacle` };
    }

    // 3. Blocked cell check for Delivery
    const deliveryKey = coordKey(dx, dy);
    if (this.blockedCells.has(deliveryKey)) {
      this.logEvent('ERROR', `Cannot create task: Delivery cell (${dx},${dy}) is blocked by a wall or obstacle!`, 'error');
      this.broadcastTelemetry();
      return { success: false, error: `Delivery cell (${dx},${dy}) is blocked by a wall or obstacle` };
    }

    // 4. Same cell check
    if (px === dx && py === dy) {
      this.logEvent('ERROR', `Pickup and delivery cannot be the exact same cell (${px},${py})`, 'error');
      this.broadcastTelemetry();
      return { success: false, error: 'Pickup and delivery cannot be the same cell' };
    }

    const task = {
      id: `T${this.taskCounter++}`,
      pickup: { x: px, y: py },
      delivery: { x: dx, y: dy },
      urgency: Number(urgency) || 5,
      status: 'PENDING',
      assignedTo: null,
      error: null,
      notifiedUnreachable: false,
      createdAtTick: this.currentTick
    };

    this.tasks.push(task);
    this.logEvent('TASK', `New task ${task.id} added (Urgency: ${task.urgency})`);

    // Run Task Allocation immediately
    this.allocatePendingTasks();
    this.broadcastTelemetry();
    return { success: true, task };
  }

  /**
   * Evaluates pending tasks and allocates via ETA formula.
   * If obstacles cut off any path, retains task as PENDING and alerts user.
   */
  allocatePendingTasks() {
    const pendingTasks = this.tasks.filter(t => t.status === 'PENDING');
    if (pendingTasks.length === 0) return;

    const robotList = Array.from(this.robots.values());

    for (const task of pendingTasks) {
      const { bestRobot, minETA } = TaskAllocator.findBestCandidate(
        robotList,
        task,
        this.rows,
        this.cols,
        this.blockedCells
      );

      if (bestRobot && minETA !== Infinity) {
        task.status = 'ASSIGNED';
        task.assignedTo = bestRobot.id;
        task.error = null;
        task.notifiedUnreachable = false;
        bestRobot.assignTask(task, this.currentTick, this.rows, this.cols, this.blockedCells);
        this.logEvent('ALLOCATION', `Task ${task.id} assigned to ${bestRobot.id} (ETA: ~${minETA} steps)`);
      } else {
        task.error = 'No walkable path available (waiting for obstacle clearance)';
        if (!task.notifiedUnreachable) {
          task.notifiedUnreachable = true;
          this.logEvent('WARNING', `Task ${task.id}: No walkable path to destination! Task remains queued until obstacles are cleared.`, 'warning');
        }
      }
    }
  }

  /**
   * Live User Action: Block or Unblock a cell
   */
  toggleBlockCell(x, y) {
    const key = coordKey(x, y);

    // Don't allow blocking cell currently occupied by a robot
    for (const robot of this.robots.values()) {
      if (robot.position.x === x && robot.position.y === y) {
        this.logEvent('WARNING', `Cannot block (${x},${y}): currently occupied by ${robot.id}`, 'warning');
        return { success: false, reason: 'Cell occupied by robot' };
      }
    }

    if (this.blockedCells.has(key)) {
      this.blockedCells.delete(key);
      this.logEvent('ENVIRONMENT', `Cell (${x},${y}) unblocked`);

      // 1. Opportunistic replanning: give active robots a chance to take newly opened shorter path
      for (const robot of this.robots.values()) {
        if (robot.status === 'MOVING' || robot.status === 'WAITING' || robot.status === 'BLOCKED') {
          const improved = robot.replanIfShorter(this.currentTick, this.rows, this.cols, this.blockedCells);
          if (improved) {
            this.logEvent('REROUTE', `${robot.id} took shorter path via unblocked cell (${x},${y})`);
          }
        }
      }

      // 2. Re-check pending tasks that were blocked/unreachable
      this.allocatePendingTasks();
    } else {
      this.blockedCells.add(key);
      this.logEvent('ENVIRONMENT', `Cell (${x},${y}) blocked dynamically`);

      // Notify all active robots whose paths intersect the blocked cell to reroute
      for (const robot of this.robots.values()) {
        if (robot.status === 'MOVING' || robot.status === 'WAITING') {
          const pathAffected = robot.path.some(s => s.x === x && s.y === y);
          if (pathAffected) {
            const replanned = robot.replan(this.currentTick, null, this.rows, this.cols, this.blockedCells);
            if (replanned) {
              this.logEvent('REROUTE', `${robot.id} dynamically replanned around (${x},${y})`);
            } else {
              robot.status = 'BLOCKED';
              this.logEvent('BLOCKED', `${robot.id} is blocked: no alternative path available`, 'warning');
            }
          }
        }
      }
    }

    this.broadcastTelemetry();
    return { success: true, blocked: this.blockedCells.has(key) };
  }

  /**
   * Live User Action: Safe Grid Resizing
   */
  resizeGrid(newRows, newCols) {
    const robotPositions = Array.from(this.robots.values()).map(r => r.position);
    const taskPoints = this.tasks
      .filter(t => t.status !== 'COMPLETED')
      .flatMap(t => [t.pickup, t.delivery]);

    const check = canResizeGrid(newRows, newCols, this.blockedCells, robotPositions, taskPoints);
    if (!check.allowed) {
      this.logEvent('WARNING', `Grid resize rejected: ${check.reason}`, 'warning');
      return { success: false, reason: check.reason };
    }

    this.rows = newRows;
    this.cols = newCols;

    // Remove any blocked cells outside new boundary
    for (const key of this.blockedCells) {
      const [bx, by] = key.split(',').map(Number);
      if (bx >= newCols || by >= newRows) {
        this.blockedCells.delete(key);
      }
    }

    this.logEvent('ENVIRONMENT', `Grid resized to ${newCols}x${newRows}`);
    this.broadcastTelemetry();
    return { success: true };
  }

  /**
   * Live User Action: Simulate Robot Failure / Revive
   */
  toggleRobotFailure(robotId) {
    const robot = this.robots.get(robotId);
    if (!robot) return;

    if (robot.status === 'FAILED') {
      robot.setFailed(false);
      this.logEvent('ROBOT', `${robotId} restored online and ready for tasks`);
    } else {
      const orphanedTask = robot.currentTask;
      robot.setFailed(true);
      this.logEvent('ROBOT', `${robotId} suffered system failure!`, 'error');

      if (orphanedTask) {
        orphanedTask.status = 'PENDING';
        orphanedTask.assignedTo = null;
        robot.currentTask = null;
        this.logEvent('REASSIGN', `Task ${orphanedTask.id} orphaned by ${robotId}, re-allocating...`);
        this.allocatePendingTasks();
      }
    }
    this.broadcastTelemetry();
  }

  /**
   * Main simulation tick
   */
  stepSimulation() {
    this.currentTick++;

    // 1. Prune past reservations
    this.reservationManager.prunePast(this.currentTick);

    // 2. Allocate any pending tasks
    this.allocatePendingTasks();

    // 3. Step each autonomous robot
    for (const robot of this.robots.values()) {
      robot.step(
        this.currentTick,
        this.rows,
        this.cols,
        this.blockedCells,
        // onTaskComplete callback
        (completedTask, robotId) => {
          completedTask.status = 'COMPLETED';
          this.stats.tasksCompleted++;
          this.logEvent('TASK', `Task ${completedTask.id} completed by ${robotId}! 🎉`, 'success');
          this.allocatePendingTasks();
        },
        // onTaskReassign callback (Level 4 deadlock recovery)
        (stuckTask) => {
          stuckTask.status = 'PENDING';
          stuckTask.assignedTo = null;
          this.stats.deadlocksRecovered++;
          this.logEvent('DEADLOCK', `Deadlock Level 4: Reassigning stuck task ${stuckTask.id}`, 'warning');
          this.allocatePendingTasks();
        }
      );
    }

    // 4. Deadlock cycle observer check for telemetry stats
    const cycles = this.waitForGraph.detectCycles();
    if (cycles.length > 0) {
      this.stats.deadlocksRecovered++;
      this.logEvent('DEADLOCK', `Cycle detected: ${cycles[0].join(' ➔ ')}! Recovery initiated.`, 'warning');
    }

    // 5. Broadcast telemetry to observer (Dashboard)
    this.broadcastTelemetry();
  }

  getSnapshot() {
    return {
      tick: this.currentTick,
      isRunning: this.isRunning,
      speed: this.tickIntervalMs,
      grid: {
        rows: this.rows,
        cols: this.cols,
        blockedCells: Array.from(this.blockedCells)
      },
      robots: Array.from(this.robots.values()).map(r => ({
        id: r.id,
        position: r.position,
        nextPosition: r.nextPosition,
        battery: r.battery,
        status: r.status,
        stage: r.stage,
        urgency: r.urgency,
        effectivePriority: r.getEffectivePriority(),
        waitingTime: r.waitingTime,
        taskId: r.currentTask?.id || null,
        task: r.currentTask,
        path: r.path
      })),
      tasks: this.tasks.slice(-20),
      events: this.events.slice(0, 30),
      stats: this.stats,
      reservations: this.reservationManager.getSnapshot().slice(0, 50)
    };
  }

  broadcastTelemetry() {
    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate(this.getSnapshot());
    }
  }

  resetSimulation() {
    this.currentTick = 0;
    this.reservationManager = new ReservationManager();
    this.waitForGraph = new WaitForGraph();
    this.deadlockRecovery = new DeadlockRecoveryManager();
    this.tasks = [];
    this.taskCounter = 1;
    this.robotCounter = 5;
    this.events = [];
    this.stats = { tasksCompleted: 0, conflictsResolved: 0, deadlocksRecovered: 0 };
    this.robots.clear();
    this.initFleet();
    this.logEvent('SYSTEM', 'Simulation reset to factory state');
    this.broadcastTelemetry();
  }
}
