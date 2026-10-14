// Pruebas del ejercicio y del material provisto. Sin dependencias externas.
// Ejecutar desde esta carpeta: node --test test.js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
for (const file of ['tablas.js', 'campo.js', 'malla.js', 'ejercicio.js']) {
    vm.runInThisContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), { filename: file });
}
const unidad = { min: [0, 0, 0], max: [1, 1, 1] };
const cerca = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
function aristasMalla(malla) {
    const aristas = new Map();
    for (const cara of malla.caras) for (let i = 0; i < 3; i++) {
        const a = cara[i], b = cara[(i + 1) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const usos = aristas.get(key) || [];
        usos.push([a, b]);
        aristas.set(key, usos);
    }
    return aristas;
}
function comprobarCerrada(malla, euler) {
    validarMalla(malla);
    assert.ok(malla.caras.length > 0);
    assert.equal(new Set(malla.vertices.map(p => p.join(','))).size, malla.vertices.length);
    assert.ok(malla.caras.every(c => trianguloValido(malla.vertices, c)));
    const aristas = aristasMalla(malla);
    for (const usos of aristas.values()) {
        assert.equal(usos.length, 2, 'Cada arista de esta superficie cerrada tiene dos caras.');
        assert.deepEqual(usos[0], usos[1].slice().reverse(), 'Las caras vecinas recorren la arista al revés.');
    }
    assert.equal(malla.vertices.length - aristas.size + malla.caras.length, euler);
}

test('Clasificación de las 256 configuraciones; igualdad y tablas coherentes', () => {
    assert.equal(indiceCaso(Array(8).fill(0.35), 0.35), 0);
    assert.equal(edgeTable.length, 256);
    assert.equal(triTable.length, 256 * 16);
    for (let caso = 0; caso < 256; caso++) {
        const valores = ESQUINAS.map((_, c) => caso & (1 << c) ? -1 : 1);
        assert.equal(indiceCaso(valores, 0), caso);
        let esperado = 0;
        ARISTAS.forEach(([a, b], e) => { if ((valores[a] < 0) !== (valores[b] < 0)) esperado |= 1 << e; });
        assert.equal(edgeTable[caso], esperado);
        const fila = Array.from(triTable.slice(caso * 16, caso * 16 + 16));
        const fin = fila.indexOf(-1);
        assert.ok(fin >= 0 && fin % 3 === 0 && fin <= 15);
        for (const e of fila.slice(0, fin)) assert.ok(esperado & (1 << e));
        assert.ok(fila.slice(fin).every(e => e === -1));
        // Al convertir la tabla a índices de puntos deben conservarse los
        // extremos de cada interpolación y el orden de todos los triángulos.
        const paresOriginales = fila.slice(0, fin).map(e => ARISTAS[e]);
        const paresAdaptados = TRIANGULOS[caso].flat().map(v => ARISTAS_POR_CASO[caso][v]);
        assert.deepEqual(paresAdaptados, paresOriginales);
        const grilla = muestrearCampo((x, y, z) => valores[ESQUINAS.findIndex(p => p[0] === x && p[1] === y && p[2] === z)], 1, unidad);
        const malla = marchingCubes(grilla, 0);
        validarMalla(malla);
        assert.equal(malla.caras.length, fin / 3);
        assert.ok(malla.caras.every(c => trianguloValido(malla.vertices, c)));
    }
});

test('Interpolación en la posición correcta, extremos y arista invertida, sin modificar entradas', () => {
    assert.deepEqual(interpolarArista([0, 0, 0], [4, 8, 12], 0, 4, 1), [1, 2, 3]);
    assert.deepEqual(interpolarArista([4, 8, 12], [0, 0, 0], 4, 0, 1), [1, 2, 3]);
    const p0 = [0, 0, 0];
    const p1 = [4, 8, 12];
    const cruceEnP0 = interpolarArista(p0, p1, 4, 0, 4);
    const cruceEnP1 = interpolarArista(p0, p1, 0, 4, 4);
    assert.deepEqual(cruceEnP0, p0);
    assert.deepEqual(cruceEnP1, p1);
    cruceEnP0[0] = 99;
    cruceEnP1[0] = 99;
    assert.deepEqual(p0, [0, 0, 0]);
    assert.deepEqual(p1, [4, 8, 12]);
});

test('Muestreo: N³ celdas, (N+1)³ evaluaciones y dominio no cúbico', () => {
    let llamadas = 0;
    const grilla = muestrearCampo((x, y, z) => { llamadas++; return x + 2 * y + 3 * z; }, 3,
        { min: [-1, 2, 4], max: [5, 8, 16] });
    assert.equal(llamadas, 64);
    assert.deepEqual(grilla.punto(grilla.indice(0, 0, 0)), [-1, 2, 4]);
    assert.deepEqual(grilla.punto(grilla.indice(3, 3, 3)), [5, 8, 16]);
    assert.deepEqual(grilla.punto(grilla.indice(1, 2, 1)), [1, 6, 8]);
    assert.equal(grilla.valores[grilla.indice(1, 2, 1)], 37);
});

test('Un cubo entrega sus ocho posiciones y valores en el orden de las tablas', () => {
    let llamadas = 0;
    const campo = (x, y, z) => { llamadas++; return x + 2*y + 3*z; };
    const grilla = muestrearCampo(campo, 3, { min: [-1, 2, 4], max: [5, 8, 16] });
    const cubo = grilla.cubo(1, 1, 1);
    const posiciones = [
        [1,4,8], [3,4,8], [3,6,8], [1,6,8],
        [1,4,12], [3,4,12], [3,6,12], [1,6,12]
    ];
    assert.deepEqual(cubo.vertices, posiciones);
    assert.deepEqual(cubo.valores, posiciones.map(([x,y,z]) => x + 2*y + 3*z));
    assert.equal(llamadas, 64, 'Obtener un cubo no vuelve a evaluar el campo.');

    const vecina = grilla.cubo(2, 1, 1);
    for (const [a, b] of [[1,0], [2,3], [5,4], [6,7]]) {
        assert.deepEqual(cubo.vertices[a], vecina.vertices[b]);
        assert.equal(cubo.valores[a], vecina.valores[b]);
    }
    cubo.vertices[0][0] = 99;
    cubo.valores[0] = 99;
    assert.deepEqual(grilla.cubo(1, 1, 1).vertices[0], [1,4,8]);
    assert.equal(grilla.cubo(1, 1, 1).valores[0], 33);
});

test('Campo compacto: valor en el centro, borde y suma de contribuciones', () => {
    const bola = { centro: [0, 0, 0], radio: 1 };
    const campo = crearCampo([bola]);
    assert.equal(campo(0, 0, 0), 1);
    assert.equal(campo(1, 0, 0), 0);
    assert.equal(campo(10, 0, 0), 0);
    cerca(campo(0.5, 0, 0), 0.75 ** 3);
    assert.equal(crearCampo([bola, bola])(0, 0, 0), 2);
    bola.centro[0] = 5;
    assert.equal(campo(0, 0, 0), 1, 'El campo captura una copia.');
});

test('Campo constante y nivel fuera del rango producen una malla vacía', () => {
    for (const constante of [-1, 0, 1]) {
        const malla = marchingCubes(muestrearCampo(() => constante, 4), 0);
        assert.deepEqual(malla, { vertices: [], caras: [], celdasActivas: 0 });
    }
});

test('Un plano se interpola exactamente y las normales apuntan a valores menores', () => {
    for (let eje = 0; eje < 3; eje++) {
        const malla = marchingCubes(muestrearCampo((...p) => p[eje], 4, unidad), 0.3);
        assert.equal(malla.caras.length, 32);
        assert.equal(malla.vertices.length, 25, 'Se comparten los vértices entre celdas.');
        malla.vertices.forEach(p => cerca(p[eje], 0.3));
        for (const cara of malla.caras) {
            const [a, b, c] = cara.map(i => malla.vertices[i]);
            const u = b.map((v, d) => v - a[d]), v = c.map((v, d) => v - a[d]);
            const normal = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
            assert.ok(normal[eje] < 0);
        }
    }
});

test('Igualdad en vértices de la grilla y cruces diagonales: sin duplicados ni triángulos degenerados', () => {
    for (const campo of [(x, y, z) => x, (x, y, z) => x + y + z]) {
        const malla = marchingCubes(muestrearCampo(campo, 4), 0);
        validarMalla(malla);
        assert.equal(new Set(malla.vertices.map(p => p.join(','))).size, malla.vertices.length);
        assert.ok(malla.caras.every(c => trianguloValido(malla.vertices, c)));
        const usados = new Set(malla.caras.flat());
        assert.equal(usados.size, malla.vertices.length);
        malla.vertices.forEach(p => cerca(campo(...p), 0));
    }
});

test('Esfera: cerrada, orientada hacia afuera, Euler = 2 y error decreciente', () => {
    const campo = (x, y, z) => 1 - x*x - y*y - z*z;
    const errores = [12, 32].map(n => {
        const grilla = muestrearCampo(campo, n);
        const antes = grilla.valores.slice();
        const malla = marchingCubes(grilla, 0);
        assert.deepEqual(grilla.valores, antes);
        comprobarCerrada(malla, 2);
        let volumen6 = 0;
        for (const [ia, ib, ic] of malla.caras) {
            const a=malla.vertices[ia], b=malla.vertices[ib], c=malla.vertices[ic];
            volumen6 += a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0]);
        }
        assert.ok(volumen6 > 0);
        return Math.max(...malla.vertices.map(p => Math.abs(Math.hypot(...p) - 1)));
    });
    assert.ok(errores[1] < errores[0] / 2);
});

