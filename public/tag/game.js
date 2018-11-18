var socket;

var id;


var game = new Phaser.Game(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update, render: render });
var colliders = []
function preload() {

    game.load.image('bullet', 'assets/bolt.png');
    game.load.image('ship', 'assets/player.png');
    game.load.image('dagger', 'assets/dagger.png');
    game.load.image('wall', 'assets/wall.png');
    socket = io.connect('localhost:3000');


}

var sprite;
var allPlayerSprites = [];
var weapon;
var cursors;
var fireButton;

var wKey;
var aKey;
var sKey;
var dKey;


var environmentGroup;
var playerEquipmentGroup;

var dungeonData = []
function dungeonDataEmit(data) {
    console.log("DUNGEON DATA");
    dungeonData = data;
}


function create() {
    socket.on('dungeonDataEmit', dungeonDataEmit);

    environmentGroup = game.add.group();
    playerEquipmentGroup = game.add.group();
    weapon = game.add.weapon(100, 'bullet');
    weapon.fireLimit = 3;
    this.wKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
    this.aKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
    this.sKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
    this.dKey = game.input.keyboard.addKey(Phaser.Keyboard.D);

    //  The bullet will be automatically killed when it leaves the world bounds
    weapon.bulletKillType = Phaser.Weapon.KILL_NEVER;

    //  Because our bullet is drawn facing up, we need to offset its rotation:
    weapon.bulletAngleOffset = 0;
    weapon.bullets.setAll('scale.x', 1);
    weapon.bullets.setAll('scale.y', 1);
    //  The speed at which the bullet is fired
    weapon.bulletSpeed = 1000;

    //  Speed-up the rate of fire, allowing them to shoot 1 bullet every 60ms
    weapon.fireRate = 400;

    //  Add a variance to the bullet angle by +- this value
    weapon.bulletAngleVariance = 10;

    
    //dungeonData = createMap(dimensions, maxTunnels, maxLength);
    //placeDungeon(dungeonData)
    sprite = this.add.sprite(0, 0, 'ship');
    console.log("SPRITE: " + sprite);

    sprite.scale.set(1);
    sprite.tint = 0xff00ff;
    game.physics.arcade.enable(sprite);
    game.physics.arcade.enable(environmentGroup);
    environmentGroup.immovable = true;

    daggerSprite = this.add.sprite(0, 0, 'dagger');
    playerEquipmentGroup.add(daggerSprite);

    game.world.scale.set(1);
    environmentGroup.forEach(function(item) {
        item.body.setSize(
            item.body.width    * 1,
            item.body.height   * 1,
            item.body.offset.x * 1,
            item.body.offset.y * 1
            );
        });
}

function onHeartbeat(data) {
    var playersInData = data;

    for (var i = 0; i < playersInData.length; i++) {
        if (playersInData[i].id == socket.id)
            continue;
            
        var playerAlreadyCreated = false;

        console.log("HERE");

        for (var j = 0; j < allPlayerSprites.length; j++) {
            console.log("check a player sprite... " + (allPlayerSprites[j].id == playersInData[i].id) + ", " + allPlayerSprites[j].id + ", " + playersInData[i].id);
            if(allPlayerSprites[j].id == playersInData[i].id) {
                console.log("UPDATE A PLAYER")

                console.log(playersInData[i].x + " vs " + allPlayerSprites[j].x)
                console.log(playersInData[i].y + " vs " + allPlayerSprites[j].y)
                allPlayerSprites[j].x = playersInData[i].x;
                allPlayerSprites[j].y = playersInData[i].y;
                playerAlreadyCreated = true;
                console.log(playerAlreadyCreated);
            }
        }

        if (playerAlreadyCreated == false) {
            console.log("Cous");
            var cous = game.add.sprite(playersInData[i].x, playersInData[i].y, 'ship');
            cous.scale.set(0.05);
            cous.tint = 0x00ffff;
            game.physics.arcade.enable(cous);
            cous.id = playersInData[i].id;
            allPlayerSprites.push(cous);
        }
    }

}

