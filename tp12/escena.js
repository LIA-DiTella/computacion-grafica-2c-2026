/** SDF de plano, esfera y cubo. Referencia: iquilezles.org/articles/distfunctions/ */
const escenaGLSL = `
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
`;
