/* intro3d.js — the folded map as a REAL 3D object.
   Three columns of the sheet: center flat, two wings folded over it.
   The wings' free edges curl apart at the middle — the parted "opening"
   of the prop — with darkness inside. A warm point light (the candle)
   shades the curdled paper for real. The oath unfolds it, the camera
   dollies in until the sheet fills the screen, then hands off to Pixi. */
'use strict';
window.MoM = window.MoM || {};

MoM.intro3d = (() => {
  // world units: map is 32 x 20
  const SW = 32, SH = 20, COL = SW / 3;
  let renderer, scene, cam, root;
  let wingL, wingR, groupL, groupR, centerPlane, innerDark, bulk;
  let curl = { amt: 1 };
  let fx = { tremble: 0, boost: 0 };
  let pointer = { x: 0.5, y: 0.5 };
  let candle;
  let running = true;
  let baseZ = [];

  function sliceTex(texture, col) {
    const t = texture.clone();          // texture is FULLY LOADED before cloning
    t.needsUpdate = true;
    t.repeat.set(1 / 3, 1);
    t.offset.set(col / 3, 0);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function bendWing(geo, sign) {
    // curl rises toward the free edge (local +x is away from hinge)
    const pos = geo.attributes.position;
    const arr = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);                       // -COL/2 .. COL/2
      const f = (x / COL + 0.5);                   // 0 at hinge .. 1 free edge
      const z = Math.pow(f, 2.1) * 1.15;           // lift
      arr.push(z);
      pos.setZ(i, pos.getZ(i) + z);
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    return arr;                                     // remember the curl offsets
  }

  async function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.setClearColor(0x0d0a06, 1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.id = 'intro3d';
    renderer.domElement.style.cssText =
      'position:fixed;inset:0;z-index:5;transition:opacity 1.1s ease;';
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 300);
    cam.position.set(0, -4.5, 40);
    cam.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffe1b0, 0.34));
    candle = new THREE.PointLight(0xffca7a, 1.35, 0, 2);
    candle.position.set(2, 6, 22);
    scene.add(candle);
    const fill = new THREE.DirectionalLight(0x8a9cc0, 0.18);   // cool moon fill
    fill.position.set(-8, 10, 14);
    scene.add(fill);

    root = new THREE.Group();
    root.rotation.x = -0.16;          // laid slightly away, like held paper
    root.rotation.z = -0.03;
    scene.add(root);

    const parch = await new THREE.TextureLoader().loadAsync('assets/parchment.jpg');
    parch.encoding = THREE.sRGBEncoding;

    const mat = (tex) => new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.93, metalness: 0.0, side: THREE.DoubleSide,
    });

    // interior darkness behind the parted seam
    innerDark = new THREE.Mesh(
      new THREE.PlaneGeometry(COL * 1.05, SH * 1.02),
      new THREE.MeshBasicMaterial({ color: 0x140c04 }),
    );
    innerDark.position.z = -0.09;
    root.add(innerDark);

    // page bulk beneath (stacked darker sheets)
    bulk = new THREE.Group();
    for (let i = 1; i <= 3; i++) {
      const b = new THREE.Mesh(
        new THREE.PlaneGeometry(COL + i * 0.5, SH + i * 0.34),
        new THREE.MeshStandardMaterial({
          map: sliceTex(parch, 1), roughness: 0.95,
          color: new THREE.Color(1 - i * 0.16, 1 - i * 0.18, 1 - i * 0.2),
        }),
      );
      b.position.set(-i * 0.16, -i * 0.1, -0.16 - i * 0.07);
      b.rotation.z = i * 0.004;
      bulk.add(b);
    }
    root.add(bulk);

    // the center column, flat
    centerPlane = new THREE.Mesh(new THREE.PlaneGeometry(COL, SH, 2, 2), mat(sliceTex(parch, 1)));
    root.add(centerPlane);

    // wings: hinged at the center column's edges, folded OVER the center
    const mkWing = (col, sign) => {
      const group = new THREE.Group();
      group.position.set(sign * COL / 2, 0, 0.02);
      const geo = new THREE.PlaneGeometry(COL, SH, 26, 2);
      const offsets = bendWing(geo, sign);
      const wing = new THREE.Mesh(geo, mat(sliceTex(parch, col)));
      wing.position.x = sign * COL / 2;
      group.add(wing);
      root.add(group);
      return { group, wing, geo, offsets };
    };
    const L = mkWing(0, -1);
    const R = mkWing(2, +1);
    groupL = L.group; wingL = L;
    groupR = R.group; wingR = R;
    // closed pose: folded over the front, leaving a parted gap at the seam
    groupL.rotation.y = Math.PI - 0.10;
    groupR.rotation.y = -(Math.PI - 0.10);

    addEventListener('pointermove', (e) => {
      pointer.x = e.clientX / innerWidth;
      pointer.y = e.clientY / innerHeight;
    });
    addEventListener('resize', onResize);
    animate();
  }

  function onResize() {
    if (!renderer) return;
    renderer.setSize(innerWidth, innerHeight);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  }

  let t = 0, last = performance.now();
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    // candle follows the cursor, flickering
    candle.position.x = (pointer.x - 0.5) * 34;
    candle.position.y = (0.5 - pointer.y) * 22 + 4;
    const flick = Math.sin(t * 9.3) * 0.06 + Math.sin(t * 23.7) * 0.04 + Math.sin(t * 3.1) * 0.05;
    candle.intensity = 1.35 * (1 + flick + fx.boost * 0.5);
    // breathing + tremble
    root.rotation.z = -0.03 + Math.sin(t * 0.5) * 0.006 + fx.tremble * Math.sin(t * 47) * 0.012;
    root.position.y = Math.sin(t * 0.7) * 0.12;
    // curl amount (relaxes to flat during the unravel)
    [wingL, wingR].forEach(({ geo, offsets }) => {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        // base plane z is 0; re-apply scaled curl
        pos.setZ(i, offsets[i] * curl.amt);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    });
    renderer.render(scene, cam);
  }

  /* screen rect of the closed folio face (for the DOM ink overlay) */
  function folioRect() {
    const pts = [
      [-COL * 0.44, SH * 0.42], [COL * 0.44, SH * 0.42],
      [-COL * 0.44, -SH * 0.42], [COL * 0.44, -SH * 0.42],
    ].map(([x, y]) => {
      const v = new THREE.Vector3(x, y, 1.25);
      root.localToWorld(v);
      v.project(cam);
      return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return {
      x1: Math.min(...xs), y1: Math.min(...ys),
      x2: Math.max(...xs), y2: Math.max(...ys),
    };
  }

  /* tremble + guttering during the suspense beat */
  function suspense() {
    gsap.to(fx, { tremble: 1, boost: 1, duration: 1.2, ease: 'power2.in' });
    gsap.to(fx, { tremble: 0, boost: 0, duration: 0.8, delay: 2.4 });
  }

  /* the unravel; resolves when the sheet fills the screen */
  function unravel() {
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      // the parted seam opens first: wings lift a little wider… a breath…
      tl.to(groupL.rotation, { y: Math.PI - 0.42, duration: 1.1, ease: 'power2.inOut' }, 0);
      tl.to(groupR.rotation, { y: -(Math.PI - 0.42), duration: 1.1, ease: 'power2.inOut' }, 0.12);
      // …then they swing fully open, curl relaxing as the paper flattens
      tl.to(groupL.rotation, { y: 0, duration: 2.6, ease: 'power3.inOut' }, 1.5);
      tl.to(groupR.rotation, { y: 0, duration: 2.6, ease: 'power3.inOut' }, 1.85);
      tl.to(curl, { amt: 0, duration: 2.4, ease: 'power2.out' }, 2.0);
      tl.to(root.rotation, { x: 0, z: 0, duration: 2.4, ease: 'power2.inOut' }, 1.8);
      // bulk + interior vanish beneath the widening sheet
      tl.to(bulk.position, { z: -0.6, duration: 1.6 }, 1.6);
      tl.add(() => { bulk.visible = false; innerDark.visible = false; }, 3.2);
      // camera: a step back to take it in, then the dive until it fills all
      tl.to(cam.position, { z: 46, y: -2, duration: 1.8, ease: 'power2.out' }, 1.5);
      const fitZ = (SH / 2) / Math.tan((34 * Math.PI / 180) / 2);
      tl.to(cam.position, { z: fitZ * 0.86, y: 0, duration: 2.6, ease: 'power2.inOut' }, 3.6);
    });
  }

  function fadeOut() {
    renderer.domElement.style.opacity = 0;
    setTimeout(() => {
      running = false;
      renderer.domElement.remove();
      renderer.dispose();
    }, 1200);
  }

  return { init, folioRect, suspense, unravel, fadeOut };
})();
