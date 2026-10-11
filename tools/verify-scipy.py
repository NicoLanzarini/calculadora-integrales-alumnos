#!/usr/bin/env python3
"""Recalcula con scipy los valores de referencia, de forma independiente del
motor de la pagina. Si agregas un ejemplo, su valor sale de aca y despues se
carga en test/reference.json — nunca al reves.

    pip install scipy numpy
    python3 tools/verify-scipy.py
"""
import json, os, sys
import numpy as np
from scipy import integrate

AQUI = os.path.dirname(os.path.abspath(__file__))
REF = json.load(open(os.path.join(AQUI, '..', 'test', 'reference.json')))

def ok(nombre, calc, clave, grupo='u4', tol=1e-6):
    esp = REF[grupo].get(str(clave))
    if esp is None:
        print(f'  {nombre:52} {calc:14.7f}   (sin referencia cargada)')
        return True
    d = abs(calc - esp) / max(1e-12, abs(esp))
    print(f'  {nombre:52} {calc:14.7f}   ref {esp:14.7f}   {"OK" if d < tol else "DIFIERE"}')
    return d < tol

print('\nUNIDAD 4 — areas')
bien = True
bien &= ok('Ej 4a  plano y+2z=2 en el cilindro x^2+z^2=1',
           integrate.dblquad(lambda u, v: np.sqrt(5)*u, 0, 2*np.pi, 0, 1)[0], 1)
bien &= ok('Ej 4b  cono z=2r entre z=2 y z=6',
           integrate.dblquad(lambda u, v: np.sqrt(5)*u, 0, 2*np.pi, 1, 3)[0], 2)
bien &= ok('Ej 11  paraboloide z=4-r^2 sobre el anillo 1<=r<=2',
           integrate.dblquad(lambda r, t: r*np.sqrt(1+4*r*r), 0, 2*np.pi, 1, 2)[0], 3)
bien &= ok('Ej 8b  toro R=2 r=1  (4 pi^2 R r)', 4*np.pi**2*2*1, 4)

print('\nUNIDAD 4 — flujo')
bien &= ok('Ej 15a F=(x,y,z) por el cilindro lateral', 2*np.pi, 5)
bien &= ok('Ej 15b F=(-y,x,0) por el mismo cilindro', 0.0, 6)
bien &= ok('Ej 15d F=(0,0,z) por el octante de esfera a=1',
           integrate.dblquad(lambda ph, th: np.cos(ph)**2*np.sin(ph), 0, np.pi/2, 0, np.pi/2)[0], 7)

print('\nUNIDAD 4 — Stokes y Gauss')
bien &= ok('Ej 19b circulacion sobre x^2+y^2=9', 9*np.pi, 8)
bien &= ok('Ej 21a circulacion en el borde r=2',
           integrate.quad(lambda t: 12*np.cos(t)**2, 0, 2*np.pi)[0], 9)
bien &= ok('Ej 37  rot F=(y,-x,0) sobre la semiesfera r=3', -18*np.pi, 10)
bien &= ok('Ej 29a Gauss cubo, div=-2, V=8', -16.0, 11)
bien &= ok('Ej 38a Gauss cilindro cerrado',
           integrate.dblquad(lambda r, t: r*(r*r + 0.5), 0, 2*np.pi, 0, 2)[0], 12)

print('\nCONTROL — los dos lados de Stokes con F=(-y,x,0), rot=(0,0,2)')
for nombre, area in REF['stokes_presets']['areas'].items():
    print(f'  area de {nombre:14} {area:10.7f}')
print(f"  los tres deben dar circulacion {REF['stokes_presets']['esperado']:.7f} = 2 pi")

print('\n' + ('TODO COINCIDE' if bien else 'HAY DIFERENCIAS'))
sys.exit(0 if bien else 1)
