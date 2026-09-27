/**
 * Direct Peer-to-Peer Communication Network for Autonomous Robots
 * Enables direct message routing and state broadcast between robots.
 */

import { EventEmitter } from 'events';

export class P2PNetwork extends EventEmitter {
  constructor() {
    super();
    this.peers = new Map(); // robotId -> robotInstance
  }

  registerRobot(robot) {
    this.peers.set(robot.id, robot);
  }

  unregisterRobot(robotId) {
    this.peers.delete(robotId);
  }

  /**
   * Broadcast state from one robot to all other active peers
   */
  broadcast(senderId, payload) {
    for (const [peerId, peer] of this.peers.entries()) {
      if (peerId !== senderId) {
        peer.receivePeerMessage({
          from: senderId,
          type: 'BROADCAST_STATE',
          data: payload,
          timestamp: Date.now()
        });
      }
    }
    // Also notify observers (e.g. Dashboard telemetry)
    this.emit('telemetry', { senderId, payload });
  }

  /**
   * Send a direct P2P message to a specific peer
   */
  sendDirect(senderId, targetId, messageType, data) {
    const targetPeer = this.peers.get(targetId);
    if (targetPeer) {
      targetPeer.receivePeerMessage({
        from: senderId,
        type: messageType,
        data,
        timestamp: Date.now()
      });
    }
  }
}

// Global network instance for the simulation
export const globalP2PNetwork = new P2PNetwork();