test('Escenas: componentes separadas, unión suave y anillo con agujero', () => {
    const separadas = [{ centro: [-0.9,0,0], radio: 1 }, { centro: [0.9,0,0], radio: 1 }];
    for (const [bolas, euler] of [[separadas, 4], [ESCENAS.pareja, 2], [ESCENAS.racimo, 2], [ESCENAS.anillo, 0]]) {
        const malla = marchingCubes(muestrearCampo(crearCampo(bolas), 32), 0.35);
        comprobarCerrada(malla, euler);
    }
});

test('Metaball aislada aproxima el radio analítico de la isosuperficie', () => {
    const nivel = 0.35, radio = 1.35;
    const malla = marchingCubes(muestrearCampo(crearCampo(ESCENAS.esfera), 48), nivel);
    const esperado = radio * Math.sqrt(1 - Math.cbrt(nivel));
    const error = Math.max(...malla.vertices.map(p => Math.abs(Math.hypot(...p) - esperado)));
    assert.ok(error < 0.005, `Error radial: ${error}`);
});

test('OBJ conserva posiciones, caras, orientación e índices desde uno', () => {
    const original = marchingCubes(muestrearCampo(crearCampo(ESCENAS.pareja), 12), 0.35);
    const texto = mallaAOBJ(original, 'nivel: 0.35');
    const vertices = [], caras = [];
    for (const linea of texto.split('\n')) {
        const [tipo, ...valores] = linea.split(' ');
        if (tipo === 'v') vertices.push(valores.map(Number));
        if (tipo === 'f') { assert.ok(valores.every(n => Number(n) >= 1)); caras.push(valores.map(n => Number(n) - 1)); }
    }
    assert.deepEqual(vertices, original.vertices);
    assert.deepEqual(caras, original.caras);
    comprobarCerrada({ vertices, caras }, 2);
});

test('Entradas inválidas y detección de superficie en el borde del dominio', () => {
    assert.throws(() => muestrearCampo(() => 0, 0), RangeError);
    assert.throws(() => muestrearCampo(() => 0, 2.5), RangeError);
    assert.throws(() => muestrearCampo(() => NaN, 2), /no finito/);
    assert.throws(() => marchingCubes(muestrearCampo(() => 0, 1), NaN), RangeError);
    const g = muestrearCampo(crearCampo([{ centro: [1.5,0,0], radio: 1.5 }]), 20);
    assert.ok(g.maxBorde >= 0.35);
    const malla = marchingCubes(g, 0.35);
    assert.ok([...aristasMalla(malla).values()].some(usos => usos.length === 1));
});
