# ROBONEX | Decentralized Multi-Robot Warehouse Coordination

Robonex is a real-time multi-robot warehouse coordination simulator built with **Node.js and React**. It demonstrates how multiple autonomous mobile robots (AMRs) can independently navigate a shared warehouse grid, coordinate aisle access, avoid collisions, and resolve deadlocks without relying on a central controller to dictate individual robot movements.

---

## 1. The Core Idea

In a conventional warehouse system, a central server calculates and commands every step for every robot. If that central planner experiences lag or fails, the whole warehouse stalls.

Robonex uses a **decentralized multi-agent approach**:
- **Robots make their own decisions:** Each robot maintains its own internal state, plans its own routes using **Space-Time $A^*$**, and checks for conflicts with other robots.
- **Direct P2P communication:** Robots broadcast their state and coordinates to each other over a peer-to-peer event bus.
- **Space-Time Reservations:** Instead of claiming a physical cell forever, a robot reserves cell $(x, y)$ for a specific time tick $t$. This allows multiple robots to safely use the same narrow aisles at different times.
- **Observation, not command:** The central server does not tell robots where to go. It serves as an **observer, telemetry stream, and environment manager** (allowing users to inject obstacles, dispatch tasks, or deploy robots).

---

## 2. System Architecture

```text
                           React Dashboard (Vite :5174)
                                      │
                         HTTP REST    │   WebSocket Telemetry
                         & Actions    │   (ws://localhost:5050)
                                      ▼
                      Node.js Observer Server (Port 5050)
                    - In-Memory Simulation State
                    - Telemetry Broadcast to UI
                    - User Action Dispatcher (Tasks, Obstacles, Robots)
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
             [Robot R1]           [Robot R2]           [Robot R3] ... [Robot RN]
          ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
          │ Space-Time A*│     │ Space-Time A*│     │ Space-Time A*│
          │ Conflict Det │     │ Conflict Det │     │ Conflict Det │
          │ Wait-For WFG │     │ Wait-For WFG │     │ Wait-For WFG │
          │ Recovery FSM │     │ Recovery FSM │     │ Recovery FSM │
          └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
                 │                    │                    │
                 └────────── P2P Communication ────────────┘
                    - Broadcast state (position, status)
                    - Yield & step-aside requests
                    - Reservation table lookups
```

### Roles & Responsibilities

| Component | Responsibility |
|---|---|
| **Robot Agents (`robot.js`)** | Autonomous agents. Plan paths via Space-Time $A^*$, negotiate reservations, check physical occupancy before moving, detect wait cycles, and recover from deadlocks. |
| **P2P Bus (`p2p.js`)** | In-process communication layer passing state broadcasts and direct peer messages (`YIELD_REQUEST`, `BROADCAST_STATE`). |
| **Central Server (`server.js` + `launcher.js`)** | Environment custodian. Tracks grid boundaries, obstacles, and the task pool. Broadcasts telemetry to the dashboard via WebSockets. Does **not** compute robot paths. |
| **React Dashboard (`frontend/`)** | Live operator console. Renders the interactive grid, task queue, robot telemetry cards, space-time reservation inspector, and live event log. |

---

## 3. How the State & Refreshing Works

A common question is: **"Why does the grid map and robot positions not reset when I refresh the browser page?"**

- **Where state lives:** The true simulation state lives **in memory inside the Node.js backend process** (`launcher.js`). This includes the grid dimensions, blocked cells (`Set`), active robots (`Map`), pending tasks (`Array`), and current simulation tick.
- **What happens on page refresh:** When you reload your browser, the React frontend simply reconnects to `ws://localhost:5050` or calls `GET /api/state`. The backend immediately sends the current live simulation snapshot.
- **How to reset the simulation:**
  - Click the **"Reset"** button on the top control bar in the UI (calls `POST /api/system/reset`).
  - Or restart the backend terminal process.

---

## 4. Core Algorithms & Coordination Logic

### A. Space-Time $A^*$ Path Planner (`algorithms/astar.js`)
Standard $A^*$ searches 2D space $(x, y)$. Robonex searches a 3D state space: **$(x, y, t)$**.
- **Actions at each tick:**
  - `MOVE`: Step to an orthogonal neighbor at $t+1$.
  - `WAIT`: Remain on the current cell at $t+1$ (with a slight cost penalty so robots prefer moving when possible).
- **Stationary Obstacle Avoidance:** Idle, broken (`FAILED`), or blocked robots are treated as physical obstacles across all time horizons. A moving robot will plan a detour around parked robots rather than driving through them.
- **Head-on Swap Prevention:** The planner rejects candidate moves where Robot A moves from $(x_1, y_1)$ to $(x_2, y_2)$ while Robot B moves from $(x_2, y_2)$ to $(x_1, y_1)$ at the same time tick.
- **Bounded Horizon:** Planning is bounded by a maximum time horizon (50 ticks) to keep computation fast and predictable.

