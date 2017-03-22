
let PlayerState = Object.freeze({faceLeft:1, faceRight:2, exploding:3})

let InvaderState = Object.freeze({seeking:1, locked:2, abducting:3, mutant:4, exploding:5, explodingReleaseHuman:6})

let Event = Object.freeze({locked:1, abducted:2, mutated:3, dead:4, removeProjectile:5, removeHuman:6, playerDead:7, collectedHuman:8, removeDebris:9})

let easing = 0.05;
let playerAccelX = 0.2;
let playerDampingX = 0.1;
let playerMaxSpeedX = 1.9;
let playerMaxSpeedY = 0.7;
let debrisDamping = 0.01;
let modulusx = 512;
let halfmodulusx = modulusx / 2;
let starmodulusx = 256;
let halfstarmodulusx = starmodulusx / 2;
let projectileLifetime = 30;
let debrisLifetime = 100;
let pointsLifetime = 200;

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
Player.colour = 0x00ccff;

class Invader extends StateVector {
  
  constructor(id, x, y, state, t_startState) {
    super(id, x, y);

    this.state = state;
    this.t_startState = t_startState;
  }
}

Invader.sideLen = 4;
Invader.graphic = '^^^^\n[[]]\n[[]]\n[[]]';
Invader.graphicAbducting = '^^^^\n[[]]\n[[]]\n[[]]\n HH \n HH';
Invader.colour = 0x00ff00;
Invader.colourAbducting = 0x00ff00;

class Human extends StateVector {

  constructor(id, x, y, xdot, ydot) {
    super(id, x, y, xdot, ydot);
  }
}

Human.sideLen = 2;
Human.graphic = 'HH\nHH';
Human.colour = 0x00aa99;

class Projectile extends StateVector {

  constructor(id, x, y, xdot, ydot, t_spawned) {
    super(id, x, y, xdot, ydot);

    this.t_spawned = t_spawned;
  }
}

Projectile.sideLen = 2;
Projectile.graphic = '--';
Projectile.graphic2 = '**\n**';
Projectile.colour = 0xffff00;
Projectile.colour2 = 0xffcc00;

class Debris extends StateVector {

  constructor(id, x, y, xdot, ydot, t_spawned) {
    super(id, x, y, xdot, ydot);

    this.t_spawned = t_spawned;
  }
}

Debris.graphic = '@';
Debris.colour = 0xff88ff;

class Points extends StateVector {

  constructor(id, x, y, xdot, ydot, t_spawned, points) {
    super(id, x, y, xdot, ydot);

    this.t_spawned = t_spawned;
    this.points = points;
  }
}

Points.colour = -1;

class Star extends StateVector {

  constructor(id, x, y, depth) {
    super(id, x, y);

    this.depth = depth;
  }
}

Star.graphic = '.';
Star.colour = -1;


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

let updatePlayerPosition = (sv, input) => {
  sv.xdot += playerAccelX * input.leftright;
  sv.ydot = playerMaxSpeedY * input.updown;

  if(sv.xdot < -playerMaxSpeedX) sv.xdot = -playerMaxSpeedX;
  if(sv.xdot > playerMaxSpeedX) sv.xdot = playerMaxSpeedX;

  if(!input.leftright) sv.xdot += -playerDampingX * sv.xdot;

  sv.x = 0;
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
        sv.xdot += 0.02 * (Math.random() - 0.5);
        sv.ydot += 0.02 * (Math.random() - 0.5);
        sv.x += sv.xdot;
        sv.y += sv.ydot;

        if(sv.y < 5) { sv.ydot = -sv.ydot; sv.y = 5; }
        if(sv.y > (Global.viewHeight - 5)) { sv.ydot = -sv.ydot; sv.y = (Global.viewHeight - 5); }
      },
      [InvaderState.locked]: () => {
        sv.xdot = targetx;
        sv.ydot = 0.2;

        sv.x += sv.xdot;
        sv.y += sv.ydot;
      },
      [InvaderState.abducting]: () => {
        sv.ydot = -0.2;

        sv.y += sv.ydot;
      },
      [InvaderState.mutant]: () => {
        sv.x += 0.02 * (targetx - sv.x) + 3 * (Math.random() - 0.5);
        sv.y += 0.02 * (targety - sv.y);
      },
      [InvaderState.exploding]: () => {
      },
      [InvaderState.explodingReleaseHuman]: () => {
      }
    }[state]();

  return sv;
}

let updateInvaders = (invaders, invaderTargets, player) =>
  invaders.map(i => {
    let targetx = 0, targety = 0;
    if(i.state == InvaderState.mutant) {
      targetx = player.x;
      targety = player.y;
    }
    else if(invaderTargets.has(i.id)) {
      targetx = invaderTargets.get(i.id).humanXDot;
    }
    updateInvaderPosition(i, i.state, targetx, targety);
  });

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