function bulletCollisionHandler(bullet, object){
    bullet.kill();
    // …
}

var hasStarted = false;
function update() {

    


    game.physics.arcade.collide(sprite, environmentGroup);
    game.physics.arcade.collide(weapon.bullets, environmentGroup, bulletCollisionHandler, null, this);
    

    

    if (dungeonData === undefined || dungeonData.length == 0) {
        console.log("NO DUNGEON DATA RECEIVED YET");
        return;

    } else if (hasStarted == false) {
        hasStarted = true;

        for (var i = 0; i < dungeonData.length; i++) {
            for (var j = 0; j < dungeonData.length; j++) {
                //console.log(dungeonData[i][j]);
              if (dungeonData[i][j] == 0) {
                var s = this.add.sprite(i * 128, j * 128, 'wall');
                var scaleNeeded = 128/(s.width);
                s.scale.set(scaleNeeded);
                s.anchor.x = 0.5;
                s.anchor.y = 0.5;
    
              }
              if (dungeonData[i][j] == 1) {
                var s = this.add.sprite(i * 128, j * 128, 'wall');
                var scaleNeeded = 128/(s.width);
                s.scale.set(scaleNeeded);
                s.tint = 0x222222;
                environmentGroup.add(s);
                s.anchor.x = 0.5;
                s.anchor.y = 0.5;
                colliders += s;
                game.physics.arcade.enable(s);
                s.body.immovable = true;s.body.moves = false;
    
            }
          }
        }
    
        game.physics.arcade.enable(environmentGroup);
    
    
        var iSpawnPos = 0;
        var jSpawnPos = 0;
        
        while(true) {
            iSpawnPos = Math.floor(Math.random() * dungeonData.length);
            jSpawnPos = Math.floor(Math.random() * dungeonData.length);
    
            if (dungeonData[iSpawnPos][jSpawnPos] == 0) {
                break;
            }
            
    

        }
    
        //  Tell the Weapon to track the 'player' Sprite, offset by 14px horizontally, 0 vertically
        weapon.trackSprite(sprite, 44, 0, true);
    
        cursors = this.input.keyboard.createCursorKeys();
    
        fireButton = this.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
    
        game.world.setBounds(-1 * 128, -1 * 128, 23 * 128, 26 * 128);
    
        game.physics.arcade.enable(sprite);
        game.camera.follow(sprite);
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
    
        sprite.x = iSpawnPos * 128;
        sprite.y = jSpawnPos * 128;
        game.world.bringToTop(sprite);
        game.world.bringToTop(weapon.bullets);

        var data = {
            x: sprite.x,
            y: sprite.y
        };
        
        socket.emit('start', data);
        console.log(data);
        socket.on('heartbeat', onHeartbeat);


    
    
    }

    
    var data = {
        x: sprite.x,
        y: sprite.y
    };

    socket.emit('update', data);
    


    game.world.setAll('immovable', true);


    sprite.rotation = game.physics.arcade.angleToPointer(sprite);
    
    sprite.body.velocity.x = 0;
    sprite.body.velocity.y = 0;

    var speed = 280;

    if (cursors.left.isDown || this.aKey.isDown)
    {
        sprite.body.velocity.x = -speed;
    }
    else if (cursors.right.isDown || this.dKey.isDown)
    {
        sprite.body.velocity.x = speed;
    }
    if (cursors.up.isDown || this.wKey.isDown)
    {
        sprite.body.velocity.y = -speed;
    }
    else if (cursors.down.isDown || this.sKey.isDown)
    {
        sprite.body.velocity.y = speed;
    }

    if (game.input.activePointer.leftButton.isDown)
    {
        weapon.fireLimit += 1;
        weapon.fire();
    }

    
    playerEquipmentGroup.forEach(function(item) {
        item.x = sprite.x;
        item.y = sprite.y;
        item.scale.set(1);
        item.rotation = sprite.rotation;
        game.world.bringToTop(playerEquipmentGroup);
    });

}

function render() {

    weapon.debug();

}
