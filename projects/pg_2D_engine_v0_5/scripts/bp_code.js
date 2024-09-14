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

function wait(ms) {
	return new Promise((resolve) => { setTimeout(resolve, ms) });
}

function clamp(min, max, value) {
	return Math.min(Math.max(min, value), max);
}

function random(min, max) {
	return (Math.random() * (max - min)) + min;
}

function pickRandomItemFromArray(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomPropertyFromObject(obj) {
	var keys = Object.keys(obj);
	var val = obj[keys[keys.length * Math.random() << 0]];
	return val;
}

var degToRad = Math.PI / 180;

var radToDeg = 180 / Math.PI;

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function lerpVec2(v1, v2, t) {
	return new Vec2(lerp(v1.x, v2.x, t), lerp(v1.y, v2.y, t));
}

function lerpVec3(v1, v2, t) {
	return new Vec3(lerp(v1.x, v2.x, t), lerp(v1.y, v2.y, t), lerp(v1.z, v2.z, t));
}

function snapNumberToGrid(number, gridSize) {
	return Math.round(number / gridSize) * gridSize;
}

function distAB(ax, ay, bx, by) {
	var dx = bx - ax;
	var dy = by - ay;
	return Math.sqrt(dx * dx + dy * dy);
}

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

function distanceToPointFromLine(point, line, givePoint = false) {
	var x0 = point.x;
	var y0 = point.y;
	var x1 = line.pointA.position.x;
	var y1 = line.pointA.position.y;
	var x2 = line.pointB.position.x;
	var y2 = line.pointB.position.y;

	// Calculate coefficients of the line equation (Ax + By + C = 0)
	var A = y2 - y1;
	var B = x1 - x2;
	var C = x2 * y1 - x1 * y2;

	// Calculate the closest point on the line to the given point
	var xc = (B * (B * x0 - A * y0) - A * C) / (A * A + B * B);
	var yc = (A * (A * y0 - B * x0) - B * C) / (A * A + B * B);

	// Check if the closest point is within the line segment
	var d1 = Math.sqrt((xc - x1) ** 2 + (yc - y1) ** 2);
	var d2 = Math.sqrt((xc - x2) ** 2 + (yc - y2) ** 2);

	if (d1 <= Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) && d2 <= Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)) {
		// The closest point is within the line segment
		if (givePoint == true) {
			return {
				point: new Vec2(xc, yc),
				distance: Math.abs(A * x0 + B * y0 + C) / Math.sqrt(A ** 2 + B ** 2)
			}
		}
		return Math.abs(A * x0 + B * y0 + C) / Math.sqrt(A ** 2 + B ** 2);
	}

	// Calculate the distance from the point to the line segment endpoints
	var dPA = Math.sqrt((x0 - x1) ** 2 + (y0 - y1) ** 2);
	var dPB = Math.sqrt((x0 - x2) ** 2 + (y0 - y2) ** 2);

	// Choose the minimum distance
	return Math.min(dPA, dPB);
}

function pointToCircleCollisionDetection(point, circle) {
	var dx = circle.position.x - point.position.x;
	var dy = circle.position.y - point.position.y;
	var sqDist = dx * dx + dy * dy;

	if (sqDist < circle.radius * circle.radius) {
		return true;
	}

	return false;
}

function pointToStaticCircleCollisionResolution(point, circle) {
	var col = pointToCircleCollisionDetection(point, circle);

	if (col) {
		var pointDir = Math.atan2(point.position.y - circle.position.y, point.position.x - circle.position.x);

		point.position.x = circle.position.x + Math.cos(pointDir) * circle.radius;
		point.position.y = circle.position.y + Math.sin(pointDir) * circle.radius;

		return true;
	}

	return false;
}

function pointToRectangleCollisionDetection(point, rect) {
	if (point.x > rect.position.x && point.y > rect.position.y && rect.position.x + rect.width > point.x && rect.position.y + rect.height > point.y) {
		return true;
	}

	return false;
}

