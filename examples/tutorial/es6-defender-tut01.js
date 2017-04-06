// -------------------------------------------------------------------------------------------------------------------------------------------
// constants and enums
// -------------------------------------------------------------------------------------------------------------------------------------------
let PlayerState = Object.freeze({faceLeft:1, faceRight:2, exploding:3})

const easing = 0.05;
const playerAccelX = 520;
const playerDampingX = 6;
const playerMaxSpeedX = 164;
const playerMaxSpeedY = 42;
const modulusx = 512;
const halfmodulusx = modulusx / 2;
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

// -------------------------------------------------------------------------------------------------------------------------------------------
// custom data type statics
// -------------------------------------------------------------------------------------------------------------------------------------------
Player.sideLen = 4;
Player.graphic = ['\xab\xac\xad\xae\n\xbb\xbc\xbd\xbe\n\xcb\xcc\xcd\xce\n\xdb\xdc\xdd\xde',
                  '\xa6\xa7\xa8\xa9\n\xb6\xb7\xb8\xb9\n\xc6\xc7\xc8\xc9\n\xd6\xd7\xd8\xd9'];
Player.colour = 0x00ccff;

// -------------------------------------------------------------------------------------------------------------------------------------------
// generic functions
// -------------------------------------------------------------------------------------------------------------------------------------------
let wrapx = (x) => {
  if(x < -halfmodulusx) x += modulusx;
  else if(x >= halfmodulusx) x -= modulusx;
  return x;
}

let toLocal = sv => {
  let lx = sv.x - offsetx;
  lx += Global.viewWidth / 2;

  let ly = sv.y;

  return {id:sv.id, lx:lx, ly:ly, gx_debug:sv.x};
}

let clip = lcoords => (lcoords.lx >= 0) && (lcoords.ly < Global.viewWidth);

// -------------------------------------------------------------------------------------------------------------------------------------------
// update state
// -------------------------------------------------------------------------------------------------------------------------------------------
let updatePlayerState = (player, input, playerDead) => {
  if(playerDead) {
    player.state = PlayerState.exploding;
    return;
  }

  if(input.leftright != 0) {
    player.state = (input.leftright == -1) ? PlayerState.faceLeft : PlayerState.faceRight;
  }
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

// -------------------------------------------------------------------------------------------------------------------------------------------
// game state variables
// -------------------------------------------------------------------------------------------------------------------------------------------
let offsetx = 0;
let targetoffsetx = 0;
let playerId = null;
let player = null;
let graphics = null;


// -------------------------------------------------------------------------------------------------------------------------------------------
// reset game state
// -------------------------------------------------------------------------------------------------------------------------------------------
let resetGame = (viewWidth, viewHeight, sound) => {

  Global.viewWidth = viewWidth;
  Global.viewHeight = viewHeight;

  playerId = 1;
  player = new Player(playerId, 0, viewHeight / 2, PlayerState.faceRight, 0);
  graphics = new Map();
}


// -------------------------------------------------------------------------------------------------------------------------------------------
// run a single game tick
// -------------------------------------------------------------------------------------------------------------------------------------------
let doGame = (textmap, input, sound, t, dt, debug = false) => {

  // update game object state
  // game objects are updated 'in-place'
  updatePlayerState         (player, input, false);

  // update positions
  // game objects are updated 'in-place'
  updatePlayerPosition      (player, input, dt);

  // prepare to draw
  // update graphics map
  graphics.set(player.id, (player.state == PlayerState.faceLeft) ? {g:Player.graphic[0], c:Player.colour} : {g:Player.graphic[1], c:Player.colour});

  let displayList = [].concat(player);

  // draw
  displayList
    .map(toLocal)
    .filter(clip)
    .map(i => {
      let g = graphics.has(i.id) ? graphics.get(i.id) : {g:'!', c:0xff0000};
      textmap.setString(Math.floor(i.lx), Math.floor(i.ly), g.g, g.c)
      if(debug) {
        // overlay object id and x coordinate
        textmap.setNumber(Math.floor(i.lx+3), Math.floor(i.ly), i.id)
        textmap.setNumber(Math.floor(i.lx), Math.floor(i.ly+4), Math.floor(i.gx_debug))
      }
    });

  // compute offset of local coordinate system
  // shift player to right or left of screen
  (player.state == PlayerState.faceLeft) ? targetoffsetx = -Global.viewWidth * 0.3 : targetoffsetx = Global.viewWidth * 0.3;
  // apply 'forward motion' effect as player velocity increases
  targetoffsetx -= 0.05 * player.xdot;
  // ease offset towards target offset
  offsetx += easing * (targetoffsetx - offsetx);

  return player.state == PlayerState.exploding;
}

