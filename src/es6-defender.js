
let PlayerState = Object.freeze({faceLeft:1, faceRight:2, exploding:3})

let InvaderState = Object.freeze({seeking:1, locked:2, abducting:3, mutant:4, exploding:5})

let Event = Object.freeze({locked:1, abducted:2, mutated:3, dead:4, remove:5})

let easing = 0.05;
let playerAccel = 0.15;
let playerDamping = 0.1;
let halfmodulusx = 256;
let modulusx = 512;
let projectileLifetime = 50;

let Global = {viewWidth:0, viewHeight:0};

class StateVector {
  
  constructor(id, x, y, xdot = 0, ydot = 0) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.xdot = xdot;
    this.ydot = ydot;
  }
}

class Player extends StateVector {

  constructor(id, x, y, state, t_startState) {
    super(id, x, y);

    this.state = state;
    this.t_startState = t_startState;
  }
}

Player.sideLen = 3;
Player.graphic = ['  /\n<--', '\\  \n-->']; 

class Invader extends StateVector {
  
  constructor(id, x, y, state, t_startState) {
    super(id, x, y);

    this.state = state;
    this.t_startState = t_startState;
  }
}

Invader.sideLen = 2;
Invader.graphic = '^^\n[]\n';

class Human extends StateVector {

  constructor(id, x, y, xdot) {
    super(id, x, y, xdot);
  }
}

Human.sideLen = 1;
Human.graphic = 'H';

class Projectile extends StateVector {

  constructor(id, x, y, xdot, ydot, t_spawned) {
    super(id, x, y, xdot, ydot);

    this.t_spawned = t_spawned;
  }
}

Projectile.sideLen = 1;
Projectile.graphic = '-';

let wrapx = (x) => (x + modulusx) % modulusx;

let updatePlayerPosition = (sv, input) => {
  sv.xdot += playerAccel * input.leftright;
  sv.ydot += playerAccel * input.updown;

  sv.xdot += playerDamping * -sv.xdot;
  sv.ydot += playerDamping * -sv.ydot;

  sv.x = halfmodulusx;
  sv.y += sv.ydot;

  if(sv.y < 0) sv.y = 0;
  if(sv.y > Global.viewHeight - 5) sv.y = Global.viewHeight - 5;

  return sv;
}

let updatePlayerState = (player, input) => {
  if(input.leftright != 0) {
    player.state = (input.leftright == -1) ? PlayerState.faceLeft : PlayerState.faceRight;
  }
}

let updateInvaderPosition = (sv, state, targetx, targety) => {
  let a = {
      [InvaderState.seeking]: () => {
        sv.xdot += 0.01 * (Math.random() - 0.5);
        sv.ydot += 0.01 * (Math.random() - 0.5);
        sv.x += sv.xdot;
        sv.y += sv.ydot;

        if(sv.y < 5) { sv.ydot = -sv.ydot; sv.y = 5; }
        if(sv.y > (Global.viewHeight - 5)) { sv.ydot = -sv.ydot; sv.y = (Global.viewHeight - 5); }
      },
      [InvaderState.locked]: () => {
        sv.xdot = targetx;
        sv.ydot = 0.1;

        sv.x += sv.xdot;
        sv.y += sv.ydot;
      }      
    }[state]();

  return sv;
}

let updateInvaders = (invaders, invaderTargets) =>
  invaders.map(i => {
    let targetx = 0;
    if(invaderTargets.has(i.id)) {
      targetx = invaderTargets.get(i.id).humanXDot;
    }
    updateInvaderPosition(i, i.state, targetx, 0);
  });

let updateInvaderState = (invaders, id, state) => {
  let i = invaders.findIndex(i => i.id == id);
  invaders[i].state = state;
}

let updateHumanPosition = (sv) => {
  sv.x += sv.xdot;
  sv.y += sv.ydot;

  return sv;
}

let updateHumans = (humans) => humans.map(updateHumanPosition);

let updateProjectilePosition = (sv) => {
  sv.x += sv.xdot;
  sv.y += sv.ydot;

  return sv;
}

let updateProjectiles = (projectiles) => projectiles.map(updateProjectilePosition);

let cartesianProduct2 = (arr1, arr2) =>
  arr1.map(e1 => arr2.map(e2 => [e1, e2])).reduce((arr, e) => arr.concat(e), []);

let toTuples = (arr) =>
  arr.map(a => ({fst:a[0], snd:a[1]}));


let xoverlap = (x1, size1, x2, size2) =>
  (x2 < (x1 + size1) &&
   x1 < (x2 + size2));

let yoverlap = (y1, size1, y2, size2) =>
  (y2 < (y1 + size1) &&
   y1 < (y2 + size2));

let collided = ({x:x1, y:y1}, size1, {x:x2, y:y2}, size2) =>
  (xoverlap(x1, size1, x2, size2) && yoverlap(y1, size1, y2, size2));


let detectCollisions = (svArr1, size1, svArr2, size2) =>
  toTuples(cartesianProduct2(svArr1, svArr2))
    .filter(svPair => collided(svPair.fst, size1, svPair.snd, size2))
    .map(collidedPair => ({id1:collidedPair.fst.id, id2:collidedPair.snd.id}));


