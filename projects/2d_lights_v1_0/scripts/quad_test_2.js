/**
 * @type { HTMLCanvasElement }
 */
var scene = document.getElementById("scene");
var ctx = scene.getContext("2d");

var vWidth = window.innerWidth;
var vHeight = window.innerHeight;

var targetFPS = 60;

var lastTimestamp = performance.now();
var fps = 1000;

var displayFPS = 512;

function calculateFPS() {
    var delta = (performance.now() - lastTimestamp) / 1000;
    lastTimestamp = performance.now();
    fps = Math.trunc(1 / delta);
}

var friction = 0.8;
var worldScale = 1;
var zoomingDampener = 0.98;

var keysDown = [];

var mouse = {
    x: 0,
    y: 0,
    down: false,
    rightdown: false
}

var polyPoints = [];

var updateLoop;
var updateFPS;

function resizeCanvas() {
    vWidth = window.innerWidth;
    vHeight = window.innerHeight;
    scene.width = vWidth * window.devicePixelRatio;
    scene.height = vHeight * window.devicePixelRatio;

    // tWidth = window.innerWidth;
    // tHeight = window.innerHeight;
    // scene.width = tWidth;
    // scene.height = tHeight;
}

resizeCanvas();

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(min, max, value) {
    if (value < min) {
        return min;
    }

    if (value > max) {
        return max;
    }

    return value;
}

function lerp(start, end, t) {
    return start + (end - start) * clamp(0, 1, t);
}

function map(value, fromMin, fromMax, toMin, toMax) {
    // Calculate the percentage of the value within the original range
    const percentage = (value - fromMin) / (fromMax - fromMin);

    // Map the percentage to the new range
    const result = percentage * (toMax - toMin) + toMin;

    return result;
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}

function snapNumberToGrid(number, gridSize) {
    return Math.floor(number / gridSize) * gridSize;
}

function getCenterOfPolygon(vertices) {
    var x = 0;
    var y = 0;
    for (var i = 0; i < vertices.length; i++) {
        x += vertices[i].x;
        y += vertices[i].y;
    }
    return {
        x: x / vertices.length,
        y: y / vertices.length
    };
}

function rectangleToRectangleCollisionDetection(obj1, obj2) {
    if (obj1.x + obj1.width > obj2.x && obj1.x < obj2.x + obj2.width &&
        obj1.y + obj1.height > obj2.y && obj1.y < obj2.y + obj2.height) {
        return true;
    }

    return false;
}

function rectangleToRectangleCollisionResolution(obj1, obj2) {
    var vx = ((obj2.x + (obj2.width / 2)) - (obj1.x + (obj1.width / 2)));
    var vy = ((obj2.y + (obj2.height / 2)) - (obj1.y + (obj1.height / 2)));

    var dir = Math.atan2(vy, vx);

    if (Math.abs(vx / obj2.width) > Math.abs(vy / obj2.height)) {
        if (vx > 0) {
            obj1.x = obj2.x - obj1.width;
        } else {
            obj1.x = obj2.x + obj2.width;
        }
    } else {
        if (vy > 0) {
            obj1.y = obj2.y - obj1.height;
        } else {
            obj1.y = obj2.y + obj2.height;
        }
    }
}

function pointToRectangleCollisionDetection(obj1, obj2) {
    if (obj1.x > obj2.x && obj1.x < obj2.x + obj2.width &&
        obj1.y > obj2.y && obj1.y < obj2.y + obj2.height) {
        return true;
    }

    return false;
}

function rectangleToCircleCollisionDetection(rectangle, circle) {
    var testX = circle.x;
    var testY = circle.y;

    if (circle.x < rectangle.x) {
        testX = rectangle.x;
    } else if (circle.x > rectangle.x + rectangle.width) {
        testX = rectangle.x + rectangle.width;
    }

    if (circle.y < rectangle.y) {
        testY = rectangle.y;
    } else if (circle.y > rectangle.y + rectangle.height) {
        testY = rectangle.y + rectangle.height;
    }

    var distX = circle.x - testX;
    var distY = circle.y - testY;
    var distance = Math.sqrt((distX * distX) + (distY * distY));

    if (distance <= circle.radius) {
        return true;
    }
    return false;
}

