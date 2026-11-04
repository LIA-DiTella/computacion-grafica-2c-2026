/** Cámara orbital y controles del visor. */
(async () => {
    const canvas = document.getElementById('vista');
    const sombras = document.getElementById('sombras');
    const reflejos = document.getElementById('reflejos');
    const error = document.getElementById('error');
    const resolucion = document.getElementById('resolucion');
    const fps = document.getElementById('fps');
    const gpu = document.getElementById('tiempo-gpu');
    let azimut = 25, elevacion = 24, distancia = 8;
    let pendiente = false, arrastre = null, visor;
    let inicioFps = null, fotogramas = 0;
    let sumaGPU = 0, muestrasGPU = 0;

    // U apunta a la derecha, V hacia arriba y W desde el centro hacia el ojo.
    function camara() {
        const a = azimut * Math.PI / 180;
        const e = elevacion * Math.PI / 180;
        const u = [Math.cos(a), 0, -Math.sin(a)];
        const v = [-Math.sin(a)*Math.sin(e), Math.cos(e), -Math.cos(a)*Math.sin(e)];
        const w = [Math.sin(a)*Math.cos(e), Math.sin(e), Math.cos(a)*Math.cos(e)];
        const ojo = [distancia*w[0], 0.6+distancia*w[1], distancia*w[2]];
        return {ojo, u, v, w};
    }

    function mostrarError(mensaje) {
        error.textContent = mensaje;
        error.hidden = false;
        fps.textContent = '— FPS';
        gpu.textContent = 'GPU — ms';
    }

    function reiniciarMedicionGPU() {
        sumaGPU = 0;
        muestrasGPU = 0;
        if (!visor) return;
        visor.descartarConsultaGPU();
        gpu.textContent = visor.temporizadorGPU ? 'GPU — ms' : 'GPU: no disponible';
        if (!visor.temporizadorGPU) gpu.title = 'Este navegador no ofrece medición de tiempo GPU.';
    }

    function dibujar(tiempo) {
        pendiente = false;
        if (document.hidden || !visor || visor.gl.isContextLost()) return;
        try {
            const tiempoGPU = visor.dibujar(camara(), sombras.checked, reflejos.checked);
            if (tiempoGPU !== null) {
                sumaGPU += tiempoGPU;
                muestrasGPU++;
            }
            const dimensiones = canvas.width + ' × ' + canvas.height + ' píxeles';
            if (resolucion.textContent !== dimensiones) resolucion.textContent = dimensiones;

            // Promediamos los fotogramas de medio segundo para que el contador sea legible.
            if (inicioFps === null) inicioFps = tiempo;
            else fotogramas++;
            const transcurrido = tiempo - inicioFps;
            if (transcurrido >= 500) {
                fps.textContent = Math.round(1000 * fotogramas / transcurrido) + ' FPS';
                if (visor.temporizadorGPU) {
                    gpu.textContent = muestrasGPU > 0
                        ? 'GPU ' + (sumaGPU / muestrasGPU).toFixed(2) + ' ms'
                        : 'GPU — ms';
                }
                sumaGPU = 0;
                muestrasGPU = 0;
                inicioFps = tiempo;
                fotogramas = 0;
            }
            solicitarDibujo(); // Dibujamos continuamente para medir FPS también con la cámara quieta.
        } catch (e) { mostrarError(e.message); }
    }

    function solicitarDibujo() {
        if (!document.hidden && !pendiente) { pendiente = true; requestAnimationFrame(dibujar); }
    }

    document.addEventListener('visibilitychange', () => {
        inicioFps = null;
        fotogramas = 0;
        fps.textContent = '— FPS';
        reiniciarMedicionGPU();
        if (!document.hidden) solicitarDibujo();
    });

    function girar(dx, dy) {
        azimut = (azimut + dx) % 360;
        elevacion = Math.max(10, Math.min(70, elevacion + dy));
        solicitarDibujo();
    }

    function acercar(factor) {
        distancia = Math.max(5, Math.min(14, distancia * factor));
        solicitarDibujo();
    }

    for (const control of [sombras, reflejos]) {
        control.addEventListener('change', () => {
            reiniciarMedicionGPU(); // La próxima media corresponde al modo recién seleccionado.
            solicitarDibujo();
        });
    }
    document.getElementById('restablecer').addEventListener('click', () => {
        azimut = 25; elevacion = 24; distancia = 8;
        solicitarDibujo();
    });
    canvas.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        arrastre = {x: e.clientX, y: e.clientY, id: e.pointerId};
        canvas.setPointerCapture(e.pointerId);
        canvas.focus();
    });
    canvas.addEventListener('pointermove', e => {
        if (!arrastre || arrastre.id !== e.pointerId) return;
        girar(-(e.clientX-arrastre.x)*0.4, (e.clientY-arrastre.y)*0.4);
        arrastre.x = e.clientX; arrastre.y = e.clientY;
    });
    for (const evento of ['pointerup','pointercancel','lostpointercapture']) {
        canvas.addEventListener(evento, () => { arrastre = null; });
    }
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        acercar(Math.exp(e.deltaY * 0.001));
    }, {passive: false});
    canvas.addEventListener('keydown', e => {
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key)) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft') girar(-5, 0);
        if (e.key === 'ArrowRight') girar(5, 0);
        if (e.key === 'ArrowUp') girar(0, 5);
        if (e.key === 'ArrowDown') girar(0, -5);
        if (e.key === '+' || e.key === '=') acercar(1/1.1);
        if (e.key === '-') acercar(1.1);
    });
    canvas.addEventListener('webglcontextlost', e => {
        e.preventDefault();
        mostrarError('Se perdió el contexto WebGL. Recargá la página para continuar.');
    });

    try {
        const shaders = await cargarShaders();
        visor = new Visor(canvas, shaders);
        reiniciarMedicionGPU();
        new ResizeObserver(() => {
            reiniciarMedicionGPU();
            solicitarDibujo();
        }).observe(canvas);
        solicitarDibujo();
    } catch (e) { mostrarError(e.message); }
})();
