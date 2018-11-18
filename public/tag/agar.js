var socket;

var blob;

var id;

var blobs = [];

var zoom = 1;

function setup() {
    createCanvas(600,600);
    blob = new Blob(0, 0, 64);

    socket = io.connect('http://localhost:3000');

    var data = {
        x: blob.pos.x,
        y: blob.pos.y,
        r: blob.r
    };
    socket.emit('start', data);
    for (var i = 0; i < 0; i++) {
        var x = random(-width * 2, width * 2);
        var y = random(-height * 2, height * 2);
        blobs[i] = new Blob(x, y, 16);
    }
    
    socket.on('heartbeat', onHeartbeat);
    
}

function onHeartbeat(data) {
  console.log(data);
  blobs = data;
}

function draw() {
    background(0);
    translate(width/2, height/2);
    var newzoom = 64/blob.r;
    zoom = lerp(zoom, newzoom, 0.05); 
    scale(zoom);
    translate(-blob.pos.x, -blob.pos.y);
    blob.show();
    blob.update();
    blob.constrain();

    for (var i = 0; i < blobs.length; i++) {
        console.log("BLOBS LENGTH: " + blobs.length + "THE1: " + blobs[i].id + " THE2: " + socket.id);
        var id = blobs[i].id;

        if (id == socket.id)
            continue;

        fill(0,0,255);
        ellipse(blobs[i].x, blobs[i].y, blobs[i].r * 2);
        //blobs[i].show();

        //if (blob.eats(blobs[i])) {
        //    blobs.splice(i, 1);
        //}

        fill(255);
        textAlign(CENTER);
        textSize(12);
        text(blobs[i].id, blobs[i].x, blobs[i].y + blobs[i].r*3);
    }

    var data = {
        x: blob.pos.x,
        y: blob.pos.y,
        r: blob.r
    };
    socket.emit('update', data);
}