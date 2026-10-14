/** Visor provisto. La vista implícita NO usa marchingCubes ni una malla oculta. */
const IMPLICIT_VERTEX = `
    varying vec2 pantalla;
    void main() {
        pantalla = position.xy;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;
const IMPLICIT_FRAGMENT = `
    precision highp float;
    varying vec2 pantalla;
    uniform mat4 inversaProyeccion;
    uniform mat4 camaraMundo;
    uniform vec3 ojo;
    uniform vec4 bolas[8];
    uniform int cantidad;
    uniform float nivel;
    uniform vec3 minimo;
    uniform vec3 maximo;

    float campo(vec3 p) {
        float suma = 0.0;
        for (int i = 0; i < 8; i++) {
            if (i >= cantidad) break;
            vec3 d = p - bolas[i].xyz;
            float q = max(0.0, 1.0 - dot(d,d) / (bolas[i].w * bolas[i].w));
            suma += q*q*q;
        }
        return suma;
    }
    vec3 normalExterior(vec3 p) {
        vec3 n = vec3(0.0);
        for (int i = 0; i < 8; i++) {
            if (i >= cantidad) break;
            vec3 d = p - bolas[i].xyz;
            float r2 = bolas[i].w * bolas[i].w;
            float q = max(0.0, 1.0 - dot(d,d) / r2);
            n += 6.0*q*q*d / r2; // -gradiente: hacia valores menores.
        }
        return n / max(length(n), 0.000001);
    }
    void main() {
        vec3 fondo = vec3(0.9333, 0.9451, 0.9451);
        gl_FragColor = vec4(fondo, 1.0);
        vec4 r = inversaProyeccion * vec4(pantalla, 1.0, 1.0);
        vec3 dir = normalize((camaraMundo * vec4(r.xyz / r.w, 0.0)).xyz);
        vec3 segura = vec3(
            abs(dir.x) < 0.000001 ? 0.000001 : dir.x,
            abs(dir.y) < 0.000001 ? 0.000001 : dir.y,
            abs(dir.z) < 0.000001 ? 0.000001 : dir.z
        );
        vec3 a = (minimo - ojo) / segura;
        vec3 b = (maximo - ojo) / segura;
        vec3 entrada = min(a, b), salida = max(a, b);
        float inicio = max(max(entrada.x, entrada.y), max(entrada.z, 0.0));
        float fin = min(min(salida.x, salida.y), salida.z);
        if (fin <= inicio) return;

        // Visualizar el campo con pasos fijos, detección de cambio de signo
        // y bisección, independientemente de la malla generada en ejercicio.js.
        float paso = (fin - inicio) / 384.0;
        float anteriorT = inicio;
        float anterior = campo(ojo + dir * anteriorT) - nivel;
        for (int s = 1; s <= 384; s++) {
            float t = inicio + float(s) * paso;
            float valor = campo(ojo + dir * t) - nivel;
            if ((valor >= 0.0) != (anterior >= 0.0)) {
                float bajo = anteriorT, alto = t;
                bool signo = anterior >= 0.0;
                for (int it = 0; it < 8; it++) {
                    float medio = 0.5 * (bajo + alto);
                    if ((campo(ojo + dir * medio) >= nivel) == signo) bajo = medio;
                    else alto = medio;
                }
                vec3 p = ojo + dir * (0.5 * (bajo + alto));
                vec3 n = normalExterior(p);
                if (dot(n, dir) > 0.0) n = -n;
                vec3 luz = normalize(vec3(-3.0, 5.0, 7.0));
                float difuso = max(0.0, dot(n, luz));
                vec3 mitad = normalize(luz - dir);
                float brillo = pow(max(0.0, dot(n, mitad)), 45.0);
                float relleno = max(0.0, dot(n, normalize(vec3(4.0, 0.0, -3.0))));
                vec3 color = vec3(0.28, 0.61, 0.60) * (0.42 + 0.55*difuso + 0.18*relleno);
                color += vec3(0.18) * brillo;
                gl_FragColor = vec4(color, 1.0);
                return;
            }
            anteriorT = t;
            anterior = valor;
        }
    }
