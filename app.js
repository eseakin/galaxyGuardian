


class imageRepository {
  constructor(src) {
    this.background = new Image();
    this.background.src = src;
  }
}

class Drawable {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 0;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
  }
}

class Background extends Drawable {
  constructor(x, y) {
    super(x, y);
    this.speed = 1;
    this.image = new imageRepository('stars-sm.jpg');
  }

  draw() {
    this.y += this.speed;
    this.context.drawImage(this.image.background, this.x, this.y);
    this.context.drawImage(this.image.background, this.x, this.y - this.canvasHeight);

    if(this.y >= this.canvasHeight)
      this.y = 0;
  }
}

class Game {
  constructor() {
    this.bgCanvas = document.getElementById('background');

    if(!this.bgCanvas.getContext)
      return false;

    this.bgContext = this.bgCanvas.getContext('2d');
    this.background = new Background(0, 0);
    this.background.context = this.bgContext;
    this.background.canvasWidth = this.bgCanvas.width;
    this.background.canvasHeight = this.bgCanvas.height;
  }

  start() {
    console.log('start')
    animate();
  }
}

const game = new Game();

const animate = function() {
  game.background.draw();
  requestAnimationFrame(animate);
  // console.log('frame');
}

function test() {
  console.log('test')
}

const init = function() {
  if(game)
    game.start();
}

init();














