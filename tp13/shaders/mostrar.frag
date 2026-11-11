#version 100
precision highp float;
uniform sampler2D uImagen;   // Textura con el promedio de radiancia lineal.
uniform vec2 uResolucion;    // Ancho y alto del canvas, en píxeles.

void main() {
    vec2 coordenadasTextura = gl_FragCoord.xy / uResolucion;
    vec3 radianciaPromedio = texture2D(uImagen, coordenadasTextura).rgb;

    // La radiancia puede superar 1. Esta curva lleva los valores positivos al rango de pantalla.
    vec3 radianciaPositiva = max(radianciaPromedio, vec3(0.0));
    vec3 colorMapeado = vec3(1.0) - exp(-radianciaPositiva);

    // Aplicamos gamma solo al mostrar. El promedio almacenado sigue siendo lineal.
    float inversaGamma = 1.0 / 2.2;
    vec3 colorPantalla = pow(colorMapeado, vec3(inversaGamma));
    gl_FragColor = vec4(colorPantalla, 1.0);
}