function lineToLineCollisionDetection(lineA, lineB) {
	var x1 = lineA.pointA.position.x;
	var y1 = lineA.pointA.position.y;
	var x2 = lineA.pointB.position.x;
	var y2 = lineA.pointB.position.y;

	var x3 = lineB.pointA.position.x;
	var y3 = lineB.pointA.position.y;
	var x4 = lineB.pointB.position.x;
	var y4 = lineB.pointB.position.y;

	var uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
	var uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

	if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
		return true;
	}
	return false;
}

function lineToPointCollisionDetection(line, point) {
	var d1 = distAB(point.position.x, point.position.y, line.pointA.position.x, line.pointA.position.y);
	var d2 = distAB(point.position.x, point.position.y, line.pointB.position.x, line.pointB.position.y);

	var lineLen = distAB(line.pointA.position.x, line.pointA.position.y, line.pointB.position.x, line.pointB.position.y);

	var buffer = 0.75;

	if (d1 + d2 >= lineLen - buffer && d1 + d2 <= lineLen + buffer) {
		return true;
	}

	return false;
}

function lineToCircleCollisionDetection(line, circle) {
	var inside1 = pointToCircleCollisionDetection(line.pointA, circle);
	var inside2 = pointToCircleCollisionDetection(line.pointB, circle);

	if (inside1 || inside2) {
		return true;
	}

	var distX = line.pointA.position.x - line.pointB.position.x;
	var distY = line.pointA.position.y - line.pointB.position.y;
	var len = Math.sqrt((distX * distX) + (distY * distY));

	var dot = (((circle.position.x - line.pointA.position.x) * (line.pointB.position.x - line.pointA.position.x)) + ((circle.position.y - line.pointA.position.y) * (line.pointB.position.y - line.pointA.position.y))) / (len ** 2);

	var closestX = line.pointA.position.x + (dot * (line.pointB.position.x - line.pointA.position.x));
	var closestY = line.pointA.position.y + (dot * (line.pointB.position.y - line.pointA.position.y));


	var rx = line.pointA.position.x < line.pointB.position.x ? line.pointA.position.x : line.pointB.position.x;
	var ry = line.pointA.position.y < line.pointB.position.y ? line.pointA.position.y : line.pointB.position.y;
	if (pointToRectangleCollisionDetection({ x: closestX, y: closestY }, { position: new Vec2(rx, ry), width: Math.abs(distX), height: Math.abs(distY) })) {
		// alert("YES");
		distX = closestX - circle.position.x;
		distY = closestY - circle.position.y;
		var distance = Math.sqrt((distX * distX) + (distY * distY));

		if (distance <= circle.radius) {
			return true;
		}
	}
	// alert("NOOOO")

	return false;
}

function lineToRectangleCollisionDetection(line, rect) {
	if (pointToRectangleCollisionDetection(line.pointA.position, rect) || pointToRectangleCollisionDetection(line.pointB.position, rect)) {
		return true;
	}

	var r1 = { pointA: { position: new Vec2(rect.position.x, rect.position.y) }, pointB: { position: new Vec2(rect.position.x, rect.position.y + rect.height) } };
	var r2 = { pointA: { position: new Vec2(rect.position.x + rect.width, rect.position.y) }, pointB: { position: new Vec2(rect.position.x + rect.width, rect.position.y + rect.height) } };
	var r3 = { pointA: { position: new Vec2(rect.position.x, rect.position.y) }, pointB: { position: new Vec2(rect.position.x + rect.width, rect.position.y) } };
	var r4 = { pointA: { position: new Vec2(rect.position.x, rect.position.y + rect.height) }, pointB: { position: new Vec2(rect.position.x + rect.width, rect.position.y + rect.height) } };

	var left = lineToLineCollisionDetection(line, r1);
	var right = lineToLineCollisionDetection(line, r2);
	var top = lineToLineCollisionDetection(line, r3);
	var bottom = lineToLineCollisionDetection(line, r4);

	if (left || right || top || bottom) {
		return true;
	}

	return false;
}

