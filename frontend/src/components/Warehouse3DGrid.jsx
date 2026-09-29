import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getRobotColor } from './WarehouseGrid';
import { 
  Box, 
  RotateCcw, 
  Eye, 
  Compass, 
  Maximize2, 
  Layers, 
  Grid as GridIcon, 
  Zap, 
  Play, 
  Pause,
  Sun,
  Moon,
  Crosshair,
  Radio,
  Sliders,
  MousePointer
} from 'lucide-react';

/**
 * Generates smooth curved trajectory points for visual path overlay on the floor.
 * Safely adds gentle corner rounding inside walkable intersections.
 */
function generateCurvedTrajectoryPoints(pathCells, cellSize, halfWidth, halfHeight) {
  if (!pathCells || pathCells.length === 0) return [];

  const worldPoints = pathCells.map(c => ({
    x: (c.x + 0.5) * cellSize - halfWidth,
    z: (c.y + 0.5) * cellSize - halfHeight
  }));

  if (worldPoints.length <= 2) {
    return worldPoints.map(p => new THREE.Vector3(p.x, 0.12, p.z));
  }

  const result = [];
  const filletRadius = 0.35; // Safe inner radius within cell intersection
  result.push(new THREE.Vector3(worldPoints[0].x, 0.12, worldPoints[0].z));

  for (let i = 1; i < worldPoints.length - 1; i++) {
    const prev = worldPoints[i - 1];
    const curr = worldPoints[i];
    const next = worldPoints[i + 1];

    const vInX = curr.x - prev.x;
    const vInZ = curr.z - prev.z;
    const lenIn = Math.hypot(vInX, vInZ);

    const vOutX = next.x - curr.x;
    const vOutZ = next.z - curr.z;
    const lenOut = Math.hypot(vOutX, vOutZ);

    if (lenIn > 0.1 && lenOut > 0.1) {
      const uInX = vInX / lenIn;
      const uInZ = vInZ / lenIn;
      const uOutX = vOutX / lenOut;
      const uOutZ = vOutZ / lenOut;
      const dot = uInX * uOutX + uInZ * uOutZ;

      if (dot < 0.75) {
        // Corner fillet
        const pStart = { x: curr.x - uInX * filletRadius, z: curr.z - uInZ * filletRadius };
        const pEnd = { x: curr.x + uOutX * filletRadius, z: curr.z + uOutZ * filletRadius };

        result.push(new THREE.Vector3(pStart.x, 0.12, pStart.z));
        for (let s = 1; s <= 2; s++) {
          const u = s / 3;
          const inv = 1 - u;
          const bx = inv * inv * pStart.x + 2 * inv * u * curr.x + u * u * pEnd.x;
          const bz = inv * inv * pStart.z + 2 * inv * u * curr.z + u * u * pEnd.z;
          result.push(new THREE.Vector3(bx, 0.12, bz));
        }
        result.push(new THREE.Vector3(pEnd.x, 0.12, pEnd.z));
        continue;
      }
    }
    result.push(new THREE.Vector3(curr.x, 0.12, curr.z));
  }

  const last = worldPoints[worldPoints.length - 1];
  result.push(new THREE.Vector3(last.x, 0.12, last.z));
  return result;
}

