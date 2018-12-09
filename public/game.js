// Global networking variables
var socket;
var id;

// Players
var localPlayerController;
var allPlayerControllers = [];
var allZombieControllers = []

var fireButton;

var environmentGroup;
var playerBodyGroup;
var playerEquipmentGroup;

var dungeonData = []
var dungeonDimensions = 0;

var game = new Phaser.Game(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update, render: render });
var hasReceivedInitialData = false;

var animateWeapon;
var animateHit;
var daggerSwish;
var daggerHit;
var danger;
var levelUp;
var zombieSlain;
var deathScream;
var music;

var dungeonScaleModifier = 1.35;

function preload() {
    game.load.audio('hit', 'assets/hit.wav');
    game.load.audio('danger', 'assets/danger.wav');
    game.load.audio('levelUp', 'assets/levelUp.mp3');
    game.load.audio('zombieSlain', 'assets/zombieSlain.wav');
    game.load.audio('swish', 'assets/swish.wav');
    game.load.audio('death', 'assets/fatality.mp3');
    game.load.audio('zombieDeath', 'assets/zombieDie.wav');
    game.load.audio('music', 'assets/music.wav');
    game.load.image('bolt', 'assets/bolt.png');
    game.load.image('player', 'assets/player.png');
    game.load.image('dagger', 'assets/dagger.png');
    game.load.image('shield', 'assets/shield.png');
    game.load.image('crossbow', 'assets/crossbow.png');
    game.load.image('wall', 'assets/wall.png');
    game.load.image('chest', 'assets/chest.png');
    game.load.image('zombie', 'assets/zombie.png');
    game.load.image('x', 'assets/blood.png');
}

