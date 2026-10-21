/** Controles y cámaras sincronizadas. No forman parte del ejercicio. */
(() => {
    const $ = id => document.getElementById(id);
    const numero = id => Number($(id).value);
    const visores = [];
    let malla, objCargado = null, nombreOBJ = '', pendiente = false;
    let camara = {azimut:25,elevacion:15,distancia:3.4};
    let carga = 0;
    const minimapa = new Minimapa($('minimapa'));
    const iniciales = {};
    document.querySelectorAll('aside input, aside select').forEach(input => {
        if (input.type !== 'file') iniciales[input.id] = {value:input.value,checked:input.checked};
    });

    function error(mensaje) { $('error').textContent = mensaje; $('error').hidden = !mensaje; }
    function configuracion() {
        const hex = $('color').value;
        const color = [1,3,5].map(i => parseInt(hex.substring(i,i+2),16)/255);
        return {...camara,color,escalaY:numero('escalaY'),luzAzimut:numero('luzAzimut'),luzElevacion:numero('luzElevacion'),
            intensidad:numero('intensidad'),ambiente:numero('ambiente'),brillo:numero('brillo'),
            ka:$('usar-ambiente').checked ? numero('ka') : 0,
            kd:$('usar-difusa').checked ? numero('kd') : 0,
            ks:$('usar-especular').checked ? numero('ks') : 0};
    }
    function actualizarEtiquetas() {
        for (const id of ['escalaY','ka','kd','ks','brillo','luzAzimut','luzElevacion','intensidad','ambiente']) {
            const angular = id === 'luzAzimut' || id === 'luzElevacion';
            $(id+'-valor').textContent = angular ? numero(id)+'°' : id === 'brillo' ? $(id).value : numero(id).toFixed(2);
        }
        ['ambiente','difusa','especular'].forEach((nombre,i) => {
            const activo = $('usar-'+nombre).checked;
            $(['ka','kd','ks'][i]).disabled = !activo;
        });
        $('detalle').disabled = $('modelo').value === 'cubo' || $('modelo').value === 'obj';
    }
    function dibujar() {
        pendiente = false;
        actualizarEtiquetas();
        const config = configuracion();
        const aspect = $('phong').clientWidth / Math.max(1,$('phong').clientHeight);
        minimapa.dibujar(config,aspect);
        if (!malla || visores.length !== 2) return;
        try {
            visores.forEach((visor,i) => {
                visor.dibujar(prepararUniformes(config,visor.canvas.width/visor.canvas.height),i === 0);
            });
            $('estado').textContent = malla.triangulos.toLocaleString('es-AR')+' triángulos · WebGL';
        } catch (e) { error(e.message); }
    }
    function solicitarDibujo() {
        if (!pendiente) { pendiente = true; requestAnimationFrame(dibujar); }
    }
    function cargarModelo() {
        const tipo = $('modelo').value;
        const nueva = tipo === 'obj' ? objCargado : crearModelo(tipo,numero('detalle'));
        if (!nueva) return;
        for (const visor of visores) visor.cargar(nueva,$('caras').checked);
        minimapa.cargar(nueva);
        malla = nueva;
        $('modelo-info').textContent = (tipo === 'obj' ? nombreOBJ+' · ' : '')+malla.triangulos.toLocaleString('es-AR')+' triángulos';
        solicitarDibujo();
    }
    function vistaInicial() {
        camara = {azimut:25,elevacion:15,distancia:3.4};
        solicitarDibujo();
    }
    function orbitar(dx,dy) {
        camara.azimut = ((camara.azimut+dx+180)%360+360)%360-180;
        camara.elevacion = Math.max(-85,Math.min(85,camara.elevacion+dy));
        solicitarDibujo();
    }
    function zoom(factor) {
        camara.distancia = Math.max(2.2,Math.min(7,camara.distancia*factor));
        solicitarDibujo();
    }
    function conectarCamara(canvas) {
        let arrastre = null;
        canvas.addEventListener('pointerdown',e => {
            if (e.button !== 0) return;
            arrastre = {x:e.clientX,y:e.clientY,id:e.pointerId};
            canvas.setPointerCapture(e.pointerId);
            canvas.focus();
        });
        canvas.addEventListener('pointermove',e => {
            if (!arrastre || e.pointerId !== arrastre.id) return;
            orbitar(-(e.clientX-arrastre.x)*0.4,(e.clientY-arrastre.y)*0.4);
            arrastre.x=e.clientX; arrastre.y=e.clientY;
        });
        for (const tipo of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(tipo,() => { arrastre=null; });
        canvas.addEventListener('wheel',e => { e.preventDefault(); zoom(Math.exp(e.deltaY*0.001)); },{passive:false});
        canvas.addEventListener('keydown',e => {
            const movimientos = {ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,5],ArrowDown:[0,-5]};
            if (movimientos[e.key]) { e.preventDefault(); orbitar(...movimientos[e.key]); }
            if (['+','=','-'].includes(e.key)) { e.preventDefault(); zoom(e.key === '-' ? 1.1 : 1/1.1); }
        });
    }

    try {
        for (const id of ['gouraud','phong']) {
            const canvas = $(id);
            const visor = new Visor(canvas);
            visores.push(visor);
            conectarCamara(canvas);
            canvas.addEventListener('webglcontextlost',e => { e.preventDefault(); error('Se perdió el contexto gráfico. Recargá la página para continuar.'); });
        }
        const ajustar = () => { visores.forEach(visor => visor.ajustarTamano()); solicitarDibujo(); };
        const cambiosTamano = new ResizeObserver(ajustar);
        cambiosTamano.observe(document.querySelector('.vistas'));
        cambiosTamano.observe($('minimapa'));
        ajustar();
        cargarModelo();
    } catch (e) {
        error(e.message);
        $('estado').textContent = 'Revisá los shaders en ejercicio.js';
    }

    document.querySelectorAll('aside input, aside select').forEach(input => {
        if (input.type === 'file') return;
        input.addEventListener('input',() => {
            if (['modelo','detalle','caras'].includes(input.id)) cargarModelo();
            else solicitarDibujo();
        });
    });
    $('archivo').addEventListener('change',async () => {
        const archivo = $('archivo').files[0];
        if (!archivo) return;
        const id = ++carga;
        try {
            if (archivo.size > 10*1024*1024) throw new Error('Usá un archivo OBJ de hasta 10 MB.');
            const texto = await archivo.text();
            if (id !== carga) return;
            const nueva = leerOBJ(texto);
            objCargado = nueva; nombreOBJ = archivo.name;
            $('modelo').querySelector('[value=obj]').hidden = false;
            $('modelo').value = 'obj';
            error('');
            cargarModelo();
        } catch (e) { if (id === carga) error(e.message); }
        $('archivo').value = '';
    });
    $('vista-inicial').addEventListener('click',vistaInicial);
    $('restablecer').addEventListener('click',() => {
        carga++;
        for (const [id,estado] of Object.entries(iniciales)) { $(id).value=estado.value; $(id).checked=estado.checked; }
        error(''); vistaInicial(); cargarModelo();
    });
})();