function circleToCircleCollisionDetection(obj1, obj2) {
    var dx = obj2.x - obj1.x;
    var dy = obj2.y - obj1.y;
    var distance = Math.sqrt((dx * dx) + (dy * dy));

    if (distance <= obj1.radius + obj2.radius) {
        return true;
    }

    return false;
}

function pointToCircleCollisionDetection(point, circle) {
    var dx = point.x - circle.x;
    var dy = point.y - circle.y;
    var distance = Math.sqrt((dx * dx) + (dy * dy));

    if (distance <= circle.radius) {
        return true;
    }

    return false;
}

function pointToLineCollisionDetection(point, line) {
    var d1 = Math.sqrt((point.x - line.x1) * (point.x - line.x1) + (point.y - line.y1) * (point.y - line.y1));
    var d2 = Math.sqrt((point.x - line.x2) * (point.x - line.x2) + (point.y - line.y2) * (point.y - line.y2));

    var lineLen = Math.sqrt((line.x1 - line.x2) * (line.x1 - line.x2) + (line.y1 - line.y2) * (line.y1 - line.y2));

    var buffer = 0.2;

    if (d1 + d2 >= lineLen - buffer && d1 + d2 <= lineLen + buffer) {
        return true;
    }

    return false;
}

function pointToPolygonCollisionDetection(point, vertices) {
    var collision = false;

    for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        var xi = vertices[i].x, yi = vertices[i].y;
        var xj = vertices[j].x, yj = vertices[j].y;

        var intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

        if (intersect) {
            collision = !collision;
        }
    }

    return collision;
}

class Vertex2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Light {
    constructor(x, y, radius, color, intensity, isStatic = false) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.intensity = intensity;
        this.static = isStatic;
        this.computeLighting = true;
        this.staticRays = [];
    }
}

class Wall {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }
}

class WallCircle {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
    }
}

class WallPoly {
    constructor(vertices = [], color) {
        this.vertices = vertices;
        this.color = color;
    }
}

function castRay(x, y, angle, maxLength, walls) {
    var step = +lightSamples.value;

    var pos = {
        x: x,
        y: y,
        dist: 0,
        col: null
    };

    var vx = Math.cos(angle) * step;
    var vy = Math.sin(angle) * step;

    for (var i = 0; i < maxLength; i += step) {
        pos.x += vx;
        pos.y += vy;

        var dx = pos.x - x;
        var dy = pos.y - y;

        pos.dist = Math.sqrt(dx * dx + dy * dy);

        for (var wall of walls) {
            if (wall instanceof Wall) {
                if (pointToRectangleCollisionDetection(pos, wall)) {
                    pos.col = wall;
                    return pos;
                }
            } else if (wall instanceof WallCircle) {
                if (pointToCircleCollisionDetection(pos, wall)) {
                    pos.col = wall;
                    return pos;
                }
            } else if (wall instanceof WallPoly) {
                if (pointToPolygonCollisionDetection(pos, wall.vertices)) {
                    pos.col = wall;
                    return pos;
                }
            }
        }
    }

    return pos;
}

function findWallsInRadius(x = 0, y = 0, radius = 50, walls = []) {
    var wallsInRadius = [];

    for (var wall of walls) {
        var dx = 0;
        var dy = 0;

        if (wall instanceof Wall) {
            dx = (wall.x + (wall.width / 2)) - x;
            dy = (wall.y + (wall.height / 2)) - y;
            // if (rectangleToCircleCollisionDetection(wall, { x: x, y: y, radius: radius })) {
            // dx = 0;
            // dy = 0;
            // }
        } else if (wall instanceof WallCircle) {
            dx = wall.x - x;
            dy = wall.y - y;
            // if (circleToCircleCollisionDetection(wall, { x: x, y: y, radius: radius })) {
            // dx = 0;
            // dy = 0;
            // }
        } /*else if (wall instanceof WallPoly) {
			var dx = 0;
		}*/

        var distance = Math.sqrt((dx * dx) + (dy * dy));

        if (distance <= radius) {
            wallsInRadius.push(wall);
        }
    }

    return wallsInRadius;
}

