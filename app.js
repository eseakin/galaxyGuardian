document.getElementById('loading').style.display = 'block';

let settings = {
  //volume
  mainVolume: .25,
  effectsVolume: .5,
  musicVolume: 0,
  
  //basics
  startLevel: 1,
  startScore: 0,
  wavesBeforeBoss: 4,
  powerUpSpeed: 2.5,

  //player stats
  playerBulletCount: 90,
  playerMaxLife: 3,
  playerFireRate: 25, //lower is faster
  playerSpeed: 3,
  playerWeapon: 1,

  //enemy stats
  enemyBaseSpeed: 1,
  enemySpeedPerLevel: .25,
  enemyPool: 40,
  addedEnemiesPerWave: 5,
  enemyBulletCount: 75,
  enemyBaseLife: 0,
  percentFire: .0005,
  percentFireMultiplier: 1.3, //multiplied every wave

  //boss stats
  bossBaseLife: 10,
  bossLifeMult: 2,
  bossBaseSpeed: 2,
  bossBulletCount: 30,
  bossMissileSpeed: 6,
  bossSpeedMultiplier: 1.1,
}

let game, game2;
let audioLoaded = false;
let imagesLoaded = false;
let loadedItems = 0;
let totalItemsToLoad = 1;

const init = () => {
  if(!game)
    game = new Game();

  if(game && audioLoaded && imagesLoaded) {
    document.getElementById('loading').style.display = 'none';
    game.menu();
  }
}

const reset = () => {
  console.log('reset')
  game = new Game();
  init();
}

function checkReadyState() {
  const percent = Math.floor(loadedItems / totalItemsToLoad * 100);
  document.getElementById('progress').innerHTML = percent + '%';
  // game.gameOverAudio.readyState === 4 && 
  if(game.backgroundAudio.readyState === 4) {
    window.clearInterval(game.checkAudio);
    audioLoaded = true;
    loadedItems++;
    init();
  }
}

class imageRepository {
  constructor() {
    const imageNames = [
      'galaxyGuardian',
      'gameOver',
      'paused',
      'settings',
      'background', 
      'ship', 
      'bullet', 
      'alien', 
      'alien2',
      // 'alienCargo',
      'boss',
      'bossBullet',
      'bossBulletHit',
      'bossExplode',
      // 'greenFire',
      // 'greenExplosion',
      'fireball', 
      'explosionSm', 
      'explosionBig',
      'forceField',
      'forceFieldBoss',
      'powerup1',
      'powerup2',
      'powerup3',
      'powerup4'
    ]
    this.images = {};

    //make sure all images load before starting
    let numLoaded = 0;
    const numImages = imageNames.length;
    totalItemsToLoad += numImages;

    const imageLoaded = (key) => {
      console.log(`loaded: ${key}`)
      numLoaded++;
      loadedItems++;
      let percent = Math.floor(loadedItems / totalItemsToLoad * 100);
      document.getElementById('progress').innerHTML = percent + '%';

      if(numLoaded === numImages) {
        imagesLoaded = true;
        init();
      }
    }

    for(let key of imageNames) {
      this.images[key] = new Image();

      let image = this.images[key];
      image.onload = () => imageLoaded(key);

      if(key === 'background')
        image.src = `images/${key}.jpg`
      else  
        image.src = `images/${key}.png`
    };
  }
}

const repo = new imageRepository();

class Drawable {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = 0;
    this.collidableWith = '';
    this.isColliding = false;
    this.type = '';
  }

  isCollidableWith(obj) {
    return (this.collidableWith === obj.type)
  }
}

class Background extends Drawable {
  constructor(x, y) {
    super(x, y);
    this.speed = 1;
  }

  draw() {
    this.y += this.speed;
    this.context.drawImage(repo.images.background, this.x, this.y);
    this.context.drawImage(repo.images.background, this.x, this.y - this.canvasHeight * 2);

    if(this.y >= this.canvasHeight * 2)
      this.y = 0;
  }
}

class Title extends Drawable {
  constructor(x, y, width, height, fileName) {
    super(x, y, width, height);
    this.fileName = fileName;
  }

  draw(x, y) {
    this.x = x;
    this.y = y;
    this.context.drawImage(repo.images[this.fileName], this.x, this.y);
  }

  clear() {
    this.context.clearRect(this.x-10, this.y-10, this.width+20, this.height+20);
  }
}

