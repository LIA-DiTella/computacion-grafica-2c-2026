/**
 * TP 10 · Modelos de iluminación
 * 1. Implementar transformarVertice(): posiciones y normales.
 * 2. Implementar iluminarPhong(): ambiente + difusa + especular.
 * 3. Implementar main() del fragment shader: color final del fragmento.
 * Las declaraciones y el main() del vertex shader están provistos.
 * El texto entre comillas invertidas es GLSL. La guía está en README.md.
 */

/**
 * PASO 1 — Preparar cada vértice para iluminar y rasterizar.
 * Transformar su posición y normal de espacio objeto a espacio cámara,
 * guardándolas en vPosicion y vNormal (unitaria). Obtener también en gl_Position
 * la posición homogénea en el volumen canónico (MVP). Recibe aPosicion y aNormal
 * y tiene acceso a las matrices uMV, uMVP y uNormal.
 */
const vertexShader = `
// Declaraciones provistas.
attribute vec3 aPosicion;
attribute vec3 aNormal;

uniform mat4 uMV;
uniform mat4 uMVP;
uniform mat3 uNormal;

uniform vec3 uLuz;
uniform vec3 uI;
uniform vec3 uIa;
uniform vec3 uKa;
uniform vec3 uKd;
uniform vec3 uKs;
uniform float uAlpha;
uniform bool uGouraud;

varying vec3 vPosicion;
varying vec3 vNormal;
varying vec3 vColor;

// Función compartida
vec3 iluminarPhong(vec3 posicion, vec3 normal);

void transformarVertice() {
    // TODO: completar.
}

void main() {
    transformarVertice();
    vColor = vec3(0.0, 0.0, 0.0);
    if (uGouraud) {
        // Gouraud: iluminar por vértice; WebGL interpola el color.
        vColor = iluminarPhong(vPosicion, vNormal);
    }
    // Phong: enviar posición y normal para iluminar en el fragment shader.
}
`;

/**
 * PASO 2 — Implementar el modelo de iluminación de Phong.
 * Calcular y devolver el color RGB a partir de la posición y la normal del punto,
 * ambas en espacio cámara. No asumir que los vectores recibidos están normalizados.
 * La función tiene acceso a los uniformes de luz y material:
 * uLuz, uI, uIa, uKa, uKd, uKs y uAlpha.
 */
const iluminacionGLSL = `
vec3 iluminarPhong(vec3 posicion, vec3 normal) {
    // TODO: completar.
}
`;

/**
 * PASO 3 — Implementar main() del fragment shader.
 * Determinar el color final del fragmento según el sombreado seleccionado
 * y escribirlo en gl_FragColor. Dispone de vColor, vPosicion y vNormal
 * interpolados por WebGL, del selector uGouraud y de la función iluminarPhong().
 */
const fragmentShader = `
// Declaraciones provistas. Los varyings deben coincidir con el vertex shader.
uniform vec3 uLuz;
uniform vec3 uI;
uniform vec3 uIa;
uniform vec3 uKa;
uniform vec3 uKd;
uniform vec3 uKs;
uniform float uAlpha;
uniform bool uGouraud;

varying vec3 vPosicion;
varying vec3 vNormal;
varying vec3 vColor;

// Función compartida: shaders.js agrega su cuerpo al final del shader.
vec3 iluminarPhong(vec3 posicion, vec3 normal);

void main() {
    // TODO: completar.
}
`;

