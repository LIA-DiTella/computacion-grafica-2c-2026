#version 100
precision highp float;

// Calculamos un camino aleatorio por píxel y por frame. Al promediar, baja el ruido.
// Completá los tres pasos. La cámara, las SDF y el generador aleatorio están al final.
// Las posiciones están en espacio mundo; las direcciones y normales tienen longitud 1.
uniform vec2 uResolucion;       // Ancho y alto de la imagen, en píxeles.
uniform vec3 uOjo;              // Posición de la cámara: origen de los rayos primarios.
uniform vec3 uEjeU;             // Eje de la cámara hacia la derecha.
uniform vec3 uEjeV;             // Eje de la cámara hacia arriba.
uniform vec3 uEjeW;             // Eje de la cámara hacia atrás: miramos en dirección -W.
uniform float uSemialto;        // Mitad del alto del plano imagen, a una unidad del ojo.
uniform sampler2D uAnterior;    // Textura que guarda el promedio lineal anterior.
uniform float uMuestras;        // Cantidad de muestras que YA contiene ese promedio.
uniform int uRebotes;           // Máximo de rebotes difusos; 1 permite cámara → objeto → luz.
uniform bool uCoseno;           // false: muestreo uniforme; true: muestreo por coseno.

const float PI = 3.14159265359;
const float EPSILON = 0.0003;    // Tolerancia para considerar que un rayo tocó la superficie.
const float SEPARACION = 0.002; // Desplazamiento del nuevo origen para no detectar el mismo punto.
const int MAX_REBOTES = 8;      // Tope fijo del bucle; uRebotes permite terminar antes.

// Estas funciones se definen después de los tres pasos.
vec3 orientarHemisferio(vec3 direccionLocal, vec3 normal);
float aleatorio(inout vec2 semilla);
float intersectar(vec3 origen, vec3 direccion);
int objetoCercano(vec3 punto);
vec3 normalObjeto(vec3 punto, int indiceObjeto);
vec3 colorDifusoObjeto(int indiceObjeto);
vec3 evaluarBRDF(vec3 colorDifuso);
vec3 emisionObjeto(int indiceObjeto, vec3 normal);

// PASO 1 — Elegir una dirección unitaria sobre el hemisferio de la normal.
// Recibe dos números aleatorios en [0,1): uno para la altura y otro para el ángulo.
// Construimos la dirección en un hemisferio cuyo eje es Z y luego lo orientamos.
vec3 muestrearHemisferio(vec3 normal, float numeroAltura, float numeroAngulo) {
    // >>> COMPLETAR PASO 1
    // A. Elegir la altura sobre el eje Z. En la esfera unitaria, altura = cos(theta).
    // ...

    // B. Ubicar el punto sobre el círculo horizontal que queda a esa altura.
    // ...

    // C. Orientar el eje Z del hemisferio en la dirección de la normal.
    // ...
    return normal; // Retorno temporal para poder compilar.
    // <<< FIN PASO 1
}

// Peso RGB de un rebote: BRDF * cos(theta) / pdf.
// Es el factor que multiplica a L_i en el estimador; buscamos L_i siguiendo el rayo.
// Consultamos evaluarBRDF(colorDifuso); la pdf describe cómo elegimos la dirección.
// Dividir por esa densidad compensa que algunas direcciones se visitan más que otras.
vec3 pesoMonteCarlo(vec3 colorDifuso, vec3 normal, vec3 direccion) {
    // A. Calcular el coseno y la densidad de la distribución usada en el paso 1.
    float cosTheta = max(dot(normal, direccion), 0.0);
    float densidadMuestreo = 1.0 / (2.0 * PI); // pdf uniforme sobre el hemisferio.
    if (uCoseno) {
        densidadMuestreo = cosTheta / PI;
    }

    // B. Consultar la BRDF del material y multiplicarla por el coseno.
    vec3 brdfDifusa = evaluarBRDF(colorDifuso);
    vec3 aportePorDireccion = brdfDifusa * cosTheta;

    // C. Compensar la densidad. Si vale cero, evitamos dividir por cero.
    if (densidadMuestreo <= 0.0) {
        return vec3(0.0);
    }
    vec3 pesoDireccion = aportePorDireccion / densidadMuestreo;
    return pesoDireccion;
}