class Game {
  constructor() {
    // console.log('game')
    this.KEY_CODES = {
      32: 'space',
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down',
      27: 'esc'
    }

    this.KEY_STATUS = {};
    for(let code in this.KEY_CODES) {
      this.KEY_STATUS[this.KEY_CODES[code]] = false;
    }

    document.onkeydown = (e) => {
      const keyCode = (e.keyCode) ? e.keyCode : e.charCode;
      if (this.KEY_CODES[keyCode]) {
        e.preventDefault();
        this.KEY_STATUS[this.KEY_CODES[keyCode]] = true;

        if(this.KEY_STATUS.esc) {
          if(this.pause && !this.isMenuOpen)
            this.unpause();
          else if(!this.pause && !this.isMenuOpen)
            this.pauseGame();
        }
      }
    }

    document.onkeyup = (e) => {
      const keyCode = (e.keyCode) ? e.keyCode : e.charCode;
      if (this.KEY_CODES[keyCode]) {
        e.preventDefault();
        this.KEY_STATUS[this.KEY_CODES[keyCode]] = false;
      }
    }

    this.playerScore = settings.startScore;
    this.level = settings.startLevel;
    this.pause = false;
    this.isMenuOpen = true;
    this.backgroundPause = true;
    this.bossAlive = false;
    this.spawnWaveFlag = true;
    this.gameOverFlag = false;

    this.bgCanvas = document.getElementById('background');
    this.shipCanvas = document.getElementById('ship');
    this.mainCanvas = document.getElementById('main');
    this.titlesCanvas = document.getElementById('titles');

    if(!this.bgCanvas || !this.bgCanvas.getContext)
      return false;

    this.bgContext = this.bgCanvas.getContext('2d');
    this.shipContext = this.shipCanvas.getContext('2d');
    this.mainContext = this.mainCanvas.getContext('2d');
    this.titlesContext = this.titlesCanvas.getContext('2d');

    this.background = new Background(0, 0);
    this.background.context = this.bgContext;
    this.background.canvasWidth = this.bgCanvas.width;
    this.background.canvasHeight = this.bgCanvas.height;
    
    Bullet.prototype.context = this.mainContext;
    Bullet.prototype.canvasWidth = this.mainCanvas.width;
    Bullet.prototype.canvasHeight = this.mainCanvas.height;

    Effect.prototype.context = this.mainContext;
    Effect.prototype.canvasWidth = this.mainCanvas.width;
    Effect.prototype.canvasHeight = this.mainCanvas.height;

    Title.prototype.context = this.titlesContext;
    Title.prototype.canvasWidth = this.titlesCanvas.width;
    Title.prototype.canvasHeight = this.titlesCanvas.height;

    this.pausedTitle = new Title(0, 0, repo.images.paused.width, repo.images.paused.height, 'paused');
    this.gameOverTitle = new Title(0, 0, repo.images.gameOver.width, repo.images.gameOver.height, 'gameOver');
    this.settingsTitle = new Title(0, 0, repo.images.settings.width, repo.images.settings.height, 'settings');
    this.gameTitle = new Title(0, 0, repo.images.galaxyGuardian.width, repo.images.galaxyGuardian.height, 'galaxyGuardian');

    this.shipX = this.shipCanvas.width /2 - repo.images.ship.width/2;
    this.shipY = this.shipCanvas.height - repo.images.ship.height *2;
    this.ship = new Ship(this.shipX, this.shipY, repo.images.ship.width, repo.images.ship.height);
    this.ship.context = this.shipContext;
    this.ship.canvasHeight = this.shipCanvas.height;
    this.ship.canvasWidth = this.shipCanvas.width;

    Alien.prototype.context = this.shipContext;
    Alien.prototype.canvasWidth = this.shipCanvas.width;
    Alien.prototype.canvasHeight = this.shipCanvas.height;
    this.enemyPool = new BulletPool(settings.enemyPool, 'alien');
    this.enemyBulletPool = new BulletPool(75, 'fireball');
    this.enemy2Pool = new BulletPool(10, 'alien2');
    // this.enemyBulletPool = new BulletPool(settings.enemyBulletCount, 'fireball');

    Boss.prototype.context = this.shipContext;
    Boss.prototype.canvasWidth = this.shipCanvas.width;
    Boss.prototype.canvasHeight = this.shipCanvas.height;
    this.bossPool = new BulletPool(1, 'boss');
    this.bossBulletPool = new BulletPool(45, 'bossBullet');
    this.bossHitPool = new BulletPool(10, 'bossBulletHit');

    this.explosionSmPool = new BulletPool(50, 'explosionSm');
    this.explosionBigPool = new BulletPool(10, 'explosionBig');
    this.explosionBossPool = new BulletPool(1, 'bossExplode');

    this.forceFieldPool = new BulletPool(30, 'forceField');
    this.forceFieldBossPool = new BulletPool(20, 'forceFieldBoss');
    this.powerup1Pool = new BulletPool(3, 'powerup1');
    this.powerup2Pool = new BulletPool(3, 'powerup2');
    this.powerup3Pool = new BulletPool(3, 'powerup3');
    this.powerup4Pool = new BulletPool(3, 'powerup4');

    this.quadTree = new QuadTree({
      x: 0,
      y: 0,
      width: this.mainCanvas.width,
      height: this.mainCanvas.height
    });

    this.missile = new SoundPool(10, 'missile');
    // this.fireball = new SoundPool(30, 'fireball');
    this.bossBullet = new SoundPool(10, 'bossBullet');
    this.explosionSm = new SoundPool(30, 'explosionSm');
    this.explosionBig = new SoundPool(10, 'explosionBig');
    this.shieldsLow = new SoundPool(2, 'shieldsLow');
    this.shieldRecharge = new SoundPool(2, 'shieldRecharge');
    this.chargeUp = new SoundPool(7, 'chargeUp');
    this.chargeRelease = new SoundPool(7, 'chargeRelease');

    this.backgroundAudio = new Audio('sounds/music.mp3');
    this.backgroundAudio.loop = true;
    this.backgroundAudio.volume = settings.mainVolume * settings.musicVolume;
    this.backgroundAudio.load();
    // this.gameOverAudio = new Audio('sounds/gameover.mp3');
    // this.gameOverAudio.loop = true;
    // this.gameOverAudio.volume = settings.mainVolume * settings.musicVolume;
    // this.gameOverAudio.load();
    this.checkAudio = setInterval(checkReadyState, 200);
  }

  detectCollision() {
    const objects = [];
    this.quadTree.getAllObjects(objects);

    objects.forEach((obj1) => {
      const obj = [];
      this.quadTree.findObjects(obj, obj1);

      obj.forEach((obj2) => {
        if((obj1.collidableWith === obj2.type || obj2.isCollidableWith === obj1.type)
          && (obj1.x < obj2.x + obj2.width
          && obj1.x + obj1.width > obj2.x
          && obj1.y < obj2.y + obj2.height
          && obj1.y + obj1.height > obj2.y)) {
          if(obj1.type === 'powerup') {
            obj1.isColliding = true;
          } else if(obj2.type === 'powerup') {
            obj2.isColliding = true;
          } else {
            obj1.isColliding = true;
            obj2.isColliding = true;
          }
        }
      });
    });
  }

  animateBackground() {
    if(!this.backgroundPause) {
      this.background.draw();
      requestAnimationFrame(this.animateBackground.bind(this));
    }
  }

  animate() {
    if(this.pause)
      return;

    //collision
    this.quadTree.clear();
    this.quadTree.insert(this.ship);
    this.quadTree.insert(this.ship.bulletPool.getPool());
    this.quadTree.insert(this.enemyPool.getPool());
    this.quadTree.insert(this.enemy2Pool.getPool());
    this.quadTree.insert(this.bossPool.getPool());
    this.quadTree.insert(this.bossBulletPool.getPool());
    this.quadTree.insert(this.enemyBulletPool.getPool());
    this.quadTree.insert(this.powerup1Pool.getPool());
    this.quadTree.insert(this.powerup2Pool.getPool());
    this.quadTree.insert(this.powerup3Pool.getPool());
    this.quadTree.insert(this.powerup4Pool.getPool());
    this.detectCollision();

    //all enemies dead, spawn new wave
    if(this.enemyPool.getPool().length === 0 && !this.bossAlive && !this.spawnWaveFlag) {
      this.spawnWaveFlag = true;

      setTimeout(() => {
        this.level++;
        this.spawnWave(this.level);
      }, 2000)
    }

    //player died
    if(!this.ship.alive) {
      this.gameOver();
      return;
    }

    requestAnimationFrame(this.animate.bind(this));

    this.ship.move();
    this.ship.bulletPool.animate();

    this.enemyPool.animate();
    this.enemy2Pool.animate();
    this.enemyBulletPool.animate();
    this.bossPool.animate();
    this.bossBulletPool.animate();

    this.forceFieldPool.animate();
    this.forceFieldBossPool.animate();
    this.powerup1Pool.animate();
    this.powerup2Pool.animate();
    this.powerup3Pool.animate();
    this.powerup4Pool.animate();

    this.bossHitPool.animate();
    this.explosionSmPool.animate();
    this.explosionBigPool.animate();
    this.explosionBossPool.animate();


    document.getElementById('score').innerHTML = game.playerScore;
  }

  menu() {
    document.getElementById('scoreContainer').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    this.shipContext.clearRect(0, 0, this.shipCanvas.width, this.shipCanvas.height);
    this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

    this.isMenuOpen = true;
    this.backgroundAudio.play();
    if(this.backgroundPause) {
      this.backgroundPause = false;
      this.animateBackground();
    }

    this.gameTitle.draw(512 - this.gameTitle.width/2, 110 - this.gameTitle.height/2);
    document.getElementById('menu').style.display = 'block';
    document.getElementById('youtube').style.display = 'block';
  }

