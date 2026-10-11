/* Carga index.html en jsdom y devuelve la API interna de la pagina.
   El <script> principal se ejecuta como funcion de Node (no dentro del
   contexto de jsdom) para que los objetos que crea compartan realm con
   los modulos de Node: mathjs ya no esta, pero el patron evita toda una
   clase de falsos fallos por cruce de realms. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let createCanvas = null;
try { ({ createCanvas } = require('canvas')); } catch (e) { /* opcional */ }

const ROOT = path.join(__dirname, '..');

function load(opts = {}) {
  const file = opts.file || path.join(ROOT, 'index.html');
  const W = opts.width || 560, H = opts.height || 430;
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script>\n\/\* ====[\s\S]*?<\/script>/);
  if (!m) throw new Error('No se encontro el <script> principal en ' + file);
  const inline = m[0].replace(/^<script>/, '').replace(/<\/script>$/, '');

  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  w.scrollTo = () => {};
  w.devicePixelRatio = opts.dpr || 1;
  w.ResizeObserver = class { observe() {} disconnect() {} };

  const canvases = [];
  const origCreate = d.createElement.bind(d);
  d.createElement = (tag) => {
    const el = origCreate(tag);
    if (tag === 'canvas') {
      const real = createCanvas ? createCanvas(W, H) : null;
      canvases.push(real);
      el.getContext = () => (real ? real.getContext('2d') : stubCtx());
      Object.defineProperty(el, 'clientWidth',  { get: () => W });
      Object.defineProperty(el, 'clientHeight', { get: () => H });
      if (real) {
        Object.defineProperty(el, 'width',  { get: () => real.width,  set: v => { real.width = v; } });
        Object.defineProperty(el, 'height', { get: () => real.height, set: v => { real.height = v; } });
      }
    }
    return el;
  };

  const exported = `
    return {
      EXAMPLES, EXAMPLES4: (typeof EXAMPLES4!=='undefined'?EXAMPLES4:null),
      QUIZ: (typeof QUIZ!=='undefined'?QUIZ:null),
      MODES, buildEvaluators, integrate2D, integrate3D,
      compileExpr, exactForm,
      plotSurface, plotSolidSurface, plotField, plotStokes,
      drawScene, project, buildBox,
      SCENES, VIEWS, CANVASES,
      getScene: () => SCENE
    };`;
  const api = new Function('document', 'window', 'getComputedStyle', 'console', inline + exported)
    (d, w, w.getComputedStyle.bind(w), opts.quiet ? quietConsole() : console);

  return { api, d, w, dom, canvases, ev: () => new w.Event('change') };
}

function stubCtx() {
  const noop = () => {};
  return new Proxy({}, { get: (t, k) => (k === 'canvas' ? { width: 0, height: 0 } : noop), set: () => true });
}
function quietConsole() {
  return new Proxy({}, { get: () => () => {} });
}

/* valor numerico que muestra una fila de resultados de Stokes/Gauss */
function sgValue(d, label) {
  const row = [...d.querySelectorAll('.sgrow')].find(r => r.textContent.includes(label));
  return row ? parseFloat(row.querySelector('b').textContent) : NaN;
}
/* valor numerico del panel de la calculadora */
function calcValue(d) {
  const el = d.querySelector('#resultBox .num');
  if (!el) return NaN;
  const m = el.textContent.match(/-?[\d.]+(e[-+]?\d+)?/i);
  return m ? parseFloat(m[0]) : NaN;
}

module.exports = { load, sgValue, calcValue, ROOT };
