/**
 * Central Node.js Server & Observer Layer
 * Serves REST endpoints and WebSocket stream to React Dashboard
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { SimulationLauncher } from './simulation/launcher.js';

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Instantiate Simulation Engine
const simulation = new SimulationLauncher();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('📡 React Dashboard client connected via WebSocket');

  // Send immediate initial state
  ws.send(JSON.stringify({
    type: 'STATE_UPDATE',
    payload: simulation.getSnapshot()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ADD_TASK') {
        const result = simulation.addTask(data.payload);
        if (result && !result.success) {
          ws.send(JSON.stringify({
            type: 'ACTION_ERROR',
            payload: { action: 'ADD_TASK', error: result.error }
          }));
        }
      } else if (data.type === 'TOGGLE_BLOCK') {
        simulation.toggleBlockCell(data.payload.x, data.payload.y);
      } else if (data.type === 'RESIZE_GRID') {
        simulation.resizeGrid(data.payload.rows, data.payload.cols);
      } else if (data.type === 'TOGGLE_FAIL') {
        simulation.toggleRobotFailure(data.payload.robotId);
      } else if (data.type === 'TOGGLE_PAUSE') {
        simulation.togglePause();
      } else if (data.type === 'SET_SPEED') {
        simulation.setSpeed(data.payload.speed);
      } else if (data.type === 'ADD_ROBOT') {
        simulation.addRobot(data.payload);
      } else if (data.type === 'RESET') {
        simulation.resetSimulation();
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('🔌 React Dashboard client disconnected');
  });
});

// Broadcast telemetry ticks to all connected frontend clients
simulation.onTelemetryUpdate = (snapshot) => {
  const message = JSON.stringify({
    type: 'STATE_UPDATE',
    payload: snapshot
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
};

// --- REST API Endpoints ---

// Get current snapshot
app.get('/api/state', (req, res) => {
  res.json(simulation.getSnapshot());
});

// Add dynamic task
app.post('/api/tasks', (req, res) => {
  const { pickup, delivery, urgency } = req.body;
  if (!pickup || !delivery) {
    return res.status(400).json({ error: 'Pickup and delivery coordinates required' });
  }
  const result = simulation.addTask({ pickup, delivery, urgency });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json(result);
});

// Block/unblock cell
app.post('/api/grid/block', (req, res) => {
  const { x, y } = req.body;
  if (x === undefined || y === undefined) {
    return res.status(400).json({ error: 'x and y coordinates required' });
  }
  const result = simulation.toggleBlockCell(Number(x), Number(y));
  res.json(result);
});

// Resize grid
app.post('/api/grid/resize', (req, res) => {
  const { rows, cols } = req.body;
  if (!rows || !cols) {
    return res.status(400).json({ error: 'rows and cols required' });
  }
  const result = simulation.resizeGrid(Number(rows), Number(cols));
  res.json(result);
});

// Add dynamic robot
app.post('/api/robots', (req, res) => {
  const { id, position } = req.body;
  if (!position) {
    return res.status(400).json({ error: 'Position coordinates required' });
  }
  const result = simulation.addRobot({ id, position });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.status(201).json(result);
});

// Simulate robot failure
app.post('/api/robots/:id/fail', (req, res) => {
  const { id } = req.params;
  simulation.toggleRobotFailure(id);
  res.json({ success: true, robotId: id });
});

// Simulation controls
app.post('/api/simulation/pause', (req, res) => {
  simulation.togglePause();
  res.json({ success: true, isRunning: simulation.isRunning });
});

app.post('/api/simulation/speed', (req, res) => {
  const { speed } = req.body;
  simulation.setSpeed(Number(speed));
  res.json({ success: true, speed: simulation.tickIntervalMs });
});

app.post('/api/simulation/reset', (req, res) => {
  simulation.resetSimulation();
  res.json({ success: true });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Robonex-2 Decentralized Warehouse Backend Started`);
  console.log(`📡 HTTP Server & REST API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Telemetry Stream: ws://localhost:${PORT}`);
  console.log(`🤖 Fleet running independently via local P2P negotiation`);
  console.log(`=======================================================`);
});