function rectangleToRectangleCollisionDetection(rect1, rect2) {
	if (rect1.position.x + rect1.width > rect2.position.x && rect1.position.y + rect1.height > rect2.position.y && rect2.position.x + rect2.width > rect1.position.x && rect2.position.y + rect2.height > rect1.position.y) {
		return true;
	}

	return false;
}

function rectangleToStaticRectangleCollisionResolution(rect, rectS) {
	if (rectangleToRectangleCollisionDetection(rect, rectS) == true) {
		var dx = (rect.position.x + rect.width / 2) - (rectS.position.x + rectS.width / 2);
		var dy = (rect.position.y + rect.height / 2) - (rectS.position.y + rectS.height / 2);

		if (Math.abs(dx / rectS.width) > Math.abs(dy / rectS.height)) {
			if (dx < 0) {
				rect.position.x = rectS.position.x - rect.width;
				return "l";
			} else {
				rect.position.x = rectS.position.x + rectS.width;
				return "r";
			}
		} else {
			if (dy < 0) {
				rect.position.y = rectS.position.y - rect.height;
				return "t";
			} else {
				rect.position.y = rectS.position.y + rectS.height;
				return "b";
			}
		}
	}

	return false;
}

class Vec2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	plusEquals(vector) {
		if (vector instanceof Vec2) {
			this.x += vector.x;
			this.y += vector.y;
			return;
		}

		this.x += vector;
		this.y += vector;
	}

	add(vector) {
		if (vector instanceof Vec2) {
			return new Vec2(this.x + vector.x, this.y + vector.y);
		}

		return new Vec2(this.x + vector, this.y + vector);
	}

	minusEquals(vector) {
		if (vector instanceof Vec2) {
			this.x -= vector.x;
			this.y -= vector.y;
			return;
		}

		this.x -= vector;
		this.y -= vector;
	}

	subtract(vector) {
		if (vector instanceof Vec2) {
			return new Vec2(this.x - vector.x, this.y - vector.y);
		}

		return new Vec2(this.x - vector, this.y - vector);
	}

	timesEquals(vector) {
		if (vector instanceof Vec2) {
			this.x *= vector.x;
			this.y *= vector.y;
			return;
		}

		this.x *= vector;
		this.y *= vector;
	}

	multiply(vector) {
		if (vector instanceof Vec2) {
			return new Vec2(this.x * vector.x, this.y * vector.y);
		}

		return new Vec2(this.x * vector, this.y * vector);
	}

	divideEquals(vector) {
		if (vector instanceof Vec2) {
			this.x /= vector.x;
			this.y /= vector.y;
			return;
		}

		this.x /= vector;
		this.y /= vector;
	}

	divide(vector) {
		if (vector instanceof Vec2) {
			return new Vec2(this.x / vector.x, this.y / vector.y);
		}

		return new Vec2(this.x / vector, this.y / vector);
	}

	dot(vector) {
		return (this.x * vector.x) + (this.y * vector.y);
	}

	length() {
		return Math.sqrt(this.dot(this));
	}

	normalized() {
		var mag = Math.sqrt(this.dot(this));
		return this.divide(mag);
	}

	direction() {
		return Math.atan2(this.y, this.x);
	}

	reflect(normal) {
		return this.subtract(normal.multiply(2 * this.dot(normal)));
	}
}

class Vec3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	plusEquals(vector) {
		if (vector instanceof Vec3) {
			this.x += vector.x;
			this.y += vector.y;
			this.z += vector.z;
			return;
		}

