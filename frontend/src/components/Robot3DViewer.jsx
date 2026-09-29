import React, { useEffect, useRef, useState } from 'react';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  ShieldCheck, 
  Battery, 
  Activity, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Radio, 
  Wifi, 
  Thermometer, 
  Compass, 
  Box
} from 'lucide-react';

export function Robot3DViewer({ robot, onClose }) {
  const mountRef = useRef(null);
  const [isThreeLoaded, setIsThreeLoaded] = useState(!!window.THREE);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' | 'hardware'
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);

  // Load Three.js dynamically if not present
  useEffect(() => {
    if (window.THREE) {
      setIsThreeLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => setIsThreeLoaded(true);
    document.head.appendChild(script);

    return () => {};
  }, []);

  // Render Photorealistic Metallic Industrial CAD AMR Scene
  useEffect(() => {
    if (!isThreeLoaded || !mountRef.current || !window.THREE) return;

    const THREE = window.THREE;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup - isometric CAD view angle
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 1000);
    camera.position.set(5.0, 3.4, 6.0);

    // 3. Renderer with high PBR quality, tone mapping, & soft shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Specular Environment Lighting (Clean Metallic Reflections)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Main Studio Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(7, 14, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.00008;
    scene.add(keyLight);

    // Metallic Specular Rim Light (Cool Blue-Steel)
    const specularRimLight = new THREE.DirectionalLight(0x94a3b8, 0.9);
    specularRimLight.position.set(-8, 6, -7);
    scene.add(specularRimLight);

    // Underbody Metallic Bounce
    const bounceLight = new THREE.DirectionalLight(0x475569, 0.4);
    bounceLight.position.set(0, -6, 0);
    scene.add(bounceLight);

    // Status Glow Color
    const statusColorHex = robot.status === 'MOVING' ? 0xc2410c : 
                           robot.status === 'WAITING' ? 0xd97706 : 
                           robot.status === 'FAILED' ? 0xd97706 : 0x059669;

    const underbodyGlow = new THREE.PointLight(statusColorHex, 2.2, 5.0);
    underbodyGlow.position.set(0, 0.08, 0);
    scene.add(underbodyGlow);

    // 5. Floor & Holographic CAD Grid
    const gridHelper = new THREE.GridHelper(12, 24, 0xc2410c, 0x3f3f46);
    gridHelper.position.y = -0.4;
    scene.add(gridHelper);

    const shadowPlaneGeo = new THREE.PlaneGeometry(12, 12);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.39;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 6. BUILD PHOTOREALISTIC INDUSTRIAL METALLIC AMR ROBOT
    const robotGroup = new THREE.Group();

    // PBR PURE METALLIC INDUSTRIAL MATERIALS
    const spaceGrayMetallic = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      metalness: 0.92,
      roughness: 0.18
    });

    const brushedTitanium = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.96,
      roughness: 0.12
    });

    const darkGraphiteMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.7,
      roughness: 0.35
    });

    const deepBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      metalness: 0.82,
      roughness: 0.22
    });

    const smokedGlassMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.98,
      roughness: 0.05,
      transparent: true,
      opacity: 0.9
    });

    const statusLedMat = new THREE.MeshBasicMaterial({ color: statusColorHex });
    const fastenerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.1 });

    // A. Lower Heavy Machinery Base Chassis (Dark Graphite Steel)
    const baseChassis = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.18, 1.72), darkGraphiteMat);
    baseChassis.position.y = -0.02;
    baseChassis.castShadow = true;
    baseChassis.receiveShadow = true;
    robotGroup.add(baseChassis);

    // B. Main Outer Shell (Anodized Space Gray Metallic Alloy)
    const mainShell = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.32, 1.85), spaceGrayMetallic);
    mainShell.position.y = 0.15;
    mainShell.castShadow = true;
    mainShell.receiveShadow = true;
    robotGroup.add(mainShell);

    // C. Chamfered Metallic Corner Guards (4 Heavy Corner Bumpers - Deep Bronze Metallic Accent)
    const cornerGuardGeo = new THREE.BoxGeometry(0.36, 0.34, 0.36);
    const cornerPositions = [
      [1.21, 0.15, 0.81],
      [-1.21, 0.15, 0.81],
      [1.21, 0.15, -0.81],
      [-1.21, 0.15, -0.81]
    ];

    cornerPositions.forEach(([x, y, z]) => {
      const guard = new THREE.Mesh(cornerGuardGeo, deepBronzeMat);
      guard.position.set(x, y, z);
      guard.castShadow = true;
      robotGroup.add(guard);
    });

    // D. Mechanical Side Ventilation Grilles & Hex Rivets
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.9, roughness: 0.3 });
    const ventLeft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.02), ventMat);
    ventLeft.position.set(0, 0.15, 0.935);
    const ventRight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.02), ventMat);
    ventRight.position.set(0, 0.15, -0.935);
    robotGroup.add(ventLeft, ventRight);

    // Steel Fastener Bolts along seam
    const rivetGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8);
    for (let x = -1.1; x <= 1.1; x += 0.45) {
      const r1 = new THREE.Mesh(rivetGeo, fastenerMat);
      r1.position.set(x, 0.28, 0.91);
      const r2 = new THREE.Mesh(rivetGeo, fastenerMat);
      r2.position.set(x, 0.28, -0.91);
      robotGroup.add(r1, r2);
    }

    // E. Continuous Recessed LED Status Ring
    const ledRing = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.04, 1.88), statusLedMat);
    ledRing.position.y = 0.24;
    robotGroup.add(ledRing);

    // F. 100% FLAT Machined Brushed Titanium Top Load Deck
    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.06, 1.82), brushedTitanium);
    topDeck.position.y = 0.33;
    topDeck.castShadow = true;
    topDeck.receiveShadow = true;
    robotGroup.add(topDeck);

    // Flush T-Slot Mounting Rail Channels (Recessed into Top Deck)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.95, roughness: 0.2 });
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.01, 0.06), railMat);
    rail1.position.set(0, 0.362, 0.55);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.01, 0.06), railMat);
    rail2.position.set(0, 0.362, -0.55);
    robotGroup.add(rail1, rail2);

    // 4 Flush Anti-Slip Rubber Friction Grip Pads
    const padGeo = new THREE.BoxGeometry(0.8, 0.008, 0.55);
    const padPositions = [
      [0.7, 0.364, 0.45],
      [-0.7, 0.364, 0.45],
      [0.7, 0.364, -0.45],
      [-0.7, 0.364, -0.45]
    ];

    padPositions.forEach(([x, y, z]) => {
      const pad = new THREE.Mesh(padGeo, darkGraphiteMat);
      pad.position.set(x, y, z);
      robotGroup.add(pad);
    });

    // G. Embedded Flush Diagonal Safety Corner LiDARs (Smoked Glass Housing)
    const createFlushLidar = (x, z, angle) => {
      const podGroup = new THREE.Group();
      podGroup.position.set(x, 0.12, z);
      podGroup.rotation.y = angle;

      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 24), smokedGlassMat);
      housing.castShadow = true;

      const laserEmitter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.14), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      laserEmitter.position.set(0.07, 0.02, 0);

      podGroup.add(housing, laserEmitter);
      return { podGroup, laserEmitter };
    };

    const lidar1 = createFlushLidar(1.18, 0.78, 0);
    const lidar2 = createFlushLidar(-1.18, -0.78, Math.PI);
    robotGroup.add(lidar1.podGroup, lidar2.podGroup);

    // H. Recessed Underbody Drive Wheels & Corner Swivel Casters
    const wheelTreadMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.85 });
    const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.95, roughness: 0.15 });

    const driveWheels = [];

    const dwLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 24), wheelTreadMat);
    dwLeft.rotation.x = Math.PI / 2;
    dwLeft.position.set(0, -0.06, 0.78);

    const dwRimLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.17, 16), wheelRimMat);
    dwRimLeft.rotation.x = Math.PI / 2;
    dwRimLeft.position.set(0, -0.06, 0.78);

    const dwRight = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 24), wheelTreadMat);
    dwRight.rotation.x = Math.PI / 2;
    dwRight.position.set(0, -0.06, -0.78);

    const dwRimRight = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.17, 16), wheelRimMat);
    dwRimRight.rotation.x = Math.PI / 2;
    dwRimRight.position.set(0, -0.06, -0.78);

    robotGroup.add(dwLeft, dwRimLeft, dwRight, dwRimRight);
    driveWheels.push(dwLeft, dwRight);

    // Corner Passive Swivel Casters
    const casterPositions = [
      [0.95, -0.2, 0.65],
      [-0.95, -0.2, 0.65],
      [0.95, -0.2, -0.65],
      [-0.95, -0.2, -0.65]
    ];

    casterPositions.forEach(([x, y, z]) => {
      const caster = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), wheelRimMat);
      caster.position.set(x, y, z);
      robotGroup.add(caster);
    });

    // I. Embedded Digital Telemetry Displays (Front & Rear)
    const oledMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const oledFront = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.42), oledMat);
    oledFront.position.set(1.33, 0.15, 0);
    const oledRear = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.42), oledMat);
    oledRear.position.set(-1.33, 0.15, 0);
    robotGroup.add(oledFront, oledRear);

    // J. REALISTIC HEAVY INDUSTRIAL CARGO PAYLOAD (Placed Flat on Top Deck)
    if (robot.taskId) {
      const payloadGroup = new THREE.Group();
      payloadGroup.position.set(0, 0.36, 0);

      // Industrial Steel & Composite Container Crate
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8, roughness: 0.3 });
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 1.2), crateMat);
      crate.position.y = 0.435;
      crate.castShadow = true;
      payloadGroup.add(crate);

      // Stainless Steel Corner Protectors
      const metalCornerMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.1 });
      const createCorner = (cx, cz) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.87, 0.08), metalCornerMat);
        c.position.set(cx, 0.435, cz);
        return c;
      };

      payloadGroup.add(createCorner(0.8, 0.6));
      payloadGroup.add(createCorner(-0.8, 0.6));
      payloadGroup.add(createCorner(0.8, -0.6));
      payloadGroup.add(createCorner(-0.8, -0.6));

      // Barcode shipping decal
      const decal = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.36), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      decal.position.set(0.81, 0.435, 0);
      payloadGroup.add(decal);

      robotGroup.add(payloadGroup);
    }

    scene.add(robotGroup);

    // 7. Smooth Orbit Drag Controls & Touch Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let spherical = { radius: 7.5, theta: Math.PI / 4, phi: Math.PI / 3.2 };

    const updateCameraPosition = () => {
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.02, spherical.phi));
      spherical.radius = Math.max(4.0, Math.min(14, spherical.radius));

      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0.3, 0);
    };

    updateCameraPosition();

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      spherical.theta -= deltaX * 0.007;
      spherical.phi -= deltaY * 0.007;

      updateCameraPosition();
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };

    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius += e.deltaY * 0.005;
      updateCameraPosition();
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElem.addEventListener('wheel', onWheel, { passive: false });

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        spherical.theta -= deltaX * 0.007;
        spherical.phi -= deltaY * 0.007;

        updateCameraPosition();
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchEnd = () => { isDragging = false; };

    domElem.addEventListener('touchstart', onTouchStart);
    domElem.addEventListener('touchmove', onTouchMove);
    domElem.addEventListener('touchend', onTouchEnd);

    // 8. Continuous Render Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Internal laser optics spinning
      lidar1.laserEmitter.rotation.y += 0.14;
      lidar2.laserEmitter.rotation.y += 0.14;

      // Auto-orbit camera if enabled
      if (autoRotate && !isDragging) {
        spherical.theta += 0.004;
        updateCameraPosition();
      }

      // Rotate wheels when moving
      if (robot.status === 'MOVING') {
        driveWheels.forEach(w => {
          w.rotation.z += 0.12;
        });
      }

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
      window.removeEventListener('resize', handleResize);
      if (container) container.innerHTML = '';
    };
  }, [isThreeLoaded, robot, autoRotate]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(9, 9, 11, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: 1180,
          height: '88vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 16,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
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
                Space Gray Anodized Alloy • Polished Titanium Deck • P2P Mesh Node
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

            {/* Viewport Overlay Controls */}
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
                style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#fff' }}
                onClick={() => setAutoRotate(!autoRotate)}
                title="Toggle 3D Camera Orbit"
              >
                {autoRotate ? <Pause size={14} color="var(--brand-orange)" /> : <Play size={14} color="#10b981" />}
                <span>{autoRotate ? 'Pause Orbit' : 'Rotate 3D'}</span>
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
                top: 16,
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
              MACHINED TITANIUM DECK • PAYLOAD: 250 KG • SPEED: 2.0 M/S
            </div>
          </div>

          {/* Right Side Telemetry Panel */}
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

            {activeTab === 'telemetry' ? (
              <>
                {/* Battery & System Health Cards */}
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

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Arbitration Priority:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{robot.effectivePriority?.toFixed(1) || '1.0'}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', padding: '12px 0' }}>
                      Flat deck empty. Robot idling at docking cell.
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Hardware Component Diagnostics Tab */
              <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Cpu size={14} color="var(--brand-orange)" />
                  Industrial Metallic CAD Architecture
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Chassis Material</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Space Gray Anodized Alloy</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Deck Plate</span>
                    <span style={{ color: 'var(--status-emerald)', fontWeight: 800 }}>Polished Machined Titanium</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Drive Motors</span>
                    <span style={{ color: 'var(--status-emerald)', fontWeight: 800 }}>Dual BLDC Differential</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Safety Optics</span>
                    <span style={{ color: 'var(--status-emerald)', fontWeight: 800 }}>Dual Smoked Glass LiDARs</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>P2P Mesh Transceiver</span>
                    <span style={{ color: 'var(--status-emerald)', fontWeight: 800 }}>Ultra-Wideband 5.8 GHz</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Core Temp</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>37.8 °C (Normal)</span>
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
