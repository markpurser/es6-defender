// -------------------------------------------------------------------------------------------------------------------------------------------
// constants and enums
// -------------------------------------------------------------------------------------------------------------------------------------------
let PlayerState = Object.freeze({faceLeft:1, faceRight:2, exploding:3})

let InvaderState = Object.freeze({seeking:1, locked:2, abducting:3, mutant:4, exploding:5, explodingReleaseHuman:6})

let Event = Object.freeze({locked:1, abducted:2, mutated:3, dead:4, removeProjectile:5, removeHuman:6, playerDead:7, collectedHuman:8, removeDebris:9})

const easing = 0.05;
const playerAccelX = 520;
const playerDampingX = 6;
const playerMaxSpeedX = 164;
const playerMaxSpeedY = 42;
const debrisDamping = 0.6;
const modulusx = 512;
const halfmodulusx = modulusx / 2;
const starmodulusx = 384;
const halfstarmodulusx = starmodulusx / 2;
const projectileLifetime = 60;
const debrisLifetime = 100;
const pointsLifetime = 200;
const groundOffset = 6;
const colourFlash = -1;

let Global = {viewWidth:0, viewHeight:0};

// -------------------------------------------------------------------------------------------------------------------------------------------
// custom data types
// -------------------------------------------------------------------------------------------------------------------------------------------
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

class Invader extends StateVector {
  
  constructor(id, x, y, state, t_startState) {
    super(id, x, y);

    this.state = state;
    this.t_startState = t_startState;
  }
}

class Human extends StateVector {

  constructor(id, x, y, xdot, ydot) {
    super(id, x, y, xdot, ydot);
  }
}

class Projectile extends StateVector {

  constructor(id, x, y, xdot, ydot, t_spawned) {
    super(id, x, y, xdot, ydot);

    this.t_spawned = t_spawned;
  }
}

class Debris extends StateVector {

  constructor(id, x, y, xdot, ydot, t_spawned) {
    super(id, x, y, xdot, ydot);

    this.t_spawned = t_spawned;
  }
}

class Points extends StateVector {

  constructor(id, x, y, xdot, ydot, t_spawned, points) {
    super(id, x, y, xdot, ydot);

    this.t_spawned = t_spawned;
    this.points = points;
  }
}

class Star extends StateVector {

  constructor(id, x, y, depth) {
    super(id, x, y);

    this.depth = depth;
  }
}

// -------------------------------------------------------------------------------------------------------------------------------------------
// custom data type statics
// -------------------------------------------------------------------------------------------------------------------------------------------
Player.sideLen = 4;
Player.graphic = ['\xab\xac\xad\xae\n\xbb\xbc\xbd\xbe\n\xcb\xcc\xcd\xce\n\xdb\xdc\xdd\xde',
                  '\xa6\xa7\xa8\xa9\n\xb6\xb7\xb8\xb9\n\xc6\xc7\xc8\xc9\n\xd6\xd7\xd8\xd9'];
Player.colour = 0x00ccff;

Invader.sideLen = 4;
Invader.graphic = '\xa1\xa2\xa3\xa4\n\xb1\xb2\xb3\xb4\n\xc1\xc2\xc3\xc4\n\xd1\xd2\xd3\xd4';
Invader.graphicAbducting = '\xa1\xa2\xa3\xa4\n\xb1\xb2\xb3\xb4\n\xc1\xc2\xc3\xc4\n\xd1\xd2\xd3\xd4\n \xe1\xe2 \n \xf1\xf2';
Invader.colour = 0x00ff00;
Invader.colourMutant = colourFlash;

Human.sideLen = 2;
Human.graphic = '\xe1\xe2\n\xf1\xf2';
Human.colour = 0x00aa99;

Projectile.sideLen = 2;
Projectile.graphic = '--';
Projectile.graphic2 = '\xe6\xe7\n\xf6\xf7';
Projectile.colour = 0xffff00;
Projectile.colour2 = 0xffcc00;

