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
var tFps = 240;

var dt = 1;
var prevTime = 0;
var curTime = 0;

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

var camera = new Camera(0, 0, 0.01, 0);

class CircleObj {
    constructor(x, y, radius, density, centerOfMass, color, glow = true, glowColor = "#ffffff", isStatic = false, isPinned = false) {
        this.position = new Vec2(x, y);
        this.glow = glow;
        this.glowColor = glowColor;
        this.radius = radius;
        this.rotation = 0;
        this.collider = PgPhysicsObject.createCircle(this, new Vec2(0, 0), this.radius, isStatic, density, centerOfMass, 0.2, 0.7, 0.5, isPinned);
        this.color = color;
    }

    update() {
        // this.collider.applyToParent();
    }

    draw(context) {
        context.save();

        context.translate(this.position.x * 2, this.position.y * 2);
        // context.rotate(this.rotation);
        context.beginPath();
        if (this.glow == true) {
            context.globalCompositeOperation = "lighter";
            context.shadowBlur = 32;
            context.shadowColor = this.glowColor;
        }
        // context.fillStyle = this.color;
        // context.arc(0, 0, this.radius * 2, 0, 2 * Math.PI, false);
        // context.fill();
        // context.closePath();

        context.lineWidth = this.radius * 4;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.strokeStyle = this.color;

        context.beginPath();
        context.moveTo(-this.collider.velocity.x * dt, -this.collider.velocity.y * dt);
        context.lineTo(0, 0);
        context.stroke();
        context.closePath();

        context.restore();
    }
}

// var physObjects = [
//     new CircleObj(0, 0, 695.7, 1.41, new Vec2(0, 0), "#fff4b3", true, "#ff8000", false, false), // 695.7
//     new CircleObj(15000, 0, 400, 1.41, new Vec2(0, 0), "#fff4b3", true, "#ff8000", false, false), // 6.378
//     new CircleObj(-15000, 0, 400, 1.41, new Vec2(0, 0), "#fff4b3", true, "#ff8000", false, false) // 6.378 149597.871
// ];

// physObjects[1].collider.velocity.y = 1300;
// physObjects[2].collider.velocity.y = -1300;

function calculateOrbitalVelocity(obj1, obj2) {
    // What goes here? Make sure to convert the units to and from
}


var physObjects = [
    // The position is in megameters, the radius is in megameters, and the density is in g/cm^2!!!.
    new CircleObj(0, 0, 2087.1, 4.23, new Vec2(0, 0), "#fff4b3", true, "#ff8000", false, false), // 695.7
    new CircleObj(0, -12500, 300, 1.41, new Vec2(0, 0), "#fff4b3", true, "#ff8000", false, false), // 6.378
    // new CircleObj(30000, 0, 300, 1.41, new Vec2(0, 0), "#fff4b3", true, "#ff8000", false, false) // 6.378 149597.871
];

var orbitVelocity = calculateOrbitalVelocity(physObjects[1].collider, physObjects[0].collider);

physObjects[0].collider.velocity.x = orbitVelocity.v2;
// physObjects[2].collider.velocity.y = 2000;

var physEngine = new PgPhysics({ direction: new Vec2(0, 0), strength: 0 }, 1);

for (var i = 0; i < physObjects.length; i++) {
    physEngine.addObject(physObjects[i].collider);
}

var orbitPoints = [
    [],
    [],
    []
];

var simStep = 0;
var timeAcceleration = 1;

function applyGravity() {
    for (var i = 0; i < physEngine.objects.length - 1; i++) {
        var obj1 = physEngine.objects[i];

        for (var j = i + 1; j < physEngine.objects.length; j++) {
            var obj2 = physEngine.objects[j];

            // Implement gravitational attraction calculations here

            var axis = obj2.position.subtract(obj1.position);
            var dist = axis.length() * 1000000;
            axis.normalize();

            if (dist > 0) {
                var mass1 = obj1.density * 10000 * Math.PI * Math.pow(obj1.radius * 1000000, 2);
                var mass2 = obj2.density * 10000 * Math.PI * Math.pow(obj2.radius * 1000000, 2);

                var force = (6.6743e-11 * mass1 * mass2) / (dist * dist);

                var scaledForce = force / 1000000;

                obj1.applyForce(axis.multiply(scaledForce));
                obj2.applyForce(axis.multiply(-scaledForce));

                // obj1.applyForce(axis.multiply(force));
                // obj2.applyForce(axis.multiply(-force));
            }
        }
    }
}

function main() {
    curTime = performance.now();
    dt = (curTime - prevTime) / 1000;
    prevTime = curTime;
    dt = (1000 / 60) / 1000;

    if (keysDown["w"]) {
        camera.position.y -= 2 / camera.viewScale;
    }

    if (keysDown["a"]) {
        camera.position.x -= 2 / camera.viewScale;
    }

    if (keysDown["s"]) {
        camera.position.y += 2 / camera.viewScale;
    }

    if (keysDown["d"]) {
        camera.position.x += 2 / camera.viewScale;
    }

    if (keysDown["ArrowLeft"]) {
        camera.rotation -= 2;
    }

    if (keysDown["ArrowRight"]) {
        camera.rotation += 2;
    }

    applyGravity();

    physEngine.update(dt * timeAcceleration);

    // physObjects[1].collider.position = mouse.position.clone().divide(2);

    for (var i = 0; i < orbitPoints.length; i++) {
        for (var j = 0; j < orbitPoints[i].length; j++) {
            var p = orbitPoints[i][j];
    
            p.t++;
    
            if (p.t >= 7200) {
                orbitPoints[i].splice(j, 1);
                j--;
                continue;
            }
        }
    }

    if (simStep % 6 === 0) {
        orbitPoints[0].push({ pos: physObjects[0].position.multiply(2), t: 0 });
        orbitPoints[1].push({ pos: physObjects[1].position.multiply(2), t: 0 });
        // orbitPoints[2].push({ pos: physObjects[2].position.multiply(2), t: 0 });
    }

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.clearRect(0, 0, vWidth, vHeight);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, vWidth, vHeight);
    camera.applyToCtx(ctx, vWidth, vHeight);

    ctx.save();
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2 / camera.viewScale;

    ctx.beginPath();
    for (var i = 0; i < orbitPoints.length; i++) {
        if (orbitPoints[i].length > 1) {
            for (var j = 0; j < orbitPoints[i].length; j++) {
                var p1 = orbitPoints[i][j];
                // var p2 = orbitPoints[i][j + 1];

                // ctx.globalAlpha = 1 - (p2.t / 600);
    
                if (j === 0) {
                    ctx.moveTo(p1.pos.x, p1.pos.y);
                } else {
                    ctx.lineTo(p1.pos.x, p1.pos.y);
                }

                // ctx.beginPath();
                // ctx.moveTo(p1.pos.x, p1.pos.y);
                // ctx.lineTo(p2.pos.x, p2.pos.y);
                // ctx.stroke();
                // ctx.closePath();
            }
        }
    }
    ctx.stroke();
    ctx.closePath();
    ctx.restore();

    for (var i = 0; i < physObjects.length; i++) {
        var obj = physObjects[i];

        obj.draw(ctx);
    }

    ctx.restore();

    ctx.save();
    ctx.font = "16px arial";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Distance: " + physObjects[1].position.length(), 8, 8);
    ctx.restore();

    mouse.velocity.x = 0;
    mouse.velocity.y = 0;
    mouse.previous.x = mouse.position.x;
    mouse.previous.y = mouse.position.y;

    simStep++;
}

window.addEventListener("load", () => {
    prevTime = performance.now();

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