		this.x += vector;
		this.y += vector;
		this.z += vector;
	}

	add(vector) {
		if (vector instanceof Vec3) {
			return new Vec3(this.x + vector.x, this.y + vector.y, this.z + vector.z);
		}

		return new Vec3(this.x + vector, this.y + vector, this.z + vector.z);
	}

	minusEquals(vector) {
		if (vector instanceof Vec3) {
			this.x -= vector.x;
			this.y -= vector.y;
			this.z -= vector.z;
			return;
		}

		this.x -= vector;
		this.y -= vector;
		this.z -= vector;
	}

	subtract(vector) {
		if (vector instanceof Vec3) {
			return new Vec3(this.x - vector.x, this.y - vector.y, this.z - vector.z);
		}

		return new Vec3(this.x - vector, this.y - vector, this.z - vector);
	}

	timesEquals(vector) {
		if (vector instanceof Vec3) {
			this.x *= vector.x;
			this.y *= vector.y;
			this.z *= vector.z;
			return;
		}

		this.x *= vector;
		this.y *= vector;
		this.z *= vector;
	}

	multiply(vector) {
		if (vector instanceof Vec3) {
			return new Vec3(this.x * vector.x, this.y * vector.y, this.z * vector.z);
		}

		return new Vec3(this.x * vector, this.y * vector, this.z * vector);
	}

	divideEquals(vector) {
		if (vector instanceof Vec3) {
			this.x /= vector.x;
			this.y /= vector.y;
			this.z /= vector.z;
			return;
		}

		this.x /= vector;
		this.y /= vector;
		this.z /= vector;
	}

	divide(vector) {
		if (vector instanceof Vec3) {
			return new Vec3(this.x / vector.x, this.y / vector.y, this.z / vector.z);
		}

		return new Vec3(this.x / vector, this.y / vector, this.z / vector);
	}

	dot(vector) {
		return (this.x * vector.x) + (this.y * vector.y) + (this.z * vector.z);
	}

	length() {
		return Math.sqrt(this.dot(this));
	}

	normalized() {
		var mag = Math.sqrt(this.dot(this));
		return this.divide(mag);
	}

	// direction() {
	//     return Math.atan2(this.y, this.x);
	// }

	reflect(normal) {
		return this.subtract(normal.multiply(2 * this.dot(normal)));
	}
}

var mouse = {
	position: new Vec2(0, 0),
	previous: new Vec2(0, 0),
	velocity: new Vec2(0, 0),
	down: false,
	rightdown: false
}

class Camera {
	constructor(x, y, viewScale) {
		this.position = new Vec2(x, y);
		this.previous = this.position;
		this.viewScale = viewScale;
		this.translated = new Vec2(0, 0);
	}

	applyToCtx(context, cWidth, cHeight) {
		context.scale(this.viewScale, this.viewScale);
		context.translate(-(this.position.x - (cWidth / (this.viewScale * 2))), -(this.position.y - (cHeight / (this.viewScale * 2))));

		this.translated.x = -(this.position.x - (cWidth / (this.viewScale * 2)));
		this.translated.y = -(this.position.y - (cHeight / (this.viewScale * 2)));

		return {
			x: -(this.position.x - (cWidth / (this.viewScale * 2))),
			y: -(this.position.y - (cHeight / (this.viewScale * 2)))
		};
	}

	applyToMouse(cWidth, cHeight, mouseX, mouseY) {
		var translatedMouse = { x: mouseX, y: mouseY };
		translatedMouse.x = (mouseX + (this.position.x * this.viewScale) - (cWidth / 2)) / this.viewScale;
		translatedMouse.y = (mouseY + (this.position.y * this.viewScale) - (cHeight / 2)) / this.viewScale;

		return translatedMouse;
	}
}

var camera = new Camera(0, 0, 1);

function main() {
	ctx.save();
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	ctx.lineWidth = 2;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.clearRect(0, 0, vWidth, vHeight);
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, vWidth, vHeight);
	camera.applyToCtx(ctx, vWidth, vHeight);


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