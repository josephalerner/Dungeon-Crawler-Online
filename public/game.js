// Global networking variables
var socket;
var id;

// Players
var localPlayerController;
var allPlayerControllers = [];

var fireButton;

var environmentGroup;
var playerBodyGroup;
var playerEquipmentGroup;

var dungeonData = []

var game = new Phaser.Game(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update, render: render });
var hasReceivedInitialData = false;

var animateWeapon;
var animateHit;
var daggerSwish;
var daggerHit;
var music;

function preload() {
    game.load.audio('hit', 'assets/hit.wav');
    game.load.audio('swish', 'assets/swish.wav');
    game.load.audio('music', 'assets/music.mp3');
    game.load.image('bolt', 'assets/bolt.png');
    game.load.image('player', 'assets/player.png');
    game.load.image('dagger', 'assets/dagger.png');
    game.load.image('crossbow', 'assets/crossbow.png');
    game.load.image('wall', 'assets/wall.png');
    game.load.image('x', 'assets/x.png');
}

function create() {
    //TODO: loop
    daggerSwish = game.add.audio('swish');
    daggerHit = game.add.audio('hit');
    music = game.add.audio('music');

    music.play();
    music.mute = false;
    music.volume = 1;

    socket = io.connect('localhost:3000');
    // Get ready to handle the dungeon data
    socket.on('initialDataEmit', onInitialDataReceived);

    // Immediately create our local player
    var newPlayerData = new PlayerData(0, 0, 0, getRandomColor(), 'dagger', socket.id);
    localPlayerController = new PlayerController(newPlayerData, true);
    allPlayerControllers.push(localPlayerController);

    // Create the enviornment group which we will eventually use when placing the dungeon
    environmentGroup = game.add.group();
    game.physics.arcade.enable(environmentGroup);
    environmentGroup.immovable = true;

    // Define weapon animation. TODO: this should really be:
    // a) framerate independent
    // b) a method of PlayerController
    animateWeapon = async function asyncCall(playerController) {
        playerController.isAttacking = true;
        for (i = 0; i < 6; i++) { 
            await new Promise(resolve => setTimeout(resolve, 10)); // .01 sec
            playerController.playerEquipmentGroup.x = i * 1.5;
        }
        for (i = 6; i >= 0; i--) { 
            await new Promise(resolve => setTimeout(resolve, 10)); // .01 sec
            playerController.playerEquipmentGroup.x = i * 1.5;
        }
        playerController.isAttacking = false;

    }

    animateHit = async function asyncCall(hitPlayer) {
        var hitColor = 0xff0000;
        if (hitPlayer.playerSprite.tint == hitColor) {
            return;
        }
        var tint = hitPlayer.playerSprite.tint;
        hitPlayer.playerSprite.tint = 0xff0000;
        await new Promise(resolve => setTimeout(resolve, 100));
        hitPlayer.playerSprite.tint = tint;

    }

}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return toHex(color);

    function toHex(str) {
        var hex = '';
        for(var i=0;i<str.length;i++) {
            hex += ''+str.charCodeAt(i).toString(16);
        }
        return hex;
    }
     
}  

function bulletCollisionHandler(bullet, object) {
    bullet.kill();
}


function onInitialDataReceived(data) {
    dungeonData = data.dungeon;
    localPlayerController.playerData.id = data.id;
    hasReceivedInitialData = true;
    placeDungeon();
    spawnPlayer();
    configureInput();
    configureCamera();
    replyToInitialData();
}

function onAttackDataReceived(data) {
    var attackingPc = getPlayerControllerById(data.attackingId);
    var debugSprite = game.add.sprite(data.xDebug, data.yDebug, 'x');

    debugSprite.anchor.x = .5;
    debugSprite.anchor.y = .5;
    debugSprite.scale.set(0.1);

    if(!isLocalPlayerController(attackingPc)) {
        // TODO: check for off screen
        daggerSwish.play();
        daggerSwish.mute = false;
        daggerSwish.volume = 1;
    }
    
    if (data.hitId === undefined) {
        return;
    }

    var hitPlayer = getPlayerControllerById(data.hitId);

    // no friendly fire
    if(hitPlayer == attackingPc) {
        return;
    }

    daggerHit.play();
    daggerHit.mute = false;
    daggerHit.volume = 1;

    animateHit(hitPlayer);
    if (isLocalPlayerController(hitPlayer)) {
        console.log("You got hit.");
    }
}

