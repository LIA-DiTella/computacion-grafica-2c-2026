/** Armado de shaders: precisión numérica e iluminación del fragment shader. */
function fuentesShaders(precision='highp') {
    const encabezado = `precision ${precision} float;\n`;
    return {
        vertex: encabezado + vertexShader,
        fragment: encabezado + fragmentShader + iluminacionGLSL
    };
}
