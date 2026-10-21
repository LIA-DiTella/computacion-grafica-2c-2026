/** Armado provisto: precisión numérica y función de iluminación compartida. */
function fuentesShaders(precision='highp') {
    const encabezado = `precision ${precision} float;\n`;
    return {
        vertex: encabezado + vertexShader + iluminacionGLSL,
        fragment: encabezado + fragmentShader + iluminacionGLSL
    };
}
