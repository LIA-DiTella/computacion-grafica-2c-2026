/** Cámara y controles. Cada cambio del experimento inicia un promedio nuevo. */
(() => {
    const canvas = document.getElementById('vista');
    const error = document.getElementById('error');
    const estado = document.getElementById('estado');
    const muestreo = document.getElementById('muestreo');
    const rebotes = document.getElementById('rebotes');
    const pausar = document.getElementById('pausar');
    const recargar = document.getElementById('recargar');
    const muestras = document.getElementById('muestras');
    const fps = document.getElementById('fps');
    const gpu = document.getElementById('tiempo-gpu');
    let azimut = 0, elevacion = 0, distancia = 8;
    let visor, arrastre = null, pendiente = false, pausado = false;
    let inicio = null, frames = 0, sumaGPU = 0, muestrasGPU = 0;

    function camara() {
        const aspecto = canvas.clientWidth / Math.max(1, canvas.clientHeight);
        const d = distancia * Math.max(1, 1.05 / aspecto);
        const a = azimut * Math.PI / 180, e = elevacion * Math.PI / 180;
        const u = [Math.cos(a), 0, -Math.sin(a)];
        const v = [-Math.sin(a)*Math.sin(e), Math.cos(e), -Math.cos(a)*Math.sin(e)];
        const w = [Math.sin(a)*Math.cos(e), Math.sin(e), Math.cos(a)*Math.cos(e)];
        return {u, v, w, ojo: [d*w[0], 1.9+d*w[1], -0.4+d*w[2]]};
    }

    function reiniciarMedicion() {
        inicio = null; frames = 0; sumaGPU = 0; muestrasGPU = 0;
        fps.textContent = pausado ? 'Pausado' : '— FPS';
        gpu.textContent = visor && visor.temporizadorGPU ? 'GPU — ms' : 'GPU: no disponible';
    }

    function reiniciar() {
        if (visor) visor.reiniciar();
        muestras.textContent = '0 muestras/píxel';
        reiniciarMedicion();
        solicitarDibujo();
    }

    function mostrarError(mensaje) {
        error.hidden = false; error.textContent = mensaje;
    }

    function dibujar(tiempo) {
        pendiente = false;
        if (document.hidden || !visor || !visor.programa || visor.gl.isContextLost()) return;
        try {
            const ms = visor.dibujar(camara(), {rebotes: Number(rebotes.value), coseno: muestreo.value === 'coseno'}, !pausado);
            muestras.textContent = visor.muestras + (visor.muestras === 1 ? ' muestra/píxel' : ' muestras/píxel');
            if (ms !== null) { sumaGPU += ms; muestrasGPU++; }
            if (inicio === null) inicio = tiempo;
            else frames++;
            if (!pausado && tiempo - inicio >= 700) {
                fps.textContent = Math.round(1000 * frames / (tiempo - inicio)) + ' FPS';
                if (visor.temporizadorGPU && muestrasGPU) gpu.textContent = 'GPU ' + (sumaGPU / muestrasGPU).toFixed(2) + ' ms';
                inicio = tiempo; frames = 0; sumaGPU = 0; muestrasGPU = 0;
            }
            if (!pausado) solicitarDibujo();
        } catch (e) { mostrarError(e.message); }
    }

    function solicitarDibujo() {
        if (!pendiente && !document.hidden) { pendiente = true; requestAnimationFrame(dibujar); }
    }

    async function cargar() {
        if (!visor) return;
        recargar.disabled = true;
        estado.hidden = false; estado.textContent = 'Compilando shaders…';
        try {
            const shaders = await cargarShaders();
            visor.actualizar(shaders);
            error.hidden = true; estado.hidden = true;
            reiniciarMedicion();
            solicitarDibujo();
        } catch (e) {
            mostrarError(e.message);
            estado.textContent = visor.programa ? 'Se conserva el shader anterior' : 'No se pudo cargar el shader';
        } finally { recargar.disabled = false; }
    }

    pausar.addEventListener('click', () => {
        pausado = !pausado;
        pausar.textContent = pausado ? 'Continuar' : 'Pausar';
        pausar.setAttribute('aria-pressed', pausado ? 'true' : 'false');
        reiniciarMedicion();
        solicitarDibujo();
    });
    for (const control of [muestreo, rebotes]) control.addEventListener('change', reiniciar);
    document.getElementById('reiniciar').addEventListener('click', reiniciar);
    recargar.addEventListener('click', cargar);
    document.getElementById('restablecer').addEventListener('click', () => {
        azimut = 0; elevacion = 0; distancia = 8; reiniciar();
    });
    function girar(dx, dy) {
        azimut = Math.max(-15, Math.min(15, azimut + dx));
        elevacion = Math.max(-5, Math.min(10, elevacion + dy));
        reiniciar();
    }
    function acercar(factor) { distancia = Math.max(6, Math.min(12, distancia*factor)); reiniciar(); }
    canvas.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        arrastre = {x: e.clientX, y: e.clientY, id: e.pointerId};
        canvas.setPointerCapture(e.pointerId); canvas.focus();
    });
    canvas.addEventListener('pointermove', e => {
        if (!arrastre || arrastre.id !== e.pointerId) return;
        const dx = e.clientX-arrastre.x, dy = e.clientY-arrastre.y;
        if (dx || dy) girar(-dx*0.16, dy*0.16);
        arrastre.x = e.clientX; arrastre.y = e.clientY;
    });
    for (const nombre of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(nombre, () => { arrastre = null; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); acercar(Math.exp(e.deltaY*0.001)); }, {passive:false});
    canvas.addEventListener('keydown', e => {
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key)) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft') girar(-3,0);
        if (e.key === 'ArrowRight') girar(3,0);
        if (e.key === 'ArrowUp') girar(0,3);
        if (e.key === 'ArrowDown') girar(0,-3);
        if (e.key === '+' || e.key === '=') acercar(0.9);
        if (e.key === '-') acercar(1.1);
    });
    document.addEventListener('visibilitychange', () => { reiniciarMedicion(); solicitarDibujo(); });
    canvas.addEventListener('webglcontextlost', e => {
        e.preventDefault(); mostrarError('Se perdió el contexto WebGL. Recargá la página para continuar.');
        fps.textContent = '— FPS'; gpu.textContent = 'GPU — ms';
    });
    try {
        visor = new Visor(canvas);
        new ResizeObserver(() => { reiniciarMedicion(); solicitarDibujo(); }).observe(canvas);
        cargar();
    } catch (e) { mostrarError(e.message); estado.hidden = true; recargar.disabled = true; }
})();
