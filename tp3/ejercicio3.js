/*
ejercicio3.js — Funciones para transformaciones 3D y rendering. 
Recordar que usaremos las siguientes convenciones para matrices: un arreglo 1D 
con 9 valores en orden "column-major". Es decir, para un arreglo A[] de 0 a 8, 
cada posición corresponderá a la siguiente matriz:

| A[0] A[3] A[6] |      ==>     [ A[0], A[1], A[2], 
| A[1] A[4] A[7] |                A[3], A[4], A[5], 
| A[2] A[5] A[8] |                A[6], A[7], A[8] ]

En este ejercicio implementás solo la cámara, las transformaciones y las
proyecciones (buscá los comentarios "TODO"). El álgebra (Vec, mat4Mul,
mat4Vec4) y el rasterizador ya vienen dados (marcados
como "PROVISTA" y no hace falta modificar).
*/

// ===================== FUNCIONES PROVISTAS — Álgebra ===================== //
// (Ya implementadas: no hace falta modificarlas.)

// PROVISTA: operaciones básicas con vectores 3D representados como [x, y, z].
const Vec = {
  add:(a,b)=>[a[0]+b[0], a[1]+b[1], a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0], a[1]-b[1], a[2]-b[2]],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
  norm:(a)=>Math.hypot(a[0],a[1],a[2]),
  normalize:(a)=>{ const n = Vec.norm(a) || 1; return [a[0]/n, a[1]/n, a[2]/n]; },
  scale:(a,s)=>[a[0]*s, a[1]*s, a[2]*s],
};

// PROVISTA: multiplicación de matrices 4x4 (column-major). mat4Mul(A, B) = A·B.
function mat4Mul(a,b){
  const r = new Array(16).fill(0);
  for(let i=0;i<4;i++){
    for(let j=0;j<4;j++){
      for(let k=0;k<4;k++) r[j*4+i] += a[k*4+i]*b[j*4+k];
    }
  }
  return r;
}

// PROVISTA: multiplica una matriz 4x4 (column-major) por un vector [x, y, z, w].
function mat4Vec4(m, v){
  const r=[0,0,0,0];
  for(let i=0;i<4;i++) for(let k=0;k<4;k++) r[i]+=m[k*4+i]*v[k];
  return r;
}

// =================== I. CÁMARA Y VISTA — A IMPLEMENTAR =================== //
//   setupCamera → DÓNDE está la cámara: vectores (eye, center, up) en el mundo.
//   lookAt      → CÓMO se ve el mundo desde ahí: la matriz de vista (mundo → cámara).

/* TODO: Implementar la función setupCamera(ui).
DÓNDE está la cámara. Traduce los parámetros de la UI (ángulos) a la UBICACIÓN
de la cámara en el mundo. OJO: no devuelve una matriz, devuelve tres vectores.
  - ui.az : ángulo de acimut (azimuth).
  - ui.el : ángulo de elevación.
Asumimos:
  - radius = 3, distancia fija de la cámara al centro de la escena.
  - center = (0,0,0), punto al que la cámara siempre mira.
  - up = (0,1,0), vertical del mundo.
Devuelve { eye, center, up } (la ubicación), que luego alimenta a lookAt.
Es la "política" de cámara de esta app (orbitar con los sliders); se podría
cambiar por otra sin tocar lookAt.
*/
function setupCamera(ui) {
  const azimuth   = ui.az;
  const elevation = ui.el;
  // ...
}

/* TODO: Implementar la matriz de vista (lookAt).
Recibe la ubicación YA calculada (eye, center, up) y construye la matriz de
vista V, que transforma cualquier punto del mundo a coordenadas de la cámara
(eye en el origen, mirando hacia -Z). lookAt NO decide dónde está la cámara.

Es la "Transformación de cámara": V = R · T, con

  R = | xu yu zu 0 |        T = | 1 0 0 -xe |
      | xv yv zv 0 |            | 0 1 0 -ye |
      | xw yw zw 0 |            | 0 0 1 -ze |
      |  0  0  0 1 |            | 0 0 0  1  |

Primero T lleva 'eye' (e) al origen; luego R rota alineando los ejes {u, v, w}.
La base ortonormal de la cámara:
  - e   = eye (posición de la cámara).
  - -w  = dirección de visión = normalize(center - eye)   [en el código: minus_w].
  - v   = dirección vertical (arriba real de la cámara).
  - u   = lateral (derecha). {u, v, w} es una base ortonormal derecha.

Notar:
  - En R, la 3ra fila es w = -minus_w (por eso aparece con signo cambiado).
  - Column-major: los arreglos se almacenan por columnas.
*/
function lookAt(eye, center, up){
  // ...
  return mat4Mul(rotation, translation);
}

// ================== II. PROYECCIONES — A IMPLEMENTAR ==================== //

/* TODO: Implementar la matriz de proyección ortográfica.
Mapea la caja de visión [l,r] × [b,t] × [n,f] al volumen canónico (NDC: Normalized Device Coordinates) [-1,1]³.
En column-major equivale a la matriz vista en clase:

  | 2/(r-l)     0        0      -(r+l)/(r-l) |
  |   0      2/(t-b)     0      -(t+b)/(t-b) |
  |   0         0     2/(n-f)   -(n+f)/(n-f) |
  |   0         0        0            1      |

Nota: n y f son las coordenadas z de los planos near/far (negativas, porque la
cámara mira hacia -Z), por eso n-f > 0.
*/
function orthographic(left, right, bottom, top, znear, zfar){
  // ...
  return orthoMat;
}

