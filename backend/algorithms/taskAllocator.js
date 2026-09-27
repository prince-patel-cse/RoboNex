/**
 * ETA-Based Task Allocator
 * Calculates true path-cost ETA for every robot (busy or free)
 * and assigns tasks to the robot with the minimal estimated completion time.
 * Considers stationary and idle robots as obstacles during routing.
 */

import { findSpatialDistance } from './astar.js';

export class TaskAllocator {
  /**
   * Calculate ETA for a specific robot to complete a given task
   */
  static calculateRobotETA(robot, task, rows, cols, blockedCells, allRobots = []) {
    if (robot.status === 'FAILED') return Infinity;

    // Obstacles for this robot include walls PLUS other stationary/idle/failed robots
    const effectiveBlocked = new Set(blockedCells);
    for (const other of allRobots) {
      if (other.id !== robot.id && (other.status === 'IDLE' || other.status === 'FAILED' || other.status === 'BLOCKED')) {
        if (other.position) {
          effectiveBlocked.add(`${other.position.x},${other.position.y}`);
        }
      }
    }

    const taskWorkload = findSpatialDistance(task.pickup, task.delivery, rows, cols, effectiveBlocked);
    if (taskWorkload === Infinity) return Infinity;

    // If robot is IDLE / FREE
    if (!robot.currentTask || robot.status === 'IDLE') {
      const distToPickup = findSpatialDistance(robot.position, task.pickup, rows, cols, effectiveBlocked);
      if (distToPickup === Infinity) return Infinity;
      return distToPickup + taskWorkload;
    }

    // If robot is BUSY:
    // Remaining time for current task + travel to new task's pickup + task workload
    let remainingCurrentTaskTime = 0;
    let endOfCurrentTaskPos = robot.position;

    if (robot.currentTask) {
      if (robot.status === 'PICKING_UP' || robot.stage === 'TO_DELIVERY') {
        // Carrying parcel to current task's delivery
        remainingCurrentTaskTime = findSpatialDistance(robot.position, robot.currentTask.delivery, rows, cols, effectiveBlocked);
        endOfCurrentTaskPos = robot.currentTask.delivery;
      } else {
        // Moving to current pickup, then to current delivery
        const toPickup = findSpatialDistance(robot.position, robot.currentTask.pickup, rows, cols, effectiveBlocked);
        const toDelivery = findSpatialDistance(robot.currentTask.pickup, robot.currentTask.delivery, rows, cols, effectiveBlocked);
        remainingCurrentTaskTime = toPickup + toDelivery;
        endOfCurrentTaskPos = robot.currentTask.delivery;
      }
    }

    const distFromEndToNewPickup = findSpatialDistance(endOfCurrentTaskPos, task.pickup, rows, cols, effectiveBlocked);
    if (distFromEndToNewPickup === Infinity) return Infinity;
    return remainingCurrentTaskTime + distFromEndToNewPickup + taskWorkload;
  }

  /**
   * Find the best robot candidate for a new task
   */
  static findBestCandidate(robots, task, rows, cols, blockedCells) {
    let bestRobot = null;
    let minETA = Infinity;

    for (const robot of robots) {
      const eta = TaskAllocator.calculateRobotETA(robot, task, rows, cols, blockedCells, robots);
      if (eta < minETA) {
        minETA = eta;
        bestRobot = robot;
      }
    }

    return { bestRobot, minETA };
  }
}
