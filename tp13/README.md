# TP 13 · Ecuación de rendering y path tracing

En TP12 seguimos rayos y reflejos. Ahora estimamos la luz reflejada por una superficie
no emisora a partir de lo que recibe desde su hemisferio, como en la ecuación de clase:

$$L_o = \int_{\Omega} L_i\,f_r\,\cos(\theta)\,d\omega$$

En cada colisión con una superficie difusa elegimos **una dirección aleatoria** para
continuar, mientras queden rebotes. El `N = 1` de path tracing significa una continuación por rebote;
para obtener el color del píxel, promediamos **muchos caminos**. El estimador Monte Carlo es:

$$L_o \approx \frac{1}{N}\sum_{i=1}^{N}\frac{L_i\,f_r\,\cos(\theta_i)}{\mathrm{pdf}(\omega_i)}$$

Usaremos una caja con paredes de color, dos objetos difusos y un panel luminoso en el
techo. Los caminos que alcanzan ese panel aportan luz, multiplicada por los pesos
de sus rebotes. Así obtenemos iluminación directa e indirecta.

## El recorrido completo

Cada camino termina al alcanzar una fuente, salir de la escena o agotar el límite
de rebotes. Si termina sin alcanzarla, su muestra vale cero y también se cuenta
en el promedio. Por ejemplo, cuatro muestras `0, 0, 0, 4` en un canal dan un promedio
de `1`. Descartar los ceros daría `4` y haría la imagen demasiado brillante.

Acumulamos **una muestra por píxel en cada frame**, conservando el promedio entre
frames. El primero promedia un camino; el segundo, dos; tras 100 frames, son 100
caminos por píxel si no reiniciamos la acumulación. Ese es nuestro bucle de muestras:
la imagen se va refinando mientras la mostramos.

```text
al iniciar o reiniciar la acumulación:
    poner en cero el promedio guardado de cada píxel
    cantidadAnterior = 0

cada frame:
    para cada píxel:
        origen = posición del ojo
        direccion = dirección hacia un punto aleatorio dentro del píxel
        // *** A IMPLEMENTAR: PASO 2 ***
        muestraNueva = trazarCamino(origen, direccion)
        leer el promedioAnterior guardado para este píxel
        // *** A IMPLEMENTAR: PASO 3 ***
        promedioNuevo = acumularMuestra(promedioAnterior, muestraNueva, cantidadAnterior)
        guardar promedioNuevo para este píxel

    cantidadAnterior = cantidadAnterior + 1
    mostrar la imagen

// Se llama una vez por píxel y frame, con el rayo que sale de la cámara.
// Busca la primera colisión y sigue los rebotes para estimar luz directa e indirecta.
trazarCamino(origen, direccion):
    pesoCamino = (1, 1, 1)
    rebotesRealizados = 0
    repetir:
        distanciaColision = intersectar(origen, direccion)
        si distanciaColision < 0:
            devolver cero

        puntoColision = origen + distanciaColision * direccion
        indiceObjeto = objetoCercano(puntoColision)
        colorDifuso = colorDifusoObjeto(indiceObjeto)  // Color del material de ese objeto.
        normal = normalObjeto(puntoColision, indiceObjeto)
        emisión = emisionObjeto(indiceObjeto, normal)
        si emite luz:
            devolver pesoCamino * emisión

        si rebotesRealizados == límite:
            devolver cero

        // Elegir dos números en [0,1) para definir una dirección en el hemisferio:
        numeroAltura = aleatorio()  // Para elegir la altura sobre el eje de la normal.
        numeroAngulo = aleatorio()  // Para elegir el ángulo alrededor de ese eje.

        // *** A IMPLEMENTAR: PASO 1 ***
        direccionSiguiente = muestrearHemisferio(normal, numeroAltura, numeroAngulo)
        
        pesoRebote = pesoMonteCarlo(colorDifuso, normal, direccionSiguiente)
        pesoCamino = pesoCamino * pesoRebote

        // Preparar el rayo que usará intersectar() en la próxima vuelta.
        origen = puntoColision + SEPARACION * normal  // Evitar repetir la misma colisión.
        direccion = direccionSiguiente
        rebotesRealizados = rebotesRealizados + 1
```

