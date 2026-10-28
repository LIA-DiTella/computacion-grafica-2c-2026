/** Vista auxiliar basada en el frustum de tp3.0/world-view.js. */
function esquinasFrustum(eye,fov,aspect,cerca,lejos) {
    const adelante = Vec.normalize(Vec.scale(eye,-1));
    const derecha = Vec.normalize(Vec.cross(adelante,[0,1,0]));
    const arriba = Vec.cross(derecha,adelante);
    const esquinas = [];
    for (const distancia of [cerca,lejos]) {
        const centro = Vec.add(eye,Vec.scale(adelante,distancia));
        const alto = Math.tan(fov/2)*distancia;
        const ancho = alto*aspect;
        for (const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
            esquinas.push(Vec.add(centro,Vec.add(Vec.scale(derecha,x*ancho),Vec.scale(arriba,y*alto))));
        }
    }
    return esquinas;
}

class Minimapa {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.min = [-0.9,-0.9,-0.9];
        this.max = [0.9,0.9,0.9];
        // Observador fijo: el mundo permanece quieto al orbitar la cámara principal.
        this.vista = lookAt([10,7,-10],[0,0,0],[0,1,0]);
    }
    cargar(malla) {
        this.min = [Infinity,Infinity,Infinity];
        this.max = [-Infinity,-Infinity,-Infinity];
        for (let i=0; i<malla.posiciones.length; i+=3) for (let d=0; d<3; d++) {
            this.min[d] = Math.min(this.min[d],malla.posiciones[i+d]);
            this.max[d] = Math.max(this.max[d],malla.posiciones[i+d]);
        }
    }
    dibujar(config,aspect) {
        const ctx = this.ctx;
        const ancho = this.canvas.clientWidth, alto = this.canvas.clientHeight;
        if (!ctx || !ancho || !alto) return;
        const dpr = Math.min(window.devicePixelRatio || 1,2);
        const w = Math.round(ancho*dpr), h = Math.round(alto*dpr);
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w; this.canvas.height = h;
        }
        ctx.setTransform(dpr,0,0,dpr,0,0);
        ctx.clearRect(0,0,ancho,alto);

        const eye = posicionCamara(config);
        const luz = direccionAngular(config.luzAzimut,config.luzElevacion);
        // El extremo es un indicador de dirección, no una posición de la fuente.
        const indicadorLuz = Vec.scale(luz,3.3);
        const adelante = Vec.normalize(Vec.scale(eye,-1));
        const corte = Math.min(PROYECCION.lejos,config.distancia+1.2);
        const esquinas = esquinasFrustum(eye,PROYECCION.fov,aspect,PROYECCION.cerca,corte);
        const caja = [];
        for (const [x,y,z] of [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]]) {
            caja.push([x ? this.max[0] : this.min[0],(y ? this.max[1] : this.min[1])*config.escalaY,z ? this.max[2] : this.min[2]]);
        }

        // Proyección ortográfica independiente de la cámara que estudia el TP.
        const proyectados = [...esquinas,...caja,eye,indicadorLuz,[-3,-1.5,-3],[3,-1.5,3],[-3,-1.5,3],[3,-1.5,-3]]
            .map(p => mat4Vec4(this.vista,[...p,1]));
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for (const p of proyectados) {
            minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);
            minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);
        }
        const escala = Math.min((ancho-48)/(maxX-minX),(alto-42)/(maxY-minY));
        const centroX = (minX+maxX)/2, centroY = (minY+maxY)/2;
        const pantalla = p => {
            const q = mat4Vec4(this.vista,[...p,1]);
            return [ancho/2+(q[0]-centroX)*escala,alto/2-(q[1]-centroY)*escala];
        };
        function linea(a,b,color,grosor=1,guiones=[]) {
            const p=pantalla(a), q=pantalla(b);
            ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);
            ctx.strokeStyle=color;ctx.lineWidth=grosor;ctx.setLineDash(guiones);ctx.stroke();ctx.setLineDash([]);
        }
        function poligono(puntos,color) {
            ctx.beginPath();
            puntos.forEach((p,i) => { const q=pantalla(p); if (i===0) ctx.moveTo(...q); else ctx.lineTo(...q); });
            ctx.closePath();ctx.fillStyle=color;ctx.fill();
        }
        function punto(p,color,radio) {
            const q=pantalla(p);ctx.beginPath();ctx.arc(q[0],q[1],radio,0,2*Math.PI);
            ctx.fillStyle=color;ctx.fill();
        }
        function texto(p,t,color,dx=7,dy=-7) {
            const q=pantalla(p);ctx.font='11px Arial';ctx.fillStyle=color;
            const x=Math.max(4,Math.min(ancho-ctx.measureText(t).width-4,q[0]+dx));
            const y=Math.max(13,Math.min(alto-5,q[1]+dy));
            ctx.fillText(t,x,y);
        }
        function flecha(a,b,color,grosor=1.5) {
            linea(a,b,color,grosor);
            const p=pantalla(a),q=pantalla(b),angulo=Math.atan2(q[1]-p[1],q[0]-p[0]);
            if (Math.hypot(q[0]-p[0],q[1]-p[1]) < 4) return;
            ctx.beginPath();ctx.moveTo(...q);
            ctx.lineTo(q[0]-6*Math.cos(angulo-0.45),q[1]-6*Math.sin(angulo-0.45));
            ctx.lineTo(q[0]-6*Math.cos(angulo+0.45),q[1]-6*Math.sin(angulo+0.45));
            ctx.closePath();ctx.fillStyle=color;ctx.fill();
        }

        for (let i=-3; i<=3; i++) {
            linea([i,-1.5,-3],[i,-1.5,3],'#e1e7eb');
            linea([-3,-1.5,i],[3,-1.5,i],'#e1e7eb');
        }
        // Caras del frustum; el contorno lejano punteado indica el corte del dibujo.
        for (let i=0; i<4; i++) {
            const j=(i+1)%4;
            poligono([esquinas[i],esquinas[j],esquinas[j+4],esquinas[i+4]],'rgba(61,125,176,0.045)');
            linea(esquinas[i],esquinas[j],'#528ab5');
            linea(esquinas[i],esquinas[i+4],'#528ab5');
            linea(esquinas[i+4],esquinas[j+4],'#528ab5',1,[3,3]);
        }
        linea(eye,[eye[0],-1.5,eye[2]],'#b4c7d5',1,[2,3]);
        linea(eye,[0,0,0],'#528ab5',1,[3,4]);

        for (const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]) {
            linea(caja[a],caja[b],'#747e87',1.2);
        }
        punto([0,0,0],'#53616c',2.5);
        for (const [eje,letra,color] of [[[1.6,0,0],'X','#a66868'],[[0,1.9,0],'Y','#5b8d76'],[[0,0,1.6],'Z','#7183a5']]) {
            flecha([0,0,0],eje,color,1);
            texto(eje,letra,color,3,-3);
        }

        // L apunta hacia la luz. Dos rayos paralelos muestran el sentido de llegada.
        const lateral = Vec.normalize(Vec.cross(luz,[0,1,0]));
        for (const signo of [-1,1]) {
            const offset=Vec.scale(lateral,signo*0.4);
            flecha(Vec.add(Vec.scale(luz,2.9),offset),Vec.add(Vec.scale(luz,1.8),offset),'#d1a35d',1);
        }
        flecha([0,0,0],indicadorLuz,'#b18032',2);
        punto(indicadorLuz,'#e2b769',5);
        texto(indicadorLuz,'L','#946b2c',8,-8);

        flecha(eye,Vec.add(eye,Vec.scale(adelante,0.65)),'#367caf',2);
        punto(eye,'#367caf',5);
        texto(eye,'Cámara','#326e99',8,15);
    }
}
