
let PlayerState = Object.freeze({faceLeft:1, faceRight:2, exploding:3})

let InvaderState = Object.freeze({seeking:1, locked:2, abducting:3, mutant:4, exploding:5})

let Event = Object.freeze({locked:1, abducted:2, mutated:3, dead:4, remove:5})

let easing = 0.3;
let modulus = 512;

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

class Projectile extends StateVector {}

Projectile.sideLen = 1;
Projectile.graphic = ['*'];


let updatePlayerPosition = (sv, input) => {
  sv.x += input.leftright;
  sv.y += input.updown;

  sv.x %= modulus;

  return sv;
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

let cartesianProduct2 = (arr1, arr2) =>
  arr1.map(e1 => arr2.map(e2 => ({fst:e1, snd:e2}))).reduce((arr, e) => arr.concat(e), []);


let haveCollided = ({x:x1, y:y1}, size1, {x:x2, y:y2}, size2) =>
    (x2 < (x1 + size1) &&
     x1 < (x2 + size2) &&
     y2 < (y1 + size1) &&
     y1 < (y2 + size2));


let detectCollisions = (svArr1, size1, svArr2, size2) =>
  cartesianProduct2(svArr1, svArr2)
    .filter(svPair => haveCollided(svPair.fst, size1, svPair.snd, size2));


let checkSeekingInvaders = (invaders, humans) => {

}

let checkHitInvaders = (invaders, projectiles) =>
  detectCollisions(invaders, Invader.sideLen, projectiles, Projectile.sideLen)
    .map(collidedPair => {Event.dead, collidedPair.fst.id, collidedPair.snd.id});



let initArray = (n, f) => Array(n).fill().map(f);


let offsetx = 0;
let playerId = 1;
let invaderId = 100;
let player = new Player(playerId, 0, 64 / 2, PlayerState.faceRight, 0);
let invaders = initArray(2, _ => new Invader(invaderId++, Math.floor(Math.random() * modulus), 64 / 2, InvaderState.seeking, 0));
// humanId = 200;
// let humans = initArray(10, _ => new Human(id++, 4, 1));
let displayStrings = new Map();

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


  if(input.leftright != 0) {
    let index = 1;
    if(input.leftright == -1) index = 0;
    displayStrings.set(player.id, Player.graphic[index]);
  }

  invaders.map(i => displayStrings.set(i.id, Invader.graphic));

  let displayArray = [].concat(
    updatePlayerPosition(player, input),
    invaders.map(i => updateInvaderPosition(i, i.state, 0, 0))
  );

  displayArray.map(toLocal)
    .filter(clip)
    .map(i => fastTextMode.setString(Math.floor(i.lx), Math.floor(i.ly), displayStrings.has(i.id) ? displayStrings.get(i.id) : '!'));


  let lpx = player.x - offsetx;
  lpx += viewWidth / 2;
  offsetx += easing * (lpx - (viewWidth / 2));

  offsetx %= modulus;


  // let e = checkSeekingInvaders(invaders.filter(i => i.state == InvaderState.seeking), humans);


}

