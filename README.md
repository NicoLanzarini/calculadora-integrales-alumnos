# Calculadora de integrales — Análisis Matemático II

Verificación numérica y visualización para los TP3 (integrales múltiples) y
TP4 parte B (superficies, Stokes y Gauss) de AM2, UNCUYO.

**No resuelve por vos: verifica lo que resolviste a mano.**

## Qué hace

- **Calculadora** — 9 modos de integral doble y triple: rectángulo, región tipo I
  y II, polares, caja, región general, cilíndricas (dos órdenes) y esféricas. El
  jacobiano se aplica solo. Las 6 permutaciones del orden de integración.
- **Visualización 3D** — la superficie z=f recortada a la región, o la frontera
  del sólido, con las superficies completas en gris para ver qué recorta el
  dominio.
- **Campos vectoriales** — en R² y R³, con líneas de flujo integradas por RK4, y
  divergencia y rotor numéricos.
- **Ejemplos** — 30 resueltos de la Unidad 3 y 12 de la Unidad 4, con pasos y
  resultado verificado. Se cargan en la calculadora de un toque.
- **Stokes y Gauss** — superficie paramétrica con sus normales, curva con sus
  tangentes, y los dos lados de cada teorema calculados por separado para
  compararlos.
- **Práctica** — 12 preguntas de criterio (sin revisión de cátedra).

## Usar

Doble clic en `index.html`. No necesita servidor, instalación ni conexión.

## Desarrollar

```bash
npm install     # jsdom y canvas, solo para los tests
npm test        # 168 comprobaciones
npm run serve   # http://localhost:8080
npm run verify  # recalcula las referencias con scipy (requiere scipy)
```

Leé `CLAUDE.md` antes de modificar: tiene los invariantes del motor numérico y
del renderer, y la lista de errores ya cometidos.

## Precisión

Simpson adaptativo anidado, validado contra `scipy.integrate` en los 30 ejemplos
de la Unidad 3: **error relativo máximo 1,8 × 10⁻⁷**. Los 10 ejemplos cargables de
la Unidad 4 reproducen su valor de referencia, y en los de Stokes los dos lados
del teorema coinciden.

## Licencia

Material de estudio de uso libre.
