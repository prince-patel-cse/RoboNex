import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  Battery, 
  Activity, 
  Radio, 
  Compass, 
  Box,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  FolderOpen,
  FolderClosed,
  Disc
} from 'lucide-react';
import { getRobotColor } from './WarehouseGrid';

export function Robot3DViewer({ robot, onClose }) {
  const mountRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(true);
  const resetCameraRef = useRef(null);
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' | 'hardware' | 'animations'
  
  // Animation State
  const [activeAnim, setActiveAnim] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [doorState, setDoorState] = useState('CLOSED'); // 'OPEN' | 'CLOSED'
  const [hatchState, setHatchState] = useState('CLOSED'); // 'OPEN' | 'CLOSED'

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);
  const mixerRef = useRef(null);
  const actionsRef = useRef({});
  const loadMeshRef = useRef(null);
  const bayLightRef = useRef(null);

  // Keep autoRotateRef in sync with state
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Trigger animation helper
  const triggerAnimation = (name) => {
    const actions = actionsRef.current;
    if (!actions || !actions[name]) return;

    if (name === 'wheel-roll') {
      const act = actions['wheel-roll'];
      if (act.isRunning()) {
        act.stop();
        setIsRolling(false);
        setActiveAnim(null);
      } else {
        act.setLoop(THREE.LoopRepeat);
        act.reset().play();
        setIsRolling(true);
        setActiveAnim('wheel-roll');
      }
      return;
    }

    if (name === 'door-open') {
      if (actions['door-close']) actions['door-close'].stop();
      actions['door-open'].setLoop(THREE.LoopOnce);
      actions['door-open'].clampWhenFinished = true;
      actions['door-open'].reset().play();
      setDoorState('OPEN');
      setActiveAnim('door-open');

      // Smoothly elevate the payload parcel inside the opened space
      if (loadMeshRef.current) {
        let t = 0;
        const liftInterval = setInterval(() => {
          t += 0.08;
          if (loadMeshRef.current) {
            loadMeshRef.current.position.y = THREE.MathUtils.lerp(0.38, 0.52, Math.min(1, t));
          }
          if (t >= 1) clearInterval(liftInterval);
        }, 30);
      }
    } else if (name === 'door-close') {
      if (actions['door-open']) actions['door-open'].stop();
      actions['door-close'].setLoop(THREE.LoopOnce);
      actions['door-close'].clampWhenFinished = true;
      actions['door-close'].reset().play();
      setDoorState('CLOSED');
      setActiveAnim('door-close');

      // Lower the payload parcel back into the bay cavity as door shuts
      if (loadMeshRef.current) {
        let t = 0;
        const lowerInterval = setInterval(() => {
          t += 0.08;
          if (loadMeshRef.current) {
            loadMeshRef.current.position.y = THREE.MathUtils.lerp(0.52, 0.38, Math.min(1, t));
          }
          if (t >= 1) clearInterval(lowerInterval);
        }, 30);
      }
    } else if (name === 'hatch-open') {
      if (actions['hatch-close']) actions['hatch-close'].stop();
      actions['hatch-open'].setLoop(THREE.LoopOnce);
      actions['hatch-open'].clampWhenFinished = true;
      actions['hatch-open'].reset().play();
      setHatchState('OPEN');
      setActiveAnim('hatch-open');

      // Slide cargo slightly forward towards hatch port
      if (loadMeshRef.current) {
        let t = 0;
        const slideInterval = setInterval(() => {
          t += 0.08;
          if (loadMeshRef.current) {
            loadMeshRef.current.position.z = THREE.MathUtils.lerp(0.02, 0.16, Math.min(1, t));
          }
          if (t >= 1) clearInterval(slideInterval);
        }, 30);
      }
    } else if (name === 'hatch-close') {
      if (actions['hatch-open']) actions['hatch-open'].stop();
      actions['hatch-close'].setLoop(THREE.LoopOnce);
      actions['hatch-close'].clampWhenFinished = true;
      actions['hatch-close'].reset().play();
      setHatchState('CLOSED');
      setActiveAnim('hatch-close');

      // Slide cargo back into center bay
      if (loadMeshRef.current) {
        let t = 0;
        const returnInterval = setInterval(() => {
          t += 0.08;
          if (loadMeshRef.current) {
            loadMeshRef.current.position.z = THREE.MathUtils.lerp(0.16, 0.02, Math.min(1, t));
          }
          if (t >= 1) clearInterval(returnInterval);
        }, 30);
      }
    }
  };

  // Render Photorealistic 3D AMR CAD Scene using model.glb
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup - isometric CAD view angle
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 1000);
    camera.position.set(4.8, 3.2, 5.6);

    // 3. Renderer with high PBR quality & soft shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Specular Environment Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Main Studio Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(7, 14, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.00008;
    scene.add(keyLight);

    // Specular Rim Light
    const specularRimLight = new THREE.DirectionalLight(0xb0bec5, 1.3);
    specularRimLight.position.set(-8, 6, -7);
    scene.add(specularRimLight);

    // Status Glow Color
    const statusColorHex = robot.status === 'MOVING' ? 0xea580c : 
                           robot.status === 'WAITING' ? 0x3b82f6 : 
                           robot.status === 'FAILED' ? 0xef4444 : 0x10b981;

    const underbodyGlow = new THREE.PointLight(statusColorHex, 2.8, 6.0);
    underbodyGlow.position.set(0, 0.1, 0);
    scene.add(underbodyGlow);

    // 5. Floor & Holographic CAD Grid
    const gridHelper = new THREE.GridHelper(12, 24, 0xc2410c, 0x2a2118);
    gridHelper.position.y = -0.4;
    scene.add(gridHelper);

    const shadowPlaneGeo = new THREE.PlaneGeometry(12, 12);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.395;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 6. Robot Model Container Group
    const robotGroup = new THREE.Group();
    scene.add(robotGroup);

    // 7. Load GLTF model.glb and apply theme-appropriate materials
    const loader = new GLTFLoader();
    const robotColor = getRobotColor(robot.id);

    loader.load(
      '/model.glb',
      (gltf) => {
        const model = gltf.scene;

        // Scale to fit isometric CAD viewport comfortably (bounding size: ~1.7m x 1.9m x 2.2m)
        model.scale.set(2.4, 2.4, 2.4);
        model.position.set(0, -0.4, 0);

        // Customize materials to HIGH-CONTRAST INDUSTRIAL GREY for maximum visibility
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
              const matName = child.material.name;

              if (matName === 'orange') {
                // Signature Bumper & Trim: vibrant brand orange
                child.material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(robotColor.bg || '#ea580c'),
                  metalness: 0.65,
                  roughness: 0.32,
                  emissive: new THREE.Color(robotColor.bg || '#ea580c'),
                  emissiveIntensity: 0.16
                });
              } else if (matName === 'shell') {
                // Outer aerodynamic shell: HIGH-VISIBILITY INDUSTRIAL SLEEK GREY
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x9ca3af, // Crisp, highly visible medium-light metallic grey
                  metalness: 0.65,
                  roughness: 0.3
                });
              } else if (matName === 'glow') {
                // Headlight / sensor status LED glow
                child.material = new THREE.MeshStandardMaterial({
                  color: statusColorHex,
                  emissive: statusColorHex,
                  emissiveIntensity: 2.4,
                  roughness: 0.15
                });
              } else if (matName === 'glass') {
                child.material = new THREE.MeshPhysicalMaterial({
                  color: 0x1e293b,
                  transparent: true,
                  opacity: 0.75,
                  roughness: 0.1,
                  metalness: 0.2
                });
              } else if (matName === 'steel') {
                // Polished metallic steel
                child.material = new THREE.MeshStandardMaterial({
                  color: 0xcfd8dc,
                  metalness: 0.92,
                  roughness: 0.18
                });
              } else if (matName === 'graphite') {
                // Visible slate grey accent
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

        // 8. Internal Cargo Bay Cavity (Space inside for the load)
        const bayLinerMat = new THREE.MeshStandardMaterial({
          color: 0x1f2937, // Dark interior recessed compartment
          roughness: 0.6,
          metalness: 0.7,
          side: THREE.BackSide
        });
        const bayLiner = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.62), bayLinerMat);
        bayLiner.position.set(0, 0.45, 0.02);
        model.add(bayLiner);

        // Internal Cavity LED Light
        const bayLight = new THREE.PointLight(0xffedd5, 1.8, 1.8);
        bayLight.position.set(0, 0.55, 0.02);
        bayLightRef.current = bayLight;
        model.add(bayLight);

        // 9. Industrial Cargo Payload Parcel (The load inside)
        const loadGroup = new THREE.Group();
        loadGroup.position.set(0, 0.38, 0.02);

        const loadGeo = new THREE.BoxGeometry(0.38, 0.28, 0.42);
        const loadMat = new THREE.MeshStandardMaterial({
          color: 0xc27803, // Corrugated industrial cardboard parcel
          roughness: 0.75,
          metalness: 0.06
        });
        const loadBox = new THREE.Mesh(loadGeo, loadMat);
        loadBox.castShadow = true;
        loadBox.receiveShadow = true;
        loadGroup.add(loadBox);

        // Orange brand security tape
        const tapeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.385, 0.05, 0.425),
          new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.35 })
        );
        loadGroup.add(tapeMesh);

        // Shipping barcode / destination label on top
        const labelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(0.18, 0.12),
          new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.position.y = 0.142;
        loadGroup.add(labelMesh);

        loadMeshRef.current = loadGroup;
        model.add(loadGroup);

        robotGroup.add(model);

        // Setup Animation Mixer with all 5 GLB animations
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;

        const actions = {};
        (gltf.animations || []).forEach((clip) => {
          const act = mixer.clipAction(clip);
          actions[clip.name] = act;
        });
        actionsRef.current = actions;
      },
      undefined,
      (err) => console.error('Failed to load /model.glb:', err)
    );

    // 8. Interactive Camera Orbit Controls (Spherical coordinates)
    const spherical = { radius: 6.8, theta: Math.PI / 4, phi: Math.PI / 3.2 };
    const targetSpherical = { radius: 6.8, theta: Math.PI / 4, phi: Math.PI / 3.2 };
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const updateCamera = () => {
      spherical.radius += (targetSpherical.radius - spherical.radius) * 0.1;
      spherical.theta += (targetSpherical.theta - spherical.theta) * 0.1;
      spherical.phi += (targetSpherical.phi - spherical.phi) * 0.1;

      spherical.phi = Math.max(0.15, Math.min(Math.PI / 2.05, spherical.phi));
      spherical.radius = Math.max(3.2, Math.min(14.0, spherical.radius));

      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0.45, 0);
    };

    const domElem = renderer.domElement;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      targetSpherical.theta -= dx * 0.007;
      targetSpherical.phi -= dy * 0.007;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      targetSpherical.radius += e.deltaY * 0.005;
    };

    resetCameraRef.current = () => {
      targetSpherical.radius = 6.8;
      targetSpherical.theta = Math.PI / 4;
      targetSpherical.phi = Math.PI / 3.2;
    };

    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElem.addEventListener('wheel', onWheel, { passive: false });

    // 9. Render & Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      if (autoRotateRef.current && !isDragging) {
        targetSpherical.theta += 0.004;
      }

      updateCamera();
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
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElem.removeEventListener('wheel', onWheel);

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [robot.id, robot.status]);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '92vw',
          maxWidth: 1280,
          height: '88vh',
          maxHeight: 840,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 16,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top CAD Header */}
        <div 
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div 
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'var(--brand-orange)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.1rem',
                fontFamily: 'var(--font-mono)',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)'
              }}
            >
              {robot.id}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  Industrial AMR CAD Model #{robot.id}
                </h2>
                <span className={`badge-status ${
                  robot.status === 'MOVING' ? 'badge-moving' :
                  robot.status === 'WAITING' ? 'badge-waiting' :
                  robot.status === 'FAILED' ? 'badge-blocked' :
                  'badge-idle'
                }`}>
                  {robot.status}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                Aerodynamic Composite Body • 5 Integrated Kinematic Actuators • P2P Mesh Node
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="btn btn-outline" 
            style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 800 }}
          >
            Close Inspector ✕
          </button>
        </div>

        {/* Modal Main View */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', flex: 1, overflow: 'hidden' }}>
          {/* 3D WebGL Canvas Viewport */}
          <div style={{ position: 'relative', background: '#09090b', display: 'flex', flexDirection: 'column' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

            {/* Viewport Overlay: Quick Animation Controller Dock */}
            <div 
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(10px)',
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
                Actuators:
              </span>

              {/* 1. Wheel Roll */}
              <button
                type="button"
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  background: isRolling ? 'var(--brand-orange)' : 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: isRolling ? '1px solid var(--brand-orange)' : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6
                }}
                onClick={() => triggerAnimation('wheel-roll')}
              >
                <Disc size={13} style={{ animation: isRolling ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isRolling ? 'Rolling (ON)' : 'Roll Wheels'}</span>
              </button>

              {/* 2. Door Open / Close */}
              <button
                type="button"
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  background: doorState === 'OPEN' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.08)',
                  color: doorState === 'OPEN' ? '#10b981' : '#fff',
                  border: doorState === 'OPEN' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6
                }}
                onClick={() => triggerAnimation(doorState === 'OPEN' ? 'door-close' : 'door-open')}
              >
                {doorState === 'OPEN' ? <FolderOpen size={13} /> : <FolderClosed size={13} />}
                <span>{doorState === 'OPEN' ? 'Close Door' : 'Open Door'}</span>
              </button>

              {/* 3. Hatch Open / Close */}
              <button
                type="button"
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  background: hatchState === 'OPEN' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.08)',
                  color: hatchState === 'OPEN' ? '#3b82f6' : '#fff',
                  border: hatchState === 'OPEN' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6
                }}
                onClick={() => triggerAnimation(hatchState === 'OPEN' ? 'hatch-close' : 'hatch-open')}
              >
                <Box size={13} />
                <span>{hatchState === 'OPEN' ? 'Close Hatch' : 'Open Hatch'}</span>
              </button>
            </div>

            {/* Bottom Viewport Controls */}
            <div 
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(24, 24, 27, 0.88)',
                backdropFilter: 'blur(8px)',
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)'
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#fff',
                  background: autoRotate ? 'rgba(234, 88, 12, 0.15)' : 'transparent',
                  borderColor: autoRotate ? 'var(--brand-orange)' : 'rgba(255,255,255,0.2)'
                }}
                onClick={() => {
                  setAutoRotate(prev => {
                    autoRotateRef.current = !prev;
                    return !prev;
                  });
                }}
                title={autoRotate ? "Stop 3D Camera Rotation" : "Start 3D Camera Rotation"}
              >
                {autoRotate ? <Pause size={14} color="var(--brand-orange)" /> : <Play size={14} color="#10b981" />}
                <span>{autoRotate ? 'Stop Rotation' : 'Rotate 3D'}</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                style={{
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#e4e4e7',
                  borderColor: 'rgba(255,255,255,0.15)'
                }}
                onClick={() => resetCameraRef.current && resetCameraRef.current()}
                title="Reset Camera Angle to Default"
              >
                <RotateCcw size={13} color="var(--brand-orange)" />
                <span>Reset Angle</span>
              </button>

              <div style={{ color: '#a1a1aa', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8, borderLeft: '1px solid #3f3f46', fontWeight: 600 }}>
                <Compass size={14} color="var(--brand-orange)" />
                <span>Drag mouse to rotate 360° • Scroll wheel to zoom</span>
              </div>
            </div>

            {/* Industrial Specs Watermark */}
            <div 
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                background: 'rgba(24, 24, 27, 0.75)',
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700
              }}
            >
              MODEL.GLB • 5 KINEMATIC CLIPS • PAYLOAD: 250 KG
            </div>
          </div>

          {/* Right Side Telemetry & Controls Panel */}
          <div 
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              overflowY: 'auto',
              borderLeft: '1px solid var(--border-light)',
              background: 'var(--bg-main)'
            }}
          >
            {/* Tab Selector */}
            <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: 3, borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('telemetry')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeTab === 'telemetry' ? 'var(--brand-orange)' : 'transparent',
                  color: activeTab === 'telemetry' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Telemetry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('animations')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeTab === 'animations' ? 'var(--brand-orange)' : 'transparent',
                  color: activeTab === 'animations' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Actuators (5)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hardware')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeTab === 'hardware' ? 'var(--brand-orange)' : 'transparent',
                  color: activeTab === 'hardware' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Hardware Specs
              </button>
            </div>

            {/* TAB 1: TELEMETRY */}
            {activeTab === 'telemetry' && (
              <>
                {/* Battery & Health Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-panel" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      <Battery size={15} color={robot.battery > 50 ? 'var(--status-emerald)' : 'var(--status-amber)'} />
                      <span>Battery Charge</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                      {robot.battery}%
                    </div>
                    <div style={{ width: '100%', background: 'var(--bg-subtle)', height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${robot.battery}%`, background: robot.battery > 50 ? 'var(--status-emerald)' : 'var(--status-rose)', height: '100%' }} />
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      <Activity size={15} color="var(--brand-orange)" />
                      <span>Health Index</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: robot.status === 'FAILED' ? 'var(--status-rose)' : 'var(--status-emerald)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                      {robot.status === 'FAILED' ? 'FAULT' : '99.8%'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
                      Flush LiDAR 360° Active
                    </div>
                  </div>
                </div>

                {/* Spatial Grid Telemetry */}
                <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Radio size={14} color="var(--brand-orange)" />
                    Grid Coordinates & Priorities
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Current (X, Y):</span>
                      <div style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        ({robot.position.x}, {robot.position.y})
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Waiting Duration:</span>
                      <div style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: robot.waitingTime > 0 ? 'var(--brand-orange)' : 'var(--text-primary)' }}>
                        {robot.waitingTime || 0} ticks
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Mission Details */}
                <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Box size={14} color="var(--brand-orange)" />
                    Active Payload Task
                  </h4>

                  {robot.taskId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Task Assignment:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--brand-orange)' }}>{robot.taskId}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Status Phase:</span>
                        <span className="badge-status badge-moving">{robot.stage || 'IN_PROGRESS'}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                      No active task currently assigned to this AMR.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 2: ANIMATIONS & ACTUATORS */}
            {activeTab === 'animations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="glass-panel" style={{ padding: 16 }}>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sliders size={15} color="var(--brand-orange)" />
                    Interactive Kinematic Actuators
                  </h4>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 14 }}>
                    Test the 5 real-time rigged animations embedded in <code style={{ color: 'var(--brand-orange)', fontFamily: 'var(--font-mono)' }}>model.glb</code>.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Wheel Roll Animation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>Wheel Roll Mechanism</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>4-wheel synchronized drive axis</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerAnimation('wheel-roll')}
                        className="btn"
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          background: isRolling ? 'var(--brand-orange)' : 'var(--bg-card)',
                          color: isRolling ? '#fff' : 'var(--text-primary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 6
                        }}
                      >
                        <Disc size={14} style={{ animation: isRolling ? 'spin 1s linear infinite' : 'none' }} />
                        <span>{isRolling ? 'Stop Roll' : 'Roll Wheels'}</span>
                      </button>
                    </div>

                    {/* Top Door Open / Close */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>Top Cargo Lid / Door</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status: <b style={{ color: doorState === 'OPEN' ? '#10b981' : 'var(--text-secondary)' }}>{doorState}</b></div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => triggerAnimation('door-open')}
                          className="btn"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: doorState === 'OPEN' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-card)',
                            color: doorState === 'OPEN' ? '#10b981' : 'var(--text-primary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 6
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerAnimation('door-close')}
                          className="btn"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: doorState === 'CLOSED' ? 'rgba(234, 88, 12, 0.2)' : 'var(--bg-card)',
                            color: doorState === 'CLOSED' ? 'var(--brand-orange)' : 'var(--text-primary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 6
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {/* Front Hatch Open / Close */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>Front Loading Hatch</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status: <b style={{ color: hatchState === 'OPEN' ? '#3b82f6' : 'var(--text-secondary)' }}>{hatchState}</b></div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => triggerAnimation('hatch-open')}
                          className="btn"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: hatchState === 'OPEN' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)',
                            color: hatchState === 'OPEN' ? '#3b82f6' : 'var(--text-primary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 6
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerAnimation('hatch-close')}
                          className="btn"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: hatchState === 'CLOSED' ? 'rgba(234, 88, 12, 0.2)' : 'var(--bg-card)',
                            color: hatchState === 'CLOSED' ? 'var(--brand-orange)' : 'var(--text-primary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 6
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: HARDWARE SPECS */}
            {activeTab === 'hardware' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="glass-panel" style={{ padding: 16 }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
                    Mechanical & Sensor Suite
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Drive Architecture:</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>4WD Independent Steer-Drive</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Payload Capacity:</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>250 kg (550 lbs)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>LiDAR Coverage:</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>360° Solid-State Dual Array</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Max Acceleration:</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>2.0 m/s²</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Battery Cell:</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>48V 60Ah LiFePO4 Hot-Swap</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Robot3DViewer;
