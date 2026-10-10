import { useEffect, useRef } from 'react';

export function ProductScene({ variant }: { variant: 'product' | 'policy' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      canvas.hidden = true;
      return;
    }

    let disposed = false;
    let frame: number | null = null;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    const cleanups: Array<() => void> = [];

    void import('three').then((THREE) => {
      if (disposed || !canvasRef.current) return;

      try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0, 7.8);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setClearAlpha(0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const composition = new THREE.Group();
        scene.add(composition);
        const isPolicy = variant === 'policy';

        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xbf5700, transparent: true, opacity: isPolicy ? 0.24 : 0.42 });
        const surfaceMaterial = new THREE.MeshBasicMaterial({ color: 0x161616, transparent: true, opacity: 0.76, side: THREE.DoubleSide });
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xf3eee7, transparent: true, opacity: 0.28 });
        const accentMaterial = new THREE.MeshBasicMaterial({ color: 0xbf5700 });

        const cards: { group: InstanceType<typeof THREE.Group>; baseY: number }[] = [];
        const cardPositions = isPolicy
          ? [[-1.8, 1.35, 0], [0.15, 0.9, -0.55], [1.65, -0.15, 0.15], [-0.7, -1.1, 0.45]]
          : [[-1.95, 1.15, -0.2], [0.15, 1.45, -0.65], [1.75, 0.25, 0.15], [-1.25, -1.0, 0.45], [0.9, -1.25, -0.15]];

        for (const [index, position] of cardPositions.entries()) {
          const card = new THREE.Group();
          const width = index % 2 === 0 ? 1.65 : 1.35;
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.88), surfaceMaterial);
          card.add(panel);
          card.add(new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), edgeMaterial));

          for (let row = 0; row < 3; row += 1) {
            const bar = new THREE.Mesh(
              new THREE.PlaneGeometry(width * (0.5 - row * 0.08), 0.028),
              row === 0 ? lineMaterial : edgeMaterial,
            );
            bar.position.set(-width * 0.14, 0.22 - row * 0.2, 0.015);
            card.add(bar);
          }
          const dot = new THREE.Mesh(new THREE.CircleGeometry(0.055, 18), accentMaterial);
          dot.position.set(width * 0.36, 0.23, 0.02);
          card.add(dot);
          card.position.set(position[0], position[1], position[2]);
          card.rotation.set(-0.08 + index * 0.035, 0.16 - index * 0.055, -0.05 + index * 0.025);
          composition.add(card);
          cards.push({ group: card, baseY: position[1] });
        }

        const pathPoints = cardPositions.map(([x, y, z]) => new THREE.Vector3(x, y, z - 0.08));
        const path = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.4);
        composition.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(90)), lineMaterial));

        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(180 * 3);
        for (let index = 0; index < starPositions.length; index += 3) {
          starPositions[index] = (Math.random() - 0.5) * 9;
          starPositions[index + 1] = (Math.random() - 0.5) * 6;
          starPositions[index + 2] = (Math.random() - 0.5) * 3 - 1;
        }
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        composition.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.018, transparent: true, opacity: 0.4 })));

        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          camera.aspect = Math.max(rect.width, 1) / Math.max(rect.height, 1);
          camera.updateProjectionMatrix();
          renderer.setSize(Math.max(rect.width, 1), Math.max(rect.height, 1), false);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
        resize();

        let pointerX = 0;
        let pointerY = 0;
        const onPointer = (event: PointerEvent) => {
          pointerX = (event.clientX / window.innerWidth - 0.5) * 0.28;
          pointerY = (event.clientY / window.innerHeight - 0.5) * 0.18;
        };
        window.addEventListener('pointermove', onPointer, { passive: true });
        cleanups.push(() => window.removeEventListener('pointermove', onPointer));

        let visible = true;
        const stop = () => {
          if (frame !== null) window.cancelAnimationFrame(frame);
          frame = null;
        };
        const clock = new THREE.Clock();
        const render = () => {
          frame = null;
          if (disposed || !visible || document.hidden) return;
          const elapsed = clock.getElapsedTime();
          composition.rotation.y += (pointerX - composition.rotation.y) * 0.022;
          composition.rotation.x += (-pointerY - composition.rotation.x) * 0.022;
          cards.forEach(({ group, baseY }, index) => {
            group.position.y = baseY + Math.sin(elapsed * 0.42 + index * 1.7) * 0.045;
          });
          renderer.render(scene, camera);
          frame = window.requestAnimationFrame(render);
        };
        const start = () => {
          if (frame === null && visible && !document.hidden && !disposed) frame = window.requestAnimationFrame(render);
        };

        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) start();
          else stop();
        });
        intersectionObserver.observe(canvas);

        const onVisibility = () => {
          if (document.hidden) stop();
          else start();
        };
        document.addEventListener('visibilitychange', onVisibility);
        cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));
        start();

        cleanups.push(() => {
          stop();
          resizeObserver?.disconnect();
          intersectionObserver?.disconnect();
          renderer.dispose();
          starGeometry.dispose();
          lineMaterial.dispose();
          surfaceMaterial.dispose();
          edgeMaterial.dispose();
          accentMaterial.dispose();
        });
      } catch {
        canvas.hidden = true;
      }
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [variant]);

  return <canvas ref={canvasRef} data-product-scene aria-hidden="true" />;
}
