window.onerror = function (err, src, lineno, colno) {
    alert(err + " " + lineno + ":" + colno + " " + src);
}

/**
 * @type { HTMLCanvasElement }
 */
var scene = document.getElementById("scene");
var ctx = scene.getContext("2d");

var vWidth = window.innerWidth;
var vHeight = window.innerHeight;

var updateIdx = 999;
var tFps = 60;

var keysDown = [];

var paused = false;

function resizeCanvas() {
    vWidth = window.innerWidth;
    vHeight = window.innerHeight;
    scene.width = vWidth * window.devicePixelRatio;
    scene.height = vHeight * window.devicePixelRatio;
}

resizeCanvas();

function drawGrid(context, x, y, width, height, gridCellSize = 16, options = {}) {
    context.save();
    Object.assign(context, options);
    context.beginPath();

    if (typeof gridCellSize === "number") {
        for (var lx = x; lx <= x + width; lx += gridCellSize) {
            context.moveTo(lx, y);
            context.lineTo(lx, y + height);
        }

        for (var ly = y; ly <= y + height; ly += gridCellSize) {
            context.moveTo(x, ly);
            context.lineTo(x + width, ly);
        }
    } else if (typeof gridCellSize === "object") {
        for (var lx = x; lx <= x + width; lx += gridCellSize.x) {
            context.moveTo(lx, y);
            context.lineTo(lx, y + height);
        }

        for (var ly = y; ly <= y + height; ly += gridCellSize.y) {
            context.moveTo(x, ly);
            context.lineTo(x + width, ly);
        }
    }

    context.stroke();
    context.closePath();
    context.restore();
}

var mouse = {
    position: new Vec2(0, 0),
    previous: new Vec2(0, 0),
    velocity: new Vec2(0, 0),
    down: false,
    rightdown: false
}

var camera = new Camera(0, 0, 1, 0);

class VerletCircle {
    constructor(x, y, radius, color, density) {
        this.position = new Vec2(x, y);
        this.previous = new Vec2(x, y);
        this.prev = new Vec2(x, y);
        this.acceleration = new Vec2(0, 0);
        this.radius = radius;
        this.color = color;
        this.mass = 1;
        // this.mass = Math.PI * (this.radius * this.radius);
        this.density = density;
    }

    accelerate(force) {
        this.acceleration.plusEquals(force.divide(this.mass));
    }

    update(dt) {
        var velocity = this.position.subtract(this.previous);

        this.prev = this.previous.clone();
        this.previous = this.position.clone();
        this.position.plusEquals(velocity.add(this.acceleration.multiply(dt * dt)));

        this.acceleration = new Vec2(0, 0);
    }

    draw(context) {
        context.save();
        // context.fillStyle = this.color;
        // context.beginPath();
        // context.arc(this.position.x, this.position.y, this.radius, 0, tau, false);
        // context.closePath();
        // context.fill();
        context.lineWidth = this.radius * 2;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.strokeStyle = this.color;
        // var alpha = Math.sqrt(1 / this.position.subtract(this.previous).length());

        // if (isNaN(alpha)) {
        //     alpha = 1;
        // }

        // context.globalAlpha = alpha;
        context.beginPath();
        context.moveTo(this.previous.x, this.previous.y);
        context.lineTo(this.position.x, this.position.y);
        context.stroke();
        context.closePath();

        // context.fillStyle = this.color;
        // var substeps = 1;
        // context.globalAlpha = 1 / substeps;
        // for (var i = 0; i < substeps; i++) {
        //     var time = i / (substeps - 1);

        //     if (isNaN(time)) {
        //         time = 1;
        //     }

        //     var pos = lerpVec2(this.prev, this.position, time);
        //     context.beginPath();
        //     context.arc(pos.x, pos.y, this.radius, 0, tau, false);
        //     context.closePath();
        //     context.fill();
        // }
        context.restore();
    }
}

