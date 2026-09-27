import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = "ws://localhost:5050";

export function useSimulationSocket() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let reconnectTimeout = null;

    function connect() {
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("Connected to Robonex-2 Simulation Server");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "STATE_UPDATE") {
            setState(message.payload);
          } else if (message.type === "ACTION_ERROR") {
            setActionError(message.payload.error);
            setTimeout(() => setActionError(null), 5000);
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 1500);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    }

    connect();

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const sendAction = useCallback((type, payload = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const addTask = useCallback(
    (pickup, delivery, urgency) => {
      sendAction("ADD_TASK", { pickup, delivery, urgency });
    },
    [sendAction],
  );

  const addRobot = useCallback(
    (position, id) => {
      sendAction("ADD_ROBOT", { position, id });
    },
    [sendAction],
  );

  const toggleBlockCell = useCallback(
    (x, y) => {
      sendAction("TOGGLE_BLOCK", { x, y });
    },
    [sendAction],
  );

  const resizeGrid = useCallback(
    (rows, cols) => {
      sendAction("RESIZE_GRID", { rows, cols });
    },
    [sendAction],
  );

  const toggleRobotFailure = useCallback(
    (robotId) => {
      sendAction("TOGGLE_FAIL", { robotId });
    },
    [sendAction],
  );

  const togglePause = useCallback(() => {
    sendAction("TOGGLE_PAUSE");
  }, [sendAction]);

  const setSpeed = useCallback(
    (speed) => {
      sendAction("SET_SPEED", { speed });
    },
    [sendAction],
  );

  const resetSimulation = useCallback(() => {
    sendAction("RESET");
  }, [sendAction]);

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    state,
    connected,
    actionError,
    clearActionError,
    addTask,
    addRobot,
    toggleBlockCell,
    resizeGrid,
    toggleRobotFailure,
    togglePause,
    setSpeed,
    resetSimulation,
  };
}
