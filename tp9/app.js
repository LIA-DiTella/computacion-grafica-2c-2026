/** Interfaz provista; la única extracción de superficie llama a ejercicio.js. */
(() => {
    const $ = id => document.getElementById(id);
    const formato = n => n.toLocaleString('es-AR');
    let bolas = [], seleccion = 0, malla = null, parametros = null, vigente = false, ocupada = false;
    let viewer;
    try {
        viewer = new SurfaceViewer($('viewports'));
    } catch (error) {
        $('error-message').textContent = `No se pudo iniciar el visor WebGL: ${error.message}`;
        $('error-message').hidden = false;
        $('status').textContent = 'Abrí el TP en un navegador con WebGL habilitado.';
        $('editor').disabled = $('extraction').disabled = true;
        return;
    }

    function opcionesBolas() {
        $('ball').replaceChildren(...bolas.map((_, i) => new Option(`Metaball ${i + 1}`, i)));
        $('ball').value = seleccion;
        $('add-ball').disabled = bolas.length >= MAX_METABALLS;
        $('remove-ball').disabled = bolas.length <= 1;
        actualizarEditor();
    }
    function actualizarEditor() {
        ['x', 'y', 'z', 'radius'].forEach((id, eje) => {
            const valor = eje < 3 ? bolas[seleccion].centro[eje] : bolas[seleccion].radio;
            $(id).value = valor;
            $(`${id}-value`).textContent = valor.toFixed(2);
        });
    }
    function actualizarGrilla() {
        const n = Number($('resolution').value);
        $('grid-info').textContent = `${formato(n ** 3)} celdas · ${formato((n + 1) ** 3)} muestras`;
    }
    function invalidar() {
        vigente = false;
        $('download').disabled = true;
        $('error-message').hidden = true;
        $('mesh-badge').textContent = malla ? 'Desactualizada' : 'Marching Cubes';
        $('mesh-badge').classList.toggle('stale', Boolean(malla));
        $('status').textContent = 'Generá la malla para usar los parámetros actuales.';
        if (malla && !malla.caras.length) $('mesh-empty').textContent = 'Generá una nueva malla con los parámetros actuales.';
        viewer.setStale(true);
    }
    function actualizarCampo() {
        $('level-value').textContent = Number($('level').value).toFixed(2);
        viewer.setField(bolas, Number($('level').value));
        invalidar();
    }
    function cargarEscena() {
        bolas = ESCENAS[$('scene').value].map(b => ({ centro: b.centro.slice(), radio: b.radio }));
        seleccion = 0;
        $('level').value = 0.35;
        opcionesBolas();
        actualizarCampo();
    }
    async function generar() {
        if (ocupada) return;
        ocupada = true;
        vigente = false;
        $('download').disabled = true;
        $('editor').disabled = $('extraction').disabled = true;
        $('generate').textContent = 'Generando…';
        $('status').textContent = 'Muestreando el campo y recorriendo las celdas…';
        $('error-message').hidden = true;
        $('mesh-view').setAttribute('aria-busy', 'true');
        // Permitir que se pinte el estado antes del cálculo sincrónico.
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        try {
            const inicio = performance.now();
            const nivel = Number($('level').value), resolucion = Number($('resolution').value);
            const grilla = muestrearCampo(crearCampo(bolas), resolucion);
            const finMuestreo = performance.now();
            const resultado = marchingCubes(grilla, nivel);
            const finExtraccion = performance.now();
            validarMalla(resultado);
            viewer.setMesh(resultado);
            viewer.setStale(false);
            malla = resultado;
            parametros = { nivel, resolucion, bolas: bolas.map(b => ({ centro: b.centro.slice(), radio: b.radio })) };
            vigente = true;
            $('mesh-badge').classList.remove('stale');
            $('mesh-badge').textContent = `${resolucion}³ celdas`;
            $('mesh-info').textContent = `${formato(malla.vertices.length)} vértices · ${formato(malla.caras.length)} triángulos`;
            $('mesh-empty').hidden = malla.caras.length > 0;
            $('mesh-empty').textContent = 'No se encontraron triángulos. Probá bajar el nivel o aumentar la resolución.';
            $('timing').textContent = `Muestreo: ${(finMuestreo - inicio).toFixed(0)} ms · Marching Cubes: ${(finExtraccion - finMuestreo).toFixed(0)} ms`;
            $('status').textContent = !malla.caras.length ? 'Malla vacía: el nivel no cruza las muestras de la grilla.' :
                grilla.maxBorde >= nivel ? 'La superficie alcanza el borde del dominio: la malla puede quedar abierta.' :
                `Malla actualizada · ${formato(malla.celdasActivas)} celdas con cruces.`;
            $('download').disabled = malla.caras.length === 0;
        } catch (error) {
            vigente = false;
            viewer.setStale(true);
            $('mesh-badge').textContent = 'Error de extracción';
            $('mesh-badge').classList.add('stale');
            $('error-message').textContent = error.message;
            $('error-message').hidden = false;
            $('status').textContent = 'Revisá la implementación de ejercicio.js y volvé a generar.';
        } finally {
            ocupada = false;
            $('editor').disabled = $('extraction').disabled = false;
            $('generate').textContent = 'Generar malla';
            $('mesh-view').setAttribute('aria-busy', 'false');
        }
    }
    $('scene').addEventListener('change', cargarEscena);
    $('ball').addEventListener('change', () => { seleccion = Number($('ball').value); actualizarEditor(); });
    ['x', 'y', 'z', 'radius'].forEach((id, eje) => $(id).addEventListener('input', () => {
        const valor = Number($(id).value);
        if (eje < 3) bolas[seleccion].centro[eje] = valor;
        else bolas[seleccion].radio = valor;
        $(`${id}-value`).textContent = valor.toFixed(2);
        actualizarCampo();
    }));
    $('level').addEventListener('input', actualizarCampo);
    $('add-ball').addEventListener('click', () => {
        if (bolas.length >= MAX_METABALLS) return;
        bolas.push({ centro: [0, 0.5, 0], radio: 0.9 });
        seleccion = bolas.length - 1;
        opcionesBolas();
        actualizarCampo();
    });
    $('remove-ball').addEventListener('click', () => {
        if (bolas.length <= 1) return;
        bolas.splice(seleccion, 1);
        seleccion = Math.min(seleccion, bolas.length - 1);
        opcionesBolas();
        actualizarCampo();
    });
    $('resolution').addEventListener('change', () => { actualizarGrilla(); invalidar(); });
    $('generate').addEventListener('click', generar);
    $('download').addEventListener('click', () => {
        if (!vigente || !malla || !malla.caras.length) return;
        const descripcion = `Resolucion: ${parametros.resolucion}; nivel: ${parametros.nivel}\nDominio: [-2,2]^3\nMetaballs: ${JSON.stringify(parametros.bolas)}`;
        descargarOBJ(malla, descripcion, `metaballs-${parametros.resolucion}-${parametros.nivel.toFixed(2)}.obj`);
    });
    $('wireframe').addEventListener('change', () => viewer.setWireframe($('wireframe').checked));
    $('flat').addEventListener('change', () => viewer.setFlat($('flat').checked));
    $('box').addEventListener('change', () => viewer.setBox($('box').checked));
    $('reset-camera').addEventListener('click', () => viewer.resetCamera());
    cargarEscena();
    actualizarGrilla();
    generar();
})();