function isLocalPlayerController(pc) {
    return pc == localPlayerController;
}

function getPlayerControllerById(id) {
    for (var j = 0; j < allPlayerControllers.length; j++) {
        if(allPlayerControllers[j].playerData.id == id) {
            return allPlayerControllers[j];
        }
    }

    return; // will return undefined. I'm practicing my JS :)
}

function configureInput() {

   fireButton = game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
}
function configureCamera() {
    game.world.setBounds(-1 * 128, -1 * 128, 23 * 128, 26 * 128);

    game.camera.follow(localPlayerController.playerSprite);
}

function placeDungeon() {
    for (var i = 0; i < dungeonData.length; i++) {
        for (var j = 0; j < dungeonData.length; j++) {
          if (dungeonData[i][j] == 0) {
            var s = game.add.sprite(i * 128, j * 128, 'wall');
            var scaleNeeded = 128/(s.width);
            s.scale.set(scaleNeeded);
            s.anchor.x = 0.5;
            s.anchor.y = 0.5;

          }
          if (dungeonData[i][j] == 1) {
            var s = game.add.sprite(i * 128, j * 128, 'wall');
            var scaleNeeded = 128/(s.width);
            s.scale.set(scaleNeeded);
            s.tint = 0x222222;
            environmentGroup.add(s);
            s.anchor.x = 0.5;
            s.anchor.y = 0.5;
            game.physics.arcade.enable(s);
            s.body.immovable = true;
            s.body.moves = false;

        }
      }
    }

    game.physics.arcade.enable(environmentGroup);
}

function spawnPlayer() {
    var iSpawnPos = 0;
    var jSpawnPos = 0;
    
    while(true) {
        iSpawnPos = Math.floor(Math.random() * dungeonData.length);
        jSpawnPos = Math.floor(Math.random() * dungeonData.length);

        if (dungeonData[iSpawnPos][jSpawnPos] == 0) {
            break;
        }
    }

    console.log("X: " + iSpawnPos + ", Y: " + jSpawnPos);
    localPlayerController.playerData.x = iSpawnPos * 128;
    localPlayerController.playerData.y = jSpawnPos * 128;
}

function replyToInitialData() {
    socket.emit('start', localPlayerController.playerData);

    // Handle updates from the server
    socket.on('heartbeat', onHeartbeat);
    socket.on('attack', onAttackDataReceived);

}

function onHeartbeat(data) {
    var serverPlayerDatas = data;

    // Check for new server joins
    for (var i = 0; i < serverPlayerDatas.length; i++) {
        if (serverPlayerDatas[i].id == socket.id)
            continue;
        
        // We have found a player that is not our own. Has it already been created in our instance?
        var pc = getPlayerControllerById(serverPlayerDatas[i].id);

        if (isLocalPlayerController(pc)) {
            continue;
        }

        // === vs ==
        if (pc === undefined) {
            var newPlayerData = new PlayerData(serverPlayerDatas[i].x, serverPlayerDatas[i].y, serverPlayerDatas[i].rotation, 
                serverPlayerDatas[i].color, serverPlayerDatas[i].weapon, serverPlayerDatas[i].id);
            var newPlayerController = new PlayerController(newPlayerData, false);
            allPlayerControllers.push(newPlayerController);
        } else {
            updatePlayerControllerPlayerData(pc, serverPlayerDatas[i]);
        }
    }
}

function updatePlayerControllerPlayerData(pc, data) {
    pc.playerData.x = data.x;
    pc.playerData.y = data.y;
    pc.playerData.rotation = data.rotation;
}

function update() {
    if (!hasReceivedInitialData) {
        return;
    }

    var data = {
        x: localPlayerController.playerBodyGroup.x,
        y: localPlayerController.playerBodyGroup.y
    };

    socket.emit('update', localPlayerController.playerData);
    
    game.world.setAll('immovable', true);

    allPlayerControllers.forEach(function(pc) {
        pc.update();
    });
}

function render() {

    //weapon.debug();

}
