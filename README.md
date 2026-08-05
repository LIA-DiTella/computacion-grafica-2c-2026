# Computación Gráfica — 2C 2026

## Configuración de GitHub

Para trabajar en los ejercicios de la materia, recomendamos que tengas una copia privada del repositorio en tu propia cuenta de GitHub.

La configuración tendrá dos repositorios remotos:

- `origin`: tu repositorio privado, donde vas a guardar y subir tus soluciones.
- `sourcerepo`: el repositorio público de la materia, desde donde vas a recibir actualizaciones y correcciones.

### 1. Cloná el repositorio de la materia

```bash
git clone https://github.com/LIA-DiTella/computacion-grafica-2c-2026.git
```

Luego, ingresá a la carpeta del repositorio:

```bash
cd computacion-grafica-2c-2026
```

### 2. Creá un repositorio privado

Desde tu cuenta de GitHub, creá un nuevo repositorio privado. Por ejemplo:

```text
MisEjercicios
```

No lo inicialices con un archivo `README`, `.gitignore` ni licencia: dejalo completamente vacío.

La URL del nuevo repositorio debería tener esta forma:

```text
https://github.com/<tu_usuario>/MisEjercicios.git
```

Cuando clonás un repositorio, Git crea automáticamente un remote llamado `origin`, que apunta al repositorio desde el cual hiciste el clone. En este caso, `origin` apunta inicialmente al repositorio público de la materia.

Vamos a cambiar esa configuración para que:

- `origin` apunte a tu repositorio privado.
- `sourcerepo` apunte al repositorio público de la materia.

### 3. Configurá los remotes

Podés comprobar la configuración actual con:

```bash
git remote -v
```

Deberías ver algo similar a esto:

```text
origin  https://github.com/LIA-DiTella/computacion-grafica-2c-2026.git (fetch)
origin  https://github.com/LIA-DiTella/computacion-grafica-2c-2026.git (push)
```

Primero, renombrá el remote actual de `origin` a `sourcerepo`:

```bash
git remote rename origin sourcerepo
```

Luego, agregá tu repositorio privado como el nuevo `origin`:

```bash
git remote add origin https://github.com/<tu_usuario>/MisEjercicios.git
```

Podés verificar que ambos remotes estén correctamente configurados ejecutando nuevamente:

```bash
git remote -v
```

El resultado debería ser similar a este:

```text
origin      https://github.com/<tu_usuario>/MisEjercicios.git (fetch)
origin      https://github.com/<tu_usuario>/MisEjercicios.git (push)
sourcerepo  https://github.com/LIA-DiTella/computacion-grafica-2c-2026.git (fetch)
sourcerepo  https://github.com/LIA-DiTella/computacion-grafica-2c-2026.git (push)
```

Finalmente, subí el código base a tu repositorio privado:

```bash
git push -u origin main
```

A partir de este momento, cuando ejecutes `git push`, tus cambios se subirán a tu repositorio privado.

### 4. Incorporá las actualizaciones de la materia

Durante el cuatrimestre podemos agregar material, corregir errores o actualizar archivos en el repositorio público.

Antes de incorporar una actualización, asegurate de haber guardado tus cambios locales en un commit:

```bash
git add .
git commit -m "Guardar cambios antes de actualizar"
git push
```

Luego, traé las novedades del repositorio de la materia:

```bash
git pull sourcerepo main
```

Git intentará combinar automáticamente las actualizaciones con tus cambios locales.

Si un mismo archivo fue modificado tanto por vos como en el repositorio de la materia, puede producirse un conflicto. En ese caso, Git te indicará qué archivos tenés que revisar. Resolvé los conflictos desde tu editor y, una vez terminados, completá el merge con:

```bash
git add .
git commit
```

Por último, subí la versión actualizada a tu repositorio privado:

```bash
git push origin main
```