Debris.graphic = '@';
Debris.colour = 0xff88ff;

Points.colour = colourFlash;

Star.graphic = '.';
Star.colour = colourFlash;


// -------------------------------------------------------------------------------------------------------------------------------------------
// generic functions
// -------------------------------------------------------------------------------------------------------------------------------------------
let wrapx = (x) => {
  if(x < -halfmodulusx) x += modulusx;
  else if(x >= halfmodulusx) x -= modulusx;
  return x;
}

let wrapstarx = (x) => {
  if(x < -halfstarmodulusx) x += starmodulusx;
  else if(x >= halfstarmodulusx) x -= starmodulusx;
  return x;
}

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

let fillWith = (n, f) => Array(n).fill().map(f);

// -------------------------------------------------------------------------------------------------------------------------------------------
// collision functions
// -------------------------------------------------------------------------------------------------------------------------------------------
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


// -------------------------------------------------------------------------------------------------------------------------------------------
// update state
// -------------------------------------------------------------------------------------------------------------------------------------------
let updatePlayerState = (player, input) => {
  if(player.state == PlayerState.exploding) return;

  if(input.leftright != 0) {
    player.state = (input.leftright == -1) ? PlayerState.faceLeft : PlayerState.faceRight;
  }
}

let updateInvaderState = (invaders, events, t) => {
  events.map(e => {
    if(e.event == Event.locked || e.event == Event.abducted || e.event == Event.dead || e.event == Event.mutated)
    {
      let idx = invaders.findIndex(i => i.id == e.invaderId);
      let i = invaders[idx];
      i.state = {
        [Event.locked]: InvaderState.locked,
        [Event.abducted]: InvaderState.abducting,
        [Event.mutated]: InvaderState.mutant,
        [Event.dead]: i.state == InvaderState.abducting ? InvaderState.explodingReleaseHuman : InvaderState.exploding
      }[e.event];
      i.t_startState = t;      
    }
  })
}

// -------------------------------------------------------------------------------------------------------------------------------------------
// update position
// -------------------------------------------------------------------------------------------------------------------------------------------
let updatePlayerPosition = (sv, input, dt) => {
  sv.xdot += playerAccelX * input.leftright * dt;
  sv.ydot = playerMaxSpeedY * input.updown;

  if(sv.xdot < -playerMaxSpeedX) sv.xdot = -playerMaxSpeedX;
  if(sv.xdot > playerMaxSpeedX) sv.xdot = playerMaxSpeedX;

  if(!input.leftright) sv.xdot += -playerDampingX * sv.xdot * dt;

  sv.x = 0;
  sv.y += sv.ydot * dt;

  if(sv.y < 0) sv.y = 0;
  if(sv.y > Global.viewHeight - groundOffset - 4) sv.y = Global.viewHeight - groundOffset - 4;

  return sv;
}

let updateInvaderPosition = (sv, state, targetx, targety, dt) => {
  let a = {
      [InvaderState.seeking]: () => {
        sv.xdot += 72 * (Math.random() - 0.5) * dt;
        sv.ydot += 72 * (Math.random() - 0.5) * dt;
        sv.x += sv.xdot * dt;
        sv.y += sv.ydot * dt;

        if(sv.y < 5) { sv.ydot = -sv.ydot; sv.y = 5; }
        if(sv.y > (Global.viewHeight - 5)) { sv.ydot = -sv.ydot; sv.y = (Global.viewHeight - 5); }
      },
      [InvaderState.locked]: () => {
        sv.xdot = targetx;
        sv.ydot = 12;

        sv.x += sv.xdot * dt;
        sv.y += sv.ydot * dt;
      },
      [InvaderState.abducting]: () => {
        sv.ydot = -12;

        sv.y += sv.ydot * dt;
      },
      [InvaderState.mutant]: () => {
        sv.xdot += dt * (targetx - sv.x) > 0 ? 1.2 : -1.2;
        sv.ydot += dt * (targety - sv.y) > 0 ? 1.2 : -1.2;

        sv.xdot += -1.2 * sv.xdot * dt;
        sv.ydot += -1.2 * sv.ydot * dt;

        sv.x += sv.xdot * dt;
        sv.y += sv.ydot * dt;
      },
      [InvaderState.exploding]: () => {
      },
      [InvaderState.explodingReleaseHuman]: () => {
      }
    }[state]();

  return sv;
}

