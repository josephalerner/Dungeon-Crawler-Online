var blobs = [];

function Blob(x, y, id, r) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.r = r;
}

var express = require('express');

var app = express();
var server = app.listen(3000);

app.use(express.static('public'));

console.log("Ok, the server has booted.");

var socket = require('socket.io');

var io = socket(server);


setInterval(heartbeat, 33);

function heartbeat() {
    io.sockets.emit('heartbeat', blobs);
}

io.sockets.on('connection', newConnection);

function newConnection(socket) {
    console.log("new connection: " + socket.id);

    

    socket.on('start', startMessage);

    // for some reason this function has to be defined within the scope of newConnection
    function startMessage(data) {
        //socket.broadcast.emit('mouse', data);
        console.log(data);
        var blob = new Blob(data.x, data.y, socket.id, data.r);
        blobs.push(blob);
    }

    socket.on('update', updateMessage);

    function updateMessage(data) {
        //socket.broadcast.emit('mouse', data);
        console.log("ID: " + socket.id + " LEN: " + blobs.length + " BLOB ID: " + blobs[0].id);

        var blob;

        for (var i = 0; i < blobs.length; i++) {
            if (socket.id == blobs[i].id) {
                //console.log("CUATEC, GRYMLOQ: " + blobs[i].id);
                blob = blobs[i];
            }
        }

        blob.x = data.x;
        blob.y = data.y;
        blob.r = data.r;
    }

}