class VerletConstraint {
    constructor(objA, objB, length) {
        this.objA = objA;
        this.objB = objB;
        this.length = length;
    }
}

class VerletPhysicsEngine {
    constructor(gravity = { direction: new Vec2(0, 1), strength: 1 }) {
        this.gravity = gravity;
        this.substeps = 8;
        this.halfBoundsX = 256;
        this.halfBoundsY = 256;
        this.boundsRadius = 256;
        // this.halfBoundsX = 256;
        // this.halfBoundsY = 256;
        this.objects = [];
    }

    addObject(object) {
        this.objects.push(object);
    }

    removeObject(object) {
        var index = this.objects.indexOf(object);

        if (index > -1) {
            if (object instanceof VerletConstraint == false) {
                for (var i = 0; i < this.objects.length; i++) {
                    if (i === index) {
                        continue;
                    }

                    var obj = this.objects[i];

                    if (obj instanceof VerletConstraint && (obj.objA == object || obj.objB == object)) {
                        this.objects.splice(i, 1);
                        i--;
                        continue;
                    }
                }
            }

            this.objects.splice(index, 1);
        }
    }

    update(dt) {
        var sdt = dt / this.substeps;
        for (var i = 0; i < this.substeps; i++) {
            this.applyGravity();
            this.updatePositions(sdt);
            this.applyBoundsConstraint();
            this.resolveCollisions();
        }
    }

    resolveCollisions() {
        for (var i = 0; i < this.objects.length - 1; i++) {
            var obj1 = this.objects[i];

            if (obj1 instanceof VerletConstraint) {
                continue;
            }

            for (var j = i + 1; j < this.objects.length; j++) {
                var obj2 = this.objects[j];

                if (obj2 instanceof VerletConstraint) {
                    continue;
                }

                var axis = obj2.position.subtract(obj1.position);
                var dist = axis.length();

                var combinedRadii = obj1.radius + obj2.radius;

                if (dist < combinedRadii) {
                    var normal = axis.normalized;

                    var totalMass = obj1.mass + obj2.mass;
                    var ratio1 = obj2.mass / totalMass;
                    var ratio2 = obj1.mass / totalMass;

                    var overlap = combinedRadii - dist;

                    obj1.position.plusEquals(normal.multiply(ratio1 * -overlap));
                    obj2.position.plusEquals(normal.multiply(ratio2 * overlap));
                }
            }
        }
    }

    applyBoundsConstraint() {
        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];

            if (obj instanceof VerletConstraint) {
                continue;
            }

            var dist = obj.position.length();

            if (dist > this.boundsRadius - obj.radius) {
                obj.position = obj.position.normalized.multiply(this.boundsRadius - obj.radius);
            }

            // if (obj.position.x - obj.radius < -this.halfBoundsX) {
            //     obj.position.x = -this.halfBoundsY + obj.radius;
            // }

            // if (obj.position.x + obj.radius > this.halfBoundsX) {
            //     obj.position.x = this.halfBoundsX - obj.radius;
            // }

            // if (obj.position.y - obj.radius < -this.halfBoundsY) {
            //     obj.position.y = -this.halfBoundsY + obj.radius;
            // }

            // if (obj.position.y + obj.radius > this.halfBoundsY) {
            //     obj.position.y = this.halfBoundsY - obj.radius;
            // }
        }
    }

    updatePositions(dt) {
        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];

            if (obj instanceof VerletConstraint) {
                continue;
            }

            obj.update(dt);
        }
    }

    applyGravity() {
        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];

            if (obj instanceof VerletConstraint) {
                continue;
            }

            obj.accelerate(this.gravity.direction.multiply(this.gravity.strength * obj.mass));
        }
    }

    draw(context) {
        for (var i = 0; i < this.objects.length; i++) {
            this.objects[i].draw(context);
        }
    }
}

var engine = new VerletPhysicsEngine({ direction: new Vec2(0, 1), strength: 1 });

var tick = 0;

