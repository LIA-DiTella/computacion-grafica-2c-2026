# TP2: Transformaciones 2D — Computación Gráfica (UTDT)

## Descripción del Juego

Una simulación interactiva de un **cohete espacial** que navega por el espacio. El jugador controla la orientación y velocidad del cohete con el teclado, y el cohete sigue al cursor del mouse. Los propulsores (llamas animadas) se mantienen siempre en posición relativa al cohete gracias a transformaciones compuestas.

## Controles

| Tecla | Acción |
|---|---|
| `W` / `↑` | Aumentar velocidad |
| `S` / `↓` | Reducir velocidad |
| `A` / `←` | Rotar antihorario |
| `D` / `→` | Rotar horario |
| Rueda del mouse | Zoom in / out |
| Mouse | El cohete sigue el cursor |
| `H` | Mostrar/ocultar ayuda |

---

## Tarea a Realizar

Completar las dos funciones en `ejercicio.js`:

### 1. `BuildTransform(positionX, positionY, rotation, scale)`

Construye una **matriz de transformación 3×3** en coordenadas homogéneas combinando escala, rotación y traslación (en ese orden).

### 2. `ComposeTransforms(trans1, trans2)`

**Multiplica** dos matrices de transformación (aplica primero `trans1`, luego `trans2`).

---

## Estructura del Proyecto

```
tp2/
├── index.html        # Interfaz principal (cohete, propulsores, fondo)
├── style.css         # Estilos
├── tp2.js            # Lógica del juego (controles, game loop)
├── ejercicio.js      # ⬅ ARCHIVO A COMPLETAR
└── tp2.md            # Enunciado detallado
```

---

## Diagrama de Estructuras

### Objetos de estado

```
rocket                          background
┌─────────────────┐             ┌─────────────────┐
│ positionX: num  │             │ positionX: num  │
│ positionY: num  │             │ positionY: num  │
│ rotation:  num  │             └─────────────────┘
│ scale:     num  │
│ speed:     num  │
└─────────────────┘
```

### Representación de la matriz (column-major)

```
Matriz 3×3:              Arreglo 1D (9 elementos):

| A[0]  A[3]  A[6] |
| A[1]  A[4]  A[7] |  →  [ A[0], A[1], A[2], A[3], A[4], A[5], A[6], A[7], A[8] ]
| A[2]  A[5]  A[8] |
```

### Matriz de transformación completa (S · R · T)

$$
M = T \cdot R \cdot S =
\begin{pmatrix}
s\cos\theta & -s\sin\theta & t_x \\
s\sin\theta &  s\cos\theta & t_y \\
0           & 0            & 1
\end{pmatrix}
$$

### Flujo de transformaciones

```
Entrada del usuario
  (mouse, teclado, rueda)
        │
        ▼
  ┌───────────┐     BuildTransform(x, y, rot, scale)
  │  rocket   │  ──────────────────────────────────►  Matriz M_cohete (3×3)
  └───────────┘                                              │
                                                             │  ComposeTransforms
                                                             ▼
                                              Matriz M_propulsor_i = M_cohete · M_offset_i
                                                             │
                                                             ▼
                                                  UpdateTrans() aplica CSS transform
                                                  a cada elemento del DOM
```

### Pipeline de renderizado

```
 ┌──────────────────────────────────────────────────────────────┐
 │  Game Loop (requestAnimationFrame)                           │
 │                                                              │
 │   Mouse move ──► MoveRocket() ──► UpdateTrans()             │
 │   Teclado    ──► KeyDown()    ──► UpdateTrans()             │
 │   Rueda      ──► WheelZoom()  ──► UpdateTrans()             │
 │                                       │                      │
 │                                       ▼                      │
 │                              BuildTransform()                │
 │                              ComposeTransforms()  ◄── TODO   │
 │                                       │                      │
 │                                       ▼                      │
 │                              CSS matrix() aplicada al DOM    │
 └──────────────────────────────────────────────────────────────┘
```

---

## Conceptos Clave

- **Coordenadas homogéneas**: Se usa una matriz 3×3 para representar traslación, rotación y escala en 2D de forma unificada.
- **Orden de transformaciones**: Escala → Rotación → Traslación. El orden importa porque la multiplicación de matrices no es conmutativa.
- **Column-major**: Los elementos del arreglo están ordenados por columnas, no por filas.
- **Composición**: Para posicionar los propulsores relativamente al cohete se componen la transformación del cohete con un offset local de cada propulsor.