let updateHumanPosition = (sv, dt) => {
  sv.x += sv.xdot * dt;
  sv.y += sv.ydot * dt;

  return sv;
}

let updateProjectilePosition = (sv, dt) => {
  sv.x += sv.xdot * dt;
  sv.y += sv.ydot * dt;

  return sv;
}

let updateDebrisPosition = (d, dt) => {
  updateProjectilePosition(d, dt);

  d.xdot += -debrisDamping * d.xdot * dt;
  d.ydot += -debrisDamping * d.ydot * dt;

  return d;
}

// -------------------------------------------------------------------------------------------------------------------------------------------
// update position helpers
// -------------------------------------------------------------------------------------------------------------------------------------------
let updateInvaderPositions = (invaders, invaderTargets, player, dt) =>
  invaders.map(i => {
    let targetx = 0, targety = 0;
    if(i.state == InvaderState.mutant) {
      targetx = player.x;
      targety = player.y;
    }
    else if(invaderTargets.has(i.id)) {
      targetx = invaderTargets.get(i.id).humanXDot;
    }
    updateInvaderPosition(i, i.state, targetx, targety, dt);
  });

let updateHumanPositions = (humans, dt) => humans.map(h => updateHumanPosition(h, dt));

let updateProjectilePositions = (projectiles, dt) => projectiles.map(p => updateProjectilePosition(p, dt));

let updateDebrisPositions = (debris, dt) => debris.map(d => updateDebrisPosition(d, dt));


// -------------------------------------------------------------------------------------------------------------------------------------------
// check state and generate events
// -------------------------------------------------------------------------------------------------------------------------------------------
let checkSeekingInvader = (invader, humans) => {
  let inRangeHumans = humans.filter(h => xoverlap(invader.x, Invader.sideLen, h.x, Human.sideLen));
  if(inRangeHumans.length > 0) {
    if(Math.random() < 0.05) {
      return [{event:Event.locked, invaderId:invader.id, humanId:inRangeHumans[0].id, humanXDot:inRangeHumans[0].xdot}];
    }
  }
  return [];
}

let checkLockedInvader = (invader, e) => {
  return ((invader.y + Invader.sideLen) >= Global.viewHeight - groundOffset) ?
    [{event:Event.abducted, invaderId:invader.id, humanId:e.humanId},
     {event:Event.removeHuman, id:e.humanId}] :
    [];
}

let checkAbductingInvader = (invader) => {
  return (invader.y <= 0) ?
    [{event:Event.mutated, invaderId:invader.id}] :
    [];
}

let checkHitInvaders = (invaders, projectiles) =>
  detectCollisions(invaders, Invader.sideLen, projectiles, Projectile.sideLen)
    .reduce((arr, collidedPair) => arr.concat([
      {event:Event.dead, invaderId:collidedPair.id1},
      {event:Event.removeProjectile, id:collidedPair.id2}
    ]), []);

let checkHitPlayerProjectiles = (player, projectiles) =>
  detectCollisions([player], Player.sideLen, projectiles, Projectile.sideLen)
    .map(collidedPair => ({event:Event.playerDead}));

let checkHitPlayerInvaders = (player, invaders) =>
  detectCollisions([player], Player.sideLen, invaders, Invader.sideLen)
    .map(collidedPair => ({event:Event.playerDead}));