function calculateLighting(lights, walls) {
    ctx.save();
    for (var light of lights) {
        var continueLoop = false;

        for (var wall of walls) {
            if (wall instanceof WallCircle) {
                if (pointToCircleCollisionDetection(light, wall)) {
                    continueLoop = true;
                    break;
                }
            } else if (wall instanceof WallPoly) {
                if (pointToPolygonCollisionDetection(light, wall.vertices)) {
                    continueLoop = true;
                    break;
                }
            }
        }

        if (continueLoop == true) {
            continue;
        }

        // var grad = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
        // grad.addColorStop(0, light.color);
        // grad.addColorStop(1, "transparent");

        var allQuads = [];

        for (var wall of walls) {
            if (wall instanceof WallCircle) {
                var colMesh = createShapeObj(wall.x, wall.y, wall.radius, wall.radius, Math.max(10, 10), "#000000", 0);
                for (var i = 0; i < colMesh.vertices.length; i++) {
                    var vertex1 = colMesh.vertices[i];
                    var otherIndex = (i + 1) % colMesh.vertices.length;
                    var vertex2 = colMesh.vertices[otherIndex];

                    var quad = [];

                    var v1endv = Math.atan2(vertex1.y - light.y, vertex1.x - light.x);
                    var v2endv = Math.atan2(vertex2.y - light.y, vertex2.x - light.x);

                    quad.push(vertex1);

                    quad.push(new Vertex2D(vertex1.x + (Math.cos(v1endv) * light.radius * 100), vertex1.y + (Math.sin(v1endv) * light.radius * 100)));

                    quad.push(new Vertex2D(vertex2.x + (Math.cos(v2endv) * light.radius * 100), vertex2.y + (Math.sin(v2endv) * light.radius * 100)));

                    quad.push(vertex2);

                    allQuads.push(quad);
                }
            } else if (wall instanceof WallPoly) {
                for (var i = 0; i < wall.vertices.length; i++) {
                    var vertex1 = wall.vertices[i];
                    var otherIndex = (i + 1) % wall.vertices.length;
                    var vertex2 = wall.vertices[otherIndex];

                    var quad = [];

                    var v1endv = Math.atan2(vertex1.y - light.y, vertex1.x - light.x);
                    var v2endv = Math.atan2(vertex2.y - light.y, vertex2.x - light.x);

                    quad.push(vertex1);

                    quad.push(new Vertex2D(vertex1.x + (Math.cos(v1endv) * light.radius * 100), vertex1.y + (Math.sin(v1endv) * light.radius * 100)));

                    quad.push(new Vertex2D(vertex2.x + (Math.cos(v2endv) * light.radius * 100), vertex2.y + (Math.sin(v2endv) * light.radius * 100)));

                    quad.push(vertex2);

                    allQuads.push(quad);
                }
            }
        }

        var tmpCanvas = document.createElement("canvas");
        var tmpCtx = tmpCanvas.getContext("2d");

        // var vWidthTmp = (vWidth * scale) * window.devicePixelRatio;
        // var vHeightTmp = (vHeight * scale) * window.devicePixelRatio;

        tmpCanvas.width = vWidth * window.devicePixelRatio;
        tmpCanvas.height = vHeight * window.devicePixelRatio;

        // tmpCtx.scale(scale, scale);
        tmpCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        tmpCtx.scale(worldScale, worldScale);
        tmpCtx.translate(-(camera.x - (vWidth / (worldScale * 2))), -(camera.y - (vHeight / (worldScale * 2))));

        var grad = tmpCtx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
        grad.addColorStop(0, light.color);
        grad.addColorStop(1, "transparent");

        tmpCtx.save();
        tmpCtx.globalCompositeOperation = "lighter";

        tmpCtx.fillStyle = grad;
        tmpCtx.beginPath();
        tmpCtx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
        tmpCtx.fill();
        tmpCtx.closePath();
        tmpCtx.clip();

        tmpCtx.save();
        tmpCtx.globalCompositeOperation = "destination-out";
        for (var i = 0; i < allQuads.length; i++) {
            var cQuad = allQuads[i];
            tmpCtx.fillStyle = "rgba(0, 0, 0, 1)";
            tmpCtx.beginPath();
            tmpCtx.moveTo(cQuad[0].x, cQuad[0].y);
            for (var j = 1; j < cQuad.length; j++) {
                tmpCtx.lineTo(cQuad[j].x, cQuad[j].y);
            }
            tmpCtx.closePath();
            tmpCtx.fill();
        }
        tmpCtx.restore();
        tmpCtx.restore();

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = light.intensity;
        ctx.drawImage(tmpCanvas, camera.x - (vWidth / 2) / worldScale, camera.y - (vHeight / 2) / worldScale, vWidth / worldScale, vHeight / worldScale);
        ctx.restore();
    }
    ctx.restore();
}

