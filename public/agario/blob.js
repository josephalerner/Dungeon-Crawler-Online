function Blob(x, y, r) { 
    this.pos = createVector(x, y);
    this.r = r;
    this.vel = createVector(0,0);

    this.update = function() {
        var newVel = createVector(mouseX-(width/2), mouseY-(height/2)); 
        newVel.setMag(3); 
        // looks like for vectors lerp is a method built in the class! cool.
        this.vel.lerp(newVel, 0.4);
        this.pos.add(this.vel);
    }

    this.constrain = function() {
        blob.pos.x = constrain(blob.pos.x, -width, width);
        blob.pos.y = constrain(blob.pos.y, -height, height);
    }

    this.show = function() { 
        fill(255);
        ellipse(this.pos.x, this.pos.y, this.r * 2, this.r * 2);
    }

    this.eats = function(other) {
        var d = p5.Vector.dist(this.pos, other.pos);
        if (d < this.r + other.r) {
            var sum = PI * this.r * this.r + PI * other.r * other.r;
            this.r = sqrt(sum/PI);
            return true;
        }

        return false;
    }
}