let checkSeekingInvader = (invader, humans) => {
  let inRangeHumans = humans.filter(h => xoverlap(invader.x, Invader.sideLen, h.x, Human.sideLen));
  if(inRangeHumans.length > 0) {
    if(Math.random() < 0.01) {
      return [{event:Event.locked, invaderId:invader.id, humanId:inRangeHumans[0].id, humanXDot:inRangeHumans[0].xdot}];
    }
  }
  return [];
}

let checkHitInvaders = (invaders, projectiles) =>
  detectCollisions(invaders, Invader.sideLen, projectiles, Projectile.sideLen)
    .map(collidedPair => { collidedPair.event=Event.dead; return collidedPair; });


let checkProjectiles = (projectiles, t) =>
  projectiles.filter(p => (t - p.t_spawned) > projectileLifetime)
    .map(p => ({event:Event.remove, id:p.id}));


let toLocal = sv => {
  let lx = sv.x - offsetx;
  lx += Global.viewWidth / 2;

  let ly = sv.y;

  return {id:sv.id, lx:lx, ly:ly, gx_debug:sv.x};
}

let clip = lcoords => (lcoords.lx >= 0) && (lcoords.ly < Global.viewWidth);

let remove = (objects, id, graphics) => {
  let o = objects.findIndex(o => o.id == id);
  objects.splice(o, 1);
  graphics.delete(id);
}



let initArray = (n, f) => Array(n).fill().map(f);


let offsetx = 0;
let targetoffsetx = 0;
let playerId = 1;
let invaderId = 100;
let player = new Player(playerId, 0, 48 / 2, PlayerState.faceRight, 0);
let invaders = initArray(3, _ => new Invader(invaderId++, Math.floor(Math.random() * modulusx), 48 / 2, InvaderState.seeking, 0));
let humanId = 200;
let humans = initArray(10, _ => new Human(humanId++, Math.floor(Math.random() * modulusx), 47, 0.2 * (Math.random() - 0.5)));
let projectileId = 500;
let projectiles = [];
let graphics = new Map();
let invaderTargets = new Map();

let t = 0;

let doGame = (fastTextMode, viewWidth, viewHeight, input, debug = false) => {

  Global.viewWidth = viewWidth;
  Global.viewHeight = viewHeight;

  updatePlayerState(player, input);

  if(input.fire) {
    projectiles.push(new Projectile(projectileId++, player.x, player.y+1, (player.state == PlayerState.faceLeft) ? -2 : 2, 0, t));
    if(projectileId >= 1000) projectileId = 500;
  }

  let projectileEvents = checkProjectiles(projectiles, t);

  let hitEvents = checkHitInvaders(invaders, projectiles);

  let seekingInvaderEvents = invaders.filter(i => i.state == InvaderState.seeking).reduce((arr, i) => arr.concat(checkSeekingInvader(i, humans)), []);

  let allEvents = [].concat(projectileEvents, hitEvents, seekingInvaderEvents);
  allEvents.filter(e => e.event == Event.remove).map(e => remove(projectiles, e.id, graphics));
  allEvents.filter(e => e.event == Event.dead).map(e => remove(invaders, e.id1, graphics));
  allEvents.filter(e => e.event == Event.locked).map(e => { updateInvaderState(invaders, e.invaderId, InvaderState.locked); invaderTargets.set(e.invaderId, e); });


  graphics.set(player.id, (player.state == PlayerState.faceLeft) ? Player.graphic[0] : Player.graphic[1]);

  invaders.map(i => graphics.set(i.id, Invader.graphic));
  humans.map(h => graphics.set(h.id, Human.graphic));
  projectiles.map(p => graphics.set(p.id, Projectile.graphic));


  updatePlayerPosition(player, input);
  updateInvaders(invaders, invaderTargets);
  updateHumans(humans);
  updateProjectiles(projectiles);

  let displacementList = [].concat(invaders, humans, projectiles);

  let displacement = player.xdot;
  displacementList.map(o => {o.x = wrapx(o.x - displacement)});

  let displayList = displacementList.concat(player);

  displayList
    .map(toLocal)
    .filter(clip)
    .map(i => {
      fastTextMode.setString(Math.floor(i.lx), Math.floor(i.ly), graphics.has(i.id) ? graphics.get(i.id) : '!')
      if(debug) {
        // overlay object id and x coordinate
        fastTextMode.setNumber(Math.floor(i.lx), Math.floor(i.ly), i.id)
        fastTextMode.setNumber(Math.floor(i.lx), Math.floor(i.ly+2), Math.floor(i.gx_debug))
      }
    });


  (player.state == PlayerState.faceLeft) ? targetoffsetx = halfmodulusx - 16 : targetoffsetx = halfmodulusx + 16;
  offsetx += easing * (targetoffsetx - offsetx);

  // let e = checkSeekingInvaders(invaders.filter(i => i.state == InvaderState.seeking), humans);

  t++;
}

