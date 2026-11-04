/**
 * TP 12 · Ray tracing con superficies implícitas
 * Primero generamos un rayo y buscamos qué ve. Después agregamos sombras y reflejos.
 * Completá los cuatro bloques marcados; sus retornos iniciales son temporales.
 * Trabajamos en espacio mundo, con direcciones unitarias.
 */
const vertexShader = `
precision highp float;
attribute vec2 aPosicion; // Vértice del rectángulo en [-1, 1], en el volumen canónico.

// Este rectángulo cubre la pantalla y permite ejecutar un fragmento por píxel.
void main() {
    gl_Position = vec4(aPosicion.x, aPosicion.y, 0.0, 1.0); // El rectángulo ya está en el volumen canónico.
}
`;

const fragmentShader = `
precision highp float; // Necesitamos precisión para medir distancias pequeñas.
uniform vec2 uResolucion; // Ancho y alto de la imagen, en píxeles.
uniform vec3 uOjo;        // Posición de la cámara en el mundo; origen de los rayos primarios.
uniform vec3 uEjeU;       // Eje unitario de la cámara que apunta a su derecha.
uniform vec3 uEjeV;       // Eje unitario de la cámara que apunta hacia arriba.
uniform vec3 uEjeW;       // Eje unitario hacia atrás: miramos en dirección -W.
uniform float uSemialto; // Mitad del alto del plano imagen, situado a distancia 1 del ojo.
uniform vec3 uPosLuz;    // Posición de la luz en el mundo.
uniform bool uSombras;   // Activa la comprobación de obstáculos hacia la luz.
uniform bool uReflejos;  // Activa un rebote del rayo en la superficie.

// Los rayos casi tangentes necesitan más pasos para pasar junto a una superficie.
const int MAX_PASOS = 1024;             // Tope de avances para buscar una intersección.
const float DISTANCIA_MAXIMA = 40.0;    // Alcance del rayo, en unidades del mundo.
const float EPSILON = 0.0001;          // A esta distancia ya consideramos que tocamos la superficie.
const float KM = 0.35;                 // Cuánto aporta el color reflejado al color final.
const vec3 FONDO = vec3(0.68, 0.77, 0.84); // Color que vemos cuando el rayo no encuentra un objeto.

// escena.js define las distancias, las normales y la iluminación de Phong.
float distanciaEscena(vec3 p);
vec3 normalEscena(vec3 p);
vec3 iluminarPhong(vec3 p, vec3 normal, vec3 vista, float visible);

// PASO 1 — Desde uOjo, mirar a través del centro del píxel recibido.
// U y V recorren el plano imagen; W apunta hacia atrás, como en la cámara de clase.
// Devolvé la dirección unitaria en espacio mundo. El origen del rayo sigue siendo uOjo.
vec3 direccionRayo(vec2 pixel) {
    // >>> COMPLETAR PASO 1
    // ...
    return vec3(0.0, 0.0, -1.0);
    // <<< FIN PASO 1
}

// PASO 2 — Buscar el primer encuentro con la escena sobre origen + t * direccion.
// limite indica hasta dónde recorrer. Devolvé t al llegar o -1 si no hay encuentro.
// La SDF indica cuánto podemos avanzar sin atravesar una superficie.
float intersectar(vec3 origen, vec3 direccion, float limite) {
    // >>> COMPLETAR PASO 2
    // Distinguí lo recorrido sobre el rayo de la distancia a la superficie más cercana.
    // ...
    return -1.0;
    // <<< FIN PASO 2
}

// PASO 3 — Desde p, comprobar si podemos llegar a la luz sin encontrar un objeto.
// normal apunta hacia afuera. Devolvé 1 si la luz es visible, o 0 si está tapada.
// Separar el origen de la superficie evita volver a chocar con ella.
float visibilidad(vec3 p, vec3 normal) {
    // >>> COMPLETAR PASO 3
    // Ubicá el origen fuera de la superficie; separá la dirección hacia la luz de su distancia.
    // ...
    return 1.0;
    // <<< FIN PASO 3
}

// Reutilizamos Phong para cualquier punto alcanzado, también por un reflejo.
vec3 colorLocal(vec3 p, vec3 direccion) {
    vec3 normal = normalEscena(p); // Normal unitaria hacia afuera del objeto alcanzado.
    float visible = 1.0; // Sin sombras, suponemos que la luz llega al punto.
    if (uSombras) {
        visible = visibilidad(p, normal);
    }

    // El rayo llega al punto; la vista apunta de vuelta hacia quien lo observa.
    vec3 vista = -direccion; // Hacia la cámara o, en un reflejo, hacia el encuentro anterior.
    return iluminarPhong(p, normal, vista, visible);
}

// PASO 4 — Seguir una sola reflexión del rayo que llega a p con direccion.
// Devolvé el color local del siguiente encuentro, o FONDO si el rayo escapa.
// La vista en ese segundo punto es la opuesta a la dirección del rayo reflejado.
vec3 colorReflejado(vec3 p, vec3 direccion) {
    // >>> COMPLETAR PASO 4
    // El rebote conserva la componente tangente a la superficie e invierte la componente normal.
    // ...
    return vec3(0.0, 0.0, 0.0);
    // <<< FIN PASO 4
}

void main() {
    // gl_FragCoord ya ubica el centro del píxel; generamos un solo rayo primario.
    vec2 pixel = vec2(gl_FragCoord.x, gl_FragCoord.y);
    vec3 direccion = direccionRayo(pixel); // Dirección desde la cámara a través de este píxel.
    float t = intersectar(uOjo, direccion, DISTANCIA_MAXIMA); // El rayo parte de uOjo y avanza en direccion.
    vec3 color = FONDO; // Conservamos el fondo si el rayo no encuentra nada.
    if (t >= 0.0) {
        vec3 p = uOjo + t * direccion; // Convertimos la distancia al encuentro en una posición.
        color = colorLocal(p, direccion); // Phong, con sombras si están activadas.
        if (uReflejos) {
            vec3 reflejo = colorReflejado(p, direccion); // Color de lo que ve el rayo reflejado.
            color = color + KM * reflejo; // KM regula cuánto de ese color sumamos al color local.
        }
    }
    gl_FragColor = vec4(color.x, color.y, color.z, 1.0); // Escribimos el color RGB con opacidad total.
}
`;
