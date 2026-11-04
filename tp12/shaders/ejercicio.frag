#version 100
/**
 * TP 12 · Ray tracing con superficies implícitas
 * Primero generamos un rayo y buscamos qué ve. Después agregamos sombras y reflejos.
 * Completá los cuatro bloques marcados, siguiendo el orden de los pasos.
 * Trabajamos en espacio mundo, con direcciones unitarias.
 */
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
const float KM = 0.35;                 // Fracción de reflejo en el color final, entre 0 y 1.
const vec3 FONDO = vec3(0.68, 0.77, 0.84); // Color que vemos cuando el rayo no encuentra un objeto.

// Las SDF, las normales y Phong se definen al final de este archivo.
float distanciaEscena(vec3 p);
vec3 normalEscena(vec3 p);
vec3 iluminarPhong(vec3 p, vec3 normal, vec3 vista, float visible);

// PASO 1 — Desde uOjo, mirar a través del centro del píxel recibido.
// Estrategia: pasar el píxel a [-1, 1] y ubicar su punto en el plano imagen,
// una unidad delante del ojo. U y V recorren ese plano; W apunta hacia atrás.
// Restar el ojo al punto y normalizar da la dirección. El origen sigue siendo uOjo.
vec3 direccionRayo(vec2 pixel) {
    // >>> COMPLETAR PASO 1
    // A. Expresar la posición del píxel en el rango [-1, 1] de cada eje.
    float x = 2.0 * pixel.x / uResolucion.x - 1.0; // De coordenada en píxeles a [-1, 1].
    float y = 2.0 * pixel.y / uResolucion.y - 1.0; // Lo mismo para el eje vertical.

    // B. Calcular la proporción ancho/alto y ubicar el centro del plano imagen.
    float aspecto = uResolucion.x / uResolucion.y; // Ancho/alto: evita deformar la imagen.
    vec3 centroPlano = uOjo - uEjeW; // Centro del plano imagen, una unidad delante del ojo.

    // C. Desplazarse desde ese centro sobre U y V hasta el punto del píxel.
    // uSemialto fija la escala vertical; aspecto ajusta la horizontal.
    vec3 puntoPlano = centroPlano + x * aspecto * uSemialto * uEjeU
                                  + y * uSemialto * uEjeV;

    // D. Formar el vector desde el ojo al punto y devolverlo con longitud 1.
    vec3 direccion = puntoPlano - uOjo; // Vector desde el ojo hasta ese punto: destino menos origen.
    return normalize(direccion); // Con longitud 1, t mide distancia sobre el rayo.
    // <<< FIN PASO 1
}

// PASO 2 — Buscar el primer encuentro con la escena sobre origen + t * direccion.
// Estrategia: partir del origen y consultar la SDF en cada punto del recorrido.
// Si estamos cerca de una superficie, devolver t; si no, avanzar lo que indica la SDF.
// Repetir hasta alcanzar limite o MAX_PASOS. Sin encuentro, devolver -1.
float intersectar(vec3 origen, vec3 direccion, float limite) {
    // >>> COMPLETAR PASO 2
    // A. Empezar con distancia recorrida cero y repetir B y C hasta MAX_PASOS veces.
    float t = 0.0; // Distancia recorrida desde el origen del rayo.
    for (int paso = 0; paso < MAX_PASOS; paso++) {
        // B. Evaluar el punto actual; si la SDF es menor que EPSILON, devolver t.
        vec3 p = origen + t * direccion; // Punto del rayo que estamos evaluando.

        // La superficie más cercana puede estar a un costado del rayo.
        float distanciaSuperficie = distanciaEscena(p);
        if (distanciaSuperficie < EPSILON) {
            return t; // Devolvemos lo recorrido desde el origen hasta este encuentro.
        }

        // C. Avanzar según la SDF y cortar la búsqueda si alcanzamos limite.
        t = t + distanciaSuperficie; // Esa distancia permite avanzar sin atravesar ningún objeto.
        if (t >= limite) {
            break; // Ya recorrimos todo el tramo que nos interesa.
        }
    }

    // D. Si la búsqueda terminó sin un encuentro, devolver -1.
    return -1.0; // No encontramos una superficie dentro de los límites de búsqueda.
    // <<< FIN PASO 2
}

