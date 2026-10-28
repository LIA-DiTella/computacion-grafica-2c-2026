/** Imágenes de ejemplo y carga de archivos. No requiere internet. */
function crearImagenTextura(tipo) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (tipo === 'damero') {
        for (let y=0; y<16; y++) for (let x=0; x<16; x++) {
            ctx.fillStyle = (x+y)%2 ? '#182d43' : '#f8e9cf';
            ctx.fillRect(x*32,y*32,32,32);
        }
    } else if (tipo === 'ladrillos') {
        ctx.fillStyle = '#e0d6c5'; ctx.fillRect(0,0,512,512);
        for (let y=0; y<8; y++) for (let x=-1; x<4; x++) {
            ctx.fillStyle = ['#b96245','#a54c35','#c97954'][(x+y+9)%3];
            ctx.fillRect(x*128+(y%2)*64+4,y*64+4,120,56);
        }
    } else {
        const colores = ['#5399ae','#e4ad55','#de7965','#84ac77'];
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let y=0; y<4; y++) for (let x=0; x<4; x++) {
            ctx.fillStyle = colores[(x+y)%4];
            ctx.fillRect(x*128,y*128,128,128);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.strokeRect(x*128+2,y*128+2,124,124);
            ctx.fillStyle = '#14202b'; ctx.font = 'bold 30px sans-serif';
            ctx.fillText(String.fromCharCode(65+y)+(x+1),x*128+64,y*128+60);
            ctx.font = '14px sans-serif';
            ctx.fillText('u →   v ↓',x*128+64,y*128+91);
        }
    }
    return canvas;
}

// POT permite repetir y usar mipmaps en WebGL 1. Conserva toda la imagen en [0,1]².
function prepararImagenTextura(img,limite) {
    const ancho = img.naturalWidth || img.width, alto = img.naturalHeight || img.height;
    function potencia(n) {
        let p = 1;
        while (p < n && p*2 <= limite) p *= 2;
        return p;
    }
    const canvas = document.createElement('canvas');
    canvas.width = potencia(ancho); canvas.height = potencia(alto);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas;
}

function leerImagen(archivo) {
    return new Promise((resolve,reject) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen. Usá PNG, JPG o WebP.')); };
        img.src = url;
    });
}
