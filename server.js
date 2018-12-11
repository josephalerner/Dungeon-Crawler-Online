var playerDatas = [];
var zombies = [];

var express = require('express');

var app = express();
var server = app.listen(3000);
var zombieSpeed = 4;
var zombieWaveSpawnChance = 0.004;

app.use(express.static('public'));

console.log("Ok, the server has booted.");

function PlayerData(x, y, rotation, color, weapon, health, id) {
  this.x = x;
  this.y = y;
  this.rotation = rotation;
  this.color = color;
  this.weapon = weapon;
  this.health = health;
  this.id = id;
}

function Zombie(x, y, rotation, zombieSpeed) {
  this.x = x;
  this.y = y;
  this.rotation = rotation;
  this.speed = zombieSpeed;
  this.id = nextZombieId++;
}

var nextZombieId = 0;

// should be 35 but rn it's 
var dimensions = 20; // width and height of the map
var maxTunnels = 70; // max number of tunnels possible
var maxLength = 16; // max length each tunnel can have
var chestChancePerTile = 0.03;
var zombieChancePerTile = .03;
var dungeonData = createMap(dimensions, maxTunnels, maxLength);
var socketUniversal = require('socket.io');
var socketServer = socketUniversal(server);
var playerRadius = 33;
var zombieSpawnCheckRadius = 200;
var dungeonScaleModifier = 1.35;

FirstTimeSetup();
StartServer();

function FirstTimeSetup() {
	setInterval(heartbeat, 33);
	setInterval(restartServerCheck, 60000);
}

function StartServer() {
	zombieWaveSpawnChance = 0.004;
	zombieChancePerTile = .03;
	playerDatas = [];
	zombies = [];

	dungeonData = createMap(dimensions, maxTunnels, maxLength);
	var biggerDungeonData = createArray(1, dimensions + 4)

	for (let i = 2; i < dimensions; i++) {
		for (let j = 2; j < dimensions; j++) {
			biggerDungeonData[i][j] = dungeonData[i][j]
			if (biggerDungeonData[i][j] == 0 && Math.random() < chestChancePerTile) {
				biggerDungeonData[i][j] = 2;// 2
			}
		}
	}

	dungeonData = biggerDungeonData;
}

function getNearestPlayer(x, y) {
  var nearestPlayer;
  var distanceToNearestPlayer = 100000000;

  for (i = 0; i < playerDatas.length; i++) {
    var xDistanceSquared = (playerDatas[i].x - x) * (playerDatas[i].x - x);
    var yDistanceSquared = (playerDatas[i].y - y) * (playerDatas[i].y - y);
    var totalDistance = Math.sqrt(xDistanceSquared + yDistanceSquared);
    
    if (totalDistance < distanceToNearestPlayer) {
      distanceToNearestPlayer = totalDistance;
      nearestPlayer = playerDatas[i];
    }
  }

  return nearestPlayer;
}