export function Warehouse3DGrid({
  grid = { rows: 10, cols: 10, blockedCells: [] },
  robots = [],
  tasks = [],
  interactionMode = 'BLOCK',
  selectedRobotId = null,
  onSelectRobot = () => {},
  onCellClick = () => {}
}) {
  const mountRef = useRef(null);
  const [viewPreset, setViewPreset] = useState('ISOMETRIC'); // 'ISOMETRIC' | 'TOP' | 'FRONT'
  const [hoveredCellPos, setHoveredCellPos] = useState(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const robotMeshesRef = useRef({});
  const wallMeshesRef = useRef({});
  const zoneMeshesRef = useRef([]);
  const pathLinesRef = useRef([]);
  const hoverMeshRef = useRef(null);
  const animFrameRef = useRef(null);
  const gltfTemplateRef = useRef(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const clockRef = useRef(new THREE.Clock());

  // Camera Damping & Rotational Inertia State
  const sphericalRef = useRef({ radius: 26, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const targetSphericalRef = useRef({ radius: 26, theta: Math.PI / 4, phi: Math.PI / 3.2 });

  // Load model.glb once for the entire simulation
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load('/model.glb', (gltf) => {
      gltfTemplateRef.current = gltf;
      setModelLoaded(true);
    }, undefined, (err) => console.error('Failed to load /model.glb in simulation:', err));
  }, []);

  // Initialize Large-Scale High-Precision 3D Warehouse Simulation
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const rows = grid.rows || 10;
    const cols = grid.cols || 10;
    const cellSize = 2.0; // Large 3D cell size
    const halfWidth = (cols * cellSize) / 2;
    const halfHeight = (rows * cellSize) / 2;

    // 1. Scene — Warm Industrial Warehouse Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1d21); // Dark neutral background beyond warehouse
    scene.fog = new THREE.Fog(0x1a1d21, 55, 90); // Atmospheric depth fog
    sceneRef.current = scene;

    // 2. Camera setup - wide angle large view
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 3. Renderer with high PBR quality & soft shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Professional Industrial Warehouse Lighting System
    // Warm ambient — simulates bounced warehouse overhead light
    const ambientLight = new THREE.AmbientLight(0xf5f0e8, 0.55);
    scene.add(ambientLight);

    // Hemisphere light — sky/ground bounce for realism
    const hemiLight = new THREE.HemisphereLight(0xf0ece4, 0x3a3a3a, 0.45);
    scene.add(hemiLight);

    // Primary overhead directional — simulates high-bay warehouse lights
    const mainSun = new THREE.DirectionalLight(0xfff8ee, 1.4);
    mainSun.position.set(halfWidth * 1.5, 40, halfHeight * 1.5);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.bias = -0.0002;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 80;
    mainSun.shadow.camera.left = -halfWidth * 2;
    mainSun.shadow.camera.right = halfWidth * 2;
    mainSun.shadow.camera.top = halfHeight * 2;
    mainSun.shadow.camera.bottom = -halfHeight * 2;
    scene.add(mainSun);

    // Secondary fill light — cool tone from opposite side for depth
    const fillLight = new THREE.DirectionalLight(0xd4e5f7, 0.35);
    fillLight.position.set(-halfWidth * 2, 25, -halfHeight * 2);
    scene.add(fillLight);

    // Accent point lights at corners — simulates overhead bay fixtures
    const bayLightColor = 0xfff4e0;
    [
      [halfWidth * 0.5, halfHeight * 0.5],
      [-halfWidth * 0.5, halfHeight * 0.5],
      [halfWidth * 0.5, -halfHeight * 0.5],
      [-halfWidth * 0.5, -halfHeight * 0.5]
    ].forEach(([lx, lz]) => {
      const pLight = new THREE.PointLight(bayLightColor, 0.3, 30);
      pLight.position.set(lx, 12, lz);
      scene.add(pLight);
    });

    // 5. Polished Concrete Industrial Floor (Light warm gray — REAL warehouse look)
    const floorGeo = new THREE.PlaneGeometry(cols * cellSize + 12, rows * cellSize + 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xc8c2b8, // Light warm concrete — like real polished warehouse epoxy floor
      roughness: 0.55,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Sub-floor slab — slight darker concrete beneath for depth
    const subFloorGeo = new THREE.PlaneGeometry(cols * cellSize + 16, rows * cellSize + 16);
    const subFloorMat = new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.75, metalness: 0.02 });
    const subFloor = new THREE.Mesh(subFloorGeo, subFloorMat);
    subFloor.rotation.x = -Math.PI / 2;
    subFloor.position.y = -0.03;
    subFloor.receiveShadow = true;
    scene.add(subFloor);

    // PRIMARY GRID — Subtle warehouse floor lane markings (muted warm gray lines)
    const gridPrimary = new THREE.GridHelper(cols * cellSize, cols, 0x9a9488, 0x9a9488);
    gridPrimary.position.y = 0.005;
    gridPrimary.material.opacity = 0.45;
    gridPrimary.material.transparent = true;
    scene.add(gridPrimary);

    // SECONDARY FINE GRID — Very subtle subdivision grid
    const gridSecondary = new THREE.GridHelper(cols * cellSize, cols * 2, 0x8a8478, 0xb0a99e);
    gridSecondary.position.y = 0.003;
    gridSecondary.material.opacity = 0.15;
    gridSecondary.material.transparent = true;
    scene.add(gridSecondary);

    // Perimeter Safety Marking — Thin yellow safety line (like real warehouse floor tape)
    const safetyLineMat = new THREE.MeshStandardMaterial({ color: 0xe8b930, roughness: 0.4, metalness: 0.15 });
    // North & South lines
    [halfHeight, -halfHeight].forEach(z => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(cols * cellSize + 0.2, 0.015, 0.12), safetyLineMat);
      line.position.set(0, 0.01, z);
      scene.add(line);
    });
    // East & West lines
    [halfWidth, -halfWidth].forEach(x => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, rows * cellSize + 0.2), safetyLineMat);
      line.position.set(x, 0.01, 0);
      scene.add(line);
    });

    // Structural H-Beam Steel Columns — Realistic industrial gray
    const steelColumnMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: 0.85, roughness: 0.25 });
    const columnPositions = [
      [halfWidth + 1.2, halfHeight + 1.2],
      [-halfWidth - 1.2, halfHeight + 1.2],
      [halfWidth + 1.2, -halfHeight - 1.2],
      [-halfWidth - 1.2, -halfHeight - 1.2]
    ];

    columnPositions.forEach(([cx, cz]) => {
      // Main I-beam column
      const colMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.0, 0.5), steelColumnMat);
      colMesh.position.set(cx, 4.5, cz);
      colMesh.castShadow = true;
      scene.add(colMesh);

      // Column base plate
      const basePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.08, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x585858, metalness: 0.9, roughness: 0.2 })
      );
      basePlate.position.set(cx, 0.04, cz);
      basePlate.castShadow = true;
      scene.add(basePlate);

      // Column cap bracket
      const capBracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.12, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x585858, metalness: 0.9, roughness: 0.2 })
      );
      capBracket.position.set(cx, 9.0, cz);
      scene.add(capBracket);
    });

    // Overhead Steel Roof Trusses (cross beams between columns)
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.88, roughness: 0.22 });
    // Longitudinal beams
    [halfWidth + 1.2, -halfWidth - 1.2].forEach(x => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, rows * cellSize + 2.8), trussMat);
      beam.position.set(x, 9.1, 0);
      scene.add(beam);
    });
    // Lateral beams
    [halfHeight + 1.2, -halfHeight - 1.2].forEach(z => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(cols * cellSize + 2.8, 0.35, 0.2), trussMat);
      beam.position.set(0, 9.1, z);
      scene.add(beam);
    });

    // 6. HOVER CELL HIGHLIGHT MESH (For Block Placement)
    const hoverGroup = new THREE.Group();
    const hoverPadMat = new THREE.MeshBasicMaterial({ color: 0x2980b9, transparent: true, opacity: 0.3 });
    const hoverPad = new THREE.Mesh(new THREE.PlaneGeometry(cellSize * 0.94, cellSize * 0.94), hoverPadMat);
    hoverPad.rotation.x = -Math.PI / 2;
    hoverPad.position.y = 0.03;

    // Bounding Wireframe Box
    const wireframeGeo = new THREE.BoxGeometry(cellSize * 0.94, 0.3, cellSize * 0.94);
    const wireframeMat = new THREE.MeshBasicMaterial({ color: 0x3498db, wireframe: true });
    const wireframeBox = new THREE.Mesh(wireframeGeo, wireframeMat);
    wireframeBox.position.y = 0.15;

    hoverGroup.add(hoverPad, wireframeBox);
    hoverGroup.visible = false;
    scene.add(hoverGroup);
    hoverMeshRef.current = hoverGroup;

    // Floor Interactive Hitbox Mesh for Raycasting Cell Clicks & Hovers
    const cellHitboxes = new THREE.Group();
    const cellGeo = new THREE.PlaneGeometry(cellSize - 0.05, cellSize - 0.05);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellMat = new THREE.MeshBasicMaterial({ visible: false });
        const cellMesh = new THREE.Mesh(cellGeo, cellMat);
        cellMesh.rotation.x = -Math.PI / 2;
        cellMesh.position.set(
          (c + 0.5) * cellSize - halfWidth,
          0.02,
          (r + 0.5) * cellSize - halfHeight
        );
        cellMesh.userData = { gridX: c, gridY: r };
        cellHitboxes.add(cellMesh);
      }
    }
    scene.add(cellHitboxes);

    // 7. Camera Damping Orbit Controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const updateCamera = () => {
      const target = targetSphericalRef.current;
      const current = sphericalRef.current;

      target.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.02, target.phi));
      target.radius = Math.max(8, Math.min(60, target.radius));

      current.theta += (target.theta - current.theta) * 0.12;
      current.phi += (target.phi - current.phi) * 0.12;
      current.radius += (target.radius - current.radius) * 0.12;

      if (viewPreset === 'TOP') {
        camera.position.set(0, current.radius, 0.001);
        camera.lookAt(0, 0, 0);
      } else if (viewPreset === 'FRONT') {
        camera.position.set(0, 5, current.radius);
        camera.lookAt(0, 1.0, 0);
      } else {
        camera.position.x = current.radius * Math.sin(current.phi) * Math.sin(current.theta);
        camera.position.y = current.radius * Math.cos(current.phi);
        camera.position.z = current.radius * Math.sin(current.phi) * Math.cos(current.theta);
        camera.lookAt(0, 0.5, 0);
      }
    };

    updateCamera();

    const onMouseDown = (e) => {
      if (e.button === 0) {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e) => {
      const rect = domElem.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Handle dragging
      if (isDragging) {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        targetSphericalRef.current.theta -= dx * 0.006;
        targetSphericalRef.current.phi -= dy * 0.006;
        prevMouse = { x: e.clientX, y: e.clientY };
      }

      // Raycast hover cell
      raycaster.setFromCamera(mouse, camera);
      const cellHits = raycaster.intersectObjects(cellHitboxes.children);

      if (cellHits.length > 0) {
        const { gridX, gridY } = cellHits[0].object.userData;
        setHoveredCellPos({ x: gridX, y: gridY });

        if (hoverMeshRef.current) {
          hoverMeshRef.current.position.set(
            (gridX + 0.5) * cellSize - halfWidth,
            0,
            (gridY + 0.5) * cellSize - halfHeight
          );
          hoverMeshRef.current.visible = true;
        }
      } else {
        setHoveredCellPos(null);
        if (hoverMeshRef.current) hoverMeshRef.current.visible = false;
      }
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      targetSphericalRef.current.radius += e.deltaY * 0.015;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElem.addEventListener('wheel', onWheel, { passive: false });

    // Touch Support
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e) => {
      if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        targetSphericalRef.current.theta -= dx * 0.006;
        targetSphericalRef.current.phi -= dy * 0.006;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchEnd = () => { isDragging = false; };

    domElem.addEventListener('touchstart', onTouchStart);
    domElem.addEventListener('touchmove', onTouchMove);
    domElem.addEventListener('touchend', onTouchEnd);

    // Click Raycaster
    const onClick = (e) => {
      const rect = domElem.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Robot clicks
      const robotMeshesList = Object.values(robotMeshesRef.current).map(r => r.group);
      const robotHits = raycaster.intersectObjects(robotMeshesList, true);

      if (robotHits.length > 0) {
        let curr = robotHits[0].object;
        while (curr && !curr.userData.robotId && curr.parent) {
          curr = curr.parent;
        }
        if (curr && curr.userData.robotId) {
          onSelectRobot(curr.userData.robotId);
          return;
        }
      }

      // Cell clicks
      const cellHits = raycaster.intersectObjects(cellHitboxes.children);
      if (cellHits.length > 0) {
        const { gridX, gridY } = cellHits[0].object.userData;
        onCellClick(gridX, gridY);
      }
    };

    domElem.addEventListener('click', onClick);

    // Render Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      updateCamera();
      const delta = clockRef.current.getDelta();
      const dt = Math.min(delta, 0.05);

      // Animate AMRs with corridor-constrained smooth motion, curve slowdown, and synchronized wheels
      Object.values(robotMeshesRef.current).forEach(rData => {
        if (rData.mixer) {
          rData.mixer.update(delta);
        }

        if (rData.lidar) rData.lidar.rotation.y += 0.12;

        if (rData.group && rData.targetPos) {
          const dt = Math.min(delta, 0.05);

          // Vector from 3D model position directly to current algorithm cell center
          const dx = rData.targetPos.x - rData.group.position.x;
          const dz = rData.targetPos.z - rData.group.position.z;
          const dist = Math.hypot(dx, dz);

          // Detect upcoming turn at this cell from rData.nextStep (planned next step)
          let isTurnAhead = false;
          let turnAngle = 0;
          let uOutX = 0;
          let uOutZ = 0;

          if (rData.nextStep && dist > 0.04) {
            const nextX = (rData.nextStep.x + 0.5) * cellSize - halfWidth;
            const nextZ = (rData.nextStep.y + 0.5) * cellSize - halfHeight;
            const vNextX = nextX - rData.targetPos.x;
            const vNextZ = nextZ - rData.targetPos.z;
            const lenNext = Math.hypot(vNextX, vNextZ);
            if (lenNext > 0.1) {
              const uInX = dx / dist;
              const uInZ = dz / dist;
              uOutX = vNextX / lenNext;
              uOutZ = vNextZ / lenNext;
              const dot = uInX * uOutX + uInZ * uOutZ;
              // If dot < 0.75, it's a corner turn (90 deg has dot ~ 0)
              if (dot < 0.75) {
                isTurnAhead = true;
                turnAngle = Math.atan2(vNextX, vNextZ);
              }
            }
          }

          // DYNAMIC SPEED CONTROLLER:
          // Straight cruising speed: ~3.4 m/s (covers 2.0m cell in ~0.59s, in lockstep with 600ms tick)
          // Curve speed: ~1.4 m/s (~41% of cruising speed: slows down smoothly for curves!)
          const cruiseSpeed = 3.4;
          const curveSpeed = 1.4;

          const isMoving = rData.status === 'MOVING' || dist > 0.04;
          let targetSpeed = 0;

          if (isMoving && dist > 0.03) {
            if (isTurnAhead && dist < 0.95) {
              // Smoothly slow down as we approach and enter the curve
              targetSpeed = THREE.MathUtils.lerp(curveSpeed, cruiseSpeed, Math.max(0, (dist - 0.2) / 0.75));
            } else {
              targetSpeed = cruiseSpeed;
            }
          } else {
            targetSpeed = 0;
          }

          // Smooth acceleration and deceleration
          const accel = 6.5; // m/s^2
          const decel = 9.0; // m/s^2
          if (rData.currentSpeed === undefined) rData.currentSpeed = 0;
          if (rData.currentSpeed < targetSpeed) {
            rData.currentSpeed = Math.min(targetSpeed, rData.currentSpeed + accel * dt);
          } else if (rData.currentSpeed > targetSpeed) {
            rData.currentSpeed = Math.max(targetSpeed, rData.currentSpeed - decel * dt);
          }

          // HEADING CONTROL:
          // By default, face the target cell.
          // When in the turn zone (within 0.35m of intersection center), smoothly blend heading to turnAngle
          let desiredHeading = rData.group.rotation.y;
          if (dist > 0.03) {
            desiredHeading = Math.atan2(dx, dz);
          }
          if (isTurnAhead && dist < 0.35) {
            desiredHeading = turnAngle;
          }

          // Shortest-arc angular rotation (no 360 flip)
          let angleDiff = desiredHeading - rData.group.rotation.y;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          const rotRate = (isTurnAhead && dist < 0.35) ? 7.0 : 5.5; // rad/s
          const rotStep = THREE.MathUtils.clamp(angleDiff, -rotRate * dt, rotRate * dt);
          rData.group.rotation.y += rotStep;

          // CORRIDOR-CONSTRAINED POSITION UPDATE (100% collision-free, strictly follows algorithm):
          if (dist > 0.02 && rData.currentSpeed > 0.02) {
            const stepDist = Math.min(dist, rData.currentSpeed * dt);
            const uX = dx / dist;
            const uZ = dz / dist;

            // When inside the intersection cell (dist < 0.30m), apply subtle rounded corner curve:
            let moveX = uX;
            let moveZ = uZ;
            if (isTurnAhead && dist < 0.30 && (uOutX !== 0 || uOutZ !== 0)) {
              const curveProgress = (0.30 - dist) / 0.30;
              moveX = THREE.MathUtils.lerp(uX, uOutX, curveProgress * 0.45);
              moveZ = THREE.MathUtils.lerp(uZ, uOutZ, curveProgress * 0.45);
              const mLen = Math.hypot(moveX, moveZ) || 1;
              moveX /= mLen;
              moveZ /= mLen;
            }

            rData.group.position.x += moveX * stepDist;
            rData.group.position.z += moveZ * stepDist;

            // Micro-suspension: subtle body lean into curve
            if (rData.clonedModel) {
              const targetRoll = THREE.MathUtils.clamp(-rotStep / dt * 0.012, -0.03, 0.03);
              rData.clonedModel.rotation.z = THREE.MathUtils.lerp(rData.clonedModel.rotation.z, targetRoll, 0.15);
            }
          } else {
            // Settle exactly at cell center
            rData.group.position.x = rData.targetPos.x;
            rData.group.position.z = rData.targetPos.z;
            if (rData.clonedModel) {
              rData.clonedModel.rotation.z = THREE.MathUtils.lerp(rData.clonedModel.rotation.z, 0, 0.2);
            }
          }

          // Wheel Roll Animation synchronized with actual ground speed
          if (rData.actions && rData.actions['wheel-roll']) {
            const wheelAction = rData.actions['wheel-roll'];
            if (rData.currentSpeed > 0.1) {
              if (!wheelAction.isRunning()) {
                wheelAction.setLoop(THREE.LoopRepeat).play();
              }
              // Scale timeScale directly with ground speed (slower in curves, faster on straights)
              wheelAction.timeScale = THREE.MathUtils.clamp((rData.currentSpeed / cruiseSpeed) * 1.6, 0.4, 2.2);
            } else {
              if (wheelAction.isRunning()) {
                wheelAction.stop();
              }
            }
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      domElem.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElem.removeEventListener('wheel', onWheel);
      domElem.removeEventListener('touchstart', onTouchStart);
      domElem.removeEventListener('touchmove', onTouchMove);
      domElem.removeEventListener('touchend', onTouchEnd);
      domElem.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      if (container) container.innerHTML = '';
      robotMeshesRef.current = {};
      wallMeshesRef.current = {};
      zoneMeshesRef.current = [];
      pathLinesRef.current = [];
    };
  }, [grid.rows, grid.cols, viewPreset]);

  // Sync Distinct Industrial Concrete & Metallic Barrier Blocks (Obstacle Walls)
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const rows = grid.rows || 10;
    const cols = grid.cols || 10;
    const cellSize = 2.0;
    const halfWidth = (cols * cellSize) / 2;
    const halfHeight = (rows * cellSize) / 2;
    const blockedSet = new Set(grid.blockedCells || []);

    // Clear old wall meshes
    Object.values(wallMeshesRef.current).forEach(mesh => scene.remove(mesh));
    wallMeshesRef.current = {};

    // DISTINCT HEAVY INDUSTRIAL BARRIER BLOCK MATERIALS
    // Dark charcoal steel body — maximum contrast against light concrete floor
    const blockBodyMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.45, metalness: 0.6 });
    const blockBaseMat = new THREE.MeshStandardMaterial({ color: 0x222629, metalness: 0.8, roughness: 0.2 });
    const hazardStripeMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.35, metalness: 0.2 }); // Red hazard accent
    const cornerGuardMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.7, roughness: 0.25 }); // Safety yellow guards
    const topCapMat = new THREE.MeshStandardMaterial({ color: 0x3d4147, metalness: 0.75, roughness: 0.3 }); // Brushed steel top

    blockedSet.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      const blockGroup = new THREE.Group();

      // Main Solid Steel Barrier Core Block — DARK against light floor
      const blockCore = new THREE.Mesh(new THREE.BoxGeometry(cellSize * 0.88, 1.3, cellSize * 0.88), blockBodyMat);
      blockCore.position.y = 0.65;
      blockCore.castShadow = true;
      blockCore.receiveShadow = true;
      blockGroup.add(blockCore);

      // Heavy Dark Base Plate
      const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(cellSize * 0.94, 0.1, cellSize * 0.94), blockBaseMat);
      baseFrame.position.y = 0.05;
      baseFrame.castShadow = true;
      blockGroup.add(baseFrame);

      // Brushed Steel Top Cap
      const topPlate = new THREE.Mesh(new THREE.BoxGeometry(cellSize * 0.86, 0.06, cellSize * 0.86), topCapMat);
      topPlate.position.y = 1.33;
      topPlate.castShadow = true;
      blockGroup.add(topPlate);

      // Red Hazard Warning Stripes (horizontal bands on two sides)
      const stripeGeoFront = new THREE.BoxGeometry(cellSize * 0.89, 0.08, 0.02);
      const stripeGeoSide = new THREE.BoxGeometry(0.02, 0.08, cellSize * 0.89);
      const stripeY = 1.0;

      const stripe1 = new THREE.Mesh(stripeGeoFront, hazardStripeMat);
      stripe1.position.set(0, stripeY, cellSize * 0.445);
      blockGroup.add(stripe1);

      const stripe2 = new THREE.Mesh(stripeGeoFront, hazardStripeMat);
      stripe2.position.set(0, stripeY, -cellSize * 0.445);
      blockGroup.add(stripe2);

      const stripe3 = new THREE.Mesh(stripeGeoSide, hazardStripeMat);
      stripe3.position.set(cellSize * 0.445, stripeY, 0);
      blockGroup.add(stripe3);

      const stripe4 = new THREE.Mesh(stripeGeoSide, hazardStripeMat);
      stripe4.position.set(-cellSize * 0.445, stripeY, 0);
      blockGroup.add(stripe4);

      // 4 Safety Yellow Corner Guard Posts
      const createGuard = (cx, cz) => {
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.32, 0.08), cornerGuardMat);
        guard.position.set(cx, 0.66, cz);
        return guard;
      };

      const offset = cellSize * 0.44;
      blockGroup.add(createGuard(offset, offset));
      blockGroup.add(createGuard(-offset, offset));
      blockGroup.add(createGuard(offset, -offset));
      blockGroup.add(createGuard(-offset, -offset));

      // Recessed bolt details on top
      const boltMat = new THREE.MeshStandardMaterial({ color: 0x555b60, metalness: 0.92, roughness: 0.15 });
      const boltPositions = [
        [cellSize * 0.25, cellSize * 0.25],
        [-cellSize * 0.25, cellSize * 0.25],
        [cellSize * 0.25, -cellSize * 0.25],
        [-cellSize * 0.25, -cellSize * 0.25]
      ];
      boltPositions.forEach(([bx, bz]) => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12), boltMat);
        bolt.position.set(bx, 1.38, bz);
        blockGroup.add(bolt);
      });

      blockGroup.position.set(
        (x + 0.5) * cellSize - halfWidth,
        0,
        (y + 0.5) * cellSize - halfHeight
      );

      scene.add(blockGroup);
      wallMeshesRef.current[key] = blockGroup;
    });
  }, [grid.blockedCells, grid.rows, grid.cols]);

  // Sync Roller Conveyor Pickup / Delivery Stations
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const rows = grid.rows || 10;
    const cols = grid.cols || 10;
    const cellSize = 2.0;
    const halfWidth = (cols * cellSize) / 2;
    const halfHeight = (rows * cellSize) / 2;

    zoneMeshesRef.current.forEach(mesh => scene.remove(mesh));
    zoneMeshesRef.current = [];

    const activeTasks = (tasks || []).filter(t => t.status !== 'COMPLETED');

    activeTasks.forEach(task => {
      // Pickup Station — Professional Deep Teal
      const pGroup = new THREE.Group();

      // Station base frame — dark steel
      const pBaseFrame = new THREE.Mesh(
        new THREE.BoxGeometry(cellSize * 0.94, 0.06, cellSize * 0.94),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.85, roughness: 0.2 })
      );
      pBaseFrame.position.y = 0.03;
      pGroup.add(pBaseFrame);

      // Station deck — teal accent
      const pFrame = new THREE.Mesh(
        new THREE.BoxGeometry(cellSize * 0.88, 0.08, cellSize * 0.88),
        new THREE.MeshStandardMaterial({ color: 0x0d7377, metalness: 0.6, roughness: 0.3 })
      );
      pFrame.position.y = 0.08;
      pGroup.add(pFrame);

      // Roller conveyor tubes
      const rollerMat = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, metalness: 0.92, roughness: 0.1 });
      for (let z = -cellSize * 0.35; z <= cellSize * 0.35; z += 0.22) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, cellSize * 0.8, 12), rollerMat);
        roller.rotation.z = Math.PI / 2;
        roller.position.set(0, 0.15, z);
        pGroup.add(roller);
      }

      // Side frame rails
      const railMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.25 });
      [-cellSize * 0.42, cellSize * 0.42].forEach(xPos => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, cellSize * 0.88), railMat);
        rail.position.set(xPos, 0.14, 0);
        pGroup.add(rail);
      });

      // Subtle beacon cone
      const pBeacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.35, 3.0, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x0d7377, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
      );
      pBeacon.position.y = 1.5;

      pGroup.add(pBeacon);
      pGroup.position.set(
        (task.pickup.x + 0.5) * cellSize - halfWidth,
        0,
        (task.pickup.y + 0.5) * cellSize - halfHeight
      );

      scene.add(pGroup);
      zoneMeshesRef.current.push(pGroup);

      // Delivery Station — Professional Navy Steel
      const dGroup = new THREE.Group();

      // Station base frame
      const dBaseFrame = new THREE.Mesh(
        new THREE.BoxGeometry(cellSize * 0.94, 0.06, cellSize * 0.94),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.85, roughness: 0.2 })
      );
      dBaseFrame.position.y = 0.03;
      dGroup.add(dBaseFrame);

      // Station deck — navy accent
      const dFrame = new THREE.Mesh(
        new THREE.BoxGeometry(cellSize * 0.88, 0.08, cellSize * 0.88),
        new THREE.MeshStandardMaterial({ color: 0x1a3a5c, metalness: 0.6, roughness: 0.3 })
      );
      dFrame.position.y = 0.08;
      dGroup.add(dFrame);

      for (let z = -cellSize * 0.35; z <= cellSize * 0.35; z += 0.22) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, cellSize * 0.8, 12), rollerMat);
        roller.rotation.z = Math.PI / 2;
        roller.position.set(0, 0.15, z);
        dGroup.add(roller);
      }

      // Side frame rails
      [-cellSize * 0.42, cellSize * 0.42].forEach(xPos => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, cellSize * 0.88), railMat);
        rail.position.set(xPos, 0.14, 0);
        dGroup.add(rail);
      });

      const dBeacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.35, 3.0, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x1a3a5c, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
      );
      dBeacon.position.y = 1.5;

      dGroup.add(dBeacon);
      dGroup.position.set(
        (task.delivery.x + 0.5) * cellSize - halfWidth,
        0,
        (task.delivery.y + 0.5) * cellSize - halfHeight
      );

      scene.add(dGroup);
      zoneMeshesRef.current.push(dGroup);
    });
  }, [tasks, grid.rows, grid.cols]);

  // Sync Industrial AMRs & Trajectories using model.glb
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    if (!gltfTemplateRef.current) return;

    const rows = grid.rows || 10;
    const cols = grid.cols || 10;
    const cellSize = 2.0;
    const halfWidth = (cols * cellSize) / 2;
    const halfHeight = (rows * cellSize) / 2;

    const currentRobotIds = new Set((robots || []).map(r => r.id));

    // Remove defunct robots
    Object.keys(robotMeshesRef.current).forEach(id => {
      if (!currentRobotIds.has(id)) {
        scene.remove(robotMeshesRef.current[id].group);
        delete robotMeshesRef.current[id];
      }
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    (robots || []).forEach(r => {
      const posX = (r.position && typeof r.position.x === 'number') ? r.position.x : 0;
      const posY = (r.position && typeof r.position.y === 'number') ? r.position.y : 0;
      const targetX = (posX + 0.5) * cellSize - halfWidth;
      const targetZ = (posY + 0.5) * cellSize - halfHeight;

      if (!robotMeshesRef.current[r.id]) {
        const rGroup = new THREE.Group();
        rGroup.userData = { robotId: r.id };

        // Clone model.glb using SkeletonUtils for independent animations
        const clonedModel = SkeletonUtils.clone(gltfTemplateRef.current.scene);
        clonedModel.scale.set(1.22, 1.22, 1.22);
        clonedModel.position.set(0, 0, 0);

        const robotColor = getRobotColor(r.id);
        const statusColor = r.status === 'MOVING' ? 0xea580c :
                            r.status === 'FAILED' ? 0xef4444 :
                            r.status === 'WAITING' ? 0x3b82f6 : 0x10b981;

        let glowMat = null;

        clonedModel.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
              const matName = child.material.name;
              if (matName === 'orange') {
                // Colored to match robot ID preset identity
                child.material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(robotColor.bg || '#ea580c'),
                  metalness: 0.65,
                  roughness: 0.35,
                  emissive: new THREE.Color(robotColor.bg || '#ea580c'),
                  emissiveIntensity: 0.16
                });
              } else if (matName === 'shell') {
                // High-visibility sleek industrial metallic grey
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x9ca3af, // Bright visible metallic grey
                  metalness: 0.65,
                  roughness: 0.3
                });
              } else if (matName === 'glow') {
                glowMat = new THREE.MeshStandardMaterial({
                  color: statusColor,
                  emissive: statusColor,
                  emissiveIntensity: 2.2,
                  roughness: 0.15
                });
                child.material = glowMat;
              } else if (matName === 'steel') {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0xcfd8dc,
                  metalness: 0.92,
                  roughness: 0.18
                });
              } else if (matName === 'graphite') {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x475569,
                  metalness: 0.6,
                  roughness: 0.38
                });
              } else if (matName === 'rubber') {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x181a1d,
                  metalness: 0.1,
                  roughness: 0.85
                });
              }
            }
          }
        });

        // Internal Cargo Bay Cavity (Space inside for the load)
        const bayLinerMat = new THREE.MeshStandardMaterial({
          color: 0x1f2937,
          roughness: 0.6,
          metalness: 0.7,
          side: THREE.BackSide
        });
        const bayLiner = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.62), bayLinerMat);
        bayLiner.position.set(0, 0.45, 0.02);
        clonedModel.add(bayLiner);

        // Internal Cavity LED Light
        const bayLight = new THREE.PointLight(0xffedd5, 1.4, 1.4);
        bayLight.position.set(0, 0.55, 0.02);
        clonedModel.add(bayLight);

        // Cargo box for pickup and drop animation
        const cargoGroup = new THREE.Group();
        cargoGroup.position.set(0, 0.38, 0.02);

        const cargoBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.28, 0.42),
          new THREE.MeshStandardMaterial({ color: 0xc27803, roughness: 0.75, metalness: 0.06 })
        );
        cargoBox.castShadow = true;
        cargoBox.receiveShadow = true;
        cargoGroup.add(cargoBox);

        // Security tape
        const tapeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.385, 0.05, 0.425),
          new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.35 })
        );
        cargoGroup.add(tapeMesh);

        cargoGroup.visible = (r.stage === 'TO_DELIVERY' || r.status === 'DELIVERING');
        clonedModel.add(cargoGroup);

        // Add cloned AMR model into the robot group
        rGroup.add(clonedModel);

        // Initialize Animation Mixer and Action clips for this robot
        const mixer = new THREE.AnimationMixer(clonedModel);
        const actions = {};
        if (gltfTemplateRef.current.animations) {
          gltfTemplateRef.current.animations.forEach(clip => {
            actions[clip.name] = mixer.clipAction(clip);
          });
        }

        // Selection ring
        const selectRing = new THREE.Mesh(
          new THREE.RingGeometry(0.75, 0.95, 32),
          new THREE.MeshBasicMaterial({ color: 0xc2410c, side: THREE.DoubleSide })
        );
        selectRing.rotation.x = -Math.PI / 2;
        selectRing.position.y = 0.02;
        selectRing.name = "selectRing";
        selectRing.visible = selectedRobotId === r.id;
        rGroup.add(selectRing);

        // Generate curved waypoints from current cell and remaining path
        let initialHeading = 0;
        if (r.path && r.path[0]) {
          const nextTargetX = (r.path[0].x + 0.5) * cellSize - halfWidth;
          const nextTargetZ = (r.path[0].y + 0.5) * cellSize - halfHeight;
          const initDx = nextTargetX - targetX;
          const initDz = nextTargetZ - targetZ;
          if (Math.hypot(initDx, initDz) > 0.05) {
            initialHeading = Math.atan2(initDx, initDz);
          }
        }
        rGroup.rotation.y = initialHeading;
        rGroup.position.set(targetX, 0, targetZ);
        scene.add(rGroup);

        robotMeshesRef.current[r.id] = {
          group: rGroup,
          clonedModel: clonedModel,
          mixer: mixer,
          actions: actions,
          glowMat: glowMat,
          cargoMesh: cargoGroup,
          selectRing: selectRing,
          targetPos: { x: targetX, z: targetZ },
          nextStep: (r.path && r.path[0]) ? { x: r.path[0].x, y: r.path[0].y } : null,
          currentSpeed: 0,
          prevStage: r.stage,
          prevStatus: r.status,
          status: r.status,
          isAnimatingCargo: false
        };
      } else {
        const rData = robotMeshesRef.current[r.id];
        rData.targetPos = { x: targetX, z: targetZ };
        rData.nextStep = (r.path && r.path[0]) ? { x: r.path[0].x, y: r.path[0].y } : null;
        rData.status = r.status;
        rData.selectRing.visible = selectedRobotId === r.id;

        const statusColor = r.status === 'MOVING' ? 0xea580c :
                            r.status === 'FAILED' ? 0xef4444 :
                            r.status === 'WAITING' ? 0x3b82f6 : 0x10b981;
        if (rData.glowMat) {
          rData.glowMat.color.setHex(statusColor);
          rData.glowMat.emissive.setHex(statusColor);
        }

        // Pickup Animation Sequence (things in)
        if ((r.status === 'PICKING_UP' || (rData.prevStage === 'TO_PICKUP' && r.stage === 'TO_DELIVERY')) && !rData.isAnimatingCargo) {
          rData.isAnimatingCargo = true;
          if (rData.actions['hatch-open']) {
            if (rData.actions['hatch-close']) rData.actions['hatch-close'].stop();
            rData.actions['hatch-open'].reset().setLoop(THREE.LoopOnce).play();
          }
          if (rData.actions['door-open']) {
            if (rData.actions['door-close']) rData.actions['door-close'].stop();
            rData.actions['door-open'].reset().setLoop(THREE.LoopOnce).play();
          }

          rData.cargoMesh.visible = true;
          rData.cargoMesh.position.set(0, 0.85, 0.45); // Coming into hatch
          let stepCount = 0;
          const animIn = setInterval(() => {
            stepCount++;
            if (rData.cargoMesh) {
              rData.cargoMesh.position.y -= 0.045;
              rData.cargoMesh.position.z -= 0.042;
            }
            if (stepCount >= 11) {
              clearInterval(animIn);
              if (rData.cargoMesh) rData.cargoMesh.position.set(0, 0.38, 0.02);
              if (rData.actions['hatch-close']) {
                if (rData.actions['hatch-open']) rData.actions['hatch-open'].stop();
                rData.actions['hatch-close'].reset().setLoop(THREE.LoopOnce).play();
              }
              if (rData.actions['door-close']) {
                if (rData.actions['door-open']) rData.actions['door-open'].stop();
                rData.actions['door-close'].reset().setLoop(THREE.LoopOnce).play();
              }
              rData.isAnimatingCargo = false;
            }
          }, 45);
        }

        // Drop / Delivery Animation Sequence (things out)
        else if ((r.status === 'DELIVERING' || (rData.prevStage === 'TO_DELIVERY' && !r.stage)) && !rData.isAnimatingCargo) {
          rData.isAnimatingCargo = true;
          if (rData.actions['door-open']) {
            if (rData.actions['door-close']) rData.actions['door-close'].stop();
            rData.actions['door-open'].reset().setLoop(THREE.LoopOnce).play();
          }
          if (rData.actions['hatch-open']) {
            if (rData.actions['hatch-close']) rData.actions['hatch-close'].stop();
            rData.actions['hatch-open'].reset().setLoop(THREE.LoopOnce).play();
          }

          let stepCount = 0;
          const animOut = setInterval(() => {
            stepCount++;
            if (rData.cargoMesh) {
              rData.cargoMesh.position.z += 0.05;
              rData.cargoMesh.position.y -= 0.02;
            }
            if (stepCount >= 11) {
              clearInterval(animOut);
              if (rData.cargoMesh) {
                rData.cargoMesh.visible = false;
                rData.cargoMesh.position.set(0, 0.38, 0.02);
              }
              if (rData.actions['door-close']) {
                if (rData.actions['door-open']) rData.actions['door-open'].stop();
                rData.actions['door-close'].reset().setLoop(THREE.LoopOnce).play();
              }
              if (rData.actions['hatch-close']) {
                if (rData.actions['hatch-open']) rData.actions['hatch-open'].stop();
                rData.actions['hatch-close'].reset().setLoop(THREE.LoopOnce).play();
              }
              rData.isAnimatingCargo = false;
            }
          }, 45);
        } else if (!rData.isAnimatingCargo) {
          rData.cargoMesh.visible = (r.stage === 'TO_DELIVERY' || r.status === 'DELIVERING');
        }

        rData.prevStage = r.stage;
        rData.prevStatus = r.status;
      }
    });

    pathLinesRef.current.forEach(line => scene.remove(line));
    pathLinesRef.current = [];

    if (selectedRobotId) {
      const selRobot = (robots || []).find(r => r.id === selectedRobotId);
      if (selRobot && selRobot.path && selRobot.path.length > 0) {
        const pathCells = [
          { x: selRobot.position.x, y: selRobot.position.y },
          ...selRobot.path
        ];
        const points = generateCurvedTrajectoryPoints(pathCells, cellSize, halfWidth, halfHeight);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xea580c, linewidth: 3 });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        scene.add(lineMesh);
        pathLinesRef.current.push(lineMesh);
      }
    }
  }, [robots, selectedRobotId, grid.rows, grid.cols, modelLoaded]);

  return (
    <div className="glass-panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Bar with View Controls & Mode Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box size={18} color="var(--brand-orange)" />
            Large-Scale 3D Industrial Fulfillment Facility Simulator
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
            High-contrast floor grid matrix with concrete barrier blocks and real-time cell hover placement.
          </p>
        </div>

        {/* View Presets & Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-orange)', background: 'var(--brand-orange-light)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--brand-orange)' }}>
            Mode: {interactionMode === 'ADD_ROBOT' ? 'DEPLOY ROBOT' : 'TOGGLE BARRIER BLOCK'}
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: 3, borderRadius: 8, border: '1px solid var(--border-light)' }}>
            <button
              type="button"
              onClick={() => setViewPreset('ISOMETRIC')}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                background: viewPreset === 'ISOMETRIC' ? 'var(--brand-orange)' : 'transparent',
                color: viewPreset === 'ISOMETRIC' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              Isometric 3D
            </button>
            <button
              type="button"
              onClick={() => setViewPreset('TOP')}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                background: viewPreset === 'TOP' ? 'var(--brand-orange)' : 'transparent',
                color: viewPreset === 'TOP' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              Top Matrix View
            </button>
            <button
              type="button"
              onClick={() => setViewPreset('FRONT')}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                background: viewPreset === 'FRONT' ? 'var(--brand-orange)' : 'transparent',
                color: viewPreset === 'FRONT' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              Front Elevation
            </button>
          </div>
        </div>
      </div>

      {/* Large 3D WebGL Canvas Container */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: 680,
          background: '#1a1d21', 
          borderRadius: 12, 
          overflow: 'hidden',
          border: '1px solid var(--border-light)',
          cursor: 'grab'
        }}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {/* Hovered Cell Tooltip Badge */}
        {hoveredCellPos && (
          <div 
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              background: 'rgba(24, 24, 27, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--brand-orange)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            <MousePointer size={14} color="var(--brand-orange)" />
            <span>
              Target Cell: ({hoveredCellPos.x}, {hoveredCellPos.y}) • Click to {interactionMode === 'ADD_ROBOT' ? 'Deploy AMR' : 'Toggle Barrier Block'}
            </span>
          </div>
        )}

        {/* Controls Overlay Hint */}
        <div 
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(24, 24, 27, 0.88)',
            backdropFilter: 'blur(8px)',
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#a1a1aa',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600
          }}
        >
          <Compass size={15} color="var(--brand-orange)" />
          <span>Drag mouse to rotate 360° • Scroll wheel to zoom • Click cell to place block</span>
        </div>

        {/* Selected Robot Tracking Badge */}
        {selectedRobotId && (
          <div 
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(24, 24, 27, 0.88)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--brand-orange)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Crosshair size={15} color="var(--brand-orange)" />
            <span>Tracking AMR #{selectedRobotId} Trajectory</span>
          </div>
        )}
      </div>
    </div>
  );
}