function main() {
    if (tick % 15 === 0) {
        var pAngle = random(0, tau);
        // var pRadius = random(0, 16);
        var pRadius = 16;
        engine.addObject(new VerletCircle(Math.cos(pAngle) * pRadius, Math.sin(pAngle) * pRadius/* - 224*/, 16, "#ffffff", 1));
    }

    // var gravityDir = (tick % 360) * degToRad * 6;
    // engine.gravity.direction = new Vec2(Math.cos(gravityDir), Math.sin(gravityDir));

    engine.update(1);

    if (keysDown["w"]) {
        camera.position.y -= 1;
    }

    if (keysDown["a"]) {
        camera.position.x -= 1;
    }

    if (keysDown["s"]) {
        camera.position.y += 1;
    }

    if (keysDown["d"]) {
        camera.position.x += 1;
    }

    if (keysDown["ArrowLeft"]) {
        camera.rotation -= 6;
    }

    if (keysDown["ArrowRight"]) {
        camera.rotation += 6;
    }

    tick++;

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.clearRect(0, 0, vWidth, vHeight);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, vWidth, vHeight);
    camera.applyToCtx(ctx, vWidth, vHeight);

    // var diagonalScreenLength = Math.sqrt(vWidth * vWidth + vHeight * vHeight);

    // var floorPoint1 = new Vec2((-diagonalScreenLength / 2) / camera.viewScale + camera.position.x, engine.floorY);
    // var floorPoint2 = new Vec2((diagonalScreenLength / 2) / camera.viewScale + camera.position.x, engine.floorY);

    // ctx.strokeStyle = "#ff0000";
    // ctx.beginPath();
    // ctx.moveTo(floorPoint1.x, floorPoint1.y);
    // ctx.lineTo(floorPoint2.x, floorPoint2.y);
    // ctx.stroke();
    // ctx.closePath();

    ctx.strokeStyle = "#ff0000";
    ctx.strokeRect(-engine.halfBoundsX, -engine.halfBoundsY, engine.halfBoundsX * 2, engine.halfBoundsY * 2);

    ctx.beginPath();
    ctx.arc(0, 0, engine.boundsRadius, 0, tau, false);
    ctx.stroke();
    ctx.closePath();

    engine.draw(ctx);

    ctx.restore();

    mouse.velocity.x = 0;
    mouse.velocity.y = 0;
    mouse.previous.x = mouse.position.x;
    mouse.previous.y = mouse.position.y;
}

window.addEventListener("load", () => {
    updateIdx = setInterval(main, 1000 / tFps);
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("wheel", (e) => {
    if (e.deltaY < 0) {
        camera.viewScale /= 0.96;
    } else {
        camera.viewScale *= 0.96;
    }
});

window.addEventListener("keydown", (e) => {
    keysDown[e.key] = true;
    // e.preventDefault();
});

window.addEventListener("keyup", (e) => {
    keysDown[e.key] = false;

});

window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

window.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        mouse.down = true;
    }

    if (e.button === 2) {
        mouse.rightdown = true;
    }

    var mpx = mouse.position.x;
    var mpy = mouse.position.y;
    var mousePos = camera.applyToMouse(vWidth, vHeight, e.clientX, e.clientY);
    mouse.position.x = mousePos.x;
    mouse.position.y = mousePos.y;
    mouse.previous.x = mpx;
    mouse.previous.y = mpy;
});

window.addEventListener("mousemove", (e) => {
    var mpx = mouse.position.x;
    var mpy = mouse.position.y;
    var mousePos = camera.applyToMouse(vWidth, vHeight, e.clientX, e.clientY);
    mouse.position.x = mousePos.x;
    mouse.position.y = mousePos.y;
    mouse.velocity.x = mouse.position.x - mpx;
    mouse.velocity.y = mouse.position.y - mpy;
    mouse.previous.x = mpx;
    mouse.previous.y = mpy;
});

window.addEventListener("mouseup", () => {
    mouse.down = false;
    mouse.rightdown = false;
});