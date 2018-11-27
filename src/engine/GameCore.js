import React from 'react';
import ReactDOM from "react-dom";
import jsonStorage from 'electron-json-storage';
const PIXI = require("pixi.js");
import path from "path";

import spritesheet from '../data/assets/spritesheet.png'
import spritesheetJSON from '../data/assets/spritesheet.json';
import GameObjectFactory from "../objects/GameObject";


export default class GameCore {
    static UPDATE_LENGTH = {
        // for each tick, how many ms will it take
        SLOW: 5000,
        NORMAL: 2000,
        FAST: 1000
    };

    // TODO move this to config area in order to make it fully modular.
    static gameComponentTypes = [
        "physicsComponents",
        "informationComponents"
    ];

    static renderComponentTypes = [
        "renderComponents",
        "menuComponents",
    ];

    static gameObjectTypes = [
        "citys",
        "merchants"
    ];

    constructor(options={}) {
        this.speed = GameCore.UPDATE_LENGTH.NORMAL;
        this.previous = null;
        this.lag = 0;

        this.components = {
            inactive: []
        };

        this.gameObjects = {
            unnamed: []
        };

        for (const componentName of [...GameCore.gameComponentTypes, ...GameCore.renderComponentTypes]) {
            this.components[componentName] = []

        }

        for (const objectName of GameCore.gameObjectTypes) {
            this.gameObjects[objectName] = [];
        }

        this.openMenus = [];
        this.reRenderMenus = false;

        this.objectFactory = null;

        this.pixiApp = null;

        this.config = GameCore.createConfig(options)
    }

    static createConfig(options) {
        // TODO make this better.
        const config = {
            debug: false,
            ...options
        };

        if (config.debug) {
            config.debug = {
                frames: 0,
                frames_time: 0
            }
        }

        return config;
    }

    startGame() {
        const startGameLoop = () => {
            this.previous = new Date().getTime();
            this.gameLoop();
        };

        Promise.all([
            // Load in game data
            this.loadGameConfig(),
            // Load in spritesheet
            this.loadGameGraphics()
        ]).then(() => {
            // Load in dummy game
            if (this.config.debug) {
                this.loadGameSave("debug").then(() => {
                    startGameLoop();
                });
            } else {
                this.createNewGame();
                startGameLoop();
            }
            // Start timer and then start loop
        })
    }

    loadGameConfig() {
        return new Promise((resolve, reject) => {
            // The path has to be set from the working directory.
            jsonStorage.setDataPath(path.resolve("./src/data/config"));

            jsonStorage.has("configfile", (err, hasKey) => {
                if (err) {
                    reject(err);
                }

                if (hasKey) {
                    // what to do if there is a file
                    resolve()
                }

                reject("There was no config file");
            })
        })
    }

    loadGameGraphics() {
        return new Promise((resolve, reject) => {
            this.pixiApp = new PIXI.Application({
                width: window.innerWidth,
                height: window.innerHeight
            });
            document.body.appendChild(this.pixiApp.view);

            this.pixiApp.stage.interactive = true;

            const renderer = this.pixiApp.renderer;
            renderer.autoResize = true;
            renderer.view.style.position = "absolute";
            renderer.view.style.display = "block";

            // TODO if you want to make a unique standalone game engine, simply make this loader 'modular'
            PIXI.loader.add(
                "spritesheet", spritesheet
            ).load((loader, resources) => {
                const spritesheet = new PIXI.Spritesheet(
                    resources["spritesheet"].texture.baseTexture,
                    spritesheetJSON
                );

                const textureObject = {};
                spritesheet.parse((sprites) => {
                    for (const frame in spritesheetJSON.frames) {
                        textureObject[frame] = {
                            ...sprites[frame]
                            // Any additional information from spritesheet goes here.
                        }
                    }
                    textureObject.metadata = spritesheetJSON.metadata
                });

                this.objectFactory = new GameObjectFactory(textureObject);

                document.getElementsByTagName("canvas")[0].addEventListener("mousewheel", (ev) => {
                    // This is the function to allow for scrolling in and out of a point.
                    ev.stopPropagation();
                    let scaleBy = 1.05;

                    let mainStage = this.pixiApp.stage;
                    let oldScale = mainStage.scale.x;

                    let mousePointTo = {
                        x: ev.x / oldScale - mainStage.position.x / oldScale,
                        y: ev.y / oldScale - mainStage.position.y / oldScale,
                    };

                    let newScale = ev.deltaY < 0 ? Math.min(2, oldScale * scaleBy) : Math.max(0.5, oldScale / scaleBy); // Min Max for zooms hard coded here.
                    mainStage.scale = { x: newScale, y: newScale };

                    let newPos = {
                        x: -(mousePointTo.x - ev.x / newScale) * newScale,
                        y: -(mousePointTo.y - ev.y / newScale) * newScale
                    };

                    mainStage.position = newPos;
                });

                 // TODO fix this. Issue being reactEntry overlaps this.
                const onDragStart = (event) => {
                    // store a reference to the data
                    // the reason for this is because of multitouch
                    console.log("Drag Starting");
                    this.data = {x: event.data.global.x, y: event.data.global.y};
                    this.dragging = true;
                };
                const onDragEnd = () => {
                    console.log("Drag Ended");
                    this.dragging = false;
                    this.data = null;

                };
                const onDragMove = (event) => {
                    // we want to track the movement of this particular touch
                    console.log("onDragMove");
                    if (this.dragging)
                    {
                        this.pixiApp.stage.position.x += event.data.global.x - this.data.x;
                        this.pixiApp.stage.position.y += event.data.global.y - this.data.y;

                        this.data = {x: event.data.global.x, y: event.data.global.y};
                        // Can probably optimize this, but oh wells
                    }
                };

                this.pixiApp.stage
                    .on('pointerdown', onDragStart)
                    // events for drag end
                    .on('pointerup', onDragEnd)
                    // events for drag move
                    .on('mousemove', onDragMove)
                    .on('touchmove', onDragMove);


                // Attaching the stage to the main app so rendering can be performed.

                resolve();
            });
        });
    }