let checkHitPlayerHumans = (player, humans) =>
  detectCollisions([player], Player.sideLen, humans, Human.sideLen)
    .reduce((arr, collidedPair) => arr.concat([
      {event:Event.collectedHuman},
      {event:Event.removeHuman, id:collidedPair.id2}
    ]), []);

let checkProjectiles = (projectiles, t) =>
  projectiles.filter(p => (t - p.t_spawned) > projectileLifetime)
    .map(p => ({event:Event.removeProjectile, id:p.id}));

let checkDebris = (debris, t) =>
  debris.filter(d => (t - d.t_spawned) > debrisLifetime)
    .map(d => ({event:Event.removeDebris, id:d.id}));

let checkPoints = (points, t) =>
  points.filter(p => (t - p.t_spawned) > pointsLifetime)
    .map(p => ({event:Event.removePoints, id:p.id}));

let invaderFire = (i, player, invaderProjectileId, t) => {
    let dx = player.x - i.x;
    if(Math.random() < 0.01 && Math.abs(dx) < (Global.viewWidth / 3)) {
      let dy = player.y - i.y;
      let l = Math.sqrt(dx * dx + dy * dy);
      let unitdx = dx / l;
      let unitdy = dy / l;
      return new Projectile(invaderProjectileId, i.x, i.y, unitdx * 60, unitdy * 60, t);
    }
    return null;
}

let makeExplosion = (debris, debrisId, i, t) => {
  let velocities = [[42,42],[60,0],[42,-42],[0,-60],[-42,-42],[-60,0],[-42,42],[0,60]];
  velocities.map(v => {
    debris.push(new Debris(debrisId++, i.x, i.y,  v[0],  v[1], t));
  });
  return debrisId;
}


// -------------------------------------------------------------------------------------------------------------------------------------------
// game state variables
// -------------------------------------------------------------------------------------------------------------------------------------------
let offsetx = 0;
let targetoffsetx = 0;
let playerId = null;
let invaderId = null;
let player = null;
let invaders = null;
let humanId = null;
let humans = null;
let projectileId = null;
let projectiles = null;
let invaderProjectileId = null;
let invaderProjectiles = null;
let starfield = null;
let debrisId = null;
let debris = null;
let pointsId = null;
let points = null;
let graphics = null;
let invaderTargets = null;
let score = null;


// -------------------------------------------------------------------------------------------------------------------------------------------
// reset game state
// -------------------------------------------------------------------------------------------------------------------------------------------
let resetGame = (viewWidth, viewHeight, sound) => {

  Global.viewWidth = viewWidth;
  Global.viewHeight = viewHeight;

  playerId = 1;
  invaderId = 100;
  player = new Player(playerId, 0, viewHeight / 2, PlayerState.faceRight, 0);
  invaders = fillWith(10, _ => new Invader(invaderId++, (((Math.random() * 0.8) + 0.2) * halfmodulusx) * [1,-1][Math.floor(Math.random()*2)], viewHeight / 2, InvaderState.seeking, 0));
  humanId = 200;
  humans = fillWith(10, _ => new Human(humanId++, (Math.random() - 0.5) * modulusx, viewHeight - groundOffset, 12 * (Math.random() - 0.5)));
  projectileId = 500;
  projectiles = [];
  invaderProjectileId = 1000;
  invaderProjectiles = [];
  starfield = fillWith(50, _ => new Star(2000, (Math.random() - 0.5) * starmodulusx, Math.random() * viewHeight, (Math.random() * 0.5) + 0.5));
  debrisId = 3000;
  debris = [];
  pointsId = 5000;
  points = [];
  graphics = new Map();
  invaderTargets = new Map();
  score = 0;

  sound('1up');
}