  gameOver() {
    this.isMenuOpen = true;
    this.gameOverFlag = true;
    this.backgroundPause = true;
    this.backgroundAudio.pause();
    // this.gameOverAudio.currentTime = 0;
    // this.gameOverAudio.play();
    this.gameOverTitle.draw(512 - this.gameOverTitle.width/2, 125 - this.gameOverTitle.height/2);
    this.ship.alive = false;
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('youtube').style.display = 'block';
  }

  pauseGame() {
    this.backgroundPause = true;
    this.backgroundAudio.pause();
    this.pausedTitle.draw(512 - this.pausedTitle.width/2, 125 - this.pausedTitle.height/2);

    this.pause = true;
    document.getElementById('pause').style.display = 'block';
    document.getElementById('youtube').style.display = 'block';
  }

  unpause() {
    this.backgroundPause = false;
    this.animateBackground();
    this.backgroundAudio.play();
    this.pausedTitle.clear();

    this.pause = false;
    document.getElementById('pause').style.display = 'none';
    document.getElementById('youtube').style.display = 'none';
    this.animate();
  }

  restart() {
    this.isMenuOpen = false;
    this.backgroundPause = false;
    this.playerScore = settings.startScore;
    this.level = settings.startLevel;
    this.pause = false;
    this.bossAlive = false;
    this.spawnWaveFlag = true;
    this.gameOverFlag = false;
    
    this.animateBackground();

    // this.gameOverAudio.pause();
    this.backgroundAudio.play();
    console.log('restart')
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('youtube').style.display = 'none';

    this.bgContext.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    this.shipContext.clearRect(0, 0, this.shipCanvas.width, this.shipCanvas.height);
    this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.quadTree.clear();
    
    this.ship = new Ship(this.shipX, this.shipY, repo.images.ship.width, repo.images.ship.height);
    this.ship.context = this.shipContext;
    this.ship.canvasHeight = this.shipCanvas.height;
    this.ship.canvasWidth = this.shipCanvas.width;

    this.enemyBulletPool = new BulletPool(75, 'fireball');
    this.enemyPool = new BulletPool(settings.enemyPool, 'alien');
    this.enemy2Pool = new BulletPool(10, 'alien2');
    this.bossPool = new BulletPool(1, 'boss');
    this.bossBulletPool = new BulletPool(45, 'bossBullet');
    document.getElementById('bossLifeBarContainer').style.display = 'none';
    document.getElementById('bossLifeBar').style.display = 'none';

    // this.backgroundAudio.currentTime = 0;
    // this.backgroundAudio.play();
    this.start();
  }

  randomNeg() {
    if(Math.round(Math.random()))
      return 1
    else 
      return -1
  }

  randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  settingsMenu() {
    this.isMenuOpen = true;
    document.getElementById('pause').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('youtube').style.display = 'none';
    this.gameOverTitle.clear();
    this.pausedTitle.clear();
    this.gameTitle.clear();

    const form = document.getElementById('settingsForm');

    if(!form.childNodes.length) {
      const numSettings = Object.keys(settings).length;
      let rows = Math.floor(numSettings / 3);
      if(numSettings % 3 > 0)
        rows++;

      let counter = 1;
      let column;

      for(let key in settings) {
        if(counter % rows === 0 || counter === 1) {
          column = document.createElement('div');
          column.className = 'settingsColumn';
          form.appendChild(column);
        }

        const d = document.createElement('div');
        const span = document.createElement('span');
        span.innerHTML = key;
        const input = document.createElement('input');
        input.name = key;

        column.appendChild(d)
        d.appendChild(span)
        d.appendChild(input)
        counter++;
      }
    }
    
    document.getElementById('settingsMenu').style.display = 'block';
    this.settingsTitle.draw(512 - this.settingsTitle.width/2, 125 - this.settingsTitle.height/2);

    //fill in values
    // const form = document.getElementById('settingsForm');
    for(let i = 0; i < form.length; i++) {
      const field = form.elements[i].name;
      form.elements[i].value = settings[field];
      // console.log(`${field} ${settings[field]} ${form.elements[i].value}`)
    }
  }

  submitSettings() {
    const form = document.getElementById('settingsForm');
    for(let i = 0; i < form.length; i++) {
      const field = form.elements[i].name;
      const value = form.elements[i].value;
      // console.log(`${value} ${parseInt(value)}`)

      if(!isNaN(value) && value >= 0)
        settings[field] = parseFloat(value);
      else
        console.log(`failed: field: ${field} setting: ${settings[field]} value: ${value} !isNaN: ${!isNaN(value)}  >=0: ${value >= 0}`);

    }

    if(settings.musicVolume > 1)
      settings.musicVolume = 1;
    if(settings.mainVolume > 1)
      settings.mainVolume = 1;
    if(settings.effectsVolume > 1)
      settings.effectsVolume = 1;

    this.settingsTitle.clear();
    document.getElementById('settingsMenu').style.display = 'none';
    document.onkeydown = null;
    document.onkeyup = null;
    this.backgroundAudio.pause();

    //clear canvas
    this.backgroundPause = true;
    // this.bgContext.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    this.shipContext.clearRect(0, 0, this.shipCanvas.width, this.shipCanvas.height);
    this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.titlesContext.clearRect(0, 0, this.titlesCanvas.width, this.titlesCanvas.height);

    //clear HUD
    if(game.bossAlive) {
      const lifeBarContainer = document.getElementById('bossLifeBarContainer');
      const lifeBar = document.getElementById('bossLifeBar');
      lifeBar.style.width = 0;
      lifeBarContainer.style.display = 'none';
      lifeBar.style.display = 'none';
    }
    
    const scoreContainer = document.getElementById('scoreContainer');
    scoreContainer.style.display = 'none';

    //remove any leftover shield spans
    const container = document.getElementById('shieldContainer');
    while(container.firstChild) {
        container.removeChild(container.firstChild);
    }

    document.getElementById('loading').style.display = 'block';
    setTimeout(reset, 1000); 
  }

  cancelSettings() {
    this.settingsTitle.clear();
    document.getElementById('settingsMenu').style.display = 'none';
    this.isMenuOpen = false;

    if(this.pause && this.ship.alive) 
      this.pauseGame();
    else if(this.gameOverFlag)
      this.gameOver();
    else
      this.menu();
  }

  start() {
    this.isMenuOpen = false;
    console.log('start')
    this.ship.draw();
    this.spawnWave(this.level);
    this.backgroundAudio.play();
    this.gameOverFlag = false;
    this.animate();
    document.getElementById('menu').style.display = 'none';
    document.getElementById('youtube').style.display = 'none';
    document.getElementById('scoreContainer').style.display = 'block';
    this.gameTitle.clear();
  }

