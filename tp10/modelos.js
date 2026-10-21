/** Geometría y lectura de OBJ provistas. Los buffers contienen ternas x,y,z. */
function empaquetarTriangulos(triangulos) {
    const posiciones = [], normales = [], normalesCaras = [];
    for (const tri of triangulos) {
        const cruz = Vec.cross(Vec.sub(tri[1].p,tri[0].p),Vec.sub(tri[2].p,tri[0].p));
        if (Math.hypot(...cruz) < 1e-12) continue;
        const normalCara = Vec.normalize(cruz);
        for (const vertice of tri) {
            posiciones.push(...vertice.p);
            normales.push(...Vec.normalize(vertice.n || normalCara));
            normalesCaras.push(...normalCara);
        }
    }
    if (!posiciones.length) throw new Error('El modelo no contiene triángulos válidos.');
    return {
        posiciones: new Float32Array(posiciones), normales: new Float32Array(normales),
        normalesCaras: new Float32Array(normalesCaras), triangulos: posiciones.length/9
    };
}

function crearModelo(tipo,n=16) {
    const triangulos = [];
    if (tipo === 'cubo') {
        const p = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
        const caras = [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,5,4],[0,1,5],
            [3,6,2],[3,7,6],[1,6,5],[1,2,6],[0,7,3],[0,4,7]];
        return empaquetarTriangulos(caras.map(c => c.map(i => ({p:Vec.scale(p[i],0.55)}))));
    }
    const filas = [];
    for (let j=0; j<=n; j++) {
        const fila = [];
        for (let i=0; i<=2*n; i++) {
            const u = i/(2*n)*2*Math.PI;
            if (tipo === 'esfera') {
                const v = j/n*Math.PI;
                const normal = [Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];
                fila.push({p:Vec.scale(normal,0.9),n:normal});
            } else {
                const v = j/n*2*Math.PI;
                fila.push({p:[(0.62+0.25*Math.cos(v))*Math.cos(u),0.25*Math.sin(v),(0.62+0.25*Math.cos(v))*Math.sin(u)],
                    n:[Math.cos(v)*Math.cos(u),Math.sin(v),Math.cos(v)*Math.sin(u)]});
            }
        }
        filas.push(fila);
    }
    function agregar(a,b,c) {
        const cruz = Vec.cross(Vec.sub(b.p,a.p),Vec.sub(c.p,a.p));
        const normal = Vec.add(Vec.add(a.n,b.n),c.n);
        triangulos.push(Vec.dot(cruz,normal) >= 0 ? [a,b,c] : [a,c,b]);
    }
    for (let j=0; j<n; j++) for (let i=0; i<2*n; i++) {
        agregar(filas[j][i],filas[j+1][i],filas[j+1][i+1]);
        agregar(filas[j][i],filas[j+1][i+1],filas[j][i+1]);
    }
    return empaquetarTriangulos(triangulos);
}

// OBJ admite v, vn, v/vt/vn e índices negativos. Los polígonos convexos se
// triangulan en abanico. Sin vn, se promedian las normales de las caras vecinas.
function leerOBJ(texto) {
    const posiciones = [], normales = [], caras = [];
    function indice(texto,cantidad) {
        const n = Number(texto);
        const i = n < 0 ? cantidad+n : n-1;
        if (!Number.isInteger(n) || n === 0 || i < 0 || i >= cantidad) {
            throw new Error('El OBJ contiene un índice de vértice o normal inválido.');
        }
        return i;
    }
    for (const linea of texto.split(/\r?\n/)) {
        const partes = linea.split('#')[0].trim().split(/\s+/);
        const tipo = partes[0];
        if (tipo === 'v' || tipo === 'vn') {
            const v = partes.slice(1,4).map(Number);
            if (v.length !== 3 || !v.every(Number.isFinite)) throw new Error('El OBJ contiene coordenadas inválidas.');
            (tipo === 'v' ? posiciones : normales).push(v);
        } else if (tipo === 'f') {
            if (partes.length < 4) throw new Error('Una cara debe tener al menos tres vértices.');
            const cara = partes.slice(1).map(p => {
                const campos = p.split('/');
                return {p:indice(campos[0],posiciones.length),n:campos[2] ? indice(campos[2],normales.length) : null};
            });
            for (let i=1; i<cara.length-1; i++) {
                caras.push([cara[0],cara[i],cara[i+1]]);
                if (caras.length > 30000) throw new Error('Usá un OBJ de hasta 30 000 triángulos.');
            }
        }
    }
    if (!caras.length) throw new Error('No se encontraron caras en el OBJ.');
    const min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
    for (const p of posiciones) for (let d=0; d<3; d++) {
        min[d] = Math.min(min[d],p[d]); max[d] = Math.max(max[d],p[d]);
    }
    const centro = min.map((v,d) => (v+max[d])/2);
    let radio = 0;
    for (const p of posiciones) radio = Math.max(radio,Math.hypot(...Vec.sub(p,centro)));
    if (!Number.isFinite(radio) || radio === 0) throw new Error('El OBJ no tiene un tamaño válido.');
    const puntos = posiciones.map(p => Vec.scale(Vec.sub(p,centro),0.95/radio));
    const promedio = posiciones.map(() => [0,0,0]);
    for (const cara of caras) {
        const [a,b,c] = cara.map(v => puntos[v.p]);
        const n = Vec.cross(Vec.sub(b,a),Vec.sub(c,a));
        for (const v of cara) promedio[v.p] = Vec.add(promedio[v.p],n);
    }
    return empaquetarTriangulos(caras.map(c => c.map(v => ({p:puntos[v.p],n:v.n === null ? promedio[v.p] : normales[v.n]}))));
}
