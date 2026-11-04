/** WebGL dibuja un rectángulo; el fragment shader calcula toda la escena. */
async function cargarShaders() {
    // Conservamos la plantilla original ejercicio-alumno.js, sin modificarla.
    if (typeof archivosShaders === 'undefined') {
        return {vertex: vertexShader, fragment: fragmentShader + escenaGLSL};
    }
    if (location.protocol === 'file:') {
        throw new Error('Para cargar los shaders, abrí esta página desde un servidor local (por ejemplo, Live Server).');
    }
    async function leer(archivo) {
        const respuesta = await fetch(archivo, {cache: 'no-store'});
        if (!respuesta.ok) throw new Error('No se pudo cargar ' + archivo + ' (HTTP ' + respuesta.status + ').');
        return respuesta.text();
    }
    const [vertex, fragment] = await Promise.all([
        leer(archivosShaders.vertex), leer(archivosShaders.fragment)
    ]);
    return {vertex, fragment};
}

function compilarShader(gl, tipo, codigo) {
    const shader = gl.createShader(tipo);
    gl.shaderSource(shader, codigo);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const mensaje = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(mensaje);
    }
    return shader;
}

class Visor {
    constructor(canvas, shaders) {
        this.canvas = canvas;
        const gl = canvas.getContext('webgl', {antialias: false, alpha: false, preserveDrawingBuffer: true});
        if (!gl) throw new Error('No se pudo iniciar WebGL en este navegador.');
        this.gl = gl;

        const vertex = compilarShader(gl, gl.VERTEX_SHADER, shaders.vertex);
        const fragment = compilarShader(gl, gl.FRAGMENT_SHADER, shaders.fragment);
        this.programa = gl.createProgram();
        gl.attachShader(this.programa, vertex);
        gl.attachShader(this.programa, fragment);
        gl.linkProgram(this.programa);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        if (!gl.getProgramParameter(this.programa, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(this.programa));
        }
        gl.useProgram(this.programa);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        // Las cuatro esquinas del canvas en el volumen canónico, en el orden del TRIANGLE_STRIP.
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        const posicion = gl.getAttribLocation(this.programa, 'aPosicion');
        gl.enableVertexAttribArray(posicion);
        gl.vertexAttribPointer(posicion, 2, gl.FLOAT, false, 0, 0);

        this.uniformes = {};
        for (const nombre of ['uResolucion','uOjo','uEjeU','uEjeV','uEjeW','uSemialto','uPosLuz','uSombras','uReflejos']) {
            this.uniformes[nombre] = gl.getUniformLocation(this.programa, nombre);
        }
        const fov = 45 * Math.PI / 180;
        gl.uniform1f(this.uniformes.uSemialto, Math.tan(fov / 2));
        gl.uniform3f(this.uniformes.uPosLuz, -3.0, 5.0, 4.0);

        // El reloj de la GPU mide el dibujo; el reloj de JavaScript solo mide el envío de comandos.
        this.temporizadorGPU = gl.getExtension('EXT_disjoint_timer_query');
        const ext = this.temporizadorGPU;
        if (ext && ext.getQueryEXT(ext.TIME_ELAPSED_EXT, ext.QUERY_COUNTER_BITS_EXT) === 0) {
            this.temporizadorGPU = null;
        }
        this.consultaGPU = null;
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
        // Un cambio en el reloj de la GPU puede invalidar la medición pendiente.
        if (this.gl.getParameter(ext.GPU_DISJOINT_EXT)) {
            this.descartarConsultaGPU();
            return null;
        }
        if (!this.consultaGPU) return null;
        // Consultamos en fotogramas posteriores, sin esperar ni detener el render.
        if (!ext.getQueryObjectEXT(this.consultaGPU, ext.QUERY_RESULT_AVAILABLE_EXT)) return null;
        const nanosegundos = ext.getQueryObjectEXT(this.consultaGPU, ext.QUERY_RESULT_EXT);
        this.descartarConsultaGPU();
        const milisegundos = nanosegundos / 1000000;
        if (!Number.isFinite(milisegundos) || milisegundos < 0) return null;
        return milisegundos;
    }

    dibujar(camara, sombras, reflejos) {
        const gl = this.gl;
        // La resolución del dibujo acompaña al tamaño visible del canvas.
        const width = Math.max(1, this.canvas.clientWidth);
        const height = Math.max(1, this.canvas.clientHeight);
        if (this.canvas.width !== width) this.canvas.width = width;
        if (this.canvas.height !== height) this.canvas.height = height;
        gl.viewport(0, 0, width, height);
        gl.useProgram(this.programa);
        gl.uniform2f(this.uniformes.uResolucion, width, height);
        gl.uniform3fv(this.uniformes.uOjo, camara.ojo);
        gl.uniform3fv(this.uniformes.uEjeU, camara.u);
        gl.uniform3fv(this.uniformes.uEjeV, camara.v);
        gl.uniform3fv(this.uniformes.uEjeW, camara.w);
        gl.uniform1i(this.uniformes.uSombras, sombras);
        gl.uniform1i(this.uniformes.uReflejos, reflejos);

        const tiempoGPU = this.leerTiempoGPU();
        const ext = this.temporizadorGPU;
        // Mantenemos una sola consulta pendiente para no acumular mediciones.
        const medir = ext && !this.consultaGPU;
        if (medir) {
            this.consultaGPU = ext.createQueryEXT();
            ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, this.consultaGPU);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (medir) ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
        return tiempoGPU;
    }
}
