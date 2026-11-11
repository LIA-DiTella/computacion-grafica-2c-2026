#version 100
precision highp float;

// En los TP anteriores aplicábamos MVP a los vértices de los objetos.
// Ahora visor.js envía solo cuatro esquinas para cubrir toda la pantalla:
//
//   2 (-1, 1) -------- 3 (1, 1)
//      |  \              |
//      |       \         |
//      |            \    |
//   0 (-1,-1) -------- 1 (1,-1)
//
// TRIANGLE_STRIP las une en dos triángulos: (0, 1, 2) y (2, 1, 3).
// Ya están en el volumen canónico, así que no necesitan una transformación MVP.
// Al rasterizarlos se ejecuta el fragment shader para cada píxel del canvas.
// Allí se usa la cámara para generar el rayo y consultar las SDF de los objetos.
// WebGL ejecuta main una vez por vértice: aquí son cuatro ejecuciones.
// En cada ejecución, aPosicion recibe otra esquina del buffer de visor.js.
attribute vec2 aPosicion; // Coordenadas (x, y) de la esquina que estamos procesando.

void main() {
    // vec4 reúne las cuatro componentes (x, y, z, w) de UN vértice.
    // z = 0 queda dentro del volumen; w = 1 conserva x e y al dividir por w.
    gl_Position = vec4(aPosicion.x, aPosicion.y, 0.0, 1.0);
}
