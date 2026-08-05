# Computacion Gráfica 2C 2025 

## GitHub Setup
Recomendamos trabajar en tu propio repositorio privado. Recomendamos crear un repositorio privado espejado (mirrored) con múltiples remotes. 

1. Cloná este repositorio 

    ```
    git clone https://github.com/LIA-DiTella/computacion-grafica-2c-2025.git
    ```

2. Crea un nuevo respo privado (e.g. MisEjercicios) 

    - No inicialices el repositorio, dejalo en blanco. 
    - El nuevo repo debería estar hosteado en: `https://github.com/<tu_usuario>/MisEjercicios.git`

    Cuando clonas un repositorio de Git, el remote predeterminado se llama `origin` y apunta a la URL desde la que clonaste.
    Vamos a configurar el `origin` de nuestro repo clonado local para que apunte a `MisEjercicios.git`, pero también tendremos un remote llamado `sourcerepo` para el repositorio público de la materia.

3. Así es como agregamos el remote privado:

    Dado que clonamos desde el repositorio `LIA-DiTella/computacion-grafica-2c-2025.git`, el valor actual de `origin` debería ser:
    ```
    $ git remote -v 
    origin	https://github.com/LIA-DiTella/computacion-grafica-2c-2025.git (fetch)
    origin	https://github.com/LIA-DiTella/computacion-grafica-2c-2025.git (push)
    ```
    Ahora renombra `origin` a `sourcerepo`:
    ```
    git remote rename origin sourcerepo
    ```
    Agrega un nuevo remote llamado `origin` que apunte a tu repositorio privado:
    ```
    git remote add origin https://github.com/<tu_usuario>/MisEjercicios.git
    ```
    Ahora puedes subir el código base a tu copia privada:
    ```
    git push origin -u main
    ```
4. Al mantener un remote adicional apuntando al repositorio original, podés actualizar tu copia cuando el repositorio original cambia (por ejemplo, si los agregamos código o arreglamos errores).
    - Commitea todos tus cambios locales a tu `origin`
    - Ejecuta `git pull sourcerepo main`: esto trae todos los cambios desde `sourcerepo` a tu copia local.
        - Si hay archivos con cambios tanto en `origin` como en `sourcerepo`, Git intentará hacer un merge automático de las actualizaciones. Para esto, Git puede crear un commit de merge.
        -  Puede que haya conflictos. Git resolverá automáticamente todos los merges que pueda, y luego te indicará qué archivos tienen conflictos que deben resolverse manualmente. Podés resolver los conflictos en tu editor de texto y luego crear un nuevo commit para completar el proceso de merge.
    - Una vez que hayas completado el merge, ya tendrás todas las actualizaciones en tu copia local. Subilas a tu repo privado con:
        ```
        git push origin main
        ```
## TP 1: Dithering 

Este trabajo práctico consiste en implementar técnicas de dithering basadas en difusión de error. El objetivo es simular niveles de gris o color mediante patrones de píxeles en imágenes cuantizadas.

Requerimientos
1.	Implementar el algoritmo de Floyd–Steinberg: aplicar difusión de error usando su kernel característico para lograr una representación visual más rica tras la cuantización.
2.	Implementar la variante de Jarvis, Judice and Ninke: utilizar su kernel extendido para una difusión de error más amplia y uniforme.
3.	Calcular el error con respecto a la imagen original
