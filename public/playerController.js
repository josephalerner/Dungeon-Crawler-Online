function PlayerController(playerData, isOwnedPlayer) {
    // Initialize variables
    this.playerData = playerData;
    this.playerBodyGroup = game.add.group();
    this.playerEquipmentGroup = game.add.group();
    this.playerSprite = this.playerBodyGroup.create(0, 0, 'player');
    this.playerSprite.width = 80;
    this.playerSprite.height = 80;

    this.spectate = false;
    this.playerSprite.smoothed = true;
    this.playerSprite.antialiasing = true;
    this.isOwnedPlayer = isOwnedPlayer;
    var speed = 8;

    // Attach weapon
    this.playerBodyGroup.add(this.playerEquipmentGroup);  
    this.weapon = this.playerEquipmentGroup.create(0, 0, this.playerData.weapon);
    this.lastAttackTime = new Date().getTime();

    // Skin player body
    this.playerSprite.tint = this.playerData.color;

    document.getElementById("Health").innerHTML = this.playerData.health;


    this.weapon.scale.set(.15);

    /*
    var shield = this.playerEquipmentGroup.create(0, 0, 'shield');
    shield.x = -15;
    shield.y = -50;
    shield.rotation = -.5;
    shield.scale.set(.22);*/

    game.physics.arcade.enable(this.playerBodyGroup);

    this.update = function() {
        // Update visuals: anchor
        this.playerSprite.anchor.x = 0.5;
        this.playerSprite.anchor.y = 0.5;
        this.playerEquipmentGroup.forEach(function(item) {
            item.anchor.x = .1;
            item.anchor.y = 0.1;
        });
        
        // Update visuals: layering
        game.world.bringToTop(this.playerBodyGroup);
        game.world.bringToTop(this.playerEquipmentGroup);
        game.world.bringToTop(this.weapon);

        // Control player, if client owns it
        if (isOwnedPlayer) {

            
            // rotate to cursor
            this.playerData.rotation = game.physics.arcade.angleToPointer(this.playerBodyGroup);

            // handle movement, input, collisions really messy 
            game.physics.arcade.collide(this.playerSprite, environmentGroup, collisionHandler, null, this);
    


            var cursors = game.input.keyboard.createCursorKeys();

            var wKey;
            var aKey;
            var sKey;
            var dKey;

            wKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
            aKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
            sKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
            dKey = game.input.keyboard.addKey(Phaser.Keyboard.D);

            if ((cursors.left.isDown || aKey.isDown) && canMoveLeft)
            {
                this.playerData.x -= speed;
            }
            else if ((cursors.right.isDown || dKey.isDown) && canMoveRight)
            {
                this.playerData.x += speed;
        
            }
            if ((cursors.up.isDown || wKey.isDown) && canMoveDown)
            {
                this.playerData.y -= speed;
        
            }
            else if ((cursors.down.isDown || sKey.isDown) && canMoveUp)
            {
                this.playerData.y += speed;
            }
            
            if (game.input.activePointer.leftButton.isDown && (new Date().getTime()) > this.lastAttackTime + this.playerData.attackSpeed)
            {
                animateWeapon(this);
                daggerSwish.play();
                socket.emit('attack', localPlayerController.playerData);
                this.lastAttackTime = new Date().getTime();
            }

            canMoveLeft = true;
            canMoveRight = true;
            canMoveUp = true;
            canMoveDown = true;

            // Update visuals: position and rotation
            this.playerBodyGroup.x = this.playerData.x;
            this.playerBodyGroup.y = this.playerData.y;
            this.playerBodyGroup.rotation = this.playerData.rotation;
        } else {
            this.playerBodyGroup.x = lerp(this.playerBodyGroup.x, this.playerData.x, 0.1);
            this.playerBodyGroup.y = lerp(this.playerBodyGroup.y, this.playerData.y, 0.1);
            this.playerBodyGroup.rotation = lerp(this.playerBodyGroup.rotation, this.playerData.rotation, 0.1);
        }
    }
}

function collisionHandler (obj1, obj2) {
    var xDistanceFromCenter = Math.abs(this.playerBodyGroup.x - obj2.x);
    var yDistanceFromCenter = Math.abs(this.playerBodyGroup.y - obj2.y);
    
    var blockedVertically = xDistanceFromCenter < yDistanceFromCenter
    
    if(blockedVertically) {
        canMoveUp = obj2.y- this.playerBodyGroup.y < 0;
        canMoveDown = !canMoveUp;
    } else {
        canMoveRight = obj2.x- this.playerBodyGroup.x < 0;
        canMoveLeft = !canMoveRight;
    }

    if(obj2.tint == 0xeeeeee) {
        obj2.tint = 0x333333;

        levelUpAll(this);
    }

    function levelUpAll(pc) {
        if (pc.playerData.attackSpeed > 300) {
            pc.playerData.attackSpeed -= 70;
            pc.playerEquipmentGroup.scale.x += .02;
            pc.playerEquipmentGroup.scale.y += .02;
            pc.playerBodyGroup.scale.x += .02;
            pc.playerBodyGroup.scale.y += .02;
            pc.speed += .3;
            levelUp.play();
        }
    }
}
