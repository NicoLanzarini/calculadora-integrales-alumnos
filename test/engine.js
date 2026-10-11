/* Motor numerico: los 30 ejemplos de la Unidad 3 contra scipy. */
const { load, calcValue } = require('./harness');
const REF = require('./reference.json');

module.exports = function run(report) {
  const { api, d } = load({ quiet: true });
  let max = 0;

  for (const ex of api.EXAMPLES) {
    if (ex.noCalc) continue;
    const ev = api.buildEvaluators(ex.mode, ex.fExpr, ex.bounds);
    const v = ev.vars.length === 2
      ? api.integrate2D(ev.integrand2, ev.outerLo, ev.outerHi, ev.g1, ev.g2)
      : api.integrate3D(ev.integrand3, ev.outerLo, ev.outerHi, ev.g1, ev.g2, ev.h1, ev.h2);
    const ref = REF.u3[ex.n];
    if (ref === undefined) { report.fail(`U3 ej${ex.n}: sin valor de referencia`); continue; }
    const rel = Math.abs(v - ref) / Math.max(1e-12, Math.abs(ref));
    max = Math.max(max, rel);
    report.check(rel < 2e-4, `U3 ej${ex.n} (${ex.ref})`, `${v} vs ${ref} (rel ${rel.toExponential(1)})`);
  }
  report.note(`error relativo maximo U3: ${max.toExponential(2)}`);

  /* los botones "Cargar en calculadora" dejan la calculadora en un estado que calcula */
  d.querySelectorAll('[data-load]').forEach(b => {
    b.click();
    const n = Number(b.dataset.load);
    const got = calcValue(d);
    const ref = REF.u3[n];
    const rel = Math.abs(got - ref) / Math.max(1e-12, Math.abs(ref));
    report.check(rel < 2e-4, `cargar ej${n} en la calculadora`, `${got} vs ${ref}`);
  });

  /* el teclado inserta en el campo enfocado y lo insertado compila */
  const f = d.getElementById('fExpr');
  f.value = ''; f.focus(); f.setSelectionRange(0, 0);
  const keys = {};
  d.querySelectorAll('#keypad button').forEach(b => { keys[b.textContent] = b; });
  ['√(', 'x', 'x²', '+', 'y', 'x²'].forEach(k => keys[k] && keys[k].click());
  report.check(f.value === 'sqrt(x^2+y^2)', 'teclado arma sqrt(x^2+y^2)', f.value);

  return max;
};
