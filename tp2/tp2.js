// Cohete y fondo
var rocket = {
    positionX : 0,
    positionY : 0,
    rotation  : 0,
    scale     : 1,
    speed     : 0,
};

var background = {
    positionX : 0,
    positionY : 0,
};

// Listeners para el mouse y el teclado
document.addEventListener("keydown", KeyDown, false);
document.addEventListener("wheel", WheelZoom);

// Zoom in/out
function WheelZoom(e) 
{
    if (e.deltaY < 0) 
    {
        rocket.scale    *= 1.05; // Factor
    }
    else if (e.deltaY > 0)
    {
        rocket.scale    *= 0.95; // Factor
    }
}

// Teclado
function KeyDown(e)
{
    var keyCode = e.key;
    switch ( e.key ) {
        case "a": case "ArrowLeft" : rocket.rotation -= 5;    break;
        case "d": case "ArrowRight": rocket.rotation += 5;    break;
        case "w": case "ArrowUp"    : rocket.speed += 1; if ( rocket.speed > 100 ) rocket.speed = 100; break;
        case "s": case "ArrowDown"  : rocket.speed -= 1; if ( rocket.speed <   0 ) rocket.speed =   0; break;
        case "h":
            var d = document.getElementById('controls');
            d.style.display = d.style.display=="" ? "none" : "";
            break;
    }
    UpdateTrans();
}

// Mover el cohete
function MoveRocket()
{
    rocket.positionX = event.clientX;
    rocket.positionY = event.clientY;
    UpdateTrans();
}

// Actualizar las transformaciones y los propulsores del cohete
function UpdateTrans()
{	
    // Cohete
    var a = rocket.speed * rocket.scale;
    var m = BuildTransform( rocket.positionX, rocket.positionY, rocket.rotation, rocket.scale );
    var b = document.getElementById('rocket');
    b.style.transform = "matrix(" + m[0] + "," + m[1] + "," + m[3] + "," + m[4] + "," + m[6] + "," + m[7] + ")";

    // Propulsores
    var offset = Array(
        { x:-30, y: 60 },
        { x: 30, y: 60 },
        { x:  0, y: 75 });

    for ( var i=0; i<3; ++i ) {
        var p = document.getElementById('propeller'+i);
        var r = 180;
        var s = rocket.speed / 100;
        var t = BuildTransform( offset[i].x, offset[i].y, r, s );
        t = ComposeTransforms( t, m );
        p.style.transform = "matrix(" + t[0] + "," + t[1] + "," + t[3] + "," + t[4] + "," + t[6] + "," + t[7] + ")";
    }

    var px = rocket.positionX + background.positionX * rocket.scale;
    var py = rocket.positionY + background.positionY * rocket.scale;

    document.body.style.backgroundPosition = px + "px " + py + "px";
    document.body.style.backgroundSize     = (rocket.scale * 1600) + "px";
}

// Game loop -> https://www.w3schools.com/jsref/met_win_setinterval.asp
setInterval( function() {
    var speed = rocket.speed * 0.25;
    var angle = rocket.rotation * Math.PI/180;
    var velX  = -Math.sin(angle) * speed;
    var velY  =  Math.cos(angle) * speed;
    background.positionX += velX;
    background.positionY += velY;
    var sx = 1600;
    var sy = sx;
    if ( background.positionX < 0  ) background.positionX += sx;
    if ( background.positionY < 0  ) background.positionY += sy;
    if ( background.positionX > sx ) background.positionX -= sx;
    if ( background.positionY > sy ) background.positionY -= sy;
    UpdateTrans();
}, 15 );
