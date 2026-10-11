/* Interfaz: pestañas, pantalla dividida, orden de integracion, formas exactas,
   escala de colores y aislamiento entre paneles. */
const { load, calcValue } = require('./harness');

module.exports = function run(report) {
  const { api, d, w, ev } = load({ quiet: true });

  /* cada pestaña activa su panel */
  const tabs = [...d.querySelectorAll('nav.tabs button')].map(b => b.dataset.tab);
  tabs.forEach(t => {
    d.querySelector(`nav.tabs button[data-tab="${t}"]`).click();
    report.check(!!d.querySelector(`#tab-${t}.active`), `pestaña ${t} activa su panel`);
  });

  /* las 6 permutaciones del orden de integracion dan el mismo tetraedro = 1/6 */
  const sel = d.getElementById('modeSelect');
  sel.value = 'F'; sel.dispatchEvent(ev());
  const os = d.getElementById('orderSelect');
  for (const o of ['xyz','xzy','yxz','yzx','zxy','zyx']) {
    os.value = o; os.dispatchEvent(ev());
    d.getElementById('fExpr').value = '1';
    d.getElementById('btnCalc').click();
    const v = calcValue(d);
    report.check(Math.abs(v - 1/6) < 1e-6, `orden ${o} -> tetraedro = 1/6`, String(v));
  }

  /* cargar un ejemplo vuelve el orden a dz dy dx */
  os.value = 'zyx'; os.dispatchEvent(ev());
  d.querySelector('[data-load="14"]').click();
  report.check(os.value === 'xyz', 'cargar un ejemplo resetea el orden');

  /* formas exactas: ningun falso positivo contra los valores de referencia */
  const casos = [[Math.PI/4,'π/4'], [2*Math.PI/3,'2π/3'], [8/3,'8/3'], [Math.sqrt(2),'√2'],
                 [4*Math.PI*Math.sqrt(2),'4π√2'], [0,'0']];
  for (const [v, esperado] of casos) {
    report.check(api.exactForm(v) === esperado, `forma exacta de ${v}`, String(api.exactForm(v)));
  }
  report.check(api.exactForm(0.1160582568) === null, 'no inventa forma para un numero sin forma');

  /* pantalla dividida: paneles alineados y opciones mutuamente excluyentes */
  const A = d.getElementById('paneA'), B = d.getElementById('paneB'), T = d.getElementById('splitToggle');
  T.checked = true; T.dispatchEvent(ev());
  report.check(d.querySelector('.wrap').classList.contains('split'), 'pantalla dividida se activa');
  const bloqueadaEnB = [...B.options].filter(o => o.disabled).map(o => o.value);
  report.check(bloqueadaEnB.includes(A.value), 'el panel elegido a la izquierda se bloquea a la derecha');
  report.check(A.value !== B.value, 'los dos paneles nunca coinciden');
  T.checked = false; T.dispatchEvent(ev());
  report.check(d.querySelectorAll('.pane-a,.pane-b').length === 0, 'al apagar queda limpio');

  /* el ancho se puede cambiar */
  const W = d.getElementById('widthSel');
  for (const [v, cls] of [['full','full'], ['normal',null], ['wide','wide']]) {
    W.value = v; W.dispatchEvent(ev());
    const has = d.querySelector('.wrap').classList.contains(cls || 'wide');
    report.check(cls ? has : !d.querySelector('.wrap').classList.contains('wide'), `ancho ${v}`);
  }

  /* escala de colores: apagarla quita la barra y unifica el color.
     Hace falta un integrando VARIABLE: con f constante no hay rampa que mostrar. */
  d.querySelector('[data-load="1"]').click();   // ej1: f = 6y^2-2x sobre un rectangulo
  d.getElementById('btnPlot').click();
  report.check(!!api.getScene().scale, 'con escala hay barra de color');
  const cs = [...d.querySelectorAll('.cscale')];
  cs[0].checked = false; cs[0].dispatchEvent(ev());
  report.check(cs.every(c => !c.checked), 'el toggle de color se sincroniza entre paneles');
  d.getElementById('btnPlot').click();
  report.check(!api.getScene().scale, 'sin escala no hay barra de color');
  cs[0].checked = true; cs[0].dispatchEvent(ev());

  /* aislamiento: cada panel tiene su escena, su canvas y su camara */
  d.getElementById('btnPlot').click();
  d.getElementById('fd2').click(); d.querySelector('[data-fpreset=rot]').click();
  d.querySelector('[data-sgp=semiesfera]').click();
  const hosts = Object.keys(api.SCENES);
  ['plot3d','plotField','plotSG'].forEach(h =>
    report.check(hosts.includes(h), `escena viva en ${h}`));
  report.check(api.VIEWS.plotField.pitch !== api.VIEWS.plot3d.pitch,
    'cada panel conserva su propia camara');

  /* el cuestionario se puede recorrer entero */
  if (api.QUIZ) {
    d.querySelector('nav.tabs button[data-tab=practice]').click();
    for (let i = 0; i < api.QUIZ.length; i++) {
      const opts = [...d.querySelectorAll('#qopts .qopt')];
      opts[api.QUIZ[i].correct].click();
      d.querySelector('#qnav button').click();
    }
    report.check(/12 de 12/.test(d.querySelector('.qtext').textContent),
      'cuestionario completo con todas correctas', d.querySelector('.qtext').textContent);
  }

  /* sin dependencias externas salvo las tipografias */
  const fs = require('fs'), path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const ext = (html.match(/(?:src|href)="(https?:[^"]+)"/g) || []);
  report.check(ext.length === 1 && /fonts\.googleapis\.com/.test(ext[0]),
    'la unica dependencia externa son las tipografias', ext.join(' '));
};
