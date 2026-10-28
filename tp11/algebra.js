/** Álgebra. Vec, mat4Mul, mat4Vec4 y lookAt retoman TP4.0. */
const PROYECCION = { fov:45*Math.PI/180, cerca:0.1, lejos:30 };
const Vec = {
    add: (a,b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
    sub: (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
    dot: (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross: (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
    scale: (a,s) => [a[0]*s, a[1]*s, a[2]*s],
    normalize: a => { const n = Math.hypot(...a) || 1; return a.map(v => v/n); }
};

// Matrices 4×4 en column-major, como en TP4.0.
function mat4Mul(a,b) {
    const r = new Array(16).fill(0);
    for (let i=0; i<4; i++) for (let j=0; j<4; j++) {
        for (let k=0; k<4; k++) r[j*4+i] += a[k*4+i]*b[j*4+k];
    }
    return r;
}
function mat4Vec4(m,v) {
    const r = [0,0,0,0];
    for (let i=0; i<4; i++) for (let k=0; k<4; k++) r[i] += m[k*4+i]*v[k];
    return r;
}
function lookAt(eye,center,up) {
    const w = Vec.normalize(Vec.sub(eye,center));
    const u = Vec.normalize(Vec.cross(up,w));
    const v = Vec.cross(w,u);
    return [u[0],v[0],w[0],0, u[1],v[1],w[1],0, u[2],v[2],w[2],0,
        -Vec.dot(u,eye),-Vec.dot(v,eye),-Vec.dot(w,eye),1];
}

// Proyección para WebGL: near/far son distancias positivas, NDC z va de -1 a 1.
// El depth buffer de WebGL usa menor profundidad = más cerca.
function perspectiveGL(fov,aspect,near=0.1,far=30) {
    const t = 1 / Math.tan(fov/2);
    return [t/aspect,0,0,0, 0,t,0,0, 0,0,(far+near)/(near-far),-1,
        0,0,2*far*near/(near-far),0];
}

// Inversa transpuesta 3×3 de la parte lineal de una matriz afín 4×4.
function matrizNormales(m) {
    const a = [m[0],m[1],m[2]], b = [m[4],m[5],m[6]], c = [m[8],m[9],m[10]];
    const bc = Vec.cross(b,c), ca = Vec.cross(c,a), ab = Vec.cross(a,b);
    const det = Vec.dot(a,bc);
    if (Math.abs(det) < 1e-12) throw new Error('La transformación no puede tener escala cero.');
    return [...bc,...ca,...ab].map(v => v/det);
}
function direccionAngular(azimut,elevacion) {
    const az = azimut*Math.PI/180, el = elevacion*Math.PI/180;
    return [Math.cos(el)*Math.sin(az), Math.sin(el), Math.cos(el)*Math.cos(az)];
}

function posicionCamara(config) {
    return Vec.scale(direccionAngular(config.azimut,config.elevacion),config.distancia);
}

function prepararUniformes(config,aspect) {
    const eye = posicionCamara(config);
    const vista = lookAt(eye,[0,0,0],[0,1,0]);
    const modelo = [1,0,0,0, 0,config.escalaY,0,0, 0,0,1,0, 0,0,0,1];
    const mv = mat4Mul(vista,modelo);
    const proyeccion = perspectiveGL(PROYECCION.fov,aspect,PROYECCION.cerca,PROYECCION.lejos);
    const direccion = direccionAngular(config.luzAzimut,config.luzElevacion);
    const luzCamara = mat4Vec4(vista,[...direccion,0]);
    return {
        mv, mvp: mat4Mul(proyeccion,mv), normal: matrizNormales(mv),
        luz: luzCamara.slice(0,3), intensidad: [config.intensidad,config.intensidad,config.intensidad],
        ambiente: [config.ambiente,config.ambiente,config.ambiente],
        ka: [config.ka,config.ka,config.ka], kd: [config.kd,config.kd,config.kd],
        ks: [config.ks,config.ks,config.ks], brillo: config.brillo
    };
}