  spawnWave(level) {
    // level = settings.wavesBeforeBoss
    if(level % settings.wavesBeforeBoss != 0) {
      const height = repo.images.alien.height;
      const width = repo.images.alien.width;
      let x = 200;
      let y = -height -205;
      const spacer = height * 1.15;
      
      let count = settings.addedEnemiesPerWave * level;
      if(count > settings.enemyPool)
        count = settings.enemyPool;

      if(level >= 3) {
        setTimeout(() => {
          const y = -272;
          this.enemy2Pool.get(x, y, 0, 3);
          let spawnCount = Math.floor(level / 4)
          for(let i = 0; i < spawnCount; i++) {
            this.enemy2Pool.get(100 + x * i, y, 0, 3);
          }
        }, 3000)
      }

      for(let i = 1; i <= count; i++) {
        this.enemyPool.get(x, y, 0, settings.enemyBaseSpeed + settings.enemySpeedPerLevel*level);
        x += width + 30;
        if(i/10 % 2 === 0) {
          x = 200;
          y += spacer;
        } else if(i/10 % 2 === 1) {
          x = 225;
          y += spacer;
        }
      }
    } else {
      this.bossAlive = true;

      this.enemyPool.get(game.randomInt(200, 500), -50, 0, 1 * level);
      this.enemyPool.get(game.randomInt(550, 824), -50, 0, 1 * level);

      setTimeout(() => this.bossPool.get(512 - repo.images.boss.width/2, -100, 4 * game.randomNeg(), 2), 2000)
      setTimeout(() => {
        for(let i = 1; i < level / settings.wavesBeforeBoss; i++) {
          this.enemy2Pool.get(200 * i, -200, 0, 3);
        }
      }, 4000)
    }

    this.spawnWaveFlag = false;
  }

  spawnPowerups(x, y) {
    setTimeout(() => {
      let level = this.level;
      this.powerup1Pool.get(x + this.randomInt(-45, -5) -20, y + this.randomInt(-25, 25) -20, .2, -settings.powerUpSpeed)
      
      if(Math.floor(Math.random() * 2))
        this.powerup3Pool.get(x + this.randomInt(5, 45) -20, y + this.randomInt(-25, 25) -20, -.2, -settings.powerUpSpeed)
      else
        this.powerup4Pool.get(x + this.randomInt(5, 45) -20, y + this.randomInt(-25, 25) -20, -.2, -settings.powerUpSpeed)
    }, 400)
  }
}

class SoundPool {
  constructor(maxSize, type) {
    this.maxSize = maxSize;
    this.pool = [];
    this.currSound = 0;

    if(type === 'missile') {
      for (let i = 0; i < this.maxSize; i++) {
        const missile = new Audio('sounds/missile.mp3');
        missile.volume = settings.mainVolume * settings.effectsVolume;
        missile.load();
        this.pool[i] = missile;
      }
    } else if(type === 'chargeUp') {
      for (let i = 0; i < this.maxSize; i++) {
        const explosion = new Audio('sounds/chargeUp.ogg');
        explosion.volume = settings.mainVolume * settings.effectsVolume;
        explosion.load();
        this.pool[i] = explosion;
      }
    } else if(type === 'chargeRelease') {
      for (let i = 0; i < this.maxSize; i++) {
        const explosion = new Audio('sounds/chargeRelease.ogg');
        explosion.volume = settings.mainVolume * settings.effectsVolume;
        explosion.load();
        this.pool[i] = explosion;
      }
    } else if(type === 'bossBullet') {
      for (let i = 0; i < this.maxSize; i++) {
        const explosion = new Audio('sounds/bossBullet.ogg');
        explosion.volume = settings.mainVolume * settings.effectsVolume;
        explosion.load();
        this.pool[i] = explosion;
      }
    } else if(type === 'shieldRecharge') {
      for (let i = 0; i < this.maxSize; i++) {
        const explosion = new Audio('sounds/shieldRecharge.mp3');
        explosion.volume = settings.mainVolume * settings.effectsVolume;
        explosion.load();
        this.pool[i] = explosion;
      }
    } else if(type === 'shieldsLow') {
      for (let i = 0; i < this.maxSize; i++) {
        const explosion = new Audio('sounds/shieldsLow.m4a');
        explosion.volume = settings.mainVolume * settings.effectsVolume;
        explosion.load();
        this.pool[i] = explosion;
      }
    } else if(type === 'explosionSm') {
      for (let i = 0; i < this.maxSize; i++) {
        const explosion = new Audio('sounds/explosionSm.mp3');
        explosion.volume = settings.mainVolume * settings.effectsVolume;
        explosion.load();
        this.pool[i] = explosion;
      }
    } else if(type === 'explosionBig') {
      for (let i = 0; i < this.maxSize; i++) {
        const explosion = new Audio('sounds/explosionBig.mp3');
        explosion.volume = settings.mainVolume * settings.effectsVolume;
        explosion.load();
        this.pool[i] = explosion;
      }
    }
  }

  get() {
    if(this.pool[this.currSound].currentTime === 0 || this.pool[this.currSound].ended) {
      this.pool[this.currSound].play();
    }
    this.currSound = (this.currSound + 1) % this.maxSize;
  }
}

class BulletPool {
  constructor(maxBullets, bulletType) {
    this.pool = [];
    this.maxBullets = maxBullets;
    this.bulletType = bulletType;
    let bullet;

    if(this.bulletType === 'bullet') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Bullet(0, 0, repo.images.bullet.width, repo.images.bullet.height, 'bullet');
        bullet.collidableWith = 'enemy';
        bullet.type = 'bullet';
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'powerup1') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Bullet(0, 0, repo.images.powerup1.width, repo.images.powerup1.height, 'powerup1');
        bullet.collidableWith = 'player';
        bullet.type = 'powerup';
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'powerup2') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Bullet(0, 0, repo.images.powerup2.width, repo.images.powerup2.height, 'powerup2');
        bullet.collidableWith = 'player';
        bullet.type = 'powerup';
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'powerup3') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Bullet(0, 0, repo.images.powerup3.width, repo.images.powerup3.height, 'powerup3');
        bullet.collidableWith = 'player';
        bullet.type = 'powerup';
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'powerup4') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Bullet(0, 0, repo.images.powerup4.width, repo.images.powerup4.height, 'powerup4');
        bullet.collidableWith = 'player';
        bullet.type = 'powerup';
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'fireball') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Bullet(0, 0, repo.images.fireball.width, repo.images.fireball.height, 'fireball');
        bullet.collidableWith = 'player';
        bullet.type = 'fireball';
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'bossBullet') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Bullet(0, 0, repo.images.bossBullet.width, repo.images.bossBullet.height, 'bossBullet');
        bullet.collidableWith = 'player';
        bullet.type = 'fireball';
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'alien') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Alien(0, 0, repo.images.alien.width, repo.images.alien.height);
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'alien2') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Alien2(0, 0, repo.images.alien2.width, repo.images.alien2.height);
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'boss') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Boss(0, 0, repo.images.boss.width, repo.images.boss.height);
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'explosionSm') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Effect(0, 0, repo.images.explosionSm.width, repo.images.explosionSm.height, 'explosionSm');
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'explosionBig') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Effect(0, 0, repo.images.explosionBig.width, repo.images.explosionBig.height, 'explosionBig');
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'bossBulletHit') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Effect(0, 0, repo.images.bossBulletHit.width, repo.images.bossBulletHit.height, 'bossBulletHit');
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'bossExplode') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Effect(0, 0, repo.images.bossExplode.width, repo.images.bossExplode.height, 'bossExplode');
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'forceField') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Effect(0, 0, repo.images.forceField.width, repo.images.forceField.height, 'forceField');
        this.pool[i] = bullet;
      }
    } else if(this.bulletType === 'forceFieldBoss') {
      for(let i = 0; i < this.maxBullets; i++) {
        bullet = new Effect(0, 0, repo.images.forceFieldBoss.width, repo.images.forceFieldBoss.height, 'forceFieldBoss');
        this.pool[i] = bullet;
      }
    }      
  }

  get(x, y, speedX, speedY, duration, rotation) {
    
    if(!this.pool[this.maxBullets - 1].alive) {
      this.pool[this.maxBullets - 1].spawn(x, y, speedX, speedY, duration, rotation);
      this.pool.unshift(this.pool.pop());
    }
  }

  getPool() {
    const results = [];
    
    for(let i = 0; i < this.maxBullets; i++) {
      if(this.pool[i].alive) {
        results.push(this.pool[i])
      }
    }

    return results;
  }

  animate() {
    for(let i = 0; i < this.maxBullets; i++) {
      const bullet = this.pool[i];

      if(bullet.alive) {
        if(bullet.draw()) {
          bullet.clear();
          this.pool.push(this.pool.splice(i, 1)[0]);
        }
      } else {
        return;
      }
    }
  }
}

