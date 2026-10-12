#!/usr/bin/env node
/* Corre todas las suites. Sale con codigo 1 si algo falla. */
const suites = { engine: './engine', u4: './u4', ui: './ui', ejes: './ejes' };
const pedido = process.argv[2];
let pasaron = 0, fallaron = 0;
const fallos = [];

const report = {
  check(ok, nombre, detalle) {
    if (ok) { pasaron++; }
    else { fallaron++; fallos.push(nombre + (detalle ? '  ->  ' + detalle : '')); }
  },
  fail(nombre, detalle) { this.check(false, nombre, detalle); },
  note(txt) { console.log('   · ' + txt); }
};

for (const [nombre, mod] of Object.entries(suites)) {
  if (pedido && pedido !== nombre) continue;
  const t0 = Date.now();
  process.stdout.write(`\n[${nombre}]\n`);
  try { require(mod)(report); }
  catch (e) { report.fail(`suite ${nombre} lanzo una excepcion`, e.message); console.error(e.stack); }
  console.log(`   (${Date.now() - t0} ms)`);
}

console.log('\n' + '─'.repeat(60));
if (fallaron) {
  console.log(`FALLAN ${fallaron} comprobaciones (${pasaron} pasan):\n`);
  fallos.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log(`OK — ${pasaron} comprobaciones`);