### B. Time-Based Reservation Table (`algorithms/reservation.js`)
Robots register their planned trajectories in a shared reservation manager:
- Entry format: `(x, y) @ t -> { robotId, priority }`
- **Stationary Reservation:** When a robot becomes idle or breaks down, it registers a stationary reservation on its current cell for future ticks.
- **Deterministic Arbitration:** If two robots claim the same cell at the same time:
  1. The robot with the higher `effectivePriority` wins.
  2. If priorities are equal, a deterministic string comparison on their IDs (`robotId_A.localeCompare(robotId_B)`) breaks the tie.
  3. The yielding robot either waits or replans.
- **Pruning:** Past reservations ($t < \text{currentTick}$) are pruned every tick to prevent memory growth.

### C. Starvation-Free Priority Arbitration
Robots calculate priority dynamically:
$$\text{effectivePriority} = \text{urgency} + (\text{waitingTime} \times 0.5)$$
- `urgency`: Defined by the task (1 to 10).
- `waitingTime`: Increments every tick a robot is stuck or waiting.
- **Anti-Starvation:** A low-priority robot waiting in an aisle will gradually gain priority until it outranks newcomers, guaranteeing it will eventually get to move.

### D. Hard Physical Occupancy Guard (`robot.js`)
Before executing any physical step into cell `nextStep`:
1. The robot checks if another robot physically occupies `nextStep` right now.
2. If the cell is occupied:
   - If the occupant is **IDLE**, **BLOCKED**, or **FAILED**, the moving robot **immediately replans** around it.
   - If the occupant is **MOVING** or **WAITING**, the robot **waits** for the cell to clear.
3. This guarantees two robots never physically overlap on the same cell at the same time.

### E. Opportunistic Shortcut Re-planning
When a blocked cell is unblocked by an operator:
- Every active robot invokes `replanIfShorter()`.
- If the newly opened cell allows a shorter path than the robot's current detour, the robot immediately updates its trajectory to take the shorter shortcut.

### F. Unreachable Task Handling (`taskAllocator.js`)
When a task is added:
- If obstacles or walls completely surround the pickup or delivery points, `TaskAllocator` recognizes that `minETA = Infinity`.
- The task is **not discarded**. It remains in the queue as `PENDING` with an error message: `"No walkable path available (waiting for obstacle clearance)"`.
- The moment an operator removes the blocking obstacles, the simulation automatically allocates the pending task to the best available robot without needing manual re-entry.

### G. Deadlock Detection & 4-Level Recovery (`algorithms/deadlock.js`)
When two or more robots wait on each other in narrow corridors, deadlocks can form.
1. **Wait-For Graph (WFG):** Robots report who they are waiting for ($R_1 \to R_2$).
2. **Cycle Detection:** A depth-first search (DFS) checks for circular dependencies ($R_1 \to R_2 \to R_1$).
3. **Graduated 4-Level Recovery:**
   - **Level 1 (Replan):** Attempt an alternative Space-Time path avoiding the contested cell.
   - **Level 2 (Backtrack):** The yielding robot steps backward along its own history to open up a choke point.
   - **Level 3 (Priority Lock):** The robot receives a temporary urgency boost (+10) to force deterministic right-of-way.
   - **Level 4 (Task Reassignment):** If still stuck after multiple attempts, the robot drops the task back into the pending pool and returns to `IDLE` so another robot can service it.

---

## 5. Project Structure

```text
robonex-2/
├── .gitignore                  # Git ignore rules (node_modules, .env, builds, logs)
├── package.json                # Root package metadata
├── README.md                   # Complete system documentation
│
├── backend/
│   ├── package.json            # Backend scripts & dependencies
│   ├── server.js               # Express REST server & WebSocket telemetry broadcaster
│   ├── algorithms/
│   │   ├── astar.js            # Space-Time A* (x, y, t) & BFS distance utilities
│   │   ├── conflict.js         # Spatial, temporal, and swap conflict detector
│   │   ├── deadlock.js         # Wait-For Graph (WFG), cycle detection & 4-level recovery
│   │   ├── reservation.js      # Space-time reservation table & tie-breaking
│   │   └── taskAllocator.js    # ETA-based task allocator with obstacle awareness
│   ├── communication/
│   │   └── p2p.js              # Peer-to-peer event bus for robot agents
│   ├── simulation/
│   │   ├── launcher.js         # Simulation lifecycle, task pool, and environment manager
│   │   └── robots/
│   │       └── robot.js        # Autonomous robot agent state machine & execution loop
│   └── utils/
│       └── grid.js             # Walkability, orthogonal neighbors, and Manhattan distance
│
└── frontend/
    ├── package.json            # Frontend dependencies (React, Vite, Lucide icons)
    ├── vite.config.js          # Vite config (runs dev server on port 5174)
    ├── index.html              # HTML entry point
    └── src/
        ├── App.jsx             # Main dashboard layout
        ├── index.css           # Glassmorphism dark UI styling
        ├── hooks/
        │   └── useSimulationSocket.js # WebSocket client hook with reconnect logic
        └── components/
            ├── WarehouseGrid.jsx   # Interactive floor grid & Space-Time inspector
            ├── TaskManager.jsx     # Task dispatch form, validation, and queue list
            ├── RobotFleet.jsx      # Robot cards, dynamic deployer, and kill switches
            ├── ControlBar.jsx      # Clock speed, pause/resume, resize, and reset
            └── ConflictLog.jsx     # Live event and telemetry feed
```