    loadGameSave(saveName) {
        return new Promise((resolve, reject) => {
            // The path has to be set from the working directory.
            jsonStorage.setDataPath(path.resolve("./src/data/saves"));

            jsonStorage.has(saveName, (err, hasKey) => {
                if (err) {
                    reject(err);
                }

                if (hasKey) {
                    jsonStorage.get(saveName, (err, data) => {
                        if (err) reject(err);

                        this.createNewGame(data.mapTerrain, data.cities);

                        resolve();
                    });
                } else {
                    // Must be under the 'else' clause due to jsonStorage.get() being async.
                    reject("There was no save under the name of '" + saveName + "'.");
                }
            })
        })
    }

    gameLoop = () => {
        // The game loop. Exactly what it says it is.
        // Timing mechanism updates the game state once every 1/60th of a second
        // and in the meantime, renders the rest of the game as fast as possible.

        // Calculate lag (how much time has passed since the last game update.
        let current = new Date().getTime();
        let elapsed = current - this.previous;
        this.previous = current;
        this.lag += elapsed;

        // If lag is greater than the 1/60th of a second, update the game.
        // Continue to do this while the lag is higher than that.
        while (this.lag >= this.speed) {
            // Passes through the amount of ticks since the last elapsed.
            this.updateGameState(Math.floor(this.lag/this.speed));
            this.lag %= this.speed;
        }

        // Render the graphics with an idea of how much time has passed.
        // Passing in the lag helps better simulate the motion of projectiles and
        // other fast moving spritesheet on the game field.
        this.renderGraphics(this.lag);

        if (this.config.debug) {
            this.config.debug.frames += 1;
            this.config.debug.frames_time += elapsed;
            if (this.config.debug.frames_time >= 1000) {
                this.config.debug.frames_time -= 1000;
                // console.log("frames: ", this.config.debug.frames);
                this.config.debug.frames = 0;
                // console.log(this);
            }
        }

        // recall the game loop, and free up assets for Electron/PIXI
        requestAnimationFrame(this.gameLoop) // TODO find appropriate numbers.
    };

    updateComponents(nameset, delta) {
        for (const componentName of nameset) {
            let componentList = this.components[componentName];

            for (const component of componentList) {
                if (!component.update(this, delta)) {
                    componentList.splice(componentList.indexOf(component), 1);
                    this.components.inactive.push(component)
                }
            }
        }
    }


    updateGameState(delta) {
        this.updateComponents(GameCore.gameComponentTypes, delta)
    }

    renderGraphics(lag) {
        // TODO
        this.updateComponents(GameCore.renderComponentTypes, lag);

        if (this.reRenderMenus) {
            this.reRenderMenus = false;
            ReactDOM.render(
                <div>
                    {this.openMenus}
                </div>,
                document.getElementById("reactEntry")
            )
        }
    }

    createNewGame(
        mapTerrain=false,
        cities=[]
    ) {
        this.addNewGameObject(this.objectFactory.createMap(this, mapTerrain));
        // TODO patch hack
        for (const city of cities) {
            this.addNewGameObject(this.objectFactory.createNewCity(this, city.pos, city.details))
        }
    }

    addNewGameObject(object) {
        for (const componentName of Object.keys(object.components)) {
            const component = object.components[componentName];
            this.components[componentName + "s"].push(component);
        }

        for (const component of Object.values(object.components)) {
            component.addComponent(this);
        }

        try {
            this.gameObjects[object.objectType + "s"].push(object);
        } catch (e) {
            this.gameObjects["unnamed"].push(object);
        }
    }

    addMenu(component) {
        this.openMenus.push(component);
        this.reRenderMenus = true;
    }

    removeMenu(component) {
        this.openMenus.splice(this.openMenus.indexOf(component), 1);
        this.reRenderMenus = true;
    }

    getComponents
}