Para una dirección elegida, el aporte estimado es `L_i * pesoRebote`.
`pesoMonteCarlo()` calcula ese peso; para estimar `L_i`, seguimos el rayo.
Si llega a otra superficie, aplicamos allí la misma ecuación. Así, para el camino
`cámara → A → B → luz`, el aporte es `pesoA * pesoB * emisión`.
`pesoCamino` guarda ese producto de pesos hasta alcanzar la fuente.
El promedio de muchos caminos en `acumularMuestra` completa el `1/N` y la suma del estimador.

Comprobamos la emisión **antes** del límite: con un rebote, el camino
`cámara → objeto → luz` debe contribuir. Si llega a otra superficie difusa en lugar
de la luz, termina con cero. `uRebotes` cuenta estas reflexiones; `MAX_PASOS` limita
los avances de sphere tracing para buscar una sola colisión. Son dos bucles distintos.

## Qué implementar y cómo se relaciona con la clase

Completá los tres bloques de `shaders/ejercicio.frag` en este orden.
Los comentarios A, B, C… guían cada función y `// ...` marca dónde escribir.

1. **`muestrearHemisferio` — muestreo uniforme y por importancia.**
   Recibe una normal unitaria y dos números uniformes en `[0,1)`; devuelve una
   dirección unitaria del hemisferio exterior.
2. **`trazarCamino` — una continuación por colisión.**
   Recibe el origen, la dirección y una semilla que se actualiza; devuelve
   la radiancia RGB estimada por un camino.
3. **`acumularMuestra` — promedio Monte Carlo.**
   Recibe el promedio anterior, una muestra nueva y la cantidad anterior de
   muestras; devuelve el promedio actualizado.

El color difuso cumple el papel de `kd` en TP10: indica cuánto refleja el material
en cada canal RGB, entre 0 y 1. `colorDifusoObjeto` devuelve ese color.
En `trazarCamino`, usá `pesoMonteCarlo(colorDifuso, normal, direccion)` para obtener
el peso RGB del rebote. Esta función ya calcula `BRDF * cosTheta / pdf`, consultando
la BRDF de Lambert en `evaluarBRDF(colorDifuso)`. La `pdf` describe cómo se distribuyen
las direcciones elegidas; dividir por ella compensa ese muestreo. La función se encarga
de esa corrección.

## Cómo elegir las direcciones

El muestreo uniforme reparte las direcciones por igual sobre el hemisferio.
El muestreo por coseno elige más direcciones cercanas a la normal, donde el factor
`cos(theta)` de la ecuación es mayor.

En `muestrearHemisferio`, elegí la altura según `uCoseno`, el mismo selector que
usa `pesoMonteCarlo()`:

| Modo | Altura del punto en el hemisferio local |
| --- | --- |
| Uniforme (`uCoseno = false`) | `numeroAltura` |
| Por coseno (`uCoseno = true`) | `sqrt(numeroAltura)` |

Para construir la dirección en `muestrearHemisferio`, esa altura es la coordenada Z.
Usá `angulo = 2 * PI * numeroAngulo` y `radioHorizontal = sqrt(1 - altura*altura)`
para ubicar X e Y sobre el círculo a esa altura. Luego `orientarHemisferio` alinea
el eje Z con la normal.

`trazarCamino` multiplica los pesos de los rebotes. El promedio entre caminos se
hace una sola vez, en `acumularMuestra`.

Cada llamada a `aleatorio(semilla)` modifica la semilla: eso significa `inout`.
Cada frame agrega un camino por píxel al promedio. El visor almacena radiancia
lineal; `mostrar.frag` aplica exposición y gamma después de promediar.