// PASO 3 — Desde p, comprobar si podemos llegar a la luz sin encontrar un objeto.
// Estrategia: separar el origen de la superficie siguiendo la normal hacia afuera
// y trazar un rayo hacia la luz, limitado a su distancia. Si encuentra un obstáculo,
// devolver 0; si el camino queda libre, devolver 1.
float visibilidad(vec3 p, vec3 normal) {
    // >>> COMPLETAR PASO 3
    // A. Ubicar el origen un poco fuera de la superficie para no detectarla otra vez.
    float separacion = 4.0 * EPSILON; // Margen mayor que la tolerancia usada para detectar encuentros.
    vec3 origen = p + separacion * normal; // Desplazamos el punto hacia afuera de la superficie.

    // B. Calcular la dirección unitaria hacia la luz y la distancia hasta ella.
    vec3 haciaLuz = uPosLuz - origen; // Vector desde ese origen hasta la luz.
    vec3 direccionLuz = normalize(haciaLuz); // Hacia dónde avanzar, con longitud 1.
    float distanciaLuz = length(haciaLuz); // Hasta dónde avanzar: un objeto detrás de la luz no tapa.

    // C. Buscar un obstáculo solo en el tramo entre ese origen y la luz.
    float t = intersectar(origen, direccionLuz, distanciaLuz);

    // D. Devolver 0 si hubo un encuentro, o 1 si el camino está libre.
    if (t >= 0.0) {
        return 0.0; // Encontramos un obstáculo antes de llegar a la luz: hay sombra.
    }
    return 1.0; // El camino hasta la luz está libre.
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

// PASO 4 — Calcular qué color vemos al reflejar el rayo que llega a p con direccion.
// Estrategia: obtener la dirección de rebote usando la normal y elegir un origen
// fuera de la superficie. Con ese nuevo rayo, buscar el primer encuentro y devolver
// su color local; si no encuentra nada, devolver FONDO. Seguimos un solo rebote.
vec3 colorReflejado(vec3 p, vec3 direccion) {
    // >>> COMPLETAR PASO 4
    // A. Obtener la normal y calcular la dirección reflejada.
    vec3 normal = normalEscena(p); // Normal unitaria en el punto donde rebota el rayo.

    float proyeccionNormal = dot(direccion, normal); // Componente con signo sobre la normal; negativa al entrar.
    vec3 componenteNormal = proyeccionNormal * normal; // Parte perpendicular a la superficie.
    vec3 componenteTangente = direccion - componenteNormal; // El resto queda paralelo a la superficie.

    // Al rebotar conservamos la parte tangente e invertimos la parte normal.
    vec3 reflejada = componenteTangente - componenteNormal;
    reflejada = normalize(reflejada); // El nuevo rayo también necesita una dirección unitaria.

    // B. Ubicar el origen un poco fuera de la superficie.
    float separacion = 4.0 * EPSILON; // El mismo margen que usamos para el rayo hacia la luz.
    vec3 origen = p + separacion * normal; // Empezamos fuera de la superficie para no volver a detectarla.

    // C. Buscar el primer encuentro del nuevo rayo; si escapa, devolver el fondo.
    float t = intersectar(origen, reflejada, DISTANCIA_MAXIMA); // Buscamos qué se ve en el reflejo.
    if (t < 0.0) {
        return FONDO; // Si no encuentra otro objeto, refleja el fondo.
    }

    // D. Ubicar el encuentro y devolver su color local, sin generar otro rebote.
    // colorLocal usa la dirección opuesta a reflejada como dirección de vista.
    vec3 encuentro = origen + t * reflejada; // Posición del segundo encuentro en el mundo.
    return colorLocal(encuentro, reflejada);
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
            vec3 aporteLocal = (1.0 - KM) * color; // Reservamos una parte del color para el reflejo.
            vec3 aporteReflejado = KM * reflejo;
            color = aporteLocal + aporteReflejado; // Los pesos suman 1: aquí, 65% local y 35% reflejado.
        }
    }
    gl_FragColor = vec4(color.x, color.y, color.z, 1.0); // Escribimos el color RGB con opacidad total.
}

// --- Escena e iluminación ---

float distanciaEsfera(vec3 p, vec3 centro, float radio) {
    return length(p - centro) - radio;
}

