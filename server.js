var playerDatas = [];

var express = require('express');

var app = express();
var server = app.listen(3000);

app.use(express.static('public'));

console.log("Ok, the server has booted.");

function PlayerData(xPos, yPos, rotation, color, weapon, health, id) { 
  this.xPos = xPos;
  this.yPos = yPos;
  this.rotation = rotation;
  this.color = color;
  this.weapon = weapon;
  this.health = health;
  this.id = id;
}

// should be 35 but rn it's 
var dimensions = 10; // width and height of the map
var maxTunnels = 100; // max number of tunnels possible
var maxLength = 22; // max length each tunnel can have
var dungeonData = createMap(dimensions, maxTunnels, maxLength);

var biggerDungeonData = createArray(1, dimensions + 4)

for (let i = 2; i < dimensions; i++) {
  for (let j = 2; j < dimensions; j++) {
    biggerDungeonData[i][j] = dungeonData[i][j]
  }
}

console.log(biggerDungeonData);
dungeonData = biggerDungeonData;


var socketUniversal = require('socket.io');
var socketServer = socketUniversal(server);


setInterval(heartbeat, 33);

var overlapRadius = 33;
var dungeonScaleModifier = 1.35;

function getOverlappingPlayers(x, y) {
  var overlappingPlayers = [];
  for (i = 0; i < playerDatas.length; i++) {
    var xOverlaps = Math.abs(playerDatas[i].x - x) < overlapRadius * dungeonScaleModifier;
    var yOverlaps = Math.abs(playerDatas[i].y - y) < overlapRadius * dungeonScaleModifier;
    if (xOverlaps && yOverlaps) {
      overlappingPlayers.push(playerDatas[i]);
    }
  }

  return overlappingPlayers;
}

function heartbeat() {
  socketServer.sockets.emit('heartbeat', playerDatas);
}


socketServer.sockets.on('connection', newConnection);

function newConnection(clientSocket) {
    clientSocket.on('start', onStartMessageReceived);
    clientSocket.on('update', onUpdateMessageReceived);
    clientSocket.on('attack', onAttackMessageReceived);

    var initialData = {
      id: clientSocket.id,
      dungeon: dungeonData
    };

    //socketServer.sockets.emit('initialDataEmit', initialData);
    socketServer.sockets.connected[clientSocket.id].emit('initialDataEmit', initialData);
    console.log("Sent initial data to client: " + clientSocket.id)

    function onStartMessageReceived(playerData) {
        var player = new PlayerData(playerData.x, playerData.y, playerData.rotation, playerData.color, playerData.weapon, playerData.health, playerData.id);
        playerDatas.push(player);
    }

    function onUpdateMessageReceived(playerData) {
        var storedPlayerData;

        for (var i = 0; i < playerDatas.length; i++) {
            if (playerData.id == playerDatas[i].id) {
              storedPlayerData = playerDatas[i];

                if (playerData.x != null) {
                  storedPlayerData.x = playerData.x;
                  storedPlayerData.y = playerData.y;
                  storedPlayerData.rotation = playerData.rotation;
                  storedPlayerData.health = playerData.health;
                  storedPlayerData.weapon = playerData.weapon;
                }
            }
        }
    }

    function onAttackMessageReceived(playerData) {
      var daggerAttackRange = 58 * dungeonScaleModifier;
      //dagger is slightly under the rotation
      var attackX = playerData.x + (Math.cos(playerData.rotation + 0.3) * daggerAttackRange);
      var attackY = playerData.y + (Math.sin(playerData.rotation + 0.3) * daggerAttackRange);

      var hitPlayers = getOverlappingPlayers(attackX, attackY);
      var hitPlayerId;

      // no friendly fire
      hitPlayers.filter(player => player.id != playerData.id);

      if (hitPlayers.length > 0) {
        var hitPlayer = hitPlayers[0];
        hitPlayerId = hitPlayer.id;

        

        console.log(hitPlayer.health);
        // a little hacky, usually health is updated from client but since in testing client wont update
        // unless it is open, it's handy to do this. plus that's good in case the client quits.
        hitPlayer.health -= 1;
        if (hitPlayer.health <= 0) {
          var deathData = {
            deadPlayerId: hitPlayerId,
          };
          socketServer.sockets.emit('death', deathData);
          playerDatas = playerDatas.filter(player => player.health > 0);
          console.log(playerDatas.length);

        }
      }

      var attackData = {
        attackingId: playerData.id,
        hitId: hitPlayerId,
        xDebug: attackX,
        yDebug: attackY
      };


      socketServer.sockets.emit('attack', attackData);

    } 
}


//lets create a randomly generated map for our dungeon crawler
function createMap(dimensions, maxTunnels, maxLength) {
    var map = createArray(1, dimensions); // create a 2d array full of 1's
    var currentRow = Math.floor(Math.random() * dimensions); // our current row - start at a random spot
    var currentColumn = Math.floor(Math.random() * dimensions); // our current column - start at a random spot
    var directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // array to get a random direction from (left,right,up,down)
    var lastDirection = []; // save the last direction we went
    var randomDirection; // next turn/direction - holds a value from directions

  // lets create some tunnels - while maxTunnels, dimentions, and maxLength  is greater than 0.
  while (maxTunnels && dimensions && maxLength) {

    // lets get a random direction - until it is a perpendicular to our lastDirection
    // if the last direction = left or right,
    // then our new direction has to be up or down,
    // and vice versa
    do {
       randomDirection = directions[Math.floor(Math.random() * directions.length)];
    } while ((randomDirection[0] === -lastDirection[0] && randomDirection[1] === -lastDirection[1]) || (randomDirection[0] === lastDirection[0] && randomDirection[1] === lastDirection[1]));

    var randomLength = Math.ceil(Math.random() * maxLength), //length the next tunnel will be (max of maxLength)
      tunnelLength = 0; //current length of tunnel being created

      // lets loop until our tunnel is long enough or until we hit an edge
    while (tunnelLength < randomLength) {

      //break the loop if it is going out of the map
      if (((currentRow === 0) && (randomDirection[0] === -1)) ||
          ((currentColumn === 0) && (randomDirection[1] === -1)) ||
          ((currentRow === dimensions - 1) && (randomDirection[0] === 1)) ||
          ((currentColumn === dimensions - 1) && (randomDirection[1] === 1))) {
        break;
      } else {
        map[currentRow][currentColumn] = 0; //set the value of the index in map to 0 (a tunnel, making it one longer)
        currentRow += randomDirection[0]; //add the value from randomDirection to row and col (-1, 0, or 1) to update our location
        currentColumn += randomDirection[1];
        tunnelLength++; //the tunnel is now one longer, so lets increment that variable
      }
    }

    if (tunnelLength) { // update our variables unless our last loop broke before we made any part of a tunnel
      lastDirection = randomDirection; //set lastDirection, so we can remember what way we went
      maxTunnels--; // we created a whole tunnel so lets decrement how many we have left to create
    }
  }
  return map; // all our tunnels have been created and our map is complete, so lets return it to our render()
};

//helper function to make a two dimentional array that takes a number and the dimentions of the array
function createArray(num, dimensions) {
    var array = [];
    for (var i = 0; i < dimensions; i++) {
      array.push([]);
      for (var j = 0; j < dimensions; j++) {
        array[i].push(num);
      }
    }
    return array;
  }
