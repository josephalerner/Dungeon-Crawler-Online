function PlayerController(playerData, isOwnedPlayer) {
    // Initialize variables
    this.playerData = playerData;
    this.playerBodyGroup = game.add.group();
    this.playerEquipmentGroup = game.add.group();
    this.playerSprite = this.playerBodyGroup.create(0, 0, 'player');
    this.isOwnedPlayer = isOwnedPlayer;

    // Attach weapon
    this.playerBodyGroup.add(this.playerEquipmentGroup);  
    this.playerEquipmentGroup.create(0, 0, this.playerData.weapon);
    this.isAttacking = false;

    // Skin player body
    this.playerSprite.scale.set(1);
    this.playerSprite.tint = this.playerData.color;

    game.physics.arcade.enable(this.playerBodyGroup);

    this.update = function() {
        // Update visuals: anchor
        this.playerSprite.anchor.x = 0.5;
        this.playerSprite.anchor.y = 0.5;
        this.playerEquipmentGroup.forEach(function(item) {
            item.anchor.x = 0.1;
            item.anchor.y = 0.1;
        });
        
        // Update visuals: layering
        game.world.bringToTop(this.playerBodyGroup);
        game.world.bringToTop(this.playerEquipmentGroup);

        // Control player, if client owns it
        if (isOwnedPlayer) {
            
            // rotate to cursor
            this.playerData.rotation = game.physics.arcade.angleToPointer(this.playerBodyGroup);

            // handle movement, input, collisions really messy 
            game.physics.arcade.collide(this.playerSprite, environmentGroup, collisionHandler, null, this);
    
            var speed = 5;


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
            
            if (game.input.activePointer.leftButton.isDown && !this.isAttacking)
            {
                animateWeapon(this);
                daggerSwish.play();
                daggerSwish.mute = false;
                daggerSwish.volume = 1;
                socket.emit('attack', localPlayerController.playerData);
            }

            canMoveLeft = true;
            canMoveRight = true;
            canMoveUp = true;
            canMoveDown = true;

        }

        // Update visuals: position and rotation
        this.playerBodyGroup.x = this.playerData.x;
        this.playerBodyGroup.y = this.playerData.y;
        this.playerBodyGroup.rotation = this.playerData.rotation;

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
}
