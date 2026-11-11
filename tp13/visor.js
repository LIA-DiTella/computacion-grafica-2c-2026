/** Acumulación progresiva en dos texturas flotantes: una se lee y la otra se escribe. */
async function cargarShaders() {
    if (location.protocol === 'file:') throw new Error('Abrí index.html desde un servidor local, como Live Server, para cargar los archivos GLSL.');
    async function leer(ruta) {
        const respuesta = await fetch(ruta, {cache: 'no-store'});
        if (!respuesta.ok) throw new Error('No se pudo cargar ' + ruta + ' (HTTP ' + respuesta.status + ').');
        return respuesta.text();
    }
    let fragment = archivosShaders.fragment;
    if (new URLSearchParams(location.search).has('alumno')) fragment = 'shaders/ejercicio-alumno.frag';
    const fuentes = await Promise.all([leer(archivosShaders.vertex), leer(fragment), leer(archivosShaders.mostrar)]);
    return {vertex: fuentes[0], fragment: fuentes[1], mostrar: fuentes[2]};
}

function crearPrograma(gl, vertex, fragment) {
    const shaders = [];
    const programa = gl.createProgram();
    try {
        for (const [tipo, codigo] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
            const shader = gl.createShader(tipo);
            shaders.push(shader);
            gl.shaderSource(shader, codigo);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
            gl.attachShader(programa, shader);
        }
        gl.bindAttribLocation(programa, 0, 'aPosicion');
        gl.linkProgram(programa);
        if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programa));
        return programa;
    } catch (error) {
        gl.deleteProgram(programa);
        throw error;
    } finally {
        for (const shader of shaders) gl.deleteShader(shader);
    }
}

class Visor {
    constructor(canvas) {
        this.canvas = canvas;
        const gl = canvas.getContext('webgl', {alpha: false, antialias: false, preserveDrawingBuffer: true});
        if (!gl) throw new Error('No se pudo iniciar WebGL.');
        this.gl = gl;
        if (!gl.getExtension('OES_texture_float')) throw new Error('Este navegador necesita soporte de texturas flotantes para acumular radiancia.');
        gl.getExtension('WEBGL_color_buffer_float');
        this.programa = null;
        this.programaMostrar = null;
        this.destinos = [];
        this.actual = 0;
        this.muestras = 0;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        this.temporizadorGPU = gl.getExtension('EXT_disjoint_timer_query');
        const ext = this.temporizadorGPU;
        if (ext && ext.getQueryEXT(ext.TIME_ELAPSED_EXT, ext.QUERY_COUNTER_BITS_EXT) === 0) this.temporizadorGPU = null;
        this.consultaGPU = null;
    }

    actualizar(shaders) {
        const gl = this.gl;
        let camino, mostrar;
        try {
            camino = crearPrograma(gl, shaders.vertex, shaders.fragment);
            mostrar = crearPrograma(gl, shaders.vertex, shaders.mostrar);
        } catch (error) {
            if (camino) gl.deleteProgram(camino);
            throw error;
        }
        if (this.programa) gl.deleteProgram(this.programa);
        if (this.programaMostrar) gl.deleteProgram(this.programaMostrar);
        this.programa = camino;
        this.programaMostrar = mostrar;
        this.uniformes = {};
        for (const nombre of ['uResolucion','uOjo','uEjeU','uEjeV','uEjeW','uSemialto','uAnterior','uMuestras','uRebotes','uCoseno']) {
            this.uniformes[nombre] = gl.getUniformLocation(camino, nombre);
        }
        this.uImagen = gl.getUniformLocation(mostrar, 'uImagen');
        this.uResolucionMostrar = gl.getUniformLocation(mostrar, 'uResolucion');
        this.reiniciar();
    }