// PASO 2 — Seguir un camino desde la cámara y devolver su contribución al píxel.
// main() la llama una vez por píxel y frame, desde uOjo, antes de la primera colisión.
// Según el recorrido, puede aportar emisión visible, iluminación directa o indirecta.
// Multiplicamos los pesos de los rebotes. Al encontrar una fuente, multiplicamos
// ese peso acumulado por su emisión. Si no encontramos luz, el camino aporta negro.
// Tras el último rebote comprobamos una colisión más, sin apuntar el rayo hacia la luz.
// semilla es inout: aleatorio la actualiza para que cada consulta produzca otro número.
vec3 trazarCamino(vec3 origen, vec3 direccion, inout vec2 semilla) {
    // >>> COMPLETAR PASO 2
    // A. Iniciar el peso del camino. Cada canal acumula sus propios factores Monte Carlo.
    // ...

    // B. Buscar una colisión: si emite, devolver su aporte; si no quedan rebotes, terminar.
    // ...

    // C. Elegir la nueva dirección y multiplicar el peso por el factor de este rebote.
    // Cada superficie aplica la ecuación otra vez: acumulamos el producto de los pesos.
    // ...

    // D. Separar el origen de la superficie y continuar con la dirección elegida.
    // ...
    return vec3(0.0); // Retorno temporal para poder compilar.
    // <<< FIN PASO 2
}

// PASO 3 — Agregar una muestra al promedio, trabajando con radiancia lineal.
// Recuperamos la suma anterior, agregamos la muestra nueva y dividimos por el total.
// cantidadAnterior cuenta las muestras anteriores: todavía no incluye muestraNueva.
vec3 acumularMuestra(vec3 promedioAnterior, vec3 muestraNueva, float cantidadAnterior) {
    // >>> COMPLETAR PASO 3
    // A. Usar la primera muestra como promedio inicial.
    // ...

    // B. Sumar la muestra nueva y dividir por la cantidad total de muestras.
    // ...
    return muestraNueva; // Retorno temporal para poder compilar.
    // <<< FIN PASO 3
}

// -----------------------------------------------------------------------------
// Funciones auxiliares de muestreo.
// -----------------------------------------------------------------------------

// Construimos dos ejes sobre la superficie. Junto con la normal forman una base:
// las componentes X e Y recorren la superficie y la componente Z apunta hacia afuera.
vec3 orientarHemisferio(vec3 direccionLocal, vec3 normal) {
    vec3 ejeReferencia = vec3(0.0, 1.0, 0.0);
    if (abs(normal.y) > 0.9) {
        ejeReferencia = vec3(1.0, 0.0, 0.0); // Evitamos un eje casi paralelo a la normal.
    }

    vec3 tangente = normalize(cross(ejeReferencia, normal));
    vec3 bitangente = cross(normal, tangente);
    vec3 aporteTangente = direccionLocal.x * tangente;
    vec3 aporteBitangente = direccionLocal.y * bitangente;
    vec3 aporteNormal = direccionLocal.z * normal;
    vec3 direccionMundo = aporteTangente + aporteBitangente + aporteNormal;
    return normalize(direccionMundo);
}