function create() {
    ///this.game.resize(5*window.innerWidth, 5*window.innerHeight);
    //game.physics.world.setBounds(0, 0, 5*window.innerWidth, 5*window.innerHeight, true, true, true, true);
 
    // setting the camera bound will set where the camera can scroll to
    // I use the 'main' camera here fro simplicity, use whichever camera you use
        
    game.stage.backgroundColor = 0x333333;
    //TODO: loop
    daggerSwish = game.add.audio('swish');
    daggerHit = game.add.audio('hit');
    danger = game.add.audio('danger');
    levelUp = game.add.audio('levelUp');
    zombieSlain = game.add.audio('zombieSlain');
    deathScream = game.add.audio('death');
    zombieScream = game.add.audio('zombieDeath');
    daggerSwish.volume = .5;

    music = game.add.audio('music', .5, true);

    music.play();
    music.mute = false;

    socket = io.connect('http://138.197.199.250:3000');
    // Get ready to handle the dungeon data
    socket.on('initialDataEmit', onInitialDataReceived);

    // Immediately create our local player
    var newPlayerData = new PlayerData(0, 0, 0, getRandomDarkColor(), 'dagger', 5, socket.id, 700);
    localPlayerController = new PlayerController(newPlayerData, true);
    allPlayerControllers.push(localPlayerController);

    // Create the enviornment group which we will eventually use when placing the dungeon
    environmentGroup = game.add.group();
    game.physics.arcade.enable(environmentGroup);
    environmentGroup.immovable = true;

    // Define weapon animation. TODO: this should really be:
    // a) framerate independent
    // b) a method of PlayerController
    // c) working for other players besides local controller
    animateWeapon = async function asyncCall(playerController) {
        for (i = 0; i < 6; i++) { 
            await new Promise(resolve => setTimeout(resolve, 10)); // .01 sec
            playerController.playerEquipmentGroup.x = i * 1.5;
        }
        for (i = 6; i >= 0; i--) { 
            await new Promise(resolve => setTimeout(resolve, 10)); // .01 sec
            playerController.playerEquipmentGroup.x = i * 1.5;
        }
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

function getRandomDarkColor() {
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

        // DARKEN
        return hex/2;
    }
     
}  

function bulletCollisionHandler(bullet, object) {
    bullet.kill();
}

function onInitialDataReceived(data) {
    dungeonData = data.dungeon;
    dungeonDimensions = data.dungeon.length;
    localPlayerController.playerData.id = data.id;
    hasReceivedInitialData = true;
    placeDungeon();
    spawnPlayer();
    configureInput();
    configureCamera();
    replyToInitialData();
}

function lerp (start, end, amt) {
    return (1-amt)*start+amt*end
}

function onAttackDataReceived(data) {
    if(!(data.attackingId === undefined)) {
        var attackingPc = getPlayerControllerById(data.attackingId);
        
        if(!isLocalPlayerController(attackingPc)) {
            // TODO: check for off screen
            animateWeapon(attackingPc);
            daggerSwish.play();
            daggerSwish.mute = false;
            daggerSwish.volume = 1;
        }
    }
    
    var wasPlayerHit = false;
    // HIT PLAYER?
    if (!(data.hitId === undefined)) {
        var debugSprite = game.add.sprite(data.xDebug, data.yDebug, 'x');

        debugSprite.anchor.x = .5;
        debugSprite.anchor.y = .5;
        debugSprite.scale.set(1);

        var hitPlayer = getPlayerControllerById(data.hitId);

        // no friendly fire
        if(hitPlayer == attackingPc) {
            return;
        }

        daggerHit.play();
        daggerHit.mute = false;
        daggerHit.volume = 1;

        wasPlayerHit = true;
        animateHit(hitPlayer);
        if (isLocalPlayerController(hitPlayer)) {
            localPlayerController.playerData.health -= 1;
            document.getElementById("Health").innerHTML = localPlayerController.playerData.health;
            }
    }

    
    // HIT ZOMBIES?
    var hitZombiesIds = data.hitZombieIds;
    hitZombiesIds.forEach(function(zid) {
        hitZombieController = allZombieControllers.filter(zc => zc.zombieData.id == zid)[0];
        allZombieControllers = allZombieControllers.filter(zc => zc != hitZombieController);
        hitZombieController.zombieSprite.kill();

        if(wasPlayerHit) {
            zombieScream.play();
        } else {
            zombieSlain.play();
        }
        
        daggerHit.play();


    });
    
    
}

function onDeathDataReceived(data) {
    var deadPlayer = getPlayerControllerById(data.deadPlayerId);

    allPlayerControllers.filter(pc => pc.playerData.id != data.deadPlayerId);
    deadPlayer.playerEquipmentGroup.destroy();
    deadPlayer.playerSprite.destroy();
    deadPlayer.playerBodyGroup.destroy();
    deadPlayer.playerSprite.tint = 0x000000;

    // TODO: check for off screen
    deathScream.play();

    if(isLocalPlayerController(getPlayerControllerById(data.deadPlayerId))) {
        document.body.style.backgroundColor = "red";
        deathScream.play();
        alert("You have been slain. Please do not refresh the page until the game has ended.");
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
    // originally was:
    // game.world.setBounds(-1 * 128, -1 * 128, (dungeonDimensions) * 128, (dungeonDimensions) * 128);
    // but we don't want players seeing past the edge walls

    game.world.setBounds(1 * 128 * dungeonScaleModifier, 1 * 128 * dungeonScaleModifier, 
        (dungeonDimensions - 2) * 128 * dungeonScaleModifier, (dungeonDimensions - 2) * 128 * dungeonScaleModifier);

    game.camera.follow(localPlayerController.playerSprite);
}

function placeDungeon() {
    for (var i = 0; i < dungeonData.length; i++) {
        for (var j = 0; j < dungeonData.length; j++) {
          if (dungeonData[i][j] == 0) {
            //var s = game.add.sprite(i * 128, j * 128, 'wall');
            //var scaleNeeded = 128/(s.width);
            //s.scale.set(scaleNeeded);
            //s.anchor.x = 0.5;
            //s.anchor.y = 0.5;

          }
          if (dungeonData[i][j] == 1) {
            var s = game.add.sprite(i * 128 * dungeonScaleModifier, j * 128 * dungeonScaleModifier, 'wall');
            var scaleNeeded = (128* dungeonScaleModifier)/(s.width);
            s.scale.set(scaleNeeded);
            s.tint = 0x222222;
            environmentGroup.add(s);
            s.anchor.x = 0.5;
            s.anchor.y = 0.5;
            game.physics.arcade.enable(s);
            s.body.immovable = true;
            s.body.moves = false;

        }

        if (dungeonData[i][j] == 2) {
            var s = game.add.sprite(i * 128 * dungeonScaleModifier, j * 128 * dungeonScaleModifier, 'chest');
            var scaleNeeded = (128* dungeonScaleModifier)/(s.width);
            scaleNeeded/=1.3;
            s.scale.set(scaleNeeded * 1.3);
            s.tint = 0xeeeeee;
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
    localPlayerController.playerData.x = iSpawnPos * 128 * dungeonScaleModifier;
    localPlayerController.playerData.y = jSpawnPos * 128 * dungeonScaleModifier;
}

function replyToInitialData() {
    socket.emit('start', localPlayerController.playerData);

    // Handle updates from the server
    socket.on('heartbeat', onHeartbeat);
    socket.on('attack', onAttackDataReceived);
    socket.on('death', onDeathDataReceived);

}

function isZombieContainedInZombieControllers(zombie, zombieControllers) {
    for (var i = 0; i < zombieControllers.length; i++) {
        if(zombieControllers[i].zombieData.id == zombie.id) {
            return true;
        }
    }

    return false;
}

function getNewZombieDatas(zombiesFromServer) {
    var zombiesNotContained = [];

    for (var i = 0; i < zombiesFromServer.length; i++) {

        if(isZombieContainedInZombieControllers(zombiesFromServer[i], allZombieControllers)) {
            continue;
        }

        zombiesNotContained.push(zombiesFromServer[i]);
    }

    return zombiesNotContained;
}

function updateExistingZombieDatas(zombiesFromServer) {
    for (var i = 0; i < zombiesFromServer.length; i++) {
        for (var j = 0; j < allZombieControllers.length; j++) {

            if(zombiesFromServer[i].id == allZombieControllers[j].zombieData.id) {
                allZombieControllers[j].zombieData = zombiesFromServer[i];
                continue;
            }
        }
    }
}

function onHeartbeat(data) {
    var serverPlayerDatas = data.playerDatasResponse;
    var zombieResponse = data.zombiesResponse;
    var newZombieDatas = getNewZombieDatas(zombieResponse);

    newZombieDatas.forEach(function(zd) {
        var newZombieController = new ZombieController(zd);
        allZombieControllers.push(newZombieController);
        danger.play();
    });

    updateExistingZombieDatas(zombieResponse);
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
                serverPlayerDatas[i].color, serverPlayerDatas[i].weapon, serverPlayerDatas[i].health, serverPlayerDatas[i].id, serverPlayerDatas[i].attackSpeed);
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
    game.world.bringToTop(pc.playerEquipmentGroup);

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

    allZombieControllers.forEach(function(zc) {
        zc.update();
    });

}

function render() {

    //weapon.debug();

}
