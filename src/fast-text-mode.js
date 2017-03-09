/*
* FastTextMode
*
* Copyright (C) 2016  Mark Purser
* Released under the MIT license
* http://github.com/markpurser/fast-text-mode/LICENSE
*
* Tile rendering based on
* https://github.com/jice-nospam/yendor.ts
* Copyright (c) 2014 Jice
*/

/**
* @module FastTextMode
*/


class FastTextMode {

    init(options) {
        var _this = this;

        options = options || {};
        Object.keys( FastTextMode.defaults ).forEach( function( key ) {
            if (!(key in options)) options[ key ] = FastTextMode.defaults[ key ];
        });

        _this._options = options;

        return new Promise(function(resolve, reject) {
            // create a new instance of a pixi container
            _this._parentContainer = new PIXI.Container();

            _this._tileTextures = [];

            // create a renderer instance
            var pixiOptions = {
                clearBeforeRender: true,
                preserveDrawingBuffer: false,
                resolution: 1,
                view: options.renderCanvas
            };

            _this._renderer = PIXI.autoDetectRenderer(
                options.renderCanvasSize.width, options.renderCanvasSize.height, pixiOptions);
            _this._renderer.backgroundColor = 0x66ff99;

            _this._stats = {
                fpsText: new PIXI.Text('', {font: '24px Arial', fill: 0xff1010}),
                fpsTimer: 0,
                currentFrameCount: 0
            };


            var loader = PIXI.loader;
            loader.add('tilesheet', options.tilesheetImage);

            loader.load( function( loader, resources )
            {
                var numTilesX = resources.tilesheet.texture.width / options.tileWidthPx;
                var numTilesY = resources.tilesheet.texture.height / options.tileHeightPx;

                // init tile textures
                for(var x = 0; x < numTilesX; x++)
                {
                    for(var y = 0; y < numTilesY; y++)
                    {
                        var rect = new PIXI.Rectangle(x * options.tileWidthPx, y * options.tileHeightPx, options.tileWidthPx, options.tileHeightPx);
                        _this._tileTextures[x + y * numTilesX] = new PIXI.Texture(resources.tilesheet.texture, rect);
                    }
                }

                _this._worldSpriteContainer = new SpriteGrid(
                    options.viewWidth, options.viewHeight, options.tileWidthPx, options.tileHeightPx, _this._tileTextures[33]);

                _this._parentContainer.addChild(_this._worldSpriteContainer.getSpriteContainer());
                _this._parentContainer.addChild(_this._stats.fpsText);

                resolve();
            });
        });
    }

    render() {
        if(this._options.displayStats)
        {
            this.updateStats(this._stats);
        }

        // render
        this._renderer.render(this._parentContainer);
    }

    set(x, y, tileCode) {
        this._worldSpriteContainer.getSprites()[x + y * this._options.viewWidth].texture = this._tileTextures[tileCode];
    }

    updateStats(stats) {
        stats.currentFrameCount++;
        if( stats.fpsTimer === 0 )
        {
            stats.fpsTimer = new Date().getTime();
        }
        else if( new Date().getTime() - stats.fpsTimer > 1000 )
        {
            var rendererTypeStr = 'Canvas';
            if(this._renderer instanceof PIXI.WebGLRenderer)
            {
                rendererTypeStr = 'WebGL';
            }
            stats.fpsText.text = 'fps: ' + stats.currentFrameCount + '\npixi: ' + PIXI.VERSION + '\nRenderer: ' + rendererTypeStr;
            stats.fpsTimer = new Date().getTime();
            stats.currentFrameCount = 0;
        }
    }
}

FastTextMode.defaults = {
    renderCanvas: document.getElementById("render-canvas"),
    renderCanvasSize: {width: 1600, height: 400},
    tilesheetImage: "assets/terminal.png",
    tileWidthPx: 16,
    tileHeightPx: 16,
    viewWidth: 64,
    viewHeight: 64,
    displayStats: true
}

class SpriteGrid {

    constructor(gridWidth, gridHeight, tileWidthPx, tileHeightPx, tileTexture) {

        this.spriteContainer = new PIXI.Container();
        this.sprites = [];

        // init grid
        for(var x = 0; x < gridWidth; x++)
        {
            for(var y = 0; y < gridHeight; y++)
            {
                var sprite = new PIXI.Sprite(tileTexture);
                sprite.position.x = x * tileWidthPx;
                sprite.position.y = y * tileHeightPx;
                sprite.width = tileWidthPx;
                sprite.height = tileHeightPx;
                this.sprites[x + y * gridWidth] = sprite;
                this.spriteContainer.addChild(sprite);
            }
        }
    }

    getSpriteContainer() {
        return this.spriteContainer;
    }

    getSprites() {
        return this.sprites;
    }
}

