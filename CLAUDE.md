# Calculadora de integrales — AM2 (UNCUYO)

Herramienta de verificación para Análisis Matemático II. El alumno resuelve a mano
y compara acá. **Nunca reemplaza la resolución: la verifica.**

Un solo archivo: `index.html` (~152 KB). HTML + CSS + JS, sin build, sin framework.
Se abre con doble clic y funciona sin conexión.

---

## Antes de tocar nada

```bash
npm install          # jsdom + canvas (solo para los tests)
npm test             # 115 comprobaciones; debe terminar en verde
```

`npm test` es la red de seguridad. Si lo rompés, el motor numérico o la interfaz
están mal. Correr una suite sola: `npm test engine | u4 | ui`.

---

## Invariantes — no romper sin discutirlo

1. **Cero dependencias externas salvo las tipografías de Google.**
   Hubo mathjs y Plotly; los saqué porque si el CDN no carga, la página no calcula
   ni dibuja. El parser de expresiones y el renderer 3D son propios. El test
   `ui.js` falla si aparece cualquier otro `src`/`href` externo.

2. **El motor numérico está validado contra scipy** (`tools/verify-scipy.py`).
   Error relativo máximo actual: **1.8e-7** sobre los 30 ejemplos de Unidad 3.
   Si tocás `adaptiveSimpson`, `integrate2D` o `integrate3D`, ese número no puede
   empeorar.

3. **Simpson adaptativo, no de orden fijo.** Con `cbrt(x)` o `sqrt(a²-x²)` en el
   borde la derivada explota y el compuesto de orden fijo erraba hasta 7.7e-3.

4. **La proyección 3D: `sy = z·cos(p) + y·sin(p)`, `depth = y·cos(p) − z·sin(p)`.**
   El signo importa y ya estuvo mal una vez: con el signo cambiado la cámara mira
   desde abajo y todo —superficie, caja y triedro— queda coherentemente invertido,
   así que el error no se nota comparando unos con otros. Prueba de control:
   con pitch = +90° (cenital), el punto (0,1,0) debe proyectar **arriba**.

5. **Una escena, un canvas y una cámara POR CONTENEDOR** (`SCENES`, `CANVASES`,
   `VIEWS`, indexados por id del div). `SCENE`/`CANVAS`/`VIEW` son solo "el panel
   activo". Sin esto, dos paneles gráficos a la vez son imposibles.

6. **El canvas se remide al mostrarse.** Un canvas en pestaña oculta mide 0 y cae
   a valores por defecto; el navegador después estira ese bitmap con otra
   proporción. Hay remedición al cambiar de pestaña y al cuadro siguiente de
   crearlo.

7. **Calidad alta en reposo, malla rala al arrastrar.** A resolución completa
   rotar costaba 210 ms por cuadro. Durante el arrastre se dibuja 1 de cada N
   caras para mantener ~2200 en pantalla.

8. **Las formas exactas se reconocen con tolerancia 1e-8.** Medido: 1e-7 reconoce
   uno más pero sube los falsos positivos de 0,04 % a 0,58 %; 1e-6 llega al 5 %.
   No aflojar el umbral sin volver a medir.

---

## Arquitectura de `index.html`

Orden dentro del `<script>`:

| Bloque | Qué hace |
|---|---|
| Motor numérico | `adaptiveSimpson`, `integrate2D/3D` |
| Parser | `tokenize`, `compileExpr` → compila a closures JS |
| `MODES` | los 9 modos de integral (A–H) y sus variables |
| Teclado | `insertKey`, `renderKeypad` (categorías) |
| Orden de integración | `applyOrder`, las 6 permutaciones del modo F |
| `buildEvaluators` | expresiones + límites → funciones evaluables |
| Formas exactas | `ratApprox`, `exactForm` |
| Renderer 3D | `project`, `drawScene`, `drawFrame`, `drawLegend`, `drawColorBar` |
| Escenas | `plotSurface`, `plotSolidSurface`, `ghostPrims` |
| Campos | `plotField`, `streamline` (RK4), `divCurl` |
| Stokes/Gauss | `buildSurface`, `buildCurve`, `plotStokes`, `simp1/simp2` |
| Datos | `EXAMPLES` (30, U3), `EXAMPLES4` (12, U4), `QUIZ` (12) |
| Interfaz | pestañas, pantalla dividida, ancho, escala de colores |

**Primitivas del renderer**: `{v:[4 vértices]}` cara, `{seg:[a,b]}` vector con
cabeza, `{path:[...]}` polilínea, `{ghost:true}` contexto tenue. El pintor las
ordena por profundidad y las dibuja de lejos a cerca.

**Sistema de coordenadas por modo**: el jacobiano (`r`, `ρ²senφ`) lo aplica
`buildEvaluators`, **no el usuario**. El integrando se escribe crudo.

---

## Convenciones

- Español rioplatense en toda la interfaz. "Líneas de flujo", no "de campo".
- `log` es base 10 y `ln` es natural — al revés que casi todas las librerías.
  Está documentado en el panel de sintaxis; si lo cambiás, cambiá también ahí.
- El parser acepta notación de cátedra: `sen`, `tg`, `raiz`, `π`, `θ`, `φ`, `ρ`,
  y producto implícito (`2x`, `3sen(y)`, `(x+1)(y-1)`).
- Las explicaciones nombran **la operación que falta**, no una confusión vaga.
  Mal: "confundir r con r²". Bien: "escribir r=h es quedarse con r² sin despejar".

---

## Errores ya cometidos — no repetirlos

- **Verificar algo contra sí mismo no prueba nada.** El triedro coincidía con las
  aristas de la caja porque comparten la fórmula; los dos estaban mal.
- **Una nube de puntos no muestra un sólido**: la superficie queda tapada por su
  propio interior. Se dibuja la frontera del dominio paramétrico (6 caras).
- **La rampa de color no puede arrancar en el color del panel**: con integrando
  constante (todo cálculo de volumen) los puntos salían invisibles.
- **Muestrear uniforme en (ρ,φ,θ) sesga la nube** hacia el eje polar. Si volvés a
  muestrear, pesá por el jacobiano.
- **Reimplementar algo que ya está.** Pasó dos veces (secciones por unidad,
  "cilíndricas"). Buscá en el archivo antes de agregar.
- **Más flechas no es mejor**: a 27×27 el campo 2D se vuelve ilegible. Tope ~21.

---

## Datos y verificación

`tools/verify-scipy.py` recalcula las referencias de forma independiente (requiere
`scipy`). Si agregás ejemplos, **primero** calculá el valor ahí, después cargalo en
`test/reference.json`, y recién entonces escribí la tarjeta. Nunca al revés:
el valor del ejemplo no puede salir del propio motor que se quiere verificar.

## Publicación

GitHub Pages sirve `index.html` tal cual. No hay build. Al actualizar, forzar
recarga: el HTML se cachea agresivamente.