float distanciaCubo(vec3 p, vec3 centro, float semilado) {
    vec3 q = abs(p - centro) - vec3(semilado, semilado, semilado);
    float fuera = length(max(q, vec3(0.0, 0.0, 0.0)));
    float dentro = min(max(q.x, max(q.y, q.z)), 0.0);
    return fuera + dentro;
}

// La escena tiene un suelo, dos esferas y dos cubos apoyados sobre él.
float distanciaObjeto(vec3 p, int objeto) {
    if (objeto == 0) return p.y;
    if (objeto == 1) return distanciaEsfera(p, vec3(-1.25, 0.8, 0.35), 0.8);
    if (objeto == 2) return distanciaEsfera(p, vec3(0.65, 0.62, 1.05), 0.62);
    if (objeto == 3) return distanciaCubo(p, vec3(1.35, 0.6, -0.85), 0.6);
    return distanciaCubo(p, vec3(-0.4, 0.38, -1.5), 0.38);
}

// Fuera de los objetos, el mínimo es la distancia a la superficie más cercana.
float distanciaEscena(vec3 p) {
    float distancia = distanciaObjeto(p, 0);
    for (int objeto = 1; objeto < 5; objeto++) {
        distancia = min(distancia, distanciaObjeto(p, objeto));
    }
    return distancia;
}

int objetoCercano(vec3 p) {
    int cercano = 0;
    float distancia = distanciaObjeto(p, 0);
    for (int objeto = 1; objeto < 5; objeto++) {
        float candidata = distanciaObjeto(p, objeto);
        if (candidata < distancia) {
            distancia = candidata;
            cercano = objeto;
        }
    }
    return cercano;
}

// Medimos la normal del objeto alcanzado, sin mezclarlo con sus vecinos.
vec3 normalEscena(vec3 p) {
    int objeto = objetoCercano(p);
    vec3 dx = vec3(EPSILON, 0.0, 0.0);
    vec3 dy = vec3(0.0, EPSILON, 0.0);
    vec3 dz = vec3(0.0, 0.0, EPSILON);
    float x = distanciaObjeto(p + dx, objeto) - distanciaObjeto(p - dx, objeto);
    float y = distanciaObjeto(p + dy, objeto) - distanciaObjeto(p - dy, objeto);
    float z = distanciaObjeto(p + dz, objeto) - distanciaObjeto(p - dz, objeto);
    return normalize(vec3(x, y, z));
}

vec3 colorMaterial(vec3 p) {
    int cercano = objetoCercano(p);
    if (cercano == 1) return vec3(0.85, 0.24, 0.15);
    if (cercano == 2) return vec3(0.17, 0.46, 0.72);
    if (cercano == 3) return vec3(0.88, 0.62, 0.19);
    if (cercano == 4) return vec3(0.25, 0.57, 0.39);

    // El damero alterna casillas de una unidad sobre el plano XZ.
    float casilla = mod(floor(p.x) + floor(p.z), 2.0);
    if (casilla < 1.0) return vec3(0.78, 0.78, 0.73);
    return vec3(0.18, 0.23, 0.28);
}

// Retomamos Phong de TP10.0; la visibilidad afecta a la luz directa.
vec3 iluminarPhong(vec3 p, vec3 normal, vec3 vista, float visible) {
    vec3 color = colorMaterial(p);
    vec3 Ka = 0.28 * color;
    vec3 Kd = 0.72 * color;
    vec3 Ks = vec3(0.3, 0.3, 0.3);
    float alpha = 48.0;
    vec3 Ia = vec3(0.8, 0.8, 0.8);
    vec3 I = vec3(1.0, 1.0, 1.0);
    vec3 N = normalize(normal);
    vec3 L = normalize(uPosLuz - p);
    vec3 V = normalize(vista);

    vec3 ambiente = Ka * Ia;
    float cosTheta = dot(N, L);
    vec3 difusa = Kd * I * max(0.0, cosTheta);
    vec3 especular = vec3(0.0, 0.0, 0.0);
    if (cosTheta > 0.0) {
        vec3 R = 2.0 * cosTheta * N - L;
        float cosSigma = dot(R, V);
        especular = Ks * I * pow(max(0.0, cosSigma), alpha);
    }
    return ambiente + visible * (difusa + especular);
}