// Generador pseudoaleatorio: mezcla el estado para producir un número en [0,1).
// fract conserva solo la parte fraccionaria. Las constantes son internas al generador;
// la distribución sobre el hemisferio se define en muestrearHemisferio, no aquí.
float aleatorio(inout vec2 semilla) {
    semilla = semilla + vec2(0.754877666, 0.569840296);

    float fraccionX = fract(semilla.x * 0.1031);
    float fraccionY = fract(semilla.y * 0.1030);
    float fraccionZ = fract(semilla.x * 0.0973);
    vec3 fracciones = vec3(fraccionX, fraccionY, fraccionZ);

    vec3 fraccionesReordenadas = vec3(fracciones.y, fracciones.z, fracciones.x);
    vec3 desplazamiento = vec3(33.33, 33.33, 33.33);
    float mezcla = dot(fracciones, fraccionesReordenadas + desplazamiento);
    vec3 valoresMezclados = fracciones + vec3(mezcla, mezcla, mezcla);

    float valorMezclado = (valoresMezclados.x + valoresMezclados.y) * valoresMezclados.z;
    return fract(valorMezclado);
}

// -----------------------------------------------------------------------------
// Escena e intersecciones. Retomamos las funciones de distancia de TP12.
// -----------------------------------------------------------------------------

const float DISTANCIA_MAXIMA = 30.0; // Alcance de cada rayo en unidades del mundo.
const int MAX_PASOS = 200;          // Avances de sphere tracing para buscar UNA colisión.
const int CANTIDAD_OBJETOS = 8;
const int PISO = 0;
const int PARED_IZQUIERDA = 1;
const int PARED_DERECHA = 2;
const int PARED_FONDO = 3;
const int TECHO = 4;
const int ESFERA = 5;
const int CUBO = 6;
const int LUZ = 7;

// Distancia con signo a una caja centrada en el origen. semilados contiene la mitad
// de su tamaño en cada eje. Afuera medimos hasta la caja; adentro, hasta la cara más cercana.
float caja(vec3 puntoLocal, vec3 semilados) {
    vec3 distanciasCaras = abs(puntoLocal) - semilados;
    vec3 distanciasExteriores = max(distanciasCaras, vec3(0.0));
    float distanciaExterior = length(distanciasExteriores);

    float distanciaCaraXY = max(distanciasCaras.x, distanciasCaras.y);
    float distanciaCaraCercana = max(distanciaCaraXY, distanciasCaras.z);
    float distanciaInterior = min(distanciaCaraCercana, 0.0); // Negativa dentro de la caja.
    return distanciaExterior + distanciaInterior;
}

// Las paredes son cajas delgadas. Restar el centro expresa el punto en coordenadas locales.
float distanciaObjeto(vec3 punto, int indiceObjeto) {
    if (indiceObjeto == PISO) {
        vec3 centro = vec3(0.0, -0.08, 0.0);
        vec3 semilados = vec3(2.88, 0.08, 2.88);
        vec3 puntoLocal = punto - centro;
        return caja(puntoLocal, semilados);
    }
    if (indiceObjeto == PARED_IZQUIERDA) {
        vec3 centro = vec3(-2.88, 2.0, 0.0);
        vec3 semilados = vec3(0.08, 2.0, 2.88);
        vec3 puntoLocal = punto - centro;
        return caja(puntoLocal, semilados);
    }
    if (indiceObjeto == PARED_DERECHA) {
        vec3 centro = vec3(2.88, 2.0, 0.0);
        vec3 semilados = vec3(0.08, 2.0, 2.88);
        vec3 puntoLocal = punto - centro;
        return caja(puntoLocal, semilados);
    }
    if (indiceObjeto == PARED_FONDO) {
        vec3 centro = vec3(0.0, 2.0, -2.88);
        vec3 semilados = vec3(2.88, 2.0, 0.08);
        vec3 puntoLocal = punto - centro;
        return caja(puntoLocal, semilados);
    }
    if (indiceObjeto == TECHO) {
        vec3 centro = vec3(0.0, 4.08, 0.0);
        vec3 semilados = vec3(2.88, 0.08, 2.88);
        vec3 puntoLocal = punto - centro;
        return caja(puntoLocal, semilados);
    }
    if (indiceObjeto == ESFERA) {
        vec3 centro = vec3(-1.1, 0.9, 0.35);
        float radio = 0.9;
        vec3 puntoLocal = punto - centro;
        return length(puntoLocal) - radio;
    }
    if (indiceObjeto == CUBO) {
        vec3 centro = vec3(1.05, 1.12, -0.55);
        vec3 puntoLocal = punto - centro;

        // Giro alrededor de Y para expresar el punto en los ejes del cubo.
        float cosenoGiro = 0.94;
        float senoGiro = 0.342;
        float xRotado = cosenoGiro * puntoLocal.x + senoGiro * puntoLocal.z;
        float zRotado = -senoGiro * puntoLocal.x + cosenoGiro * puntoLocal.z;
        vec3 puntoRotado = vec3(xRotado, puntoLocal.y, zRotado);

        vec3 semilados = vec3(0.65, 1.07, 0.65);
        float redondeo = 0.05;
        float distanciaCaja = caja(puntoRotado, semilados);
        return distanciaCaja - redondeo; // Redondea ligeramente las aristas.
    }
    if (indiceObjeto == LUZ) {
        vec3 centro = vec3(0.0, 3.975, -0.4);
        vec3 semilados = vec3(1.05, 0.015, 0.95);
        vec3 puntoLocal = punto - centro;
        return caja(puntoLocal, semilados);
    }
    return DISTANCIA_MAXIMA;
}

