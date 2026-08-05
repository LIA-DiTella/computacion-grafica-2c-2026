# TP1: Dithering (Computación Gráfica)

En este trabajo práctico vas a armar una aplicación web que implementa el algoritmo de dithering de Floyd-Steinberg. 

## Estructura de Carpetas

- Archivos HTML/CSS/JS: Archivos principales de la aplicación
- Archivos de imágenes: Imágenes de prueba (`bunny.jpeg`, `bunny_grey.jpeg`, `loros.png`)
- Documentación: `tp1.md` con información básica del proyecto

### `index.html`

La interfaz principal en HTML, que incluye:

- Entrada para subir archivos de imagen
- Entrada numérica para controlar los niveles de dithering (1-20)
- Tres elementos `<canvas>` que muestran:
    - Imagen original
    - Resultado con dithering
    - Diferencia entre la imagen original y el resultado

### `tp1.js`

Lógica principal de la aplicación con las siguientes funciones:
- `handleFiles`: Carga los archivos de imagen seleccionados en el canvas de entrada
- `recomputeImages`: Orquesta el proceso de dithering y el cálculo de diferencia


### `ejercicio.js`

Algoritmos principales de procesamiento de imágenes:
- `dither`: Implementa el algoritmo de dithering de Floyd-Steinberg.
- `substraction`: Calcula la diferencia absoluta entre dos imágenes
- `index`: Función auxiliar para calcular los índices de píxeles RGBA en `ImageData`


## ¿Cómo Funciona?
1.	El usuario sube una imagen mediante el selector de archivos
2.	La imagen se muestra en el primer canvas
3.	La función `dither` aplica el algoritmo de Floyd-Steinberg con los niveles de color especificados
4.	`substraction` calcula la diferencia visual entre la imagen original y la imagen dithered
5.	Los resultados se muestran en el segundo y tercer canvas, respectivamente
