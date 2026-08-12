# TP2: Transformaciones 2D (Computación Gráfica)

En este trabajo práctico vas a implementar las funciones de transformaciones 2D usando matrices homogéneas para controlar un cohete interactivo que se mueve por el espacio.

## Estructura de Carpetas

- Archivos HTML/CSS/JS: Archivos principales de la aplicación
- Archivos de imágenes: Sprites del cohete (`rocket.png`), efectos de fuego (`fire.gif`) y fondo espacial (`space_background.png`)
- Documentación: `tp2.md` con información básica del proyecto

### `index.html`

La interfaz principal en HTML, que incluye:

- Imagen del cohete (`rocket.png`) como elemento principal controlable
- Tres propulsores animados (`fire.gif`) que se posicionan relativamente al cohete
- Fondo espacial que se repite infinitamente
- Panel de controles con las teclas disponibles

### `tp2.js`

Lógica principal de la aplicación con las siguientes funciones:
- `WheelZoom`: Maneja el zoom in/out con la rueda del mouse
- `KeyDown`: Procesa las entradas del teclado para mover y rotar el cohete
- `MoveRocket`: Actualiza la posición del cohete según la posición del mouse
- `UpdateTrans`: Aplica las transformaciones calculadas a todos los elementos visuales
- Game loop: Bucle principal que actualiza continuamente la posición del fondo

### `ejercicio.js`

**Este es el archivo que debes completar** con los algoritmos principales de transformaciones:

- `BuildTransform`: Construye una matriz de transformación 3x3 que combina traslación, rotación y escala
- `ComposeTransforms`: Compone (multiplica) dos matrices de transformación

## Controles

- **[W] / [↑]**: Acelerar hacia adelante
- **[S] / [↓]**: Frenar/reducir velocidad
- **[A] / [←]**: Rotar antihorario
- **[D] / [→]**: Rotar horario
- **[Scroll]**: Zoom in/out
- **[H]**: Mostrar/ocultar panel de ayuda
- **[Mouse]**: El cohete sigue la posición del cursor

## ¿Cómo Funciona?

1. El usuario controla el cohete usando el teclado y mouse
2. La función `BuildTransform` debe crear matrices de transformación que combinen:
   - **Escala**: Zoom in/out controlado por la rueda del mouse
   - **Rotación**: Orientación del cohete controlada por las teclas A/D
   - **Traslación**: Posición del cohete que sigue al mouse
3. La función `ComposeTransforms` debe multiplicar matrices para combinar transformaciones
4. Los propulsores se posicionan relativamente al cohete usando transformaciones compuestas
5. El fondo se mueve en dirección opuesta al cohete para simular movimiento

## Conceptos Clave

### Orden de Transformaciones

**Importante**: El orden de aplicación es crucial:
1. **Escala** (cambia el tamaño)
2. **Rotación** (cambia la orientación)
3. **Traslación** (cambia la posición)

### Representación de Datos

Las matrices se almacenan como arreglos 1D de 9 elementos en orden **column-major**:

```
Matriz:           Arreglo:
| A[0] A[3] A[6] |    [A[0], A[1], A[2], 
| A[1] A[4] A[7] | ->  A[3], A[4], A[5],
| A[2] A[5] A[8] |     A[6], A[7], A[8]]
```

## Objetivos del Ejercicio

1. **Implementar `BuildTransform`**: Crear una matriz que combine escala, rotación y traslación
2. **Implementar `ComposeTransforms`**: Multiplicar dos matrices de transformación
3. **Comprender el orden de transformaciones**: Aplicar las transformaciones en el orden correcto
4. **Manejar coordenadas homogéneas**: Trabajar con matrices 3x3 para transformaciones 2D

Al completar correctamente las funciones, el cohete debería moverse fluidamente, rotar según los controles, escalar con el zoom, y los propulsores deberían mantenerse en posición relativa al cohete.
