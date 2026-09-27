/**
 * Conflict Detection & Resolution System
 * Implements spatial, temporal, and swap conflict checks,
 * plus priority arbitration using urgency + waitingTime * 0.5.
 */

import { isWalkable } from '../utils/grid.js';

export function calculateEffectivePriority(urgency, waitingTime) {
  return Number((urgency + (waitingTime || 0) * 0.5).toFixed(2));
}

export class ConflictDetector {
  /**
   * Evaluates the safety of the planned next step.
   * 
   * @param {Object} params
   * @param {Object} params.robot - Current robot instance
   * @param {Object} params.nextStep - { x, y, t }
   * @param {Map<string, Object>} params.knownRobots - Peer states from P2P
   * @param {ReservationManager} params.reservationManager
   * @param {number} params.rows
   * @param {number} params.cols
   * @param {Set<string>} params.blockedCells
   * @returns {Object|null} Conflict descriptor if unsafe, else null
   */
  static detectConflict({
    robot,
    nextStep,
    knownRobots,
    reservationManager,
    rows,
    cols,
    blockedCells
  }) {
    if (!nextStep) return null;

    // 1. Static Wall / Boundary Check
    if (!isWalkable(nextStep.x, nextStep.y, rows, cols, blockedCells)) {
      return {
        type: 'STATIC_OBSTACLE',
        reason: 'Target cell is blocked or outside boundaries',
        target: { x: nextStep.x, y: nextStep.y },
        severity: 'CRITICAL',
        recommendedAction: 'REPLAN'
      };
    }

    // If next step is WAIT in place, check if anyone is currently moving into our current position
    if (nextStep.x === robot.position.x && nextStep.y === robot.position.y) {
      // Check if another robot is entering our spot
      for (const [peerId, peer] of knownRobots.entries()) {
        if (peer.id === robot.id || peer.status === 'FAILED') continue;
        if (peer.nextPosition && peer.nextPosition.x === robot.position.x && peer.nextPosition.y === robot.position.y) {
          const peerPriority = calculateEffectivePriority(peer.urgency, peer.waitingTime);
          const myPriority = calculateEffectivePriority(robot.urgency, robot.waitingTime);
          return {
            type: 'ENCROACHMENT',
            reason: `Peer ${peerId} is entering current cell while waiting`,
            target: { x: robot.position.x, y: robot.position.y },
            peerId,
            peerPriority,
            myPriority,
            recommendedAction: myPriority > peerPriority ? 'HOLD' : 'YIELD'
          };
        }
      }
      return null;
    }

    // 2. Physical Occupancy: Is another robot currently standing on nextStep?
    for (const [peerId, peer] of knownRobots.entries()) {
      if (peer.id === robot.id) continue;

      if (peer.position && peer.position.x === nextStep.x && peer.position.y === nextStep.y) {
        // If peer is FAILED, it is physically dead on this cell: must replan around it
        if (peer.status === 'FAILED') {
          return {
            type: 'OCCUPIED_CELL',
            reason: `Cell (${nextStep.x},${nextStep.y}) is blocked by failed robot ${peerId}`,
            target: { x: nextStep.x, y: nextStep.y },
            peerId,
            recommendedAction: 'REPLAN'
          };
        }

        // Check if peer is actively moving away in this same tick
        const peerWillVacate = peer.nextPosition && 
          (peer.nextPosition.x !== nextStep.x || peer.nextPosition.y !== nextStep.y) &&
          peer.status === 'MOVING';

        if (!peerWillVacate) {
          const peerPriority = calculateEffectivePriority(peer.urgency, peer.waitingTime);
          const myPriority = calculateEffectivePriority(robot.urgency, robot.waitingTime);
          // If peer is IDLE or BLOCKED, it won't move away, so REPLAN around it immediately
          const recommendedAction = (peer.status === 'IDLE' || peer.status === 'BLOCKED') ? 'REPLAN' : 'WAIT';

          return {
            type: 'OCCUPIED_CELL',
            reason: `Cell (${nextStep.x},${nextStep.y}) is occupied by ${peerId} (${peer.status})`,
            target: { x: nextStep.x, y: nextStep.y },
            peerId,
            peerPriority,
            myPriority,
            recommendedAction
          };
        }
      }
    }

    // 3. Same-Cell Contention: Is another peer aiming for the same nextStep at the same tick?
    for (const [peerId, peer] of knownRobots.entries()) {
      if (peer.id === robot.id || peer.status === 'FAILED') continue;

      if (peer.nextPosition && peer.nextPosition.x === nextStep.x && peer.nextPosition.y === nextStep.y) {
        const peerPriority = calculateEffectivePriority(peer.urgency, peer.waitingTime);
        const myPriority = calculateEffectivePriority(robot.urgency, robot.waitingTime);

        return {
          type: 'SAME_CELL_CONTENTION',
          reason: `Both ${robot.id} and ${peerId} intend to enter (${nextStep.x},${nextStep.y})`,
          target: { x: nextStep.x, y: nextStep.y },
          peerId,
          peerPriority,
          myPriority,
          iWin: myPriority >= peerPriority,
          recommendedAction: myPriority >= peerPriority ? 'PROCEED' : 'YIELD'
        };
      }
    }

    // 4. Swap Conflict: R1 moves A -> B while R2 moves B -> A
    for (const [peerId, peer] of knownRobots.entries()) {
      if (peer.id === robot.id || peer.status === 'FAILED') continue;

      if (
        peer.position.x === nextStep.x &&
        peer.position.y === nextStep.y &&
        peer.nextPosition &&
        peer.nextPosition.x === robot.position.x &&
        peer.nextPosition.y === robot.position.y
      ) {
        const peerPriority = calculateEffectivePriority(peer.urgency, peer.waitingTime);
        const myPriority = calculateEffectivePriority(robot.urgency, robot.waitingTime);

        return {
          type: 'SWAP_COLLISION',
          reason: `Swap conflict with ${peerId}: mutual head-on crossing`,
          target: { x: nextStep.x, y: nextStep.y },
          peerId,
          peerPriority,
          myPriority,
          iWin: myPriority >= peerPriority,
          recommendedAction: myPriority >= peerPriority ? 'WAIT_FOR_CLEAR' : 'YIELD'
        };
      }
    }

    // 5. Time-based Reservation Table Check
    if (reservationManager) {
      const res = reservationManager.getReservation(nextStep.x, nextStep.y, nextStep.t);
      if (res && res.robotId !== robot.id) {
        const myPriority = calculateEffectivePriority(robot.urgency, robot.waitingTime);
        if (res.priority >= myPriority) {
          return {
            type: 'RESERVATION_CONFLICT',
            reason: `Cell reserved by ${res.robotId} at time t=${nextStep.t} with priority ${res.priority}`,
            target: { x: nextStep.x, y: nextStep.y },
            peerId: res.robotId,
            peerPriority: res.priority,
            myPriority,
            iWin: false,
            recommendedAction: 'REPLAN'
          };
        }
      }
    }

    return null;
  }
}