class Bullet extends Drawable {
  constructor(x, y, width, height, bulletType) {
    super(x, y, width, height);
    this.alive = false;
    this.bulletType = bulletType;
  }

  spawn(x, y, speedX, speedY, duration, rotation) {
    this.x = x;
    this.y = y;

    if(this.bulletType === 'bullet') {
      const rand = Math.round(Math.random());
      const center = x - this.width/2 + ((Math.random() - Math.random()) * Math.max(30, 3 * game.ship.weapon));
      
      if(rand)
        this.x = center - this.width/2;
      else
        this.x = center + this.width/2;
    }
    
    this.speedX = speedX;
    this.speedY = speedY;
    this.alive = true;
  }

  draw() {
    // console.log('bullet draw', this.bulletType)

    this.context.clearRect(this.x, this.y, this.width, this.height);
    this.x -= this.speedX;
    this.y -= this.speedY;

    // if(this.bulletType === 'bossBullet'){
    //   //Homing missile
    //   if(Math.abs(game.ship.x - this.x) < 50 && Math.abs(game.ship.y - this.y) < 100){
    //     if(game.ship.x < this.x)
    //       this.x -= 1
    //     else
    //       this.x += 1
    //   }
    // }

    if(this.isColliding && (this.bulletType === 'bullet' || this.bulletType === 'fireball')) {
      this.isColliding = false;
      game.explosionSm.get();
      game.explosionSmPool.get(this.x + this.width/2, this.y + this.width/2, 0, 0, 5);
      return true;
    } else if(this.isColliding && this.bulletType === 'bossBullet') {
      this.isColliding = false;
      game.explosionSm.get();
      game.bossHitPool.get(this.x + this.width/2, this.y + this.width/2, 0, 0, 5);
      return true;
    } else if(this.type === 'powerup') {
      if(this.isColliding) {
        this.isColliding = false;

        if(this.bulletType === 'powerup1') {
          game.ship.weapon++;
        
        } else if(this.bulletType === 'powerup2') {
        
        } else if(this.bulletType === 'powerup3') {
          game.ship.gainLife();
          game.ship.maxLife++;
        } else if(this.bulletType === 'powerup4') {
          game.ship.fireRate /= 2;
          setTimeout(() => game.ship.fireRate *=2, 20000);
        }

        game.explosionBig.get();
        game.explosionBigPool.get(this.x + this.width/2, this.y + this.width/2, 0, 0, 5)
        return true;
      } else if(this.x < 0 || this.x + this.width > this.canvasWidth) {
        this.speedX = -this.speedX
      } else if(this.y > this.canvasHeight - this.height) {
        this.speedY = 0;
        this.y -= 5;
      }
    }
    
    if(this.bulletType === 'bullet' && this.y <= 0 - this.height) {
      return true;
    } else if((this.type === 'fireball' || this.type === 'powerup') && this.y >= this.canvasHeight) {
      return true;
    } else {
      this.context.drawImage(repo.images[this.bulletType], this.x, this.y);
    }
  }

  clear() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.alive = false;
    this.isColliding = false;
  }
}

class Effect extends Drawable {
  constructor(x, y, width, height, effectType, scale, frameX, frameY) {
    scale = scale || 1;
    super(x, y, width * scale, height * scale);
    this.alive = false;
    this.effectType = effectType;
    this.rotation = 0;
    this.scale = scale;
    this.currFrame = 0;
    this.frameX = frameX;
    this.frameY = frameY;
  }

  spawn(x, y, speedX, speedY, duration, rotation, scale) {
    scale = scale || 1;
    this.rotation = rotation;
    this.x = x;
    this.y = y;
  
    this.scale = scale;
    this.width *= scale;
    this.height *= scale;

    this.speedX = speedX;
    this.speedY = speedY;
    this.alive = true;
    this.duration = duration;
    this.frameCounter = 0;
  }

  draw() {
    // console.log('draw', this.x, this.y, this.speed, this.frameCounter, this.duration)

    let x = this.x;
    let y = this.y;
    this.x += this.speedX;
    this.y += this.speedY;

    if(!this.rotation) {
      this.context.clearRect(x - this.width/2, y - this.height/2, this.width, this.height);
  
      if(this.frameCounter >= this.duration)
        return true;

      this.frameCounter++;
      this.context.drawImage(repo.images[this.effectType], this.x - this.width/2, this.y - this.height/2);

    } else {
      this.context.save();
      this.context.translate(x, y);
      this.context.rotate(this.rotation);

      x = -this.width/2
      y = -this.height/2

      this.context.clearRect(x, y, this.width * this.scale, this.height * this.scale);
      this.context.restore();
      
      if(this.frameCounter >= this.duration)
        return true;

      this.context.save();
      this.context.translate(this.x, this.y);
      this.context.rotate(this.rotation);

      x = -this.width/2
      y = -this.height/2

      this.frameCounter++;
      this.context.drawImage(repo.images[this.effectType], x, y, this.width * this.scale, this.height * this.scale);
      this.context.restore();
    }
  }

  clear() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.alive = false;
    this.isColliding = false;
  }
}

class Ship extends Drawable {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.speed = 3.5;
    this.bulletPool = new BulletPool(settings.playerBulletCount, 'bullet');
    this.fireRate = settings.playerFireRate;
    this.counter = 0;
    this.healCounter = 0;
    this.ticksToHeal = 300;
    this.collidableWith = 'fireball';
    this.type = 'player';
    this.alive = true;
    this.maxLife = settings.playerMaxLife;
    // this.life = settings.playerMaxLife;
    this.life = 0;
    this.weapon = settings.playerWeapon;

    const container = document.getElementById('shieldContainer');

