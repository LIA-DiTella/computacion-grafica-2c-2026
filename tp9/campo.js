/** Campo escalar y muestreo provistos. No forman parte del ejercicio. */
const DOMINIO = { min: [-2, -2, -2], max: [2, 2, 2] };
const MAX_METABALLS = 8;
const ESCENAS = {
    pareja: [
        { centro: [-0.55, 0, 0], radio: 1.2 },
        { centro: [0.55, 0, 0], radio: 1.2 }
    ],
    esfera: [{ centro: [0, 0, 0], radio: 1.35 }],
    racimo: [
        { centro: [-0.5, -0.3, 0], radio: 1.15 },
        { centro: [0.5, -0.3, 0], radio: 1.15 },
        { centro: [0, 0.55, 0], radio: 1.15 },
        { centro: [0, 0, 0.65], radio: 0.85 }
    ],
    anillo: Array.from({ length: 6 }, (_, i) => ({
        centro: [0.9 * Math.cos(i * Math.PI / 3), 0.9 * Math.sin(i * Math.PI / 3), 0], radio: 0.95
    }))
};

// Cada bola aporta 1 en su centro y disminuye hasta 0 en su radio de influencia:
// max(0, 1 - ||p-c||²/R²)³. Los aportes se suman; el interior cumple f >= nivel.
function crearCampo(bolas) {
    const copia = bolas.map(b => ({ centro: b.centro.slice(), radio: b.radio }));
    return (x, y, z) => {
        let suma = 0;
        for (const { centro: c, radio: r } of copia) {
            const d2 = (x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2;
            const q = Math.max(0, 1 - d2 / (r * r));
            suma += q * q * q;
        }
        return suma;
    };
}

// N celdas por eje requieren N+1 muestras por eje. El campo se evalúa una vez
// por vértice de la grilla, aunque ese vértice pertenezca a varios cubos.
function muestrearCampo(campo, resolucion, dominio = DOMINIO) {
    if (!Number.isInteger(resolucion) || resolucion < 1 || resolucion > 128) {
        throw new RangeError('La resolución debe ser un entero entre 1 y 128.');
    }
    const min = dominio.min.slice(), max = dominio.max.slice();
    if (min.length !== 3 || max.length !== 3 ||
        min.some((v, d) => !Number.isFinite(v) || !Number.isFinite(max[d]) || v >= max[d])) {
        throw new RangeError('El dominio debe tener tres intervalos finitos de longitud positiva.');
    }
    const lado = resolucion + 1;
    const paso = min.map((v, d) => (max[d] - v) / resolucion);
    const valores = new Float64Array(lado ** 3);
    const indice = (i, j, k) => i + lado * (j + lado * k);
    const punto = id => [
        min[0] + (id % lado) * paso[0],
        min[1] + (Math.floor(id / lado) % lado) * paso[1],
        min[2] + Math.floor(id / (lado * lado)) * paso[2]
    ];
    let maxBorde = -Infinity;
    for (let k = 0; k < lado; k++) {
        for (let j = 0; j < lado; j++) {
            for (let i = 0; i < lado; i++) {
                const id = indice(i, j, k);
                const valor = campo(...punto(id));
                if (!Number.isFinite(valor)) throw new Error('El campo produjo un valor no finito.');
                valores[id] = valor;
                if (i === 0 || j === 0 || k === 0 || i === resolucion || j === resolucion || k === resolucion) {
                    maxBorde = Math.max(maxBorde, valor);
                }
            }
        }
    }
    // Acceso provisto para el ejercicio: cada cubo expone directamente sus
    // ocho posiciones y valores. Los índices globales quedan dentro de esta ayuda.
    function cubo(i, j, k) {
        const vertices = [];
        const valoresCubo = [];
        for (const [dx, dy, dz] of ESQUINAS) {
            const id = indice(i + dx, j + dy, k + dz);
            vertices.push(punto(id));
            valoresCubo.push(valores[id]);
        }
        return { vertices, valores: valoresCubo };
    }

    return { resolucion, cubo, valores, indice, punto, min, max, paso, maxBorde };
}