function getOverlappingPlayers(x, y, overlapRadius) {
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

function getOverlappingZombies(x, y, overlapRadius) {
  var overlappingZombies = [];
  for (i = 0; i < zombies.length; i++) {
    var xOverlaps = Math.abs(zombies[i].x - x) < overlapRadius * dungeonScaleModifier;
    var yOverlaps = Math.abs(zombies[i].y - y) < overlapRadius * dungeonScaleModifier;
    if (xOverlaps && yOverlaps) {
      overlappingZombies.push(zombies[i]);
    }
  }

  return overlappingZombies;
}


function restartServerCheck() {
	console.log("Check to restart server: number of players in game?: " + playerDatas);
	if (playerDatas.length == 0) {
		StartServer();
		console.log("RESTARTING SERVER");
	}
}

function heartbeat() {
  if(playerDatas.length == 0) {
    return;
  }

  var heartbeatData = {
    playerDatasResponse: playerDatas,
    zombiesResponse: zombies
  }

  if(Math.random() < zombieWaveSpawnChance) {
    console.log("SPAWNED A ZOMBIE WAVE");
    SpawnZombieWave(dungeonData);
  }
  
  zombies.forEach(function(zomb) {
		var moveDir = getPathfindingDirectionTowardsNearestPlayer(zomb.x, zomb.y);
    var moveX = Math.cos(moveDir) * (zomb.speed);
    var moveY = Math.sin(moveDir) * (zomb.speed);
    zomb.x += moveX;
    zomb.y += moveY;
		zomb.rotation = moveDir;
		
		var zombHitPlayerRadius = 10;
		var hitPlayers = getOverlappingPlayers(zomb.x, zomb.y, zombHitPlayerRadius);

		hitPlayers.forEach(function(hitPlayer) {
			var attackData = {
				attackingId: undefined,
				hitId: hitPlayer.id,
				hitZombieIds: [zomb.id],
				xDebug: zomb.x,
				yDebug: zomb.y
			};

			zombies.splice(zombies.indexOf(zomb), 1);
			socketServer.sockets.emit('attack', attackData);

		
			hitPlayer.health -= 1;
			if (hitPlayer.health <= 0) {
				var deathData = {
					deadPlayerId: hitPlayer.id,
				};
				socketServer.sockets.emit('death', deathData);
				playerDatas = playerDatas.filter(player => player.health > 0);

			}
		});
  });


  socketServer.sockets.emit('heartbeat', heartbeatData);
}

function convertWorldToGrid(worldX, worldY) {
  var gridX = Math.round(worldX/(dungeonScaleModifier * 128));
  var gridY = Math.round(worldY/(dungeonScaleModifier * 128));

  return [gridX, gridY];
}
function getPathfindingDirectionTowardsNearestPlayer(x, y) {
  var nearestPlayer = getNearestPlayer(x, y);

  if (nearestPlayer === undefined) {
    return 1;
  }
  //console.log("x, y: " + convertWorldToGrid(nearestPlayer.x, nearestPlayer.y));
  var nearestPlayerGridCoords = convertWorldToGrid(nearestPlayer.x, nearestPlayer.y);
	var zombieGridCoords = convertWorldToGrid(x, y);
	
	// if player is super close
	if (Math.abs(nearestPlayerGridCoords[0] - zombieGridCoords[0]) <= 1) {
		if (Math.abs(nearestPlayerGridCoords[1] - zombieGridCoords[1]) <= 1){
			var rotationTowardsPlayer = Math.atan2(x - nearestPlayer.x, y - nearestPlayer.y);
			return -(3.14/2 + rotationTowardsPlayer);
		}
	}

  var path = findPath(dungeonData, zombieGridCoords, nearestPlayerGridCoords);
  if (path[0] === undefined) {
    console.log("Path is undefined");
  } else {
  }
  if (path.length > 1) {
    var xDirection = path[1][0] - path[0][0];
    var yDirection = path[1][1] - path[0][1];
     var angleRadians = Math.atan2(path[1][1] - path[0][1], path[1][0] - path[0][0]);
     return angleRadians;
  } else {
    return 0;
  }
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

			var zombieRadius = playerRadius * 1.15;
      var hitPlayers = getOverlappingPlayers(attackX, attackY, playerRadius);
      var hitZombies = getOverlappingZombies(attackX, attackY, zombieRadius);
      var hitPlayerId;

      // no friendly fire
      hitPlayers.filter(player => player.id != playerData.id);

      if (hitPlayers.length > 0) {
        var hitPlayer = hitPlayers[0];
        hitPlayerId = hitPlayer.id;

        

        console.log("A player was hit: " + hitPlayer.health);
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
			
			//only 1 zombie hit per attack now
			hitZombies.length = 1;

      var attackData = {
        attackingId: playerData.id,
				hitId: hitPlayerId,
				hitZombieIds: hitZombies.map(z => z.id),
        xDebug: attackX,
        yDebug: attackY
      };

			// only hit 1 zombie at a time now
			hitZombies.forEach(function(z) {
				zombies.splice(zombies.indexOf(z), 1);
			});

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

function SpawnZombieWave(dungeon) {
  var dimension1 = dungeon.length;
	var dimension2 = dungeon[0].length;

	if(zombieWaveSpawnChance < 0.011) {
	zombieChancePerTile += 0.001;
	}

	if(zombieSpeed < 12) {
		console.log("SPEED: " + zombieSpeed);
		zombieSpeed += 0.5;
	}

  for (let i = 0; i < dimension1; i++) {
    for (let j = 0; j < dimension2; j++) {
      if (dungeon[i][j] == 0 && Math.random() < zombieChancePerTile) {

        var x = i * dungeonScaleModifier * 128;
        var y = j * dungeonScaleModifier  * 128;
        var overlappingPlayers = getOverlappingPlayers(x, y, zombieSpawnCheckRadius);

        if(overlappingPlayers.length > 0) {
          continue;
        }

        var zombie = new Zombie(x, y, 0, zombieSpeed);
        if(true) {
					zombies.push(zombie);

        }
      }
    }
	}
	
	console.log("Number of zombies after wave spawn: " + zombies.length);
}

// world is a 2d array of integers (eg world[10][15] = 0)
// pathStart and pathEnd are arrays like [5,10]
function findPath(world, pathStart, pathEnd)
{
	// shortcuts for speed
	var	abs = Math.abs;
	var	max = Math.max;
	var	pow = Math.pow;
	var	sqrt = Math.sqrt;

	// the world data are integers:
	// anything higher than this number is considered blocked
	// this is handy is you use numbered sprites, more than one
	// of which is walkable road, grass, mud, etc
	var maxWalkableTileNum = 0;

	// keep track of the world dimensions
    // Note that this A-star implementation expects the world array to be square: 
	// it must have equal height and width. If your game world is rectangular, 
	// just fill the array with dummy values to pad the empty space.
	var worldWidth = world[0].length;
	var worldHeight = world.length;
	var worldSize =	worldWidth * worldHeight;

  // diagonals allowed but no sqeezing through cracks:
	var distanceFunction = DiagonalDistance;
	var findNeighbours = DiagonalNeighbours;
	// which heuristic should we use?
	// default: no diagonals (Manhattan)
	//var distanceFunction = ManhattanDistance;
	//var findNeighbours = function(){}; // empty

	/*

	// alternate heuristics, depending on your game:

	// diagonals allowed but no sqeezing through cracks:
	var distanceFunction = DiagonalDistance;
	var findNeighbours = DiagonalNeighbours;

	// diagonals and squeezing through cracks allowed:
	var distanceFunction = DiagonalDistance;
	var findNeighbours = DiagonalNeighboursFree;

	// euclidean but no squeezing through cracks:
	var distanceFunction = EuclideanDistance;
	var findNeighbours = DiagonalNeighbours;

	// euclidean and squeezing through cracks allowed:
	var distanceFunction = EuclideanDistance;
	var findNeighbours = DiagonalNeighboursFree;

	*/

	// distanceFunction functions
	// these return how far away a point is to another

	function ManhattanDistance(Point, Goal)
	{	// linear movement - no diagonals - just cardinal directions (NSEW)
		return abs(Point.x - Goal.x) + abs(Point.y - Goal.y);
	}

	function DiagonalDistance(Point, Goal)
	{	// diagonal movement - assumes diag dist is 1, same as cardinals
		return max(abs(Point.x - Goal.x), abs(Point.y - Goal.y));
	}

	function EuclideanDistance(Point, Goal)
	{	// diagonals are considered a little farther than cardinal directions
		// diagonal movement using Euclide (AC = sqrt(AB^2 + BC^2))
		// where AB = x2 - x1 and BC = y2 - y1 and AC will be [x3, y3]
		return sqrt(pow(Point.x - Goal.x, 2) + pow(Point.y - Goal.y, 2));
	}

	// Neighbours functions, used by findNeighbours function
	// to locate adjacent available cells that aren't blocked

	// Returns every available North, South, East or West
	// cell that is empty. No diagonals,
	// unless distanceFunction function is not Manhattan
	function Neighbours(x, y)
	{
		var	N = y - 1,
		S = y + 1,
		E = x + 1,
		W = x - 1,
		myN = N > -1 && canWalkHere(x, N),
		myS = S < worldHeight && canWalkHere(x, S),
		myE = E < worldWidth && canWalkHere(E, y),
		myW = W > -1 && canWalkHere(W, y),
		result = [];
		if(myN)
		result.push({x:x, y:N});
		if(myE)
		result.push({x:E, y:y});
		if(myS)
		result.push({x:x, y:S});
		if(myW)
		result.push({x:W, y:y});
		findNeighbours(myN, myS, myE, myW, N, S, E, W, result);
		return result;
	}

	// returns every available North East, South East,
	// South West or North West cell - no squeezing through
	// "cracks" between two diagonals
	function DiagonalNeighbours(myN, myS, myE, myW, N, S, E, W, result)
	{
		if(myN)
		{
			if(myE && canWalkHere(E, N))
			result.push({x:E, y:N});
			if(myW && canWalkHere(W, N))
			result.push({x:W, y:N});
		}
		if(myS)
		{
			if(myE && canWalkHere(E, S))
			result.push({x:E, y:S});
			if(myW && canWalkHere(W, S))
			result.push({x:W, y:S});
		}
	}

	// returns every available North East, South East,
	// South West or North West cell including the times that
	// you would be squeezing through a "crack"
	function DiagonalNeighboursFree(myN, myS, myE, myW, N, S, E, W, result)
	{
		myN = N > -1;
		myS = S < worldHeight;
		myE = E < worldWidth;
		myW = W > -1;
		if(myE)
		{
			if(myN && canWalkHere(E, N))
			result.push({x:E, y:N});
			if(myS && canWalkHere(E, S))
			result.push({x:E, y:S});
		}
		if(myW)
		{
			if(myN && canWalkHere(W, N))
			result.push({x:W, y:N});
			if(myS && canWalkHere(W, S))
			result.push({x:W, y:S});
		}
	}

	// returns boolean value (world cell is available and open)
	function canWalkHere(x, y)
	{
		return ((world[x] != null) &&
			(world[x][y] != null) &&
			(world[x][y] <= maxWalkableTileNum));
	};

	// Node function, returns a new object with Node properties
	// Used in the calculatePath function to store route costs, etc.
	function Node(Parent, Point)
	{
		var newNode = {
			// pointer to another Node object
			Parent:Parent,
			// array index of this Node in the world linear array
			value:Point.x + (Point.y * worldWidth),
			// the location coordinates of this Node
			x:Point.x,
			y:Point.y,
			// the heuristic estimated cost
			// of an entire path using this node
			f:0,
			// the distanceFunction cost to get
			// from the starting point to this node
			g:0
		};

		return newNode;
	}

	// Path function, executes AStar algorithm operations
	function calculatePath()
	{
		// create Nodes from the Start and End x,y coordinates
		var	mypathStart = Node(null, {x:pathStart[0], y:pathStart[1]});
		var mypathEnd = Node(null, {x:pathEnd[0], y:pathEnd[1]});
		// create an array that will contain all world cells
		var AStar = new Array(worldSize);
		// list of currently open Nodes
		var Open = [mypathStart];
		// list of closed Nodes
		var Closed = [];
		// list of the final output array
		var result = [];
		// reference to a Node (that is nearby)
		var myNeighbours;
		// reference to a Node (that we are considering now)
		var myNode;
		// reference to a Node (that starts a path in question)
		var myPath;
		// temp integer variables used in the calculations
		var length, max, min, i, j;
		// iterate through the open list until none are left
		while(length = Open.length)
		{
			max = worldSize;
			min = -1;
			for(i = 0; i < length; i++)
			{
				if(Open[i].f < max)
				{
					max = Open[i].f;
					min = i;
				}
			}
			// grab the next node and remove it from Open array
			myNode = Open.splice(min, 1)[0];
			// is it the destination node?
			if(myNode.value === mypathEnd.value)
			{
				myPath = Closed[Closed.push(myNode) - 1];
				do
				{
					result.push([myPath.x, myPath.y]);
				}
				while (myPath = myPath.Parent);
				// clear the working arrays
				AStar = Closed = Open = [];
				// we want to return start to finish
				result.reverse();
			}
			else // not the destination
			{
				// find which nearby nodes are walkable
				myNeighbours = Neighbours(myNode.x, myNode.y);
				// test each one that hasn't been tried already
				for(i = 0, j = myNeighbours.length; i < j; i++)
				{
					myPath = Node(myNode, myNeighbours[i]);
					if (!AStar[myPath.value])
					{
						// estimated cost of this particular route so far
						myPath.g = myNode.g + distanceFunction(myNeighbours[i], myNode);
						// estimated cost of entire guessed route to the destination
						myPath.f = myPath.g + distanceFunction(myNeighbours[i], mypathEnd);
						// remember this new path for testing above
						Open.push(myPath);
						// mark this node in the world graph as visited
						AStar[myPath.value] = true;
					}
				}
				// remember this route as having no more untested options
				Closed.push(myNode);
			}
		} // keep iterating until the Open list is empty
		return result;
	}

	// actually calculate the a-star path!
	// this returns an array of coordinates
	// that is empty if no path is possible
	return calculatePath();

} // end of findPath() function

