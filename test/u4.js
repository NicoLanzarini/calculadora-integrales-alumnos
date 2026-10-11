/* Unidad 4: cada ejemplo cargable reproduce su valor verificado,
   y en los de Stokes los dos lados del teorema coinciden. */
const { load, sgValue } = require('./harness');
const REF = require('./reference.json');

module.exports = function run(report) {
  const { api, d } = load({ quiet: true });

  for (const ex of api.EXAMPLES4) {
    const ref = REF.u4[ex.n];
    if (ex.noLoad) { report.note(`U4 ej${ex.n} (${ex.ref}) sin carga, referencia ${ref}`); continue; }
    const btn = d.querySelector(`[data-load4="${ex.n}"]`);
    if (!btn) { report.fail(`U4 ej${ex.n}: falta el boton de carga`); continue; }
    btn.click();

    const campo = ex.tag === 'área' ? 'Área' : (ex.tag === 'flujo' ? 'Flujo' : 'lado superficie');
    const got = sgValue(d, campo);
    const ok = Math.abs(ref) < 1e-9 ? Math.abs(got) < 1e-6
             : Math.abs(got - ref) / Math.abs(ref) < 2e-4;
    report.check(ok, `U4 ej${ex.n} (${ex.ref}) ${campo}`, `${got} vs ${ref}`);

    if (ex.tag === 'Stokes') {
      const c = sgValue(d, 'lado curva');
      report.check(Math.abs(c - got) < 2e-3 * Math.max(1, Math.abs(got)),
        `U4 ej${ex.n} Stokes cierra por ambos lados`, `superficie ${got} vs curva ${c}`);
    }
  }

  /* los tres presets con el mismo borde dan la misma circulacion y areas distintas.
     Los presets cambian la superficie pero NO el campo: hay que fijar F aparte. */
  const esp = REF.stokes_presets.esperado;
  const setF = (P,Q,R) => { d.getElementById('sP').value=P; d.getElementById('sQ').value=Q; d.getElementById('sR').value=R; };
  for (const [name, area] of Object.entries(REF.stokes_presets.areas)) {
    d.querySelector(`[data-sgp=${name}]`).click();
    setF('-y','x','0');
    d.getElementById('sCx').value='cos(t)'; d.getElementById('sCy').value='sin(t)';
    d.getElementById('sCz').value='0'; d.getElementById('sT0').value='0'; d.getElementById('sT1').value='2*pi';
    d.getElementById('sShowC').checked = true;
    d.getElementById('btnSG').click();
    const fr = sgValue(d, 'lado superficie'), ci = sgValue(d, 'lado curva'), ar = sgValue(d, 'Área');
    report.check(Math.abs(fr - esp) < 1e-4 && Math.abs(ci - esp) < 1e-4,
      `Stokes preset ${name} = 2pi`, `${fr} / ${ci}`);
    report.check(Math.abs(ar - area) < 1e-4, `area de ${name}`, `${ar} vs ${area}`);
  }

  /* Gauss: esfera cerrada con F=(x,y,z) -> flujo = 3 * 4pi/3 = 4pi */
  d.querySelector('[data-sgp=esfera]').click();
  ['sP','sQ','sR'].forEach((id, i) => { d.getElementById(id).value = ['x','y','z'][i]; });
  d.getElementById('btnSG').click();
  const flujo = sgValue(d, 'Flujo');
  report.check(Math.abs(flujo - 4 * Math.PI) < 1e-4, 'Gauss esfera: flujo = 4pi', String(flujo));
};
