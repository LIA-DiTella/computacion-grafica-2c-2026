/** WebGL provisto: compilar shaders, cargar buffers y dibujar. */
function crearPrograma(gl,fuentes) {
    const shaders = [];
    const programa = gl.createProgram();
    try {
        for (const [tipo,codigo,nombre] of [[gl.VERTEX_SHADER,fuentes.vertex,'vértices'],[gl.FRAGMENT_SHADER,fuentes.fragment,'fragmentos']]) {
            const shader = gl.createShader(tipo);
            shaders.push(shader);
            gl.shaderSource(shader,codigo);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
                throw new Error('Error en el shader de '+nombre+':\n'+gl.getShaderInfoLog(shader));
            }
            gl.attachShader(programa,shader);
        }
        gl.linkProgram(programa);
        if (!gl.getProgramParameter(programa,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programa));
        return programa;
    } catch (error) {
        gl.deleteProgram(programa);
        throw error;
    } finally {
        shaders.forEach(shader => gl.deleteShader(shader));
    }
}

class Visor {
    constructor(canvas) {
        this.canvas = canvas;
        const gl = canvas.getContext('webgl',{antialias:true,preserveDrawingBuffer:true,alpha:false});
        if (!gl) throw new Error('Este navegador no pudo iniciar WebGL. Probá habilitar la aceleración gráfica.');
        this.gl = gl;
        const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision > 0;
        this.programa = crearPrograma(gl,fuentesShaders(highp ? 'highp' : 'mediump'));
        this.atributos = {};
        this.buffers = {};
        for (const nombre of ['aPosicion','aNormal']) {
            this.atributos[nombre] = gl.getAttribLocation(this.programa,nombre);
            this.buffers[nombre] = gl.createBuffer();
        }
        this.uniformes = {};
        for (const nombre of ['uMV','uMVP','uNormal','uLuz','uI','uIa','uKa','uKd','uKs','uAlpha','uGouraud']) {
            this.uniformes[nombre] = gl.getUniformLocation(this.programa,nombre);
        }
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.clearColor(0.07,0.09,0.12,1);
        // Se muestran ambos lados: permite inspeccionar también OBJ abiertos.
        gl.disable(gl.CULL_FACE);
    }
    cargar(malla,porCara=false) {
        const gl = this.gl;
        for (const [nombre,datos] of [['aPosicion',malla.posiciones],['aNormal',porCara ? malla.normalesCaras : malla.normales]]) {
            gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[nombre]);
            gl.bufferData(gl.ARRAY_BUFFER,datos,gl.STATIC_DRAW);
        }
        this.cantidad = malla.posiciones.length/3;
    }
    dibujar(u,gouraud=false) {
        const gl = this.gl;
        gl.viewport(0,0,this.canvas.width,this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.programa);
        gl.uniformMatrix4fv(this.uniformes.uMV,false,u.mv);
        gl.uniformMatrix4fv(this.uniformes.uMVP,false,u.mvp);
        gl.uniformMatrix3fv(this.uniformes.uNormal,false,u.normal);
        for (const [nombre,valor] of [['uLuz',u.luz],['uI',u.intensidad],['uIa',u.ambiente],['uKa',u.ka],['uKd',u.kd],['uKs',u.ks]]) {
            gl.uniform3fv(this.uniformes[nombre],valor);
        }
        gl.uniform1f(this.uniformes.uAlpha,u.brillo);
        gl.uniform1i(this.uniformes.uGouraud,gouraud ? 1 : 0);
        for (const nombre of ['aPosicion','aNormal']) {
            const indice = this.atributos[nombre];
            if (indice < 0) continue;
            gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[nombre]);
            gl.enableVertexAttribArray(indice);
            gl.vertexAttribPointer(indice,3,gl.FLOAT,false,0,0);
        }
        gl.drawArrays(gl.TRIANGLES,0,this.cantidad || 0);
    }
    ajustarTamano() {
        const pixelRatio = Math.min(window.devicePixelRatio || 1,2);
        this.canvas.width = Math.max(1,Math.round(this.canvas.clientWidth*pixelRatio));
        this.canvas.height = Math.max(1,Math.round(this.canvas.clientHeight*pixelRatio));
    }
}