// -------------------------------------------------------------------------------------------------------------------------------------------
// run a single game tick
// -------------------------------------------------------------------------------------------------------------------------------------------
let doGame = (fastTextMode, input, sound, t, dt, debug = false) => {

  // player fire button
  if(input.fire) {
    sound('zap');
    projectiles.push(new Projectile(projectileId++, player.x, player.y+2, (player.state == PlayerState.faceLeft) ? -240 : 240, 0, t));
    if(projectileId >= 1000) projectileId = 500;
  }

  // filter invaders according to state
  let seekingInvaders   = invaders.filter(i => i.state == InvaderState.seeking);
  let lockedInvaders    = invaders.filter(i => i.state == InvaderState.locked);
  let abductingInvaders = invaders.filter(i => i.state == InvaderState.abducting);
  let mutantInvaders    = invaders.filter(i => i.state == InvaderState.mutant);

  // invader fire
  seekingInvaders.map(i => {
    let p = invaderFire(i, player, invaderProjectileId, t);
    if(p) {
      invaderProjectiles.push(p);
      invaderProjectileId++;
    }
  });

  mutantInvaders.map(i => {
    let p = invaderFire(i, player, invaderProjectileId, t);
    if(p) {
      invaderProjectiles.push(p);
      invaderProjectileId++;
    }
    if(Math.random() < 0.02) {
      invaderProjectiles.push(new Projectile(invaderProjectileId++, i.x, i.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, t));
    }
  });

  if(invaderProjectileId >= 1500) invaderProjectileId = 1000;
  if(invaderProjectiles.length > 30) remove(invaderProjectiles, invaderProjectiles[0].id, graphics);

  // events
  let projectileEvents          = checkProjectiles(projectiles, t);
  let debrisEvents              = checkDebris(debris, t);
  let pointsEvents              = checkPoints(points, t);

  let hitEvents                 = checkHitInvaders(invaders, projectiles);

  let playerProjectileHitEvent  = checkHitPlayerProjectiles(player, invaderProjectiles);
  let playerInvaderHitEvent     = checkHitPlayerProjectiles(player, invaders);
  let playerHumanHitEvent       = checkHitPlayerHumans(player, humans);

  let seekingInvaderEvents      = seekingInvaders.reduce((arr, i)   => arr.concat(checkSeekingInvader(i, humans)), []);
  let lockedInvaderEvents       = lockedInvaders.reduce((arr, i)    => arr.concat(checkLockedInvader(i, invaderTargets.get(i.id))), []);
  let abductingInvaderEvents    = abductingInvaders.reduce((arr, i) => arr.concat(checkAbductingInvader(i)), []);

  let invaderEvents = [].concat(hitEvents, seekingInvaderEvents, lockedInvaderEvents, abductingInvaderEvents);

  let allEvents = [].concat(projectileEvents, playerProjectileHitEvent, playerInvaderHitEvent, playerHumanHitEvent, invaderEvents, debrisEvents, pointsEvents);

  allEvents.filter(e => e.event == Event.removeProjectile)  .map(e => remove(projectiles, e.id, graphics));
  allEvents.filter(e => e.event == Event.removeDebris)      .map(e => remove(debris, e.id, graphics));
  allEvents.filter(e => e.event == Event.removePoints)      .map(e => remove(points, e.id, graphics));
  allEvents.filter(e => e.event == Event.locked)            .map(e => invaderTargets.set(e.invaderId, e));
  allEvents.filter(e => e.event == Event.removeHuman)       .map(e => remove(humans, e.id, graphics));
  allEvents.filter(e => e.event == Event.playerDead)        .map(e => {sound('death'); player.state = PlayerState.exploding;});
  allEvents.filter(e => e.event == Event.collectedHuman)    .map(_ => {sound('coin'); score += 20000; points.push(new Points(pointsId++, player.x, player.y, 0.01, 0.01, t, '20000'));});


  // update game object state
  // game objects are updated 'in-place'
  updatePlayerState         (player, input);
  updateInvaderState        (invaders, invaderEvents, t);

  // update positions
  // game objects are updated 'in-place'
  updatePlayerPosition      (player, input, dt);
  updateInvaderPositions    (invaders, invaderTargets, player, dt);
  updateHumanPositions      (humans, dt);
  updateProjectilePositions (projectiles, dt);
  updateProjectilePositions (invaderProjectiles, dt);
  updateDebrisPositions     (debris, dt);
  updateProjectilePositions (points, dt);

  // triggers based on state changes must be placed after state update code

  // abducting invaders drop human when hit
  invaders.filter(i => i.state == InvaderState.explodingReleaseHuman && i.t_startState == t)
    .map(i => humans.push(new Human(humanId++, i.x+2, i.y, 0, 6)));

  // invader explosion
  invaders.filter(i => i.state == InvaderState.explodingReleaseHuman || i.state == InvaderState.exploding && i.t_startState == t)
    .map(i => {
      sound('boom');
      score += 1000;
      remove(invaders, i.id, graphics);
      // debris updated 'in-place'
      debrisId = makeExplosion(debris, debrisId, i, t);
      if(debrisId >= 4000) debrisId = 3000;
    });


  // prepare to draw
  // update graphics map
  graphics.set(player.id, (player.state == PlayerState.faceLeft) ? {g:Player.graphic[0], c:Player.colour} : {g:Player.graphic[1], c:Player.colour});

  invaders.map(i => {
    let g = (i.state == InvaderState.abducting) ? Invader.graphicAbducting : Invader.graphic;
    let c = (i.state == InvaderState.mutant) ? Invader.colourMutant : Invader.colour;
    graphics.set(i.id, {g:g, c:c});
  });
  humans              .map(h => graphics.set(h.id, {g:Human.graphic,       c:Human.colour}));
  projectiles         .map(p => graphics.set(p.id, {g:Projectile.graphic,  c:Projectile.colour}));
  invaderProjectiles  .map(p => graphics.set(p.id, {g:Projectile.graphic2, c:Projectile.colour2}));
  starfield           .map(s => graphics.set(s.id, {g:Star.graphic,        c:Star.colour}));
  debris              .map(d => graphics.set(d.id, {g:Debris.graphic,      c:Debris.colour}));
  points              .map(p => graphics.set(p.id, {g:p.points,            c:0xffffff}));

  // compute displacements
  let displacementList = [].concat(invaders, humans, projectiles, invaderProjectiles, debris, points);

  let displacement = player.xdot * dt;
  displacementList.map(o => {o.x = wrapx(o.x - displacement)});

  starfield.map(o => {o.x = wrapstarx(o.x - (displacement * o.depth))});

  let displayList = [].concat(starfield, displacementList, player);

  // draw
  displayList
    .map(toLocal)
    .filter(clip)
    .map(i => {
      let g = graphics.has(i.id) ? graphics.get(i.id) : {g:'!', c:0xff0000};
      fastTextMode.setString(Math.floor(i.lx), Math.floor(i.ly), g.g, g.c)
      if(debug) {
        // overlay object id and x coordinate
        fastTextMode.setNumber(Math.floor(i.lx+3), Math.floor(i.ly), i.id)
        fastTextMode.setNumber(Math.floor(i.lx), Math.floor(i.ly+4), Math.floor(i.gx_debug))
      }
    });

  fastTextMode.setString(50, 2, 'Score: ');
  fastTextMode.setNumber(57, 2, score);

  // compute offset of local coordinate system
  // shift player to right or left of screen
  (player.state == PlayerState.faceLeft) ? targetoffsetx = -Global.viewWidth * 0.3 : targetoffsetx = Global.viewWidth * 0.3;
  // apply 'forward motion' effect as player velocity increases
  targetoffsetx -= 0.05 * player.xdot;
  // ease offset towards target offset
  offsetx += easing * (targetoffsetx - offsetx);

  return player.state == PlayerState.exploding;
}