    for(let i = 0; i < this.maxLife; i++) {
      // const shieldSpan = document.createElement('span');
      // shieldSpan.className = 'shield';
      // container.appendChild(shieldSpan);
      this.gainLife();
    }
  }

  draw() {
    this.context.drawImage(repo.images.ship, this.x, this.y);
  }

  getHit() {
    this.loseLife();
    this.healCounter = 0;
    this.ticksToHeal = 300;
    
    if(this.life >= 1) {
      game.forceFieldPool.get(this.x + this.width/2, this.y, 0, 0, 5);
      this.isColliding = false;
      
    } else {
      this.context.clearRect(this.x, this.y, this.width, this.height);
      game.explosionBigPool.get(this.x + this.width/2, this.y + this.height/2, 0, 0, 5);
      game.explosionBig.get();
      game.gameOver();
    }
  }

  loseLife() {
    const container = document.getElementById('shieldContainer');
    if(this.life === 2) {
      game.shieldsLow.get();
      container.childNodes[0].style.backgroundColor = '#e80000';
      container.childNodes[1].style.backgroundColor = '#e80000';
    }
    const shieldSpan = container.childNodes[this.life-1];
    shieldSpan.style.width = 0;
    setTimeout(() => container.removeChild(shieldSpan), 2000);

    this.life--;
    
    
  }

  gainLife() {
    const container = document.getElementById('shieldContainer');

    if(this.life === 1){
      container.childNodes[0].style.backgroundColor = 'rgba(96, 191, 255, .85)';
    }

    this.life++;
    const shieldSpan = document.createElement('span');
    shieldSpan.className = 'shield';
    shieldSpan.style.width = 0;
    container.appendChild(shieldSpan);
    setTimeout(() => shieldSpan.style.width = '50px', 200);
  }

  move() {
    this.counter++;
    this.healCounter++;
    // console.log('healCounter', this.healCounter)

    if(this.healCounter > this.ticksToHeal && this.life < this.maxLife) {
      // console.log('healing')
      if(this.ticksToHeal === 300) {
        game.shieldRecharge.get();
        this.ticksToHeal = 100;
      }

      this.gainLife();
      this.healCounter = 0;
    }

    if(this.isColliding)
      this.getHit();

    let KEY_STATUS = game.KEY_STATUS;
    if(KEY_STATUS.left || KEY_STATUS.right || KEY_STATUS.up || KEY_STATUS.down) {
      this.context.clearRect(this.x, this.y, this.width, this.height);
      // console.log(`canvas: ${this.canvasWidth} x ${this.canvasHeight} ship: ${this.width} x ${this.height}`)

      if(KEY_STATUS.left) {
        this.x -= this.speed;
        if(this.x <= 0)
          this.x = 0;
      }

      if(KEY_STATUS.right) {
        this.x += this.speed;
        if(this.x >= this.canvasWidth - this.width)
          this.x = this.canvasWidth - this.width;
      }

      if(KEY_STATUS.up) {
        this.y -= this.speed;
        if(this.y <= this.canvasHeight *3/4 - this.height)
          this.y = this.canvasHeight *3/4 - this.height;
      }

      if(KEY_STATUS.down) {
        this.y += this.speed;
        if(this.y >= this.canvasHeight - this.height)
          this.y = this.canvasHeight - this.height;
      }

      if(!this.isColliding)
        this.draw();
        
    }
    if(KEY_STATUS.space && this.counter >= this.fireRate) {
      this.fire();
      this.counter = 0;
    }
  }

  fire() {
    for(let i = 0; i < this.weapon; i++) {
      this.bulletPool.get(this.x + this.width/2, this.y +15 - 5*i, 0, 3);
    }
    game.missile.get();
  }

  reset(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.alive = true;
  }
}

class Alien extends Drawable {
  constructor(x, y, width, height, maxLife = settings.enemyBaseLife) {
    super(x, y, width, height);
    this.percentFire = settings.percentFire;
    this.alive = false;
    this.collidableWith = 'bullet';
    this.type = 'enemy';
    this.maxLife = maxLife;
    this.life = maxLife;
  }

  spawn(x, y, speedX, speedY) {
    this.x = x;
    this.y = y;
    this.speedX = speedX;
    this.speedY = speedY;
    this.alive = true;
    this.leftEdge = this.x - 200;
    this.rightEdge = this.x + 200;
    this.bottomEdge = this.y + 340;
    this.percentFire *= settings.percentFireMultiplier;
    this.maxLife++;
    this.life = this.maxLife;
  }

  draw() {
    this.context.clearRect(this.x, this.y, this.width, this.height);
    this.x += this.speedX;
    this.y += this.speedY;
    
    if(this.x <= this.leftEdge || this.x > this.rightEdge + this.width) {
      if(Math.abs(this.speedX) < 3)
        this.speedX *= 1.2;
      this.speedX = -this.speedX

    } else if(this.y >= this.bottomEdge) {
      this.speedY = 0;
      this.y -= 5;
      this.speedX = -1;
    }

    if(!this.isColliding || (this.isColliding && this.life > 1)) {
      if(this.isColliding) {
        this.life--;
        game.playerScore += 20;
        game.forceFieldPool.get(this.x + this.width/2, this.y + this.height -20, this.speedX, this.speedY, 5, Math.PI);
        game.explosionSm.get();
        this.isColliding = false;
      }

      this.context.drawImage(repo.images.alien, this.x, this.y);

      const chance = Math.floor(Math.random() * 1001);
      if(chance/1000 <= this.percentFire) {
        this.fire();
      }
      return false;      
    } else if(this.isColliding && this.life === 1) {
      game.playerScore += 100;
      game.explosionBig.get();
      game.explosionBigPool.get(this.x + this.width/2, this.y + this.height/2, this.speedX, this.speedY, 10);
      return true;        
    }
  }

  fire() {
    // console.log('alien fire', this.x + this.width/2, this.y + this.height)
    game.missile.get();
    game.enemyBulletPool.get(this.x + this.width/2, this.y + this.height -50, 0, -3 - .1*game.level - this.speedY);
  }

  clear() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.speedX = 0;
    this.speedY = 0;
    this.alive = false;
    this.isColliding = false;
  }
}

class Alien2 extends Alien {
  constructor(x, y, width, height, maxLife = settings.enemyBaseLife) {
    super(x, y, width, height, maxLife);
    this.percentFire = settings.percentFire *2;
    this.alive = false;
    this.collidableWith = 'bullet';
    this.type = 'enemy';
    this.maxLife = maxLife;
    this.life = maxLife;
  }

  spawn(x, y, speedX, speedY) {
    super.spawn(x, y, speedX, speedY);
    this.speed = this.speedX;
    this.firing = false;
    this.leftEdge = 0;
    this.rightEdge = this.canvasWidth - this.width;
    this.bottomEdge = this.y + 272;
    setTimeout(() => this.fire(), 3000);
  }

