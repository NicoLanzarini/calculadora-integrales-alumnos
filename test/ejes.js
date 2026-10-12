/* Ejes: orientación sin espejo, triedro contra proyección, marcas y letras
   (dentro del área, sin pisarse, creciendo hacia el eje), cámaras entre paneles
   y signos de los campos de Física II.
   Las comprobaciones de orientación usan la misma proyección que la página;
   las de signo usan las fórmulas de los presets tal como quedan en los campos. */
const { load } = require('./harness');

module.exports = function run(report) {
  const { api, d } = load({ quiet: true });
  const near = (a, b, t = 1e-6) => Math.abs(a - b) < t;
  const box = { cx: 0, cy: 0, cz: 0, s: 1 };

  /* captura de las operaciones de dibujo de un panel: líneas y textos, en orden.
     Cada texto guarda su fuente y alineado para medirlo como se dibuja. */
  function grab(dd, host) {
    const ctx = dd.getElementById(host).querySelector('canvas').getContext('2d');
    const ops = [];
    for (const m of ['moveTo', 'lineTo']) {
      const f = ctx[m].bind(ctx);
      ctx[m] = (x, y) => { ops.push([m === 'moveTo' ? 'M' : 'L', x, y]); return f(x, y); };
    }
    const ft = ctx.fillText.bind(ctx);
    ctx.fillText = (t, x, y) => { ops.push(['T', t, x, y, ctx.font, ctx.textAlign, ctx.textBaseline]); return ft(t, x, y); };
    return { ctx, ops };
  }
  /* rectángulo que ocupa cada texto capturado */
  const rects = (g) => g.ops.filter(o => o[0] === 'T').map(o => {
    g.ctx.font = o[4];
    const w = g.ctx.measureText(o[1]).width, h = 11;
    const l = o[5] === 'center' ? o[2] - w/2 : o[5] === 'right' ? o[2] - w : o[2];
    const t = o[6] === 'middle' ? o[3] - h/2 : o[6] === 'bottom' ? o[3] - h : o[3];
    return { txt: o[1], l, r: l + w, t, b: t + h, x: o[2], y: o[3], base: o[6] };
  });
  /* texto de ejes: letras y marcas que dibuja drawAxes, con línea base no alfabética.
     La barra de color y la leyenda quedan en 'alphabetic' y no entran en la comprobación. */
  const esEje = r => (/^[xyz]$/.test(r.txt) || /^-?\d+(\.\d+)?$/.test(r.txt)) && r.base !== 'alphabetic';
  const solapan = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

  /* ---- 1. lateralidad: en cualquier cámara, la base imagen (derecha, arriba,
        hacia el observador) tiene determinante +1; un espejo daría -1.
        "Hacia el observador" = -profundidad, porque el pintor dibuja primero lo lejano. */
  const det3 = M => M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])
                  - M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])
                  + M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
  d.querySelector('[data-load="1"]').click(); d.getElementById('btnPlot').click();
  const V = api.VIEWS.plot3d;
  let minD = Infinity, maxD = -Infinity, n = 0;
  for (let yaw = -Math.PI; yaw <= Math.PI + 1e-9; yaw += Math.PI / 5)
    for (let pitch = -1.4; pitch <= 1.4 + 1e-9; pitch += 0.35) {
      V.yaw = yaw; V.pitch = pitch;
      const o = api.project([0, 0, 0], box);
      const cols = [[1,0,0],[0,1,0],[0,0,1]].map(p => {
        const q = api.project(p, box);
        return [q.sx - o.sx, q.sy - o.sy, -(q.depth - o.depth)];
      });
      const dt = det3([0,1,2].map(r => [0,1,2].map(c => cols[c][r])));
      minD = Math.min(minD, dt); maxD = Math.max(maxD, dt); n++;
    }
  report.check(minD > 0.999 && maxD < 1.001,
    `lateralidad: ${n} cámaras dan det=+1 (sin espejo)`, `det ∈ [${minD.toFixed(6)}, ${maxD.toFixed(6)}]`);

  /* ---- 2. controles de CLAUDE.md y sentido de cada eje con pitch 0 */
  V.yaw = 0; V.pitch = Math.PI / 2;
  const up = api.project([0, 1, 0], box);
  report.check(near(up.sy, 1) && near(up.sx, 0), 'control: pitch=+90°, (0,1,0) proyecta arriba', JSON.stringify(up));
  V.pitch = 0;
  const px = api.project([1, 0, 0], box), pz = api.project([0, 0, 1], box), pm = api.project([0, -1, 0], box);
  report.check(near(px.sx, 1) && near(px.sy, 0), 'pitch=0: +x a la derecha', JSON.stringify(px));
  report.check(near(pz.sy, 1) && near(pz.sx, 0), 'pitch=0: +z arriba', JSON.stringify(pz));
  report.check(near(pm.depth, -1), 'pitch=0: el observador está en -y (profundidad menor = más cerca)', String(pm.depth));

  /* ---- 3. triedro contra proyección, con tres cámaras */
  const ox = d.getElementById('plot3d').querySelector('canvas').clientWidth - 44, oy = 44;
  d.querySelector('[data-load="1"]').click(); d.getElementById('btnPlot').click();
  const g3 = grab(d, 'plot3d');
  const unit = v => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
  for (const [yaw, pitch] of [[-2.0, 0.38], [0, 0.06], [0.7, 1.2]]) {
    V.yaw = yaw; V.pitch = pitch; V.zoom = 1;
    g3.ops.length = 0;
    api.drawScene('plot3d');
    const triad = [];
    for (let i = 0; i < g3.ops.length; i++) {
      const o = g3.ops[i];
      if (o[0] === 'M' && near(o[1], ox) && near(o[2], oy)) {
        const nx = g3.ops.slice(i + 1).find(q => q[0] === 'L');
        if (nx) triad.push([nx[1] - ox, nx[2] - oy]);
      }
    }
    const tag = `yaw ${yaw}, pitch ${pitch}`;
    report.check(triad.length === 3, `triedro (${tag}): se dibujan tres ejes desde la esquina`, String(triad.length));
    ['x', 'y', 'z'].forEach((k, i) => {
      const p = api.project(k === 'x' ? [1,0,0] : k === 'y' ? [0,1,0] : [0,0,1], box);
      const a = unit(triad[i] || [0, 0]), b = unit([p.sx, -p.sy]);
      report.check(a[0]*b[0] + a[1]*b[1] > 0.999, `triedro eje ${k} coincide con la proyección (${tag})`,
        `triedro=(${a.map(v => v.toFixed(3))}) proy=(${b.map(v => v.toFixed(3))})`);
    });
  }
  V.yaw = -2.0; V.pitch = 0.38; V.zoom = 1;
  g3.ops.length = 0; api.drawScene('plot3d');
  const letrasTriedro = g3.ops.filter(o => o[0] === 'T' && /^[xyz]$/.test(o[1]) && Math.hypot(o[2] - ox, o[3] - oy) < 45);
  report.check(letrasTriedro.length === 3, 'triedro: una letra por eje', letrasTriedro.map(o => o[1]).join(','));
  const letrasEje = g3.ops.filter(o => o[0] === 'T' && /^[xyz]$/.test(o[1]) && Math.hypot(o[2] - ox, o[3] - oy) >= 45);
  report.check(letrasEje.length >= 3, '3D: cada eje tiene su letra sobre una arista, además del triedro', letrasEje.map(o => o[1]).join(','));

  /* ---- 4. campos: marcas y letras en 2D, y en 3D sobre las aristas */
  const setField = (dd, dim, P, Q, R, lo = '-2', hi = '2') => {
    dd.getElementById(dim === 3 ? 'fd3' : 'fd2').click();
    dd.getElementById('fP').value = P; dd.getElementById('fQ').value = Q; dd.getElementById('fR').value = R;
    dd.getElementById('fLines').checked = false; dd.getElementById('fArrows').checked = true;
    dd.getElementById('fDomLo').value = lo; dd.getElementById('fDomHi').value = hi;
    dd.getElementById('btnField').click();
    return api.getScene();
  };
  const redibujar = (dd, host) => { const g = grab(dd, host); g.ops.length = 0; api.drawScene(host); return g; };

  setField(d, 2, '1', '0', '0');
  const g2 = redibujar(d, 'plotField');
  const txt2 = g2.ops.filter(o => o[0] === 'T').map(o => o[1]);
  report.check(['-2','-1','0','1','2'].every(v => txt2.includes(v)), '2D: marcas -2…2 sobre el marco');
  report.check(txt2.includes('x') && txt2.includes('y'), '2D: letra x abajo a la derecha y letra y arriba a la izquierda');
  setField(d, 2, '1', '0', '0', '1', '3');
  const g2b = redibujar(d, 'plotField');
  report.check(g2b.ops.some(o => o[0] === 'T' && o[1] === '1.5'), '2D: dominio [1,3] usa paso 0,5 (aparece 1,5)');

  setField(d, 3, '1', '0', '0');
  const g3f = redibujar(d, 'plotField');
  const nums3 = g3f.ops.filter(o => o[0] === 'T' && /^-?\d+$/.test(o[1])).map(o => o[1]);
  report.check(['-2','-1','0','1','2'].every(v => nums3.includes(v)), '3D: marcas -2…2 sobre las aristas del campo [-2,2]', nums3.join(' '));

  /* ---- 5. las marcas crecen en la dirección positiva de su eje.
        Los números se dibujan por eje (x, luego y, luego z) y cada grupo sube de valor:
        se parte cuando el valor baja. Primer a último número, dentro de cada grupo,
        tiene que apuntar como +k en pantalla. */
  const numTxt = g3f.ops.filter(o => o[0] === 'T' && /^-?\d+(\.\d+)?$/.test(o[1]));
  const grupos = []; let prev = Infinity;
  for (const o of numTxt) {
    const v = parseFloat(o[1]);
    if (v <= prev) grupos.push([]);
    grupos[grupos.length - 1].push(o); prev = v;
  }
  const ejes = ['x','y','z'];
  for (let i = 0; i < 3; i++) {
    const k = ejes[i], g = grupos[i];
    if (!g || g.length < 2) { report.check(false, `marcas de ${k}: hay al menos dos`); continue; }
    const first = g[0], last = g[g.length - 1];
    const dv = [last[2] - first[2], last[3] - first[3]];
    const pa = api.project([0,0,0], box), pk = api.project(k === 'x' ? [1,0,0] : k === 'y' ? [0,1,0] : [0,0,1], box);
    const dir = [pk.sx - pa.sx, -(pk.sy - pa.sy)];
    const cos = (dv[0]*dir[0] + dv[1]*dir[1]) / (Math.hypot(...dv) * Math.hypot(...dir) + 1e-12);
    report.check(cos > 0.9, `marcas de ${k} crecen hacia +${k} en pantalla`, `cos=${cos.toFixed(3)} ${first[1]}→${last[1]}`);
  }

  /* ---- 6. texto de los ejes: dentro del área de dibujo y sin pisarse,
        en el canvas por defecto (560×430, área 406 px) y en uno chico (320×320) */
  const cv2 = d.getElementById('plotField').querySelector('canvas');
  const areaW = cv2.clientWidth, areaH = Math.max(80, cv2.clientHeight - 24);
  const sinPisarse = (g, tag) => {
    const R = rects(g).filter(esEje);
    const pisan = [];
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++)
      if (solapan(R[i], R[j])) pisan.push(`${R[i].txt}/${R[j].txt}`);
    report.check(pisan.length === 0, `texto de ejes sin pisarse (${tag})`, pisan.join(' '));
    const fuera = R.filter(r => r.l < 0 || r.r > areaW || r.t < 0 || r.b > areaH).map(r => r.txt);
    report.check(fuera.length === 0, `texto de ejes dentro del área (${tag})`, fuera.join(' '));
  };
  sinPisarse(g3f, '3D campo, 560×430');
  const dChico = load({ quiet: true, width: 320, height: 320 });
  dChico.d.getElementById('fd3').click();
  dChico.d.getElementById('fP').value = '1'; dChico.d.getElementById('fQ').value = '0'; dChico.d.getElementById('fR').value = '0';
  dChico.d.getElementById('btnField').click();
  const gChico = grab(dChico.d, 'plotField'); gChico.ops.length = 0; dChico.api.drawScene('plotField');
  const cvC = dChico.d.getElementById('plotField').querySelector('canvas');
  const areaWC = cvC.clientWidth, areaHC = Math.max(80, cvC.clientHeight - 24);
  const RC = rects(gChico).filter(esEje);
  const fueraC = RC.filter(r => r.l < 0 || r.r > areaWC || r.t < 0 || r.b > areaHC).map(r => r.txt);
  report.check(fueraC.length === 0, 'texto de ejes dentro del área (3D campo, 320×320)', fueraC.join(' '));
  const pisanC = [];
  for (let i = 0; i < RC.length; i++) for (let j = i + 1; j < RC.length; j++) if (solapan(RC[i], RC[j])) pisanC.push(`${RC[i].txt}/${RC[j].txt}`);
  report.check(pisanC.length === 0, 'texto de ejes sin pisarse (3D campo, 320×320)', pisanC.join(' '));
  setField(d, 2, '1', '0', '0', '-2', '2');
  const g2c = redibujar(d, 'plotField');
  sinPisarse(g2c, '2D campo, [-2,2]');

  /* ---- 7. cámaras entre paneles */
  setField(d, 3, '0', '0', '1');
  const VF = api.VIEWS.plotField;
  VF.yaw = 0.7; VF.pitch = 0.2;                       /* el alumno rota el 3D */
  setField(d, 3, '0', '0', '1');
  report.check(near(VF.yaw, 0.7) && near(VF.pitch, 0.2), '3D tras 3D conserva la rotación del alumno');
  setField(d, 2, '1', '0', '0');
  report.check(near(VF.pitch, Math.PI / 2) && near(VF.yaw, 0), '2D deja la cámara de frente');
  VF.zoom = 2.5;
  setField(d, 2, '1', '0', '0');
  report.check(near(VF.zoom, 1), '2D tras un zoom 3D vuelve a zoom 1 (las marcas no se salen del panel)', String(VF.zoom));
  /* otro panel activo entre el 2D y el 3D: la cámara sigue dependiendo de la escena anterior del campo */
  d.querySelector('[data-load="1"]').click(); d.getElementById('btnPlot').click();
  setField(d, 3, '0', '0', '1');
  report.check(near(VF.pitch, 0.38) && near(VF.yaw, -2.0), '3D tras 2D (con otro panel activo en medio) vuelve a la isométrica',
    `yaw=${VF.yaw} pitch=${VF.pitch}`);

  /* ---- 8. signos físicos de los presets de Física II */
  const preset = (id, dim) => {
    d.getElementById(dim === 3 ? 'fd3' : 'fd2').click();
    d.querySelector(`[data-fpreset=${id}]`).click();
    return { P: d.getElementById('fP').value, Q: d.getElementById('fQ').value, R: d.getElementById('fR').value };
  };
  const F = (v, pt) => [v.P, v.Q, v.R].map(src => api.compileExpr(src, ['x','y','z'])(pt));
  const v3 = (a, b, t = 1e-9) => a.every((x, i) => Math.abs(x - b[i]) < t);
  report.check(v3(F(preset('carga', 3), [0,0,0]), [0,0,1]), 'carga +1 en (0,0,-1): en el origen E=(0,0,1), hacia afuera');
  report.check(v3(F(preset('dipE', 3), [0,0,0]), [0,0,-2]), 'dipolo E: en el origen E=(0,0,-2), de la + a la -');
  const Bp = F(preset('dipB', 3), [0,0,0.5]);
  report.check(Math.abs(Bp[2] - 2/Math.pow(1.5,3)) < 1e-9 && Math.abs(Bp[0]) < 1e-9 && Math.abs(Bp[1]) < 1e-9,
    'dipolo B: sobre el polo B = 2m/r³ hacia +z', JSON.stringify(Bp));
  report.check(v3(F(preset('hilos', 2), [0,0,0]), [0,-2,0]), 'dos hilos: en el centro B=(0,-2)');

  /* ---- 9. superficie plana (z constante): sin escala en z, sin excepciones */
  d.querySelector('nav.tabs button[data-tab=calc]').click();
  d.getElementById('fExpr').value = '0';
  d.getElementById('btnPlot').click();
  const notaViz = d.getElementById('vizNote').textContent;
  report.check(!/No se pudo/.test(notaViz) && !!api.getScene(), 'superficie plana z=0 se dibuja sin excepciones', notaViz);

  /* ---- 10. rango minúsculo sobre valores grandes: el bucle de marcas no puede colgarse */
  setField(d, 3, '1', '0', '0', '10000', '10000.000000000002');
  report.check(!/No se pudo/.test(d.getElementById('fieldNote').textContent) && !!api.getScene(),
    'dominio de 1,8e-12 sobre 1e4 se dibuja sin colgarse (regresión del bucle de marcas)');
};
