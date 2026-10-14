/** Utilidades provistas para la malla y la descarga. */
function trianguloValido(vertices, [a, b, c]) {
    if (a === b || b === c || c === a) return false;
    const u = vertices[b].map((v, d) => v - vertices[a][d]);
    const v = vertices[c].map((v, d) => v - vertices[a][d]);
    return Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) > 0;
}

function compactarMalla(vertices, caras) {
    // La aritmética flotante puede redondear una intersección al extremo aunque
    // su valor escalar no sea exactamente igual al nivel. Unificamos también
    // posiciones idénticas, sin aproximar ni fusionar puntos cercanos distintos.
    const porPosicion = new Map();
    const unicos = [];
    const remapeo = vertices.map(p => {
        const clave = p.join(',');
        if (!porPosicion.has(clave)) {
            porPosicion.set(clave, unicos.length);
            unicos.push(p);
        }
        return porPosicion.get(clave);
    });
    const validas = caras.map(cara => cara.map(id => remapeo[id]))
        .filter(cara => trianguloValido(unicos, cara));
    const usados = new Map();
    const compactos = [];
    const nuevasCaras = validas.map(cara => cara.map(id => {
        if (!usados.has(id)) {
            usados.set(id, compactos.length);
            compactos.push(unicos[id]);
        }
        return usados.get(id);
    }));
    return { vertices: compactos, caras: nuevasCaras };
}

function validarMalla(malla) {
    if (!malla || !Array.isArray(malla.vertices) || !Array.isArray(malla.caras)) {
        throw new Error('marchingCubes debe devolver { vertices, caras, celdasActivas }.');
    }
    if (malla.vertices.some(p => !Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite))) {
        throw new Error('La malla contiene vértices inválidos.');
    }
    if (malla.caras.some(c => !Array.isArray(c) || c.length !== 3 ||
        c.some(i => !Number.isInteger(i) || i < 0 || i >= malla.vertices.length))) {
        throw new Error('La malla contiene caras con índices inválidos.');
    }
}

function mallaAOBJ(malla, descripcion = '') {
    validarMalla(malla);
    const lineas = ['# TP 9 · Superficies implícitas · Marching Cubes'];
    for (const linea of descripcion.split('\n')) if (linea) lineas.push(`# ${linea}`);
    lineas.push('o metaballs');
    for (const p of malla.vertices) lineas.push(`v ${p.join(' ')}`);
    // OBJ usa índices desde 1. Conservamos conectividad y orientación.
    for (const cara of malla.caras) lineas.push(`f ${cara.map(i => i + 1).join(' ')}`);
    return lineas.join('\n') + '\n';
}

function descargarOBJ(malla, descripcion, nombre) {
    const url = URL.createObjectURL(new Blob([mallaAOBJ(malla, descripcion)], { type: 'text/plain;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