  draw() {
    // console.log('alien draw', this.x, this.y)

    this.context.clearRect(this.x, this.y, this.width, this.height);
    this.x += this.speedX;
    this.y += this.speedY;
    
    if(this.x <= this.leftEdge || this.x > this.rightEdge) {
      if(Math.abs(this.speedX) < 3)
        this.speedX *= 1.2;
      this.speedX = -this.speedX

    } else if(this.y >= this.bottomEdge) {
      this.speedY = 0;
      this.y -= 5;
      this.speedX = -1.25;
    }

    if(!this.isColliding || (this.isColliding && this.life > 1)) {
      if(this.isColliding) {
        this.life--;
        game.playerScore += 20;
        game.forceFieldPool.get(this.x + this.width/2, this.y + this.height -20, this.speedX, this.speedY, 5, Math.PI);
        game.explosionSm.get();
        this.isColliding = false;
      }

      this.context.drawImage(repo.images.alien2, this.x, this.y);

      const chance = Math.floor(Math.random() * 1001);
      if(chance/1000 <= this.percentFire) {
        this.fire();
      }
      return false;      
    } else if(this.isColliding && this.life === 1) {
      game.playerScore += 100;
      game.explosionBig.get();
      game.explosionBigPool.get(this.x + this.width/2, this.y + this.height/2, this.speedX, this.speedY, 10);
      return true;        
    }
  }

  fire() {
    // console.log('alien fire', this.x + this.width/2, this.y + this.height)
    if(this.firing || !this.alive)
      return

    this.firing = true;
    let speedX = this.speedX;
    let shipX = game.ship.x;
    let shipY = game.ship.y;
    this.speedX = 0;
    game.chargeUp.get();
    game.bossHitPool.get(this.x + this.width/2, this.y + this.height/2, 0, 0, 45);
    setTimeout(() => {
      if(!this.alive)
        return

      game.chargeRelease.get();
      // game.bossBullet.get();
      const shipDx = shipX - game.ship.x;
      const shipDy = shipY - game.ship.y;
      const dx = (this.x + this.width/2) - (game.ship.x + game.ship.width/2 - shipDx);
      const dy = (this.y + this.width/2) - (game.ship.y + game.ship.width/2 - shipDy);
      game.bossBulletPool.get(this.x + this.width/2, this.y + this.height -50, dx/45, dy/45);
      this.speedX = speedX;
      this.firing = false;
    }, 750);
  }
}

class Boss extends Alien {
  constructor(x, y, width, height, maxLife = settings.bossBaseLife) {
    super(x, y, width, height, maxLife);
    this.percentFire = .01;
    this.turnRate = settings.bossTurnRate;
    this.alive = false;
    this.collidableWith = 'bullet';
    this.type = 'enemy';
    this.maxLife = maxLife;
    this.life = maxLife;
    this.rotation = 0;
    this.frameCounter = 0;
    this.recalculating = false;
    this.firingCharges = 6;
    this.bulletSpeed = 5;
    this.lifeBarContainer = document.getElementById('bossLifeBarContainer');
    this.lifeBar = document.getElementById('bossLifeBar');
    this.missileSpeed = settings.bossMissileSpeed;
  }

  spawn(x, y, speedX, speedY) {
    this.x = x;
    this.y = y;
    this.speedX = speedX;
    this.speedY = speedY;
    this.alive = true;
    this.leftEdge = 0;
    this.rightEdge = 900;
    this.bottomEdge = 200;
    this.percentFire *= settings.percentFireMultiplier;
    this.maxLife = Math.floor(this.maxLife * settings.bossLifeMult);
    this.life = this.maxLife;
    this.bossOnScreen = false;
    this.frameCounter = 0;
    this.recalculating = false;
    this.firing = false;
    this.firingCharges += 2;
    this.showLifeBar();
    this.missileSpeed *= settings.bossSpeedMultiplier;
  }

  draw() {
    this.frameCounter++;

    const chance = Math.floor(Math.random() * 1001);
    if(chance/1000 <= this.percentFire && !this.firing) {
      this.fire();
    }

    //randomly recalculate
    if(this.frameCounter > 560) {
      this.recalculate(game.randomNeg(), game.randomNeg());
    }

    if(!this.bossOnScreen && this.y > 0)
      this.bossOnScreen = true;

    let x = this.x;
    let y = this.y;
    this.x += this.speedX;
    this.y += this.speedY;

    if(!this.rotation) {
      this.context.clearRect(x-4, y-4, this.width+8, this.height+8);

      this.context.drawImage(repo.images.boss, this.x, this.y);

    } else {
      this.context.save();
      this.context.translate(x, y);
      this.context.rotate(this.rotation);

      x = -this.width/2
      y = -this.height/2

      this.context.clearRect(x, y, this.width, this.height);
      this.context.restore();

      this.context.save();
      this.context.translate(this.x, this.y);
      this.context.rotate(this.rotation);

      x = -this.width/2
      y = -this.height/2

      this.context.drawImage(repo.images.boss, x, y);
      this.context.restore();
    }

    if(this.checkCollision()) {
      return true;
    }
  }

  checkCollision() {
    if(this.x <= this.leftEdge) {
      this.x = this.leftEdge;
      this.recalculate(1, 0);
    }
    if(this.x >= this.rightEdge + this.width) {
      this.x = this.rightEdge + this.width;
      this.recalculate(1, 0);
    }
    if(this.y >= this.bottomEdge) {
      this.y = this.bottomEdge;
      this.recalculate(0, 1);
    }
    if(this.y <= 0 && this.bossOnScreen) {
      this.y = 0;
      this.recalculate(0, 1);
    }

    //boss hit
    if(this.isColliding && this.life > 1) {
      if(this.isColliding) {
        this.life--;
        this.loseLife();
        game.playerScore += 50;
        game.forceFieldBossPool.get(this.x + this.width/2, this.y + this.height -10, this.speedX, this.speedY, 5);
        game.explosionSm.get();
        this.isColliding = false;
      }

      return false;      
    //boss dead
    } else if(this.isColliding && this.life === 1) {
      this.life--;
      this.loseLife();
      game.playerScore += 5000;
      this.speedX = 0;
      this.speedY = 0;
      this.deathX = this.x;
      this.deathY = this.y;
      let tick = 0;
      let ctx = this;
      this.bossDeathInterval = setInterval(() => {
        if(tick > 3) {
          this.hideLifeBar();
          this.context.clearRect(this.deathX, this.deathY, this.width, this.height);
          game.explosionBig.get();
          game.explosionBossPool.get(this.deathX + this.width/2, this.deathY + this.height/2, this.speedX, this.speedY, 10);
          window.clearInterval(ctx.bossDeathInterval);
          game.spawnPowerups(this.deathX + this.width/2, this.deathY + this.height/2);
        }
        game.bossAlive = false;
        game.explosionBig.get();
        game.explosionBigPool.get(this.deathX + Math.random() * this.width, this.deathY + Math.random() * this.height, this.speedX, this.speedY, 10);
        tick++;
      }, 350);
      return true;        
    }
    return false;
  }

  recalculate(dx, dy) {
    this.frameCounter = 0;

    if(!this.recalculating) {
      this.recalculating = true;

      this.speedX = 7 * game.randomNeg();
      this.speedY = 4 * game.randomNeg();
  
      // console.log('recalculating', this.speedX, this.speedY)

      setTimeout(() => {
        if(!game.bossAlive)
          return
        this.aimAndFire()
      }, (1 + Math.random() * 2) * 1000);

    } else {
      if(dx)
        this.speedX = -this.speedX;
      if(dy)
        this.speedY = -this.speedY;
    }
  }