// El menor valor de las SDF representa la unión de todos los objetos.
float distanciaEscena(vec3 punto) {
    float distanciaMinima = DISTANCIA_MAXIMA;
    for (int indiceObjeto = 0; indiceObjeto < CANTIDAD_OBJETOS; indiceObjeto++) {
        float distanciaActual = distanciaObjeto(punto, indiceObjeto);
        distanciaMinima = min(distanciaMinima, distanciaActual);
    }
    return distanciaMinima;
}

// La SDF indica cuánto avanzar sin atravesar una superficie.
// Devuelve la distancia recorrida hasta la colisión, o -1 si no la encuentra.
float intersectar(vec3 origen, vec3 direccion) {
    float distanciaRecorrida = 0.0;
    for (int paso = 0; paso < MAX_PASOS; paso++) {
        vec3 puntoActual = origen + distanciaRecorrida * direccion;
        float distanciaSuperficie = distanciaEscena(puntoActual);
        if (distanciaSuperficie < EPSILON) {
            return distanciaRecorrida;
        }
        distanciaRecorrida = distanciaRecorrida + distanciaSuperficie;
        if (distanciaRecorrida > DISTANCIA_MAXIMA) {
            break;
        }
    }
    return -1.0;
}

// En la colisión, identificamos el objeto cuya superficie pasa más cerca del punto.
int objetoCercano(vec3 punto) {
    int indiceMasCercano = PISO;
    float distanciaMinima = DISTANCIA_MAXIMA;
    for (int indiceObjeto = 0; indiceObjeto < CANTIDAD_OBJETOS; indiceObjeto++) {
        float distanciaActual = abs(distanciaObjeto(punto, indiceObjeto));
        if (distanciaActual < distanciaMinima) {
            distanciaMinima = distanciaActual;
            indiceMasCercano = indiceObjeto;
        }
    }
    return indiceMasCercano;
}

// La normal apunta hacia donde crece la SDF. Estimamos ese cambio comparando
// la distancia a ambos lados del punto en cada eje, y normalizamos el resultado.
vec3 normalObjeto(vec3 punto, int indiceObjeto) {
    vec3 desplazamientoX = vec3(EPSILON, 0.0, 0.0);
    vec3 desplazamientoY = vec3(0.0, EPSILON, 0.0);
    vec3 desplazamientoZ = vec3(0.0, 0.0, EPSILON);

    float distanciaMasX = distanciaObjeto(punto + desplazamientoX, indiceObjeto);
    float distanciaMenosX = distanciaObjeto(punto - desplazamientoX, indiceObjeto);
    float variacionX = distanciaMasX - distanciaMenosX;

    float distanciaMasY = distanciaObjeto(punto + desplazamientoY, indiceObjeto);
    float distanciaMenosY = distanciaObjeto(punto - desplazamientoY, indiceObjeto);
    float variacionY = distanciaMasY - distanciaMenosY;

    float distanciaMasZ = distanciaObjeto(punto + desplazamientoZ, indiceObjeto);
    float distanciaMenosZ = distanciaObjeto(punto - desplazamientoZ, indiceObjeto);
    float variacionZ = distanciaMasZ - distanciaMenosZ;

    vec3 gradiente = vec3(variacionX, variacionY, variacionZ);
    return normalize(gradiente); // El factor común 1 / (2 * EPSILON) no cambia su dirección.
}

