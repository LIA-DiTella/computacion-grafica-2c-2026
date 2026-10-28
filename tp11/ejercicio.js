/**
 * TP 11 · Texturas
 * Vamos a usar una imagen para darle color al material de TP10.0.
 * Completá los cuatro bloques marcados con >>> COMPLETAR.
 */

/**
 * PASO 1 — Llevar la imagen a la GPU.
 * Recibís el contexto gl e img, una imagen ya cargada con dimensiones potencia de 2.
 * Devolvé un WebGLTexture con la imagen y sus mipmaps, copias más pequeñas.
 * Conservá su orientación: nuestras UV empiezan arriba a la izquierda.
 */
function crearTextura(gl, img) {
    // >>> COMPLETAR PASO 1
    // ...
    // <<< FIN PASO 1
}

/**
 * PASO 2 — Conectar la textura con el shader.
 * Antes de dibujar, usá gl para vincular la textura a la unidad 0 y asociar
 * el sampler texGPU del programa a esa unidad. La función no devuelve un valor.
 */
function activarTextura(gl, programa, textura) {
    // >>> COMPLETAR PASO 2
    // ...
    // <<< FIN PASO 2
}

/**
 * PASO 3 — Llevar las UV al fragment shader.
 * En main(), partí de aTexCoord y dejá en texCoord las UV con las repeticiones
 * indicadas por uRepeticiones. WebGL las interpolará sobre cada triángulo.
 */
const vertexShader = `
// Cada vértice trae su posición, su normal y sus coordenadas UV.
attribute vec3 aPosicion;
attribute vec3 aNormal; // La normal está en espacio objeto.
attribute vec2 aTexCoord;

// Transformamos la geometría con las mismas matrices de TP10.0.
uniform mat4 uMV;
uniform mat4 uMVP;
uniform mat3 uNormal; // Lleva las normales al espacio de cámara.
uniform float uRepeticiones; // Cuántas veces recorremos la imagen en cada eje.

// WebGL interpola estos datos para cada fragmento.
varying vec3 vPosicion;
varying vec3 vNormal;
varying vec2 texCoord;

// Como en TP10.0, preparamos el vértice para iluminarlo y rasterizarlo.
void transformarVertice() {
    vec4 posicionObjeto = vec4(aPosicion.x, aPosicion.y, aPosicion.z, 1.0);
    // Llevamos posición y normal al espacio de cámara para calcular la luz.
    vec4 posicionCamara = uMV * posicionObjeto;
    vPosicion = vec3(posicionCamara.x, posicionCamara.y, posicionCamara.z);
    vec3 normalCamara = uNormal * aNormal;
    vNormal = normalize(normalCamara);
    // Para rasterizar, llevamos la posición al volumen canónico.
    gl_Position = uMVP * posicionObjeto;
}

void main() {
    transformarVertice();
    // Con dos repeticiones, las UV recorren [0,2] en ambos ejes.
    // Al consultar la textura, vuelve a empezar la imagen en cada intervalo.
    // >>> COMPLETAR PASO 3
    // ...
    // <<< FIN PASO 3
}
`;

/**
 * PASO 4 — Preparar el material de cada fragmento.
 * Definí ka y kd a partir de uKa y uKd. Cuando uUsarTextura esté activo,
 * incorporá el color de texGPU en las UV texCoord antes de calcular la luz.
 * La consulta aplica automáticamente el filtro y REPEAT del visor.
 */
const fragmentShader = `
// Con este sampler accedemos a la textura vinculada a la unidad 0.
uniform sampler2D texGPU;
uniform bool uUsarTextura;

// Seguimos usando la luz y el material de TP10.0.
uniform vec3 uLuz;
uniform vec3 uI;
uniform vec3 uIa;
uniform vec3 uKa;
uniform vec3 uKd;
uniform vec3 uKs;
uniform float uAlpha;

// Acá llegan interpoladas la posición, la normal y las UV de cada fragmento.
varying vec3 vPosicion;
varying vec3 vNormal;
varying vec2 texCoord;

// shaders.js agrega el cuerpo de esta función al final.
vec3 iluminarPhong(vec3 posicion, vec3 normal, vec3 ka, vec3 kd);

void main() {
    // >>> COMPLETAR PASO 4
    // Reemplazá estos ceros por los coeficientes que correspondan.
    vec3 ka = vec3(0.0, 0.0, 0.0);
    vec3 kd = vec3(0.0, 0.0, 0.0);
    // ...
    // <<< FIN PASO 4
    // Calculamos la iluminación con el material de este fragmento.
    vec3 color = iluminarPhong(vPosicion, vNormal, ka, kd);
    // Completamos el color RGBA con opacidad 1.
    gl_FragColor = vec4(color.x, color.y, color.z, 1.0);
}
`;

// Phong recibe los coeficientes ambiente y difuso de cada fragmento.
const iluminacionGLSL = `
vec3 iluminarPhong(vec3 posicion, vec3 normal, vec3 ka, vec3 kd) {
    // Normalizamos la normal y las direcciones hacia la luz y la cámara.
    vec3 N = normalize(normal);
    vec3 L = normalize(uLuz);
    vec3 V = normalize(-posicion);

    // La luz ambiente aporta color sin depender de una dirección.
    vec3 ambiente = ka * uIa;

    // El aporte difuso depende del ángulo entre la normal y la luz.
    float cosTheta = dot(N, L);
    float factorDifuso = max(0.0, cosTheta);
    vec3 difusa = kd * uI * factorDifuso;

    // El brillo especular aparece cuando la vista se alinea con la reflexión.
    vec3 especular = vec3(0.0, 0.0, 0.0);
    if (cosTheta > 0.0) {
        // Calculamos la dirección reflejada respecto de la normal.
        vec3 R = 2.0 * cosTheta * N - L;
        float cosSigma = dot(R, V);
        float factorEspecular = pow(max(0.0, cosSigma), uAlpha);
        especular = uKs * uI * factorEspecular;
    }
    return ambiente + difusa + especular;
}
`;