/* TODO: Implementar la matriz proyectiva (la que "aplasta" el frustum).
Es la primera parte de la perspectiva vista en clase. En column-major equivale a:

  | n   0     0      0  |
  | 0   n     0      0  |
  | 0   0   n+f   -f·n  |
  | 0   0     1      0  |

n y f son las coordenadas z de los planos near y far. La fila inferior [0 0 1 0]
hace que w' = z: al dividir por w (perspective divide) aparece la perspectiva.
*/
function projective(znear, zfar){
  const n = znear, f = zfar;
  // ...
}
/* TODO: Implementar la matriz de perspectiva como COMPOSICIÓN.
Tal como se ve en clase, la perspectiva se arma en dos pasos:
  1. projective(n, f): "aplasta" el frustum en una caja.
  2. orthographic(l, r, b, t, n, f): lleva esa caja al volumen canónico (NDC).
Es decir:  perspective = orthographic · projective.
Recordá que mat4Mul(A, B) devuelve A·B.
Parámetros: l, r, b, t definen la ventana en el plano near; n, f son los
planos near/far (coordenadas z, negativas).
*/
function perspective(left, right, bottom, top, znear, zfar){
  return mat4Mul(
    //...
  );
}

/* TODO: Implementar la conversión de NDC a coordenadas de pantalla (viewport).
Lleva el volumen canónico (x, y ∈ [-1, 1]) a píxeles, siguiendo la matriz de
ventana vista en clase:

  | w/2    0    (w-1)/2 |
  |  0    h/2   (h-1)/2 |
  |  0     0       1    |

Ojo: en pantalla el eje Y crece hacia ABAJO, por eso invertimos el signo de Y.
La coordenada z se conserva para el z-buffer.
Ejemplo: ndcToScreen([-1, 1, 0], 800, 600) => [-0.5, -0.5, 0]
*/
function ndcToScreen(ndc, width, height){
  // ...
  return [x,y,ndc[2]]; // coord z se mantiene sin cambios
}

// ============= FUNCIONES PROVISTAS — Pipeline y rasterización ============ //
// (Ya implementadas: no hace falta modificarlas.)

/* PROVISTA: homogeneousToNDC (perspective divide).
Pasa de coordenadas CLIP (homogéneas [x, y, z, w]) a NDC dividiendo por w.
En perspectiva, esta división es la que produce el efecto de "lejanía".
*/
function homogeneousToNDC(coords) {
  const w = coords[3];
  return [
    coords[0] / w,  // x
    coords[1] / w,  // y
    coords[2] / w   // z
  ];
}
// ------------------------------ II. Rasterización ------------------------- //

/* PROVISTA: función de borde edge(p0, p1, p2).
Dado el segmento orientado p0->p1 y un punto p2, devuelve un valor con signo:
  > 0 si p2 queda a un lado de la recta, < 0 del otro lado, 0 si está sobre ella.
Su valor equivale al doble del área (con signo) del triángulo (p0, p1, p2),
por eso sirve para calcular coordenadas baricéntricas.
  p0, p1, p2: puntos 2D [x, y] en coordenadas de pantalla.
*/
function edge(p0, p1, p2){
  return (p1[0]-p0[0])*(p2[1]-p0[1]) - (p1[1]-p0[1])*(p2[0]-p0[0]);
}

/* PROVISTA: rasterizador drawTriangle.
Pinta el triángulo (v0, v1, v2) dado en coordenadas de pantalla con el color rgb.
Idea:
  1. Recorrer sólo los píxeles del bounding box del triángulo.
  2. Para cada píxel, calcular sus coordenadas baricéntricas (w0, w1, w2)
     con la función edge. El píxel está dentro si las tres son >= 0.
  3. Interpolar la profundidad z usando esas baricéntricas.
  4. Usar un z-buffer (depth) para conservar sólo lo más cercano.
Parámetros:
  - img      : {data, w, h} buffer de la imagen (RGBA).
  - depth    : Float32Array con la profundidad guardada por píxel.
  - v0,v1,v2 : vértices [x, y, z] en pantalla.
  - rgb      : color [r, g, b].
*/
function drawTriangle(img, depth, v0, v1, v2, rgb){
  const w = img.w, h = img.h;

  // Bounding box del triángulo, recortado a los límites de la pantalla
  const minX = Math.max(0,   Math.floor(Math.min(v0[0], v1[0], v2[0])));
  const maxX = Math.min(w-1, Math.ceil (Math.max(v0[0], v1[0], v2[0])));
  const minY = Math.max(0,   Math.floor(Math.min(v0[1], v1[1], v2[1])));
  const maxY = Math.min(h-1, Math.ceil (Math.max(v0[1], v1[1], v2[1])));

  // Área con signo del triángulo. Si es 0, es degenerado y no ocupa píxeles.
  const area = edge(v0, v1, v2);
  if (area === 0) return;

  for (let y = minY; y <= maxY; y++){
    for (let x = minX; x <= maxX; x++){
      const p = [x + 0.5, y + 0.5]; // centro del píxel

      // Coordenadas baricéntricas: proporción de área de cada subtriángulo
      const w0 = edge(v1, v2, p) / area;
      const w1 = edge(v2, v0, p) / area;
      const w2 = edge(v0, v1, p) / area;

      // El píxel está dentro del triángulo si las tres son no negativas
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      // Profundidad interpolada en el píxel
      const z = w0*v0[2] + w1*v1[2] + w2*v2[2];

      // z-buffer: pinto sólo si este píxel está más cerca (z mayor = más cercano)
      const idx = y*w + x;
      if (z > depth[idx]){
        depth[idx] = z;
        img.data[idx*4+0] = rgb[0];
        img.data[idx*4+1] = rgb[1];
        img.data[idx*4+2] = rgb[2];
        img.data[idx*4+3] = 255;
      }
    }
  }
}