    crearDestino(ancho, alto) {
        const gl = this.gl;
        const textura = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textura);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ancho, alto, 0, gl.RGBA, gl.FLOAT, null);
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textura, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteTexture(textura); gl.deleteFramebuffer(framebuffer);
            throw new Error('La GPU no permite dibujar sobre texturas RGBA de punto flotante. Probá otro navegador con aceleración gráfica.');
        }
        return {textura, framebuffer};
    }

    redimensionar() {
        const gl = this.gl;
        const ancho = Math.max(1, Math.round(this.canvas.clientWidth));
        const alto = Math.max(1, Math.round(this.canvas.clientHeight));
        if (this.destinos.length && this.canvas.width === ancho && this.canvas.height === alto) return;
        const nuevos = [];
        try {
            nuevos.push(this.crearDestino(ancho, alto));
            nuevos.push(this.crearDestino(ancho, alto));
        } catch (error) {
            for (const destino of nuevos) { gl.deleteTexture(destino.textura); gl.deleteFramebuffer(destino.framebuffer); }
            throw error;
        }
        for (const destino of this.destinos) { gl.deleteTexture(destino.textura); gl.deleteFramebuffer(destino.framebuffer); }
        this.destinos = nuevos;
        this.canvas.width = ancho; this.canvas.height = alto;
        this.reiniciar();
    }

    reiniciar() {
        this.muestras = 0;
        this.actual = 0;
        this.descartarConsultaGPU();
        const gl = this.gl;
        gl.clearColor(0, 0, 0, 1);
        for (const destino of this.destinos) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, destino.framebuffer);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    descartarConsultaGPU() {
        if (this.consultaGPU) {
            this.temporizadorGPU.deleteQueryEXT(this.consultaGPU);
            this.consultaGPU = null;
        }
    }

    leerTiempoGPU() {
        const ext = this.temporizadorGPU;
        if (!ext) return null;
        if (this.gl.getParameter(ext.GPU_DISJOINT_EXT)) { this.descartarConsultaGPU(); return null; }
        if (!this.consultaGPU || !ext.getQueryObjectEXT(this.consultaGPU, ext.QUERY_RESULT_AVAILABLE_EXT)) return null;
        const ns = ext.getQueryObjectEXT(this.consultaGPU, ext.QUERY_RESULT_EXT);
        this.descartarConsultaGPU();
        return Number.isFinite(ns) && ns >= 0 ? ns / 1000000 : null;
    }

    dibujar(camara, opciones, avanzar) {
        if (!this.programa) return null;
        this.redimensionar();
        const gl = this.gl;
        const ancho = this.canvas.width, alto = this.canvas.height;
        gl.viewport(0, 0, ancho, alto);
        gl.activeTexture(gl.TEXTURE0);
        const tiempo = this.leerTiempoGPU();
        const ext = this.temporizadorGPU;
        const medir = ext && !this.consultaGPU;
        if (medir) {
            this.consultaGPU = ext.createQueryEXT();
            ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, this.consultaGPU);
        }
        // Incluso en pausa, un cambio de cámara o tamaño requiere una primera muestra nueva.
        if (avanzar || this.muestras === 0) {
            const siguiente = 1 - this.actual;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.destinos[siguiente].framebuffer);
            gl.useProgram(this.programa);
            gl.bindTexture(gl.TEXTURE_2D, this.destinos[this.actual].textura);
            const u = this.uniformes;
            gl.uniform1i(u.uAnterior, 0);
            gl.uniform1f(u.uMuestras, this.muestras);
            gl.uniform2f(u.uResolucion, ancho, alto);
            gl.uniform3fv(u.uOjo, camara.ojo);
            gl.uniform3fv(u.uEjeU, camara.u);
            gl.uniform3fv(u.uEjeV, camara.v);
            gl.uniform3fv(u.uEjeW, camara.w);
            gl.uniform1f(u.uSemialto, Math.tan(40 * Math.PI / 360));
            gl.uniform1i(u.uRebotes, opciones.rebotes);
            gl.uniform1i(u.uCoseno, opciones.coseno);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            this.actual = siguiente;
            this.muestras++;
        }
        // Mostramos el promedio. Gamma y exposición ocurren en este segundo pase.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(this.programaMostrar);
        gl.bindTexture(gl.TEXTURE_2D, this.destinos[this.actual].textura);
        gl.uniform1i(this.uImagen, 0);
        gl.uniform2f(this.uResolucionMostrar, ancho, alto);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (medir) ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
        return tiempo;
    }
}