`;

class SurfaceViewer {
    constructor(container) {
        this.container = container;
        this.panels = [document.getElementById('implicit-view'), document.getElementById('mesh-view')];
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setClearColor(0xeef1f1);
        this.renderer.domElement.setAttribute('aria-hidden', 'true');
        container.prepend(this.renderer.domElement);
        this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
        this.camera.position.set(0, 0.6, 6.8);
        this.meshScene = new THREE.Scene();
        this.meshScene.add(new THREE.HemisphereLight(0xffffff, 0x777e83, 1.15));
        const key = new THREE.DirectionalLight(0xffffff, 0.8);
        key.position.set(-3, 5, 7);
        this.meshScene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.25);
        fill.position.set(4, 0, -3);
        this.meshScene.add(fill);
        this.meshRoot = new THREE.Group();
        this.meshScene.add(this.meshRoot);
        this.box = new THREE.Box3Helper(new THREE.Box3(
            new THREE.Vector3(...DOMINIO.min), new THREE.Vector3(...DOMINIO.max)), 0xa2adb4);
        this.box.visible = false;
        this.meshScene.add(this.box);
        this.implicitScene = new THREE.Scene();
        this.uniforms = {
            inversaProyeccion: { value: new THREE.Matrix4() },
            camaraMundo: { value: new THREE.Matrix4() },
            ojo: { value: new THREE.Vector3() },
            bolas: { value: Array.from({ length: MAX_METABALLS }, () => new THREE.Vector4(0, 0, 0, 1)) },
            cantidad: { value: 0 }, nivel: { value: 0.35 },
            minimo: { value: new THREE.Vector3(...DOMINIO.min) },
            maximo: { value: new THREE.Vector3(...DOMINIO.max) }
        };
        this.implicitMaterial = new THREE.ShaderMaterial({
            uniforms: this.uniforms, vertexShader: IMPLICIT_VERTEX, fragmentShader: IMPLICIT_FRAGMENT,
            depthTest: false, depthWrite: false
        });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.implicitMaterial);
        screen.frustumCulled = false;
        this.implicitScene.add(screen);
        this.screenCamera = new THREE.Camera();
        this.controls = this.panels.map(panel => {
            const control = new THREE.OrbitControls(this.camera, panel);
            control.enablePan = false;
            control.minDistance = 4;
            control.maxDistance = 15;
            control.addEventListener('change', () => this.requestRender());
            panel.addEventListener('keydown', event => this.keyboard(event));
            return control;
        });
        this.flat = false;
        this.wireVisible = true;
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(container);
        this.resetCamera();
        this.resize();
    }

    setField(bolas, nivel) {
        this.uniforms.cantidad.value = bolas.length;
        bolas.forEach((bola, i) => this.uniforms.bolas.value[i].set(...bola.centro, bola.radio));
        this.uniforms.nivel.value = nivel;
        this.requestRender();
    }

    setMesh(malla) {
        this.meshRoot.children.slice().forEach(object => {
            this.meshRoot.remove(object);
            object.geometry.dispose();
            object.material.dispose();
        });
        this.surface = this.wire = null;
        if (!malla.caras.length) { this.requestRender(); return; }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(malla.vertices.flat(), 3));
        geometry.setIndex(malla.caras.flat());
        geometry.computeVertexNormals();
        this.surface = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
            color: 0x7b8dc7, specular: 0x252b39, shininess: 35, flatShading: this.flat,
            side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
        }));
        this.wire = new THREE.LineSegments(new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x344572, transparent: true, opacity: 0.36 }));
        this.wire.visible = this.wireVisible;
        this.meshRoot.add(this.surface, this.wire);
        this.requestRender();
    }

    setStale(stale) {
        if (this.surface) this.surface.material.color.setHex(stale ? 0xb4bcc9 : 0x7b8dc7);
        this.requestRender();
    }
    setWireframe(visible) { this.wireVisible = visible; if (this.wire) this.wire.visible = visible; this.requestRender(); }
    setFlat(flat) { this.flat = flat; if (this.surface) { this.surface.material.flatShading = flat; this.surface.material.needsUpdate = true; } this.requestRender(); }
    setBox(visible) { this.box.visible = visible; this.requestRender(); }
    resetCamera() {
        this.camera.position.set(0, 0.6, 6.8);
        this.controls.forEach(c => { c.target.set(0, 0, 0); c.update(); });
        this.requestRender();
    }
    keyboard(event) {
        const spherical = new THREE.Spherical().setFromVector3(this.camera.position);
        if (event.key === 'ArrowLeft') spherical.theta -= 0.1;
        else if (event.key === 'ArrowRight') spherical.theta += 0.1;
        else if (event.key === 'ArrowUp') spherical.phi -= 0.1;
        else if (event.key === 'ArrowDown') spherical.phi += 0.1;
        else if (event.key === '+' || event.key === '=') spherical.radius /= 1.1;
        else if (event.key === '-') spherical.radius *= 1.1;
        else return;
        event.preventDefault();
        spherical.makeSafe();
        spherical.radius = Math.max(4, Math.min(15, spherical.radius));
        this.camera.position.setFromSpherical(spherical);
        this.controls.forEach(c => c.update());
        this.requestRender();
    }
    resize() {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.requestRender();
    }
    requestRender() {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); });
    }
    render() {
        const area = this.container.getBoundingClientRect();
        if (!area.width || !area.height) return;
        this.renderer.setScissorTest(true);
        this.panels.forEach((panel, index) => {
            const rect = panel.getBoundingClientRect();
            const x = rect.left - area.left, y = area.bottom - rect.bottom;
            this.renderer.setViewport(x, y, rect.width, rect.height);
            this.renderer.setScissor(x, y, rect.width, rect.height);
            this.camera.aspect = rect.width / rect.height;
            this.camera.updateProjectionMatrix();
            this.camera.updateMatrixWorld();
            this.uniforms.inversaProyeccion.value.copy(this.camera.projectionMatrixInverse);
            this.uniforms.camaraMundo.value.copy(this.camera.matrixWorld);
            this.uniforms.ojo.value.copy(this.camera.position);
            this.renderer.render(index === 0 ? this.implicitScene : this.meshScene, index === 0 ? this.screenCamera : this.camera);
        });
        this.renderer.setScissorTest(false);
    }
}
