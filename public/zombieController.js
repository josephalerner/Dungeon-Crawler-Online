function ZombieController(zombieData) {
  // Initialize variables
  this.zombieData = zombieData;
  this.zombieSprite = game.add.sprite(200, 200, 'zombie');;
  this.zombieSprite.width = 80;
  this.zombieSprite.height = 80;

  this.zombieSprite.smoothed = true;
  this.zombieSprite.antialiasing = true;

  this.zombieSprite.tint = 0xffffff;

  //game.physics.arcade.enable(this.zombieSprite);

  this.zombieSprite.x = zombieData.x;
  this.zombieSprite.y = zombieData.y;
  this.zombieSprite.rotation = zombieData.rotation;

  this.update = function() {
      // Update visuals: anchor
      this.zombieSprite.anchor.x = 0.5;
      this.zombieSprite.anchor.y = 0.5;

      // Update visuals: position and rotation
      this.zombieSprite.x = lerp(this.zombieSprite.x, this.zombieData.x, 0.1);
      this.zombieSprite.y = lerp(this.zombieSprite.y, this.zombieData.y, 0.1);
      this.zombieSprite.rotation = lerp(this.zombieSprite.rotation, this.zombieData.rotation, 0.1);

      game.world.bringToTop(this.zombieSprite);


  }
}