// Color difuso del material (kd): fracción de luz reflejada por canal, entre 0 y 1.
vec3 colorDifusoObjeto(int indiceObjeto) {
    if (indiceObjeto == PARED_IZQUIERDA) {
        return vec3(0.72, 0.08, 0.055);
    }
    if (indiceObjeto == PARED_DERECHA) {
        return vec3(0.08, 0.55, 0.17);
    }
    if (indiceObjeto == LUZ) {
        return vec3(0.0);
    }
    return vec3(0.72, 0.70, 0.64);
}

// BRDF de Lambert: un material difuso cuya respuesta no depende de la dirección.
// Recibe el color difuso (kd) y devuelve f_r. El coseno se aplica en pesoMonteCarlo.
vec3 evaluarBRDF(vec3 colorDifuso) {
    return colorDifuso / PI;
}

// Solo la cara inferior del panel emite luz: su normal apunta hacia abajo.
vec3 emisionObjeto(int indiceObjeto, vec3 normal) {
    if (indiceObjeto == LUZ && normal.y < -0.5) {
        return vec3(8.0, 7.6, 6.8);
    }
    return vec3(0.0);
}

void main() {
    // Cambiamos la semilla por píxel y por muestra para obtener caminos distintos.
    vec2 posicionPixel = gl_FragCoord.xy;
    vec2 desplazamientoMuestra = uMuestras * vec2(17.17, 43.71);
    vec2 semilla = posicionPixel + desplazamientoMuestra;

    // Elegimos un punto dentro del píxel. Promediar esas posiciones suaviza los bordes.
    float desplazamientoX = aleatorio(semilla);
    float desplazamientoY = aleatorio(semilla);
    float pixelX = floor(posicionPixel.x) + desplazamientoX;
    float pixelY = floor(posicionPixel.y) + desplazamientoY;
    float coordenadaHorizontal = 2.0 * pixelX / uResolucion.x - 1.0;
    float coordenadaVertical = 2.0 * pixelY / uResolucion.y - 1.0;

    // Ubicamos ese punto en el plano imagen, una unidad delante del ojo.
    float relacionAspecto = uResolucion.x / uResolucion.y;
    float distanciaHorizontal = coordenadaHorizontal * relacionAspecto * uSemialto;
    float distanciaVertical = coordenadaVertical * uSemialto;
    vec3 centroPlano = uOjo - uEjeW;
    vec3 aporteHorizontal = distanciaHorizontal * uEjeU;
    vec3 aporteVertical = distanciaVertical * uEjeV;
    vec3 puntoPlano = centroPlano + aporteHorizontal + aporteVertical;
    vec3 direccionRayo = normalize(puntoPlano - uOjo);

    // Un camino devuelve una muestra RGB de la luz que llega a este píxel.
    vec3 muestraNueva = trazarCamino(uOjo, direccionRayo, semilla);
    vec3 promedioAnterior = vec3(0.0);
    if (uMuestras > 0.0) {
        vec2 coordenadasTextura = posicionPixel / uResolucion;
        promedioAnterior = texture2D(uAnterior, coordenadasTextura).rgb;
    }
    vec3 promedioActualizado = acumularMuestra(promedioAnterior, muestraNueva, uMuestras);
    gl_FragColor = vec4(promedioActualizado, 1.0); // Radiancia lineal, guardada en una textura flotante.
}
