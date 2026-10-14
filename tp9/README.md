# TP 9 · De superficies implícitas a mallas

**Marching Cubes** aproxima con triángulos la superficie donde un campo
`f(x,y,z)` alcanza un valor elegido: **`f(x,y,z) = nivel`**.
El campo asigna un número a cada punto del espacio.

Divide el espacio en cubos y compara el campo en sus ocho vértices con el nivel.
Cada vértice tiene dos estados: menor que el nivel o mayor o igual. Las
**2⁸ = 256 configuraciones** posibles permiten usar tablas para construir
triángulos, repitiendo el mismo procedimiento en cada cubo.

Si los extremos de una arista están a distintos lados del nivel, hay un cruce.
La interpolación lineal estima dónde ocurre; una tabla indica cómo unir esos
puntos. Una grilla más fina suele capturar más detalle, a mayor costo.

```text
crear malla vacía; celdasActivas = 0
para cada cubo de la grilla:
    obtener sus posiciones y valores; identificar el caso
    si el caso es 0 o 255, continuar con el siguiente cubo
    incrementar celdasActivas
    interpolar puntos en las aristas indicadas por la tabla
    unirlos según la tabla de triángulos y agregarlos a la malla
compactar la malla
devolver la malla y celdasActivas
```

En este TP usamos **metaballs**: cada bola aporta 1 en su centro y disminuye
hasta 0 en su radio de influencia. Al sumar sus aportes, las superficies
de bolas cercanas pueden unirse.

## Funciones a implementar

Completá las tres funciones de [`ejercicio.js`](ejercicio.js). El campo, la grilla
muestreada, las tablas, el visor y la exportación OBJ están provistos.

### 1. `indiceCaso(valores, nivel)`

Recibe los ocho valores del cubo y devuelve el **índice del caso**, de 0 a 255.
Construí un patrón, del vértice 0 al 7: `'1'` si su valor es menor que `nivel`,
`'0'` si es mayor o igual. `CONFIGURACIONES` es la lista de los 256 patrones:
buscá el indicado con `CONFIGURACIONES.indexOf(patron)`.
Su posición es el caso: por ejemplo, `"10000000"` corresponde al caso 1.
Los casos 0 y 255 tienen todos los vértices del mismo lado; no generan triángulos.

### 2. `interpolarArista(p0, p1, v0, v1, nivel)`

Recibe las posiciones `p0`, `p1` y los valores del campo `v0`, `v1` en los extremos.
Devuelve el cruce como un nuevo punto `[x,y,z]`:

```text
t = (nivel − v0) / (v1 − v0)
p = p0 + t (p1 − p0)
```

Aplicá la segunda fórmula a cada coordenada. Por ejemplo, entre valores 0 y 1,
el nivel 0.25 queda a un cuarto del recorrido desde `p0` (`t = 0.25`).
La tabla garantiza `v0 ≠ v1`. Los cruces en los extremos dan `t = 0` o `t = 1`.

### 3. `marchingCubes(grilla, nivel)`

Seguí el pseudocódigo usando las funciones anteriores. La grilla ya está
muestreada; recorré `i`, `j`, `k` de **0 a N−1**.

| Dato | Contenido |
| --- | --- |
| `grilla.resolucion` | Cantidad `N` de cubos por eje. |
| `grilla.cubo(i,j,k)` | Cubo con arreglos `vertices` y `valores`. |
| `cubo.vertices[v]` | Posición `[x,y,z]` del vértice local `v`, de 0 a 7. |
| `cubo.valores[v]` | Valor del campo en ese mismo vértice. |
| `ARISTAS_POR_CASO[caso]` | Pares de vértices del cubo donde interpolar. |
| `TRIANGULOS[caso]` | Ternas de índices de los puntos interpolados. |

Numeración de los vértices del cubo, definida en `tablas.js`:

```text
       7 -------- 6
      /|         /|
     4 -------- 5 |
     | 3 -------|-2
     |/         |/
     0 -------- 1
```

Por ejemplo, para el caso 1:

```text
ARISTAS_POR_CASO[1] = [[0,1], [0,4], [0,3]]
interpolar cada par → puntos[0], puntos[1], puntos[2]
TRIANGULOS[1] = [[0,1,2]] → unir esos tres puntos
```

Interpolá cada par `a,b` usando `cubo.vertices[a]`, `cubo.vertices[b]` y sus
valores. Guardá los resultados **en el orden de los pares** en `puntos`:
los índices de `TRIANGULOS` se refieren a esa lista.

Agregá los puntos de cada triángulo a `vertices` y sus índices a una cara de
`caras`. Cada punto nuevo recibe el índice `vertices.length` antes de agregarlo.
Conservá el orden de la tabla para mantener la orientación.

Podés repetir puntos. Al terminar, `compactarMalla(vertices, caras)` une
posiciones coincidentes y elimina caras de área cero. Agregá `celdasActivas`
al resultado y devolvé:

```text
{ vertices, caras, celdasActivas }
vertices: posiciones [x,y,z] de toda la malla
caras: ternas de índices de vertices, desde cero
celdasActivas: cantidad de cubos con caso distinto de 0 y 255
```

Sin cruces, las listas quedan vacías. No modifiques las entradas ni las tablas.

## Referencias

- [Video de referencia](https://www.youtube.com/watch?v=KvwVYJY_IZ4).
- Material de clase **7.1 Superficies**: blending y apéndice de Marching Cubes.
- Tablas adaptadas de [Three.js r128](https://github.com/mrdoob/three.js/blob/r128/examples/jsm/objects/MarchingCubes.js),
  atribuidas allí a Cory Gene Bloyd / Paul Bourke. Licencia: `vendor/LICENSE-three.txt`.