let updateDebrisPosition = (d) => {
  updateProjectilePosition(d);

  d.xdot += -debrisDamping * d.xdot;
  d.ydot += -debrisDamping * d.ydot;

  return d;
}

let updateDebris = (debris) => debris.map(updateDebrisPosition);

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
    if(Math.random() < 0.1) {
      return [{event:Event.locked, invaderId:invader.id, humanId:inRangeHumans[0].id, humanXDot:inRangeHumans[0].xdot}];
    }
  }
  return [];
}

let checkLockedInvader = (invader, e) => {
  return ((invader.y + Invader.sideLen) >= Global.viewHeight) ?
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


let offsetx = 0;
let targetoffsetx = 0;
let playerId = 1;
let invaderId = 100;
let player = new Player(playerId, 0, 96 / 2, PlayerState.faceRight, 0);
let invaders = fillWith(10, _ => new Invader(invaderId++, (((Math.random() * 0.8) + 0.2) * halfmodulusx) * [1,-1][Math.floor(Math.random()*2)], 96 / 2, InvaderState.seeking, 0));
let humanId = 200;
let humans = fillWith(10, _ => new Human(humanId++, (Math.random() - 0.5) * modulusx, 94, 0.2 * (Math.random() - 0.5)));
let projectileId = 500;
let projectiles = [];
let invaderProjectileId = 1000;
let invaderProjectiles = [];
let starfield = fillWith(50, _ => new Star(2000, (Math.random() - 0.5) * starmodulusx, Math.random() * 96, (Math.random() * 0.5) + 0.5));
let debrisId = 3000;
let debris = [];
let pointsId = 5000;
let points = [];
let graphics = new Map();
let invaderTargets = new Map();
let score = 0;
let colours = new Map([
  [Player.graphic[0], Player.colour],
  [Player.graphic[1], Player.colour],
  [Invader.graphic, Invader.colour],
  [Invader.graphicAbducting, Invader.colourAbducting],
  [Human.graphic, Human.colour],
  [Projectile.graphic, Projectile.colour],
  [Projectile.graphic2, Projectile.colour2],
  [Debris.graphic, Debris.colour],
  [Star.graphic, Star.colour]
]);

let doGame = (fastTextMode, viewWidth, viewHeight, input, t, debug = false) => {

  Global.viewWidth = viewWidth;
  Global.viewHeight = viewHeight;

  if(input.fire) {
    projectiles.push(new Projectile(projectileId++, player.x, player.y+1, (player.state == PlayerState.faceLeft) ? -4 : 4, 0, t));
    if(projectileId >= 1000) projectileId = 500;
  }

  let seekingInvaders = invaders.filter(i => i.state == InvaderState.seeking);
  let lockedInvaders = invaders.filter(i => i.state == InvaderState.locked);
  let abductingInvaders = invaders.filter(i => i.state == InvaderState.abducting);
  let mutantInvaders = invaders.filter(i => i.state == InvaderState.mutant);

  seekingInvaders.map(i => {
    let dx = player.x - i.x;
    if(Math.random() < 0.01 && Math.abs(dx) < (Global.viewWidth / 3)) {
      let dy = player.y - i.y;
      let l = Math.sqrt(dx * dx + dy * dy);
      let unitdx = dx / l;
      let unitdy = dy / l;
      invaderProjectiles.push(new Projectile(invaderProjectileId++, i.x, i.y, unitdx, unitdy, t));
    }
  });

  mutantInvaders.map(i => {
    if(Math.random() < 0.1) {
      invaderProjectiles.push(new Projectile(invaderProjectileId++, i.x, i.y, Math.random() - 0.5, Math.random() - 0.5, t));
    }
  });

  if(invaderProjectileId >= 1500) invaderProjectileId = 1000;
  if(invaderProjectiles.length > 30) remove(invaderProjectiles, invaderProjectiles[0].id, graphics);


  let projectileEvents = checkProjectiles(projectiles, t);
  let debrisEvents = checkDebris(debris, t);
  let pointsEvents = checkPoints(points, t);

  let hitEvents = checkHitInvaders(invaders, projectiles);

  let playerProjectileHitEvent = checkHitPlayerProjectiles(player, invaderProjectiles);
  let playerInvaderHitEvent = checkHitPlayerProjectiles(player, invaders);
  let playerHumanHitEvent = checkHitPlayerHumans(player, humans);

  let seekingInvaderEvents = seekingInvaders.reduce((arr, i) => arr.concat(checkSeekingInvader(i, humans)), []);
  let lockedInvaderEvents = lockedInvaders.reduce((arr, i) => arr.concat(checkLockedInvader(i, invaderTargets.get(i.id))), []);
  let abductingInvaderEvents = abductingInvaders.reduce((arr, i) => arr.concat(checkAbductingInvader(i)), []);

  let invaderEvents = [].concat(hitEvents, seekingInvaderEvents, lockedInvaderEvents, abductingInvaderEvents);

  let allEvents = [].concat(projectileEvents, playerProjectileHitEvent, playerInvaderHitEvent, playerHumanHitEvent, invaderEvents, debrisEvents, pointsEvents);
  allEvents.filter(e => e.event == Event.removeProjectile).map(e => remove(projectiles, e.id, graphics));
  allEvents.filter(e => e.event == Event.removeDebris).map(e => remove(debris, e.id, graphics));
  allEvents.filter(e => e.event == Event.removePoints).map(e => remove(points, e.id, graphics));
  allEvents.filter(e => e.event == Event.locked).map(e => invaderTargets.set(e.invaderId, e));
  allEvents.filter(e => e.event == Event.removeHuman).map(e => remove(humans, e.id, graphics));
  allEvents.filter(e => e.event == Event.playerDead).map(e => eiofjeiof());
  allEvents.filter(e => e.event == Event.collectedHuman).map(_ => {score += 20000; points.push(new Points(pointsId++, player.x, player.y, 0.01, 0.01, t, '20000'));});


  graphics.set(player.id, (player.state == PlayerState.faceLeft) ? Player.graphic[0] : Player.graphic[1]);

  invaders.map(i => {
    let g = (i.state == InvaderState.abducting) ? Invader.graphicAbducting : Invader.graphic;
    graphics.set(i.id, g);
  });
  humans.map(h => graphics.set(h.id, Human.graphic));
  projectiles.map(p => graphics.set(p.id, Projectile.graphic));
  invaderProjectiles.map(p => graphics.set(p.id, Projectile.graphic2));
  starfield.map(s => graphics.set(s.id, Star.graphic));
  debris.map(d => graphics.set(d.id, Debris.graphic));
  points.map(p => graphics.set(p.id, p.points));


  // non-functional code section. game objects are updated 'in-place'
  updatePlayerState(player, input);
  updateInvaderState(invaders, invaderEvents, t);

  updatePlayerPosition(player, input);
  updateInvaders(invaders, invaderTargets, player);
  updateHumans(humans);
  updateProjectiles(projectiles);
  updateProjectiles(invaderProjectiles);
  updateDebris(debris);
  updateProjectiles(points);
  // end non-functional code section

  // triggers based on state changes must be placed after state update code

  // abducting invaders drop human when hit
  invaders.filter(i => i.state == InvaderState.explodingReleaseHuman && i.t_startState == t)
    .map(i => humans.push(new Human(humanId++, i.x+2, i.y, 0, 0.1)));

  // invader explosion
  invaders.filter(i => i.state == InvaderState.explodingReleaseHuman || i.state == InvaderState.exploding && i.t_startState == t)
    .map(i => {
      score += 1000;
      remove(invaders, i.id, graphics);
      debris.push(new Debris(debrisId++, i.x, i.y,  0.7, 0.7, t));
      debris.push(new Debris(debrisId++, i.x, i.y,  1,  0, t));
      debris.push(new Debris(debrisId++, i.x, i.y,  0.7, -0.7, t));
      debris.push(new Debris(debrisId++, i.x, i.y,  0, -1, t));
      debris.push(new Debris(debrisId++, i.x, i.y, -0.7, -0.7, t));
      debris.push(new Debris(debrisId++, i.x, i.y, -1, 0, t));
      debris.push(new Debris(debrisId++, i.x, i.y, -0.7,  0.7, t));
      debris.push(new Debris(debrisId++, i.x, i.y, 0,  1, t));
      if(debrisId >= 4000) debrisId = 3000;
    });


  let displacementList = [].concat(invaders, humans, projectiles, invaderProjectiles, debris, points);

  let displacement = player.xdot;
  displacementList.map(o => {o.x = wrapx(o.x - displacement)});

  starfield.map(o => {o.x = wrapstarx(o.x - (displacement * o.depth))});

  let displayList = [].concat(starfield, displacementList, player);

  displayList
    .map(toLocal)
    .filter(clip)
    .map(i => {
      let g = graphics.has(i.id) ? graphics.get(i.id) : '!';
      let c = colours.has(g) ? colours.get(g) : 0xffffff;
      fastTextMode.setString(Math.floor(i.lx), Math.floor(i.ly), g, c)
      if(debug) {
        // overlay object id and x coordinate
        fastTextMode.setNumber(Math.floor(i.lx+3), Math.floor(i.ly), i.id)
        fastTextMode.setNumber(Math.floor(i.lx), Math.floor(i.ly+4), Math.floor(i.gx_debug))
      }
    });

  fastTextMode.setString(30, 2, 'Score: ');
  fastTextMode.setNumber(37, 2, score);

  (player.state == PlayerState.faceLeft) ? targetoffsetx = - 32 : targetoffsetx = 32;
  offsetx += easing * (targetoffsetx - offsetx);
}

