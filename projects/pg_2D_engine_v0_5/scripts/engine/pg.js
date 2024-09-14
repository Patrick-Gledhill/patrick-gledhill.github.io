import * as Physics from "./pgPhysics.js";
import { Camera } from "./camera.js";
import { Vec2, Vec3 } from "./vec.js";
import * as Utils from "./utils.js";

export var pgEngine = {
    Vec2: Vec2,
    Vec3: Vec3,
    Utils: Utils,
    Camera: Camera,
    Physics: Physics
};