var walls = [
    // new Wall(100, 100, 200, 100, "#808080"),
    // new Wall(500, 300, 100, 200, "#808080"),
    // new Wall(400, 300, 100, 100, "#808080"),
    // new Wall(200, 400, 50, 50, "#808080"),
    // new Wall(300, 450, 50, 50, "#808080"),
    // new Wall(200, 500, 50, 50, "#808080")
    // new WallPoly(
    //     [
    //         new Vertex2D(100, 100),
    //         new Vertex2D(150, 125),
    //         new Vertex2D(50, 195),
    //         new Vertex2D(75, 150),
    //         new Vertex2D(100, 75)
    //     ],
    //     "#808080"
    // )
];

function createShapeObj(x, y, radiusX, radiusY, sides, color, rotation = 0) {
    rotation = degreesToRadians(rotation);
    var shape = new WallPoly([], color);
    sides = Math.round(sides);
    var increment = 2 * Math.PI / sides;
    var currentSide = 0;
    // shape.vertices.push(new Vertex2D(x + (Math.cos(currentSide + rotation) * radiusX), y + (Math.sin(currentSide + rotation) * radiusY)));
    for (var i = 0; i < sides; i++) {
        currentSide += increment;
        shape.vertices.push(new Vertex2D(x + (Math.cos(currentSide + rotation) * radiusX), y + (Math.sin(currentSide + rotation) * radiusY)));
    }

    return shape;
}

function createRectangle(x, y, width, height, color) {
    var vertices = [
        new Vertex2D(x - (width / 2), y - (height / 2)),
        new Vertex2D(x + (width / 2), y - (height / 2)),
        new Vertex2D(x + (width / 2), y + (height / 2)),
        new Vertex2D(x - (width / 2), y + (height / 2))
    ];

    walls.push(new WallPoly(vertices, color));
}

function drawShape(x, y, radiusX, radiusY, sides, color, rotation = 0) {
    sides = Math.round(sides);
    ctx.save();
    ctx.fillStyle = color;
    var increment = 2 * Math.PI / sides;
    var currentSide = 0;
    ctx.beginPath();
    ctx.moveTo(x + (Math.cos(currentSide + rotation) * radiusX), y + (Math.sin(currentSide + rotation) * radiusY));
    for (var i = 0; i < sides; i++) {
        currentSide += increment;
        ctx.lineTo(x + (Math.cos(currentSide + rotation) * radiusX), y + (Math.sin(currentSide + rotation) * radiusY));
    }
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
}

function createShape(x, y, radiusX, radiusY, sides, color, rotation = 0) {
    rotation = degreesToRadians(rotation);
    var shape = new WallPoly([], color);
    sides = Math.round(sides);
    var increment = 2 * Math.PI / sides;
    var currentSide = 0;
    // shape.vertices.push(new Vertex2D(x + (Math.cos(currentSide + rotation) * radiusX), y + (Math.sin(currentSide + rotation) * radiusY)));
    for (var i = 0; i < sides; i++) {
        currentSide += increment;
        shape.vertices.push(new Vertex2D(x + (Math.cos(currentSide + rotation) * radiusX), y + (Math.sin(currentSide + rotation) * radiusY)));
    }

    walls.push(shape);
}

// setInterval(() => console.log(pointToPolygonCollisionDetection({ x: 101, y: 101 }, walls[0].vertices)), 1000 / 60);

for (var i = 0; i < 6; i++) {
    createRectangle(random(-vWidth / 2, vWidth / 2), random(-vHeight / 2, vHeight / 2), 50, 50, "#808080");

    // if (i >= 5) {
    //     createRectangle(random(-vWidth / 2, vWidth / 2), random(-vHeight / 2, vHeight / 2), 50, 50, "#808080");
    // } else {
    //     walls.push(new WallCircle(random(-vWidth / 2, vWidth / 2), random(-vHeight / 2, vHeight / 2), random(25, 25), "#808080"));
    // }
}

var lights = [
	new Light(-128, -128, 256, "#ff0000", 1),
	new Light(128, -128, 256, "#ffff00", 1),
	new Light(128, 128, 256, "#00ffff", 1),
	new Light(-128, 128, 256, "#00ff00", 1),
 //    new Light(-128, -128, 256, "#ff8000", 1),
 //    new Light(128, -128, 256, "#0080ff", 1),
	// new Light(-128, 128, 256, "#ff0000", 1),
	// new Light(128, 128, 256, "#00ffff", 1),
	new Light(-512, 0, 512, "#ffffff", 1),
	new Light(512, 0, 512, "#ffffff", 1)
];

// lights.forEach((light, i) => {
//     // light.intensity = (i + 1) / lights.length;
//     light.radius = 250;
//     light.color = "#001000";
// });

var theta = 0;

var selectedWall = null;

createShape(0, 0, 32, 32, 5, "#808080", -90);

function drawGrid(x, y, width, height, color, gridCellSize) {
    ctx.save();
    ctx.strokeStyle = color;

    ctx.beginPath();

    for (var cX = x; cX < x + width; cX += gridCellSize) {
        ctx.moveTo(cX, y);
        ctx.lineTo(cX, y + height);
    }

    for (var cY = y; cY < y + height; cY += gridCellSize) {
        ctx.moveTo(x, cY);
        ctx.lineTo(x + width, cY);
    }

    ctx.stroke();
    ctx.closePath();
    ctx.restore();
}

class Camera {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.velX = 0;
        this.velY = 0;
        this.acceleration = 1;
    }
}

var camera = new Camera(0, 0);

function main() {
    calculateFPS();

    if (worldScale <= 0) {
        worldScale = 0;
    }

    theta += 0.05;

    if (mouse.down == true) {
        if (selectedWall != null) {
            if (selectedWall instanceof Wall) {
                // selectedWall.x += e.movementX / worldScale;
                // selectedWall.y += e.movementY / worldScale;

                // selectedWall.x = mouse.x - (selectedWall.width / 2);
                // selectedWall.y = mouse.y - (selectedWall.height / 2);

                selectedWall.x = lerp(selectedWall.x, mouse.x - (selectedWall.width / 2), 0.2);
                selectedWall.y = lerp(selectedWall.y, mouse.y - (selectedWall.height / 2), 0.2);
            } else if (selectedWall instanceof WallCircle) {
                // selectedWall.x = e.movementX / worldScale;
                // selectedWall.y = e.movementY / worldScale;

                // selectedWall.x = mouse.x;
                // selectedWall.y = mouse.y;

                selectedWall.x = lerp(selectedWall.x, mouse.x, 0.2);
                selectedWall.y = lerp(selectedWall.y, mouse.y, 0.2);
            } else if (selectedWall instanceof WallPoly) {
                var center = getCenterOfPolygon(selectedWall.vertices);
                for (var i = 0; i < selectedWall.vertices.length; i++) {
                    var vert = selectedWall.vertices[i];

                    var offsetX = vert.x - center.x;
                    var offsetY = vert.y - center.y;

                    // vert.x += e.movementX / worldScale;
                    // vert.y += e.movementY / worldScale;

                    // vert.x = mouse.x + offsetX;
                    // vert.y = mouse.y + offsetY;

                    vert.x = lerp(vert.x, mouse.x + offsetX, 0.2);
                    vert.y = lerp(vert.y, mouse.y + offsetY, 0.2);
                }
            } else if (selectedWall instanceof Light) {
                // selectedWall.x = mouse.x;
                // selectedWall.y = mouse.y;

                selectedWall.x = lerp(selectedWall.x, mouse.x, 0.2);
                selectedWall.y = lerp(selectedWall.y, mouse.y, 0.2);
            }
        }
    }

    if (keysDown["w"]) {
        camera.velY -= camera.acceleration;
    }

    if (keysDown["a"]) {
        camera.velX -= camera.acceleration;
    }

    if (keysDown["s"]) {
        camera.velY += camera.acceleration;
    }

    if (keysDown["d"]) {
        camera.velX += camera.acceleration;
    }

    camera.velX *= friction;
    camera.velY *= friction;

    camera.x += camera.velX;
    camera.y += camera.velY;

    // lights[0].x = camera.x;
    // lights[0].y = camera.y;

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, vWidth, vHeight);
    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, vWidth, vHeight);

    ctx.scale(worldScale, worldScale);
    ctx.translate(-(camera.x - (vWidth / (worldScale * 2))), -(camera.y - (vHeight / (worldScale * 2))));

    // drawGrid(-1024, -1024, 2048, 2048, "#808080", 32);

    // lights.forEach((light, i) => {
    // light.x = (vWidth / 2) + (Math.cos(theta / (i + 1))) * (vWidth / 4);
    // light.y = (vHeight / 2) + (Math.sin(theta / (i + 1))) * (vHeight / 4);
    // });

    for (var wall of walls) {
        ctx.fillStyle = wall.color;
        if (wall instanceof Wall) {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        } else if (wall instanceof WallCircle) {
            ctx.beginPath();
            ctx.arc(wall.x, wall.y, wall.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        } else if (wall instanceof WallPoly) {
            ctx.beginPath();
            ctx.moveTo(wall.vertices[0].x, wall.vertices[0].y);
            for (var i = 1; i < wall.vertices.length; i++) {
                ctx.lineTo(wall.vertices[i].x, wall.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
        }
    }

    calculateLighting(lights, walls);

    if (polyPoints.length > 0) {
        ctx.strokeStyle = "#ff0000";
        ctx.beginPath();
        ctx.moveTo(polyPoints[0].x, polyPoints[0].y);

        for (var i = 1; i < polyPoints.length; i++) {
            var point = polyPoints[i];

            ctx.lineTo(point.x, point.y);
        }

        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
        ctx.closePath();
    }

    ctx.restore();

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = " 14px arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`FPS: ${displayFPS}`, 5, 5);
    ctx.restore();

    // requestAnimationFrame(main);
}

updateLoop = setInterval(main, 1000 / targetFPS);

updateFPS = setInterval(function () {
    displayFPS = fps;
}, 1000);

// main();

window.addEventListener("keydown", (e) => {
    // e.preventDefault();
    keysDown[e.key] = true;

    if (e.key === " ") {
        polyPoints.push(new Vertex2D(mouse.x, mouse.y));
    }
});

window.addEventListener("keyup", (e) => {
    e.preventDefault();
    keysDown[e.key] = false;

    if (e.key === "Enter" && polyPoints.length > 1) {
        walls.push(new WallPoly(polyPoints, "#208040"));
        polyPoints = [];
    }
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        mouse.down = true;
    } else if (e.button === 2) {
        mouse.rightdown = true;
    }

    if (selectedWall == null) {
        var lightPoints = [];

        for (var i = 0; i < lights.length; i++) {
            var light = lights[i];
            lightPoints.push(light);
        }

        var rt = false;

        for (var i = 0; i < lightPoints.length; i++) {
            var lp = lightPoints[i];

            if (pointToCircleCollisionDetection(mouse, { x: lp.x, y: lp.y, radius: 25 }) == true) {
                selectedWall = lp;
                rt = true;
                break;
            }
        }

        if (rt == true) {
            return;
        }

        for (var i = 0; i < walls.length; i++) {
            var wall = walls[i];

            if (wall instanceof Wall) {
                if (pointToRectangleCollisionDetection(mouse, wall)) {
                    selectedWall = wall;
                    break;
                }
            } else if (wall instanceof WallCircle) {
                if (pointToCircleCollisionDetection(mouse, wall)) {
                    selectedWall = wall;
                    break;
                }
            } else if (wall instanceof WallPoly) {
                if (pointToPolygonCollisionDetection(mouse, wall.vertices)) {
                    selectedWall = wall;
                    break;
                }
            }
        }
    }
});

scene.addEventListener("click", () => {
    // polyPoints.push(new Vertex2D(mouse.x, mouse.y));
});

window.addEventListener("mouseup", (e) => {
    selectedWall = null;
    mouse.down = false;
    mouse.rightdown = false;
});

window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// scene.onclick = function () {
//     scene.requestPointerLock();
// }

window.onwheel = function (e) {
    if (event.wheelDelta) {
        if (event.wheelDelta > 0) {
            worldScale /= zoomingDampener;
            return -1;
        } else {
            worldScale *= zoomingDampener;
            return 1;
        }
    }

    if (event.deltaY < 0) {
        worldScale /= zoomingDampener;
        return -1;
    } else {
        worldScale *= zoomingDampener;
        return 1;
    }
}

window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX + (camera.x * worldScale) - (vWidth / 2)) / worldScale;
    mouse.y = (e.clientY + (camera.y * worldScale) - (vHeight / 2)) / worldScale;

    // lights[0].x = mouse.x;
    // lights[0].y = mouse.y;
});

window.onerror = function (ev) {
    alert(ev)
}