  fire() {
    // console.log('alien fire', this.x + this.width/2, this.y + this.height)
    const cx = this.x + this.width/2;
    const cy = this.y + this.height/2;
    const dx = cx - (game.ship.x + game.ship.width/2);
    const dy = cy - (game.ship.y + game.ship.height/2);
    // x2 + y2 = 5^2
    // x2 + y2 = 25
    // x2 + y2 = 25
    // x2 + y2 = 25

    // x/y = d
    // x = d/y
    // y = x/d

    // x2/d2 + x2 = 25

    // x2(1/d2 + 1) = 25

    // sqrt(25/(1/d2 + 1)) = sqrt(x2)

    const d = dx/dy;
    let x;
    const speed = this.missileSpeed * .7;
    const s = speed * speed;

    if(dx < 0)
      x = -Math.sqrt(s/(1/(d*d) + 1))
    else
      x = Math.sqrt(s/(1/(d*d) + 1))

    const y = -Math.abs(x/d);

    // console.log(`fire: ${x} ${y}`)

    game.bossBullet.get();
    game.bossBulletPool.get(cx, cy, x * game.randomInt(8, 12)/10, y * game.randomInt(8, 12)/10);
  }

  aimAndFire() {
    if(game.pause)
      return
    // console.log('aimAndFire')
    this.firing = true;
    this.speedX = 0;
    this.speedY = 0;
    this.timeouts = [];
    let x = this.x;
    let y = this.y;
    // game.chargeUp.get();

    this.timeouts.push(setTimeout(() => {
      if(!game.bossAlive || !game.ship.alive || game.pause) {
        while(this.timeouts.length) {
          // console.log('clearing timeout', this.timeouts.length)
          let ctx = this;
          clearTimeout(ctx.timeouts[ctx.timeouts.length - 1]);
          this.timeouts.pop();
        }
        return
      }

      for(let i = 0; i < this.firingCharges; i++) {
        this.timeouts.push(setTimeout(() => {
          if(!game.bossAlive || !game.ship.alive || game.pause) {
            while(this.timeouts.length) {
              // console.log('clearing timeout', this.timeouts.length)
              let ctx = this;
              clearTimeout(ctx.timeouts[ctx.timeouts.length - 1]);
              this.timeouts.pop();
            }
            return
          }
          
          const cx = this.x + this.width/2;
          const cy = this.y + this.height/2;
          const dx = cx - (game.ship.x + game.ship.width/2);
          const dy = cy - (game.ship.y + game.ship.height/2);

          const d = dx/dy;
          const speed = this.missileSpeed;
          const s = speed * speed;

          let x;
          if(dx < 0)
            x = -Math.sqrt(s/(1/(d*d) + 1))
          else
            x = Math.sqrt(s/(1/(d*d) + 1))

          const y = -Math.abs(x/d);

          // console.log(`fire: ${x} ${y}`)

          game.bossBullet.get();
          game.bossBulletPool.get(cx+20, cy, x, y);
          game.bossBulletPool.get(cx-20, cy, x, y);
        }, 200 * i))      
      }
    }, 1000))

    setTimeout(() => {
      this.firing = false;
      if(!game.bossAlive)
        return
      this.speedX = (1 + Math.random()) * game.randomNeg();
      this.speedY = (.25 + Math.random()) * game.randomNeg();
      // console.log('business as usual', this.speedX, this.speedY)
      setTimeout(() => this.recalculating = false, (2 + Math.random() * 2) * 1000);
    }, 4000)
  }

  showLifeBar() {
    this.lifeBarContainer.style.display = 'block';
    this.lifeBar.style.display = 'block';
    setTimeout(() => this.lifeBar.style.width = '500px', 200);
  }

  hideLifeBar() {
    this.lifeBarContainer.style.display = 'none';
    this.lifeBar.style.display = 'none';
  }

  loseLife() {
    const width = Math.floor(this.life / this.maxLife * 500);
    this.lifeBar.style.width = width + 'px';
  }

  clear() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.speedX = 0;
    this.speedY = 0;
    this.alive = false;
    this.isColliding = false;
    this.rotation = 0;
  }
}

class QuadTree {
  constructor(boundBox, level) {
    this.bounds = boundBox || {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
    this.objects = [];
    this.nodes = [];
    this.level = level || 0;
    this.maxLevels = 5;
  }

  clear() {
    this.objects = [];
    this.nodes.forEach((node) => node.clear());
    this.nodes = [];
  }

  getAllObjects(returnedObjects) {
    this.nodes.forEach((node) => node.getAllObjects(returnedObjects));
    this.objects.forEach((object) => returnedObjects.push(object))
  }

  findObjects(returnedObjects, obj) {
    if(!obj) {
      console.log('undefined object')
      return;
    }

    const index = this.getIndex(obj);
    if(index !== -1 && this.nodes.length) {
      this.nodes[index].findObjects(returnedObjects, obj);
    }

    this.objects.forEach((object) => returnedObjects.push(object));
    return returnedObjects;
  }

  insert(obj) {
    // console.log('quadTree insert')
    if(!obj)
      return;

    if(obj instanceof Array) {
      obj.forEach((ele) => this.insert(ele));
      return;
    }

    if(this.nodes.length) {
      const index = this.getIndex(obj);
      if(index != -1) {
        this.nodes[index].insert(obj);
        return;
      }
    }

    this.objects.push(obj);

    if(this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if(this.nodes[0] === null) {
        this.split();
      }
      let i = 0;
      while(i < this.objects.length) {
        let index = this.getIndex(this.objects[i]);
        if(index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  getIndex(obj) {
    let index = -1;
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    const topQuadrant = (obj.y < horizontalMidpoint && obj.y + obj.height < horizontalMidpoint);
    const bottomQuadrant = (obj.y > horizontalMidpoint);

    if(obj.x < verticalMidpoint && obj.x + obj.width < verticalMidpoint) {
      if(topQuadrant)
        index = 1;
      else if(bottomQuadrant)
        index = 2;
    } else if(obj.x > verticalMidpoint) {
      if(topQuadrant)
        index = 0;
      else if(bottomQuadrant)
        index = 3;
    }

    return index;
  }

  split() {
    const subWidth = (this.bounds.width / 2) | 0;
    const subHeight = (this.bounds.height / 2) | 0;

    this.nodes[0] = new QuadTree({
      x: this.bounds.x + subWidth,
      y: this.bounds.y,
      width: subWidth,
      height: subHeight
    }, this.level + 1);

    this.nodes[1] = new QuadTree({
      x: this.bounds.x,
      y: this.bounds.y,
      width: subWidth,
      height: subHeight
    }, this.level + 1);    

    this.nodes[2] = new QuadTree({
      x: this.bounds.x,
      y: this.bounds.y + subHeight,
      width: subWidth,
      height: subHeight
    }, this.level + 1);

    this.nodes[3] = new QuadTree({
      x: this.bounds.x + subWidth,
      y: this.bounds.y + subHeight,
      width: subWidth,
      height: subHeight
    }, this.level + 1);
  }
}
















