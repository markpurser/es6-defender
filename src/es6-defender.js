
let PlayerState = Object.freeze({faceLeft:1, faceRight:2, exploding:3})

let InvaderState = Object.freeze({seeking:1, locked:2, abducting:3, mutant:4, exploding:5})

let Event = Object.freeze({locked:1, abducted:2, mutated:3, dead:4, remove:5})

let easing = 0.3;
let playerAccel = 0.1;
let playerDamping = 0.1;
let modulus = 512;
let projectileLifetime = 25;

class StateVector {
  
  constructor(id, x, y, xdot, ydot) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.xdot = xdot;
    this.ydot = ydot;
  }
}

class Player extends StateVector {

  constructor(id, x, y, state, t_startState) {
    super(id, x, y, 0, 0);

    this.state = state;
    this.t_startState = t_startState;
  }
}

Player.sideLen = 3;
Player.graphic = ['  /\n<--', '\\  \n-->']; 

class Invader extends StateVector {
  
  constructor(id, x, y, state, t_startState) {
    super(id, x, y, 0, 0);

    this.state = state;
    this.t_startState = t_startState;
  }
}

Invader.sideLen = 2;
Invader.graphic = '^^\n[]\n';

class Human extends StateVector {

  constructor(id, x, y) {
    super(id, x, y, 0, 0);
  }
}

class Projectile extends StateVector {

  constructor(id, x, y, xdot, ydot, t_spawned) {
    super(id, x, y, xdot, ydot);

    this.t_spawned = t_spawned;
  }
}

Projectile.sideLen = 1;
Projectile.graphic = '-';


let updatePlayerPosition = (sv, input) => {
  sv.xdot += playerAccel * input.leftright;
  sv.ydot += playerAccel * input.updown;

  sv.xdot += playerDamping * -sv.xdot;
  sv.ydot += playerDamping * -sv.ydot;

  sv.x += sv.xdot;
  sv.y += sv.ydot;

  sv.x %= modulus;

  return sv;
}

let updatePlayerState = (player, input) => {
  if(input.leftright != 0) {
    player.state = (input.leftright == -1) ? PlayerState.faceLeft : PlayerState.faceRight;
  }
}

let updateInvaderPosition = (sv, state, targetx, targety) => {
  switch(state) {
    case InvaderState.seeking:
      sv.x++;
      break;
  }

  sv.x %= modulus;

  return sv;
}

let updateProjectilePosition = (sv) => {
  sv.x += sv.xdot;
  sv.y += sv.ydot;

  sv.x %= modulus;

  return sv;
}

let cartesianProduct2 = (arr1, arr2) =>
  arr1.map(e1 => arr2.map(e2 => ({fst:e1, snd:e2}))).reduce((arr, e) => arr.concat(e), []);


let collided = ({x:x1, y:y1}, size1, {x:x2, y:y2}, size2) =>
    (x2 < (x1 + size1) &&
     x1 < (x2 + size2) &&
     y2 < (y1 + size1) &&
     y1 < (y2 + size2));


let detectCollisions = (svArr1, size1, svArr2, size2) =>
  cartesianProduct2(svArr1, svArr2)
    .filter(svPair => collided(svPair.fst, size1, svPair.snd, size2));


let checkSeekingInvaders = (invaders, humans) => {

}

let checkHitInvaders = (invaders, projectiles) =>
  detectCollisions(invaders, Invader.sideLen, projectiles, Projectile.sideLen)
    .map(collidedPair => {Event.dead, collidedPair.fst.id, collidedPair.snd.id});


let checkProjectiles = (projectiles, t) =>
  projectiles.filter(p => (t - p.t_spawned) > projectileLifetime)
    .map(p => ({event:'remove', id:p.id}));



let initArray = (n, f) => Array(n).fill().map(f);


let offsetx = 0;
let playerId = 1;
let invaderId = 100;
let player = new Player(playerId, 0, 64 / 2, PlayerState.faceRight, 0);
let invaders = initArray(2, _ => new Invader(invaderId++, Math.floor(Math.random() * modulus), 64 / 2, InvaderState.seeking, 0));
// humanId = 200;
// let humans = initArray(10, _ => new Human(id++, 4, 1));
let projectileId = 500;
let projectiles = [];
let graphics = new Map();

let t = 0;

let doGame = (fastTextMode, viewWidth, viewHeight, input) => {

  let toLocal = sv => {
    let lx = sv.x - offsetx;
    lx += viewWidth / 2;

    if((lx < 0) || (lx >= viewWidth))
    {
      lx -= modulus;
    }

    let ly = sv.y;

    return {id:sv.id, lx:lx, ly:ly};
  }

  let clip = lcoords => (lcoords.lx >= 0) && (lcoords.ly < viewWidth);


  updatePlayerState(player, input);

  if(input.fire) {
    projectiles.push(new Projectile(projectileId++, player.x, player.y+1, (player.state == PlayerState.faceLeft) ? -1 : 1, 0, t));
    if(projectileId >= 1000) projectileId = 500;
  }

  let projectileEvents = checkProjectiles(projectiles, t);

  projectileEvents.map(pe => {
    let i = projectiles.find(n => n.id == pe.id);
    projectiles.splice(i, 1);
    graphics.delete(pe.id);
  });

  graphics.set(player.id, (player.state == PlayerState.faceLeft) ? Player.graphic[0] : Player.graphic[1]);

  invaders.map(i => graphics.set(i.id, Invader.graphic));
  projectiles.map(p => graphics.set(p.id, Projectile.graphic));

  let displayArray = [].concat(
    updatePlayerPosition(player, input),
    invaders.map(i => updateInvaderPosition(i, i.state, 0, 0)),
    projectiles.map(updateProjectilePosition)
  );

  displayArray.map(toLocal)
    .filter(clip)
    .map(i => fastTextMode.setString(Math.floor(i.lx), Math.floor(i.ly), graphics.has(i.id) ? graphics.get(i.id) : '!'));


  let lpx = player.x - offsetx;
  lpx += viewWidth / 2;
  offsetx += easing * (lpx - (viewWidth / 2));

  offsetx %= modulus;



  // let e = checkSeekingInvaders(invaders.filter(i => i.state == InvaderState.seeking), humans);

  t++;
}