---

## 6. Setup & Running Locally

### Prerequisites
- **Node.js:** v18 or higher (tested on Node v20 / v22 / v24)
- **npm:** v9 or higher

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/prince-patel-cse/RoboNex.git
   cd RoboNex
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```
   *(Uses `node --watch server.js` to automatically reload if backend files change).*
   - REST API: `http://localhost:5050`
   - WebSocket: `ws://localhost:5050`

2. **Start the Frontend Dashboard:**
   In a second terminal window:
   ```bash
   cd frontend
   npm run dev
   ```
   - Open your browser at: `http://localhost:5174`

---

## 7. Interactive Controls & Features

1. **Space-Time Inspector:** Click on any robot card or grid token. Its planned trajectory will be highlighted with cyan reservation markers displaying the scheduled arrival tick ($t=\dots$) at each step.
2. **Interactive Obstacle Placement:** Click any free grid cell to toggle an obstacle block. Any robot whose path intersects the cell will immediately reroute.
3. **Opportunistic Shortcuts:** Unblock a cell along a detour. Moving robots will recalculate and take the newly opened shortcut immediately.
4. **Task Dispatcher:** Enter pickup and delivery coordinates with an urgency level (1–10), or click **"Auto Dispatch"** for randomized tasks. Blocked cells are rejected with an error banner.
5. **Dynamic Robot Deployment:** Click **"Drop on Grid"** in the Robot Fleet panel and click any empty cell to deploy a new robot (`R5`, `R6`, etc.) in real time.
6. **Hardware Failure Simulation:** Click **"Kill"** on any robot card to simulate a mechanical breakdown. The robot stops moving, turns red, reserves its spot as a stationary obstacle, and any active task is reassigned to another robot.
7. **Grid Resizing:** Dynamically change warehouse rows and columns from the control bar without restarting.

---

## 8. REST API Reference

The backend provides HTTP endpoints for external tools or scripts:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | Returns the complete simulation snapshot (grid, robots, tasks, events, stats). |
| `POST` | `/api/tasks` | Create a new task. Body: `{ pickup: {x,y}, delivery: {x,y}, urgency: number }`. |
| `POST` | `/api/environment/block` | Toggle obstacle at cell. Body: `{ x: number, y: number }`. |
| `POST` | `/api/fleet/robot` | Deploy new robot. Body: `{ position: {x,y}, id?: string }`. |
| `POST` | `/api/fleet/:id/fail` | Toggle simulated failure on robot `:id`. |
| `POST` | `/api/environment/resize` | Resize grid. Body: `{ rows: number, cols: number }`. |
| `POST` | `/api/system/speed` | Change tick interval. Body: `{ intervalMs: number }` (100–2000ms). |
| `POST` | `/api/system/pause` | Pause or resume simulation loop. |
| `POST` | `/api/system/reset` | Reset simulation state back to factory default. |

---

## 9. Assumptions & Design Trade-offs

To keep the project grounded, understandable, and runnable without specialized robotics hardware or distributed clusters, the following design trade-offs were made:

1. **Discrete Grid & Clock:** The warehouse is modeled as a 2D grid where time advances in discrete ticks (default 600ms per tick). Real-world continuous kinematics (turning radius, acceleration curves) are simplified to discrete orthogonal movements.
2. **In-Process P2P Simulation:** Communication between robots is modeled using an asynchronous Node.js EventEmitter bus. In real hardware, this would map to ROS2 DDS or 802.11p Wi-Fi mesh broadcasts.
3. **Shared Reservation Table:** The reservation table is hosted in-memory and accessed cooperatively by robot instances. In a fully distributed physical deployment without shared memory, this would be implemented via distributed consensus (e.g. Raft or distributed locking).
4. **Single-Parcel Capacity:** Each robot carries one task at a time (pickup $\to$ delivery). Batch pickup routing (VRP) is left as a future extension.
