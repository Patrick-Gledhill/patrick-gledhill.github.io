import { pgEngine } from "./engine/pg.js";

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

var meterSizeInPixels = 32;

var dt = 1;
var adt = 0;

var prevTime = 0;
var curTime = 0;

class CircleTest {
	constructor(x, y, radius, density, centerOfMass, color, isStatic = false, convertMetersToPixels = false, isPinned = false) {
		this.position = new pgEngine.Vec2(x, y);
		this.radius = radius;
		if (convertMetersToPixels) {
			this.position.timesEquals(meterSizeInPixels);
			this.radius *= meterSizeInPixels;
		}
		this.rotation = 0;
		this.collider = pgEngine.Physics.PgPhysicsObject.createCircle(this, new pgEngine.Vec2(0, 0), this.radius, isStatic, density, centerOfMass, 0.4, 0.7, 0.5, isPinned);
		this.color = color;
	}

	update() {
		// this.collider.applyToParent();
	}

	draw(context) {
		context.save();
		context.lineWidth = 0.5;

		context.save();
		context.translate(this.position.x, this.position.y);
		context.rotate(this.rotation);
		context.beginPath();
		context.fillStyle = this.color;
		context.arc(0, 0, this.radius, 0, 2 * Math.PI, false);
		context.fill();
		context.closePath();

		context.save();
		context.lineWidth = 1;
		context.globalCompositeOperation = "multiply";
		context.strokeStyle = "#e6e6e6";
		context.beginPath();
		context.moveTo(0, 0);
		context.lineTo(this.radius, 0);
		context.stroke();
		context.closePath();
		context.restore();

		context.restore();

		// context.strokeStyle = "#0000ff";
		// context.beginPath();
		// context.moveTo(this.position.x, this.position.y);
		// context.lineTo(this.position.x + this.collider.velocity.x * dt, this.position.y + this.collider.velocity.y * dt);
		// context.stroke();
		// context.closePath();

		// var aabb = this.collider.GetAABB();

		// context.strokeStyle = "#ffffff80";
		// context.beginPath();
		// context.rect(aabb.min.x, aabb.min.y, aabb.max.x - aabb.min.x, aabb.max.y - aabb.min.y);
		// context.stroke();
		// context.closePath();

		context.restore();
	}
}

class RectangleTest {
	constructor(x, y, width, height, density, centerOfMass, color, isStatic = false, convertMetersToPixels = false, isPinned = false) {
		this.position = new pgEngine.Vec2(x, y);
		this.width = width;
		this.height = height;
		if (convertMetersToPixels) {
			this.position.timesEquals(meterSizeInPixels);
			this.width *= meterSizeInPixels;
			this.height *= meterSizeInPixels;
		}
		this.rotation = 0;
		this.collider = pgEngine.Physics.PgPhysicsObject.createRectangle(this, new pgEngine.Vec2(0, 0), this.width, this.height, isStatic, density, centerOfMass, 0.4, 0.7, 0.5, isPinned);
		this.color = color;
	}

	update() {
		// var aabb = this.collider.GetAABB();
		// alert(this.collider.position.subtract(aabb.min.add(aabb.max).divide(2)).x)
		// this.collider.applyToParent();
	}

	draw(context) {
		context.save();
		context.lineWidth = 0.5;

		context.save();
		context.translate(this.position.x, this.position.y);
		context.rotate(this.rotation);
		context.fillStyle = this.color;
		context.beginPath();
		context.rect(-this.width / 2, -this.height / 2, this.width, this.height);
		context.fill();
		context.closePath();

		// context.save();
		// context.lineWidth = 1;
		// context.globalCompositeOperation = "multiply";
		// context.strokeStyle = "#e6e6e6";
		// context.beginPath();
		// context.moveTo(0, 0);
		// context.lineTo(this.width / 2, 0);
		// context.stroke();
		// context.closePath();
		// context.restore();

		context.restore();

		// context.strokeStyle = "#0000ff";
		// context.beginPath();
		// context.moveTo(this.position.x, this.position.y);
		// context.lineTo(this.position.x + this.collider.velocity.x * dt, this.position.y + this.collider.velocity.y * dt);
		// context.stroke();
		// context.closePath();

		// var aabb = this.collider.GetAABB();

		// context.strokeStyle = "#ffffff80";
		// context.beginPath();
		// context.rect(aabb.min.x, aabb.min.y, aabb.max.x - aabb.min.x, aabb.max.y - aabb.min.y);
		// context.stroke();
		// context.closePath();

		context.restore();
	}
}

class PolygonTest {
	constructor(x, y, vertices, density, centerOfMass, color, isStatic = false, convertMetersToPixels = false, isPinned = false) {
		this.position = new pgEngine.Vec2(x, y);
		this.vertices = vertices;
		if (convertMetersToPixels) {
			this.position.timesEquals(meterSizeInPixels);
			for (var i = 0; i < this.vertices.length; i++) {
				this.vertices[i].timesEquals(meterSizeInPixels);
			}
		}
		this.rotation = 0;
		this.collider = pgEngine.Physics.PgPhysicsObject.createPolygon(this, new pgEngine.Vec2(0, 0), this.vertices, isStatic, density, centerOfMass, 0.4, 0.7, 0.5, isPinned);
		this.color = color;
	}

	update() {
		// var aabb = this.collider.GetAABB();
		// alert(this.collider.position.subtract(aabb.min.add(aabb.max).divide(2)).x)
		// this.collider.applyToParent();
	}

	draw(context) {
		context.save();
		context.lineWidth = 0.5;

		context.save();
		context.translate(this.position.x, this.position.y);
		context.rotate(this.rotation);
		context.fillStyle = this.color;
		context.beginPath();
		for (var i = 0; i < this.vertices.length; i++) {
			var vert = this.vertices[i];

			if (i === 0) {
				context.moveTo(vert.x, vert.y);
			} else {
				context.lineTo(vert.x, vert.y);
			}
		}
		context.fill();
		context.closePath();

		// context.save();
		// context.lineWidth = 1;
		// context.globalCompositeOperation = "multiply";
		// context.strokeStyle = "#e6e6e6";
		// context.beginPath();
		// context.moveTo(0, 0);
		// context.lineTo(this.width / 2, 0);
		// context.stroke();
		// context.closePath();
		// context.restore();

		context.restore();

		// context.strokeStyle = "#0000ff";
		// context.beginPath();
		// context.moveTo(this.position.x, this.position.y);
		// context.lineTo(this.position.x + this.collider.velocity.x * dt, this.position.y + this.collider.velocity.y * dt);
		// context.stroke();
		// context.closePath();

		// var aabb = this.collider.GetAABB();

		// context.strokeStyle = "#ffffff80";
		// context.beginPath();
		// context.rect(aabb.min.x, aabb.min.y, aabb.max.x - aabb.min.x, aabb.max.y - aabb.min.y);
		// context.stroke();
		// context.closePath();

		context.restore();
	}
}

var circle1 = new CircleTest(-3.5, 3.5, 0.5, 3, new pgEngine.Vec2(0, 0), "#ff8000", false, true);
// circle1.collider.acceleration.x = 16384;
var circle2 = new CircleTest(3.5, 0, 0.5, 1, new pgEngine.Vec3(0, 0), "#0080ff", false, true);

var floor = new RectangleTest(0, 6, 16, 4, 1, new pgEngine.Vec2(0, 0), "#404040", true, true, false);
floor.collider.rotation = 0 * pgEngine.Utils.degToRad;
// floor.collider.inject = function() {
// this.velocity.x = 0;
// this.velocity.y = 0;
// this.rotation = 0;
// this.angularVelocity = 0;
// }

var slope1 = new RectangleTest(-4, -3, 6, 1, 1, new pgEngine.Vec2(0, 0), "#404040", true, true, false);
slope1.collider.rotation = 15 * pgEngine.Utils.degToRad;

var slope2 = new RectangleTest(4, 0, 6, 1, 1, new pgEngine.Vec2(0, 0), "#404040", true, true);
slope2.collider.rotation = -45 * pgEngine.Utils.degToRad;

var rect1 = new RectangleTest(0, 0, 1, 1, 1, new pgEngine.Vec2(0, 0), "#ff8000", false, true);
var rect2 = new RectangleTest(4, -2, 1, 1, 1, new pgEngine.Vec2(0, 0), "#0080ff", false, true);

var floorVertices = [
	new pgEngine.Vec2(-2, -2),
	new pgEngine.Vec2(2, -2),
	new pgEngine.Vec2(0, 2)
	// new pgEngine.Vec2(8, 0),
	// new pgEngine.Vec2(-8, 2)
];


var testPolygon = new PolygonTest(-6, 6, floorVertices, 1, new pgEngine.Vec2(0, 0), "#404040", true, true, false);
testPolygon.collider.rotation = 0 * pgEngine.Utils.degToRad;

// var ref = new RectangleTest(-64, (9.81 * 64) / 2, 16, 9.81 * 64, 1, new pgEngine.Vec2(0, 0), "#ffff00", true, false);

var pgPhy = new pgEngine.Physics.PgPhysics({ direction: new pgEngine.Vec2(0, 1).normalized, strength: (9.81 * meterSizeInPixels) * 1 }, 1);

// var constraintTest = new pgEngine.Physics.ObjectConstraint(rect1.collider, rect3.collider, 64);
// var constraintTest2 = new pgEngine.Physics.ObjectConstraint(rect3.collider, rect2.collider, 64);

pgPhy.addObject(circle1.collider);
pgPhy.addObject(circle2.collider);

pgPhy.addObject(floor.collider);
pgPhy.addObject(testPolygon.collider);

pgPhy.addObject(slope1.collider);
pgPhy.addObject(slope2.collider);

pgPhy.addObject(rect1.collider);
pgPhy.addObject(rect2.collider);

// pgPhy.addObject(constraintTest);
// pgPhy.addObject(constraintTest2);

var testObjs = [];

for (var i = 0; i < 0; i++) {
	var newObj = new CircleTest(Math.random() * 8 - 4, Math.random() * 8 - 4, 0.5, 1, new pgEngine.Vec2(0, 0), "#ff0000", false, true);
	testObjs.push(newObj);
	pgPhy.addObject(newObj.collider);
}

// var linePSpacing = 32;

// for (var i = 0; i < 4; i++) {
// 	if (i === 0) {
// 		var point = new CircleTest(0, -128, linePSpacing / 8, 22, new pgEngine.Vec2(0, 0), "#ff0000", true, false);
// 		testObjs.push(point);
// 		pgPhy.addObject(point.collider);
// 	} else {
// 		var point = new CircleTest(0, (i * 32) - 128, linePSpacing / 8, 3, new pgEngine.Vec2(0, 0), "#ff0000", false, false);
// 		var lineC = new pgEngine.Physics.ObjectConstraint(testObjs[testObjs.length - 1].collider, point.collider, linePSpacing);

// 		testObjs.push(lineC);
// 		testObjs.push(point);
// 		pgPhy.addObject(point.collider);
// 		pgPhy.addObject(lineC);
// 	}
// }

var mouse = {
	position: new pgEngine.Vec2(0, 0),
	previous: new pgEngine.Vec2(0, 0),
	velocity: new pgEngine.Vec2(0, 0),
	down: false,
	rightdown: false
}

var camera = new pgEngine.Camera(0, 0, 2);

var selectedObj = {
	obj: null,
	offset: new pgEngine.Vec2(0, 0)
}

var testPoints = [];
var tick = 0;

var curFPS = 1000;
var minFPS = Number.POSITIVE_INFINITY;
var maxFPS = Number.NEGATIVE_INFINITY;
var avgFPS = 1000;

function main() {
	curTime = performance.now();
	dt = (curTime - prevTime) / 1000;
	prevTime = curTime;
	dt = (1000 / 60) / 1000;
	// adt += dt;
	tick++;

	if ((tick - 1) % 15 === 0 && (tick - 1) !== 0) {
		curFPS = 1 / dt;

		if (curFPS < minFPS) {
			minFPS = curFPS;
		}

		if (curFPS > maxFPS) {
			maxFPS = curFPS;
		}

		avgFPS = (minFPS + maxFPS) / 2;

		tick = 0;
	}

	// if (keysDown["w"]) {
	// 	camera.position.y -= 2;
	// }

	// if (keysDown["a"]) {
	// 	camera.position.x -= 2;
	// }

	// if (keysDown["s"]) {
	// 	camera.position.y += 2;
	// }

	// if (keysDown["d"]) {
	// 	camera.position.x += 2;
	// }

	if (keysDown["w"]) {
		rect1.collider.applyForce(new pgEngine.Vec2(0, -19.62 * meterSizeInPixels).multiply(rect1.collider.mass));
	}

	if (keysDown["a"]) {
		rect1.collider.applyForce(new pgEngine.Vec2(-19.62 * meterSizeInPixels, 0).multiply(rect1.collider.mass));
	}

	if (keysDown["s"]) {
		rect1.collider.applyForce(new pgEngine.Vec2(0, 19.62 * meterSizeInPixels).multiply(rect1.collider.mass));
	}

	if (keysDown["d"]) {
		rect1.collider.applyForce(new pgEngine.Vec2(19.62 * meterSizeInPixels, 0).multiply(rect1.collider.mass));
	}

	// var addll = [];

	// if (keysDown["w"]) {
	// 	var x = Math.cos((pgPhy.gravity.direction.direction() * pgEngine.Utils.radToDeg - 180) * pgEngine.Utils.degToRad) * 19.62 * meterSizeInPixels * rect1.collider.mass;
	// 	var y = Math.sin((pgPhy.gravity.direction.direction() * pgEngine.Utils.radToDeg - 180) * pgEngine.Utils.degToRad) * 19.62 * meterSizeInPixels * rect1.collider.mass;
	// 	// addll.push({ a: rect1.position.clone(), b: rect1.position.add(new pgEngine.Vec2(x, y)), color: "#ff0000", offset: new pgEngine.Vec2(0, 0) });
	// 	rect1.collider.applyForce(new pgEngine.Vec2(x, y));
	// }

	// if (keysDown["a"]) {
	// 	var x = Math.cos((pgPhy.gravity.direction.direction() * pgEngine.Utils.radToDeg - 270) * pgEngine.Utils.degToRad) * 19.62 * meterSizeInPixels * rect1.collider.mass;
	// 	var y = Math.sin((pgPhy.gravity.direction.direction() * pgEngine.Utils.radToDeg - 270) * pgEngine.Utils.degToRad) * 19.62 * meterSizeInPixels * rect1.collider.mass;
	// 	// addll.push({ a: rect1.position.clone(), b: rect1.position.add(new pgEngine.Vec2(x, y)), color: "#ff0000", offset: new pgEngine.Vec2(0, 0) });
	// 	rect1.collider.applyForce(new pgEngine.Vec2(x, y));
	// }

	// if (keysDown["s"]) {
	// 	var x = Math.cos(pgPhy.gravity.direction.direction()) * 19.62 * meterSizeInPixels * rect1.collider.mass;
	// 	var y = Math.sin(pgPhy.gravity.direction.direction()) * 19.62 * meterSizeInPixels * rect1.collider.mass;
	// 	// addll.push({ a: rect1.position.clone(), b: rect1.position.add(new pgEngine.Vec2(x, y)), color: "#ff0000", offset: new pgEngine.Vec2(0, 0) });
	// 	rect1.collider.applyForce(new pgEngine.Vec2(x, y));
	// }

	// if (keysDown["d"]) {
	// 	var x = Math.cos((pgPhy.gravity.direction.direction() * pgEngine.Utils.radToDeg - 90) * pgEngine.Utils.degToRad) * 19.62 * meterSizeInPixels * rect1.collider.mass;
	// 	var y = Math.sin((pgPhy.gravity.direction.direction() * pgEngine.Utils.radToDeg - 90) * pgEngine.Utils.degToRad) * 19.62 * meterSizeInPixels * rect1.collider.mass;
	// 	// addll.push({ a: rect1.position.clone(), b: rect1.position.add(new pgEngine.Vec2(x, y)), color: "#ff0000", offset: new pgEngine.Vec2(0, 0) });
	// 	rect1.collider.applyForce(new pgEngine.Vec2(x, y));
	// }

	if (keysDown["ArrowRight"]) {
		rect1.collider.angularAcceleration += 360 * pgEngine.Utils.degToRad;
	}

	if (keysDown["ArrowLeft"]) {
		rect1.collider.angularAcceleration -= 360 * pgEngine.Utils.degToRad;
	}

	// if (keysDown[" "]) {
	// 	rect1.collider.applyForce(new pgEngine.Vec2(0, -98.1 * meterSizeInPixels).multiply(rect1.collider.mass));
	// }

	// if (mouse.down == true) {
	// 	for (var i = 0; i < pgPhy.objects.length; i++) {
	// 		var obj = pgPhy.objects[i];

	// 		if (obj instanceof pgEngine.Physics.ObjectConstraint) {
	// 			continue;
	// 		}

	// 		// selectedObj.obj = obj;

	// 		var frce = mouse.position.subtract(obj.position).multiply(obj.mass * 2);
	// 		obj.applyForce(frce);
	// 	}
	// }

	if (selectedObj.obj != null) {
		selectedObj.obj.velocity = mouse.velocity.multiply(meterSizeInPixels);
		selectedObj.obj.position = mouse.position.clone();
	}

	pgPhy.update(dt);

	camera.position = rect1.position.clone();
	// camera.rotation = rect1.rotation * pgEngine.Utils.radToDeg;

	// pgPhy.lineDebugList.push(...addll);

	// alert(circle1.collider.velocity.x / dt)

	circle1.update();
	circle2.update();

	floor.update();

	testPolygon.update();

	rect1.update();
	rect2.update();

	slope1.update();
	slope2.update();

	// camera.position = testObjs[Math.floor(Math.random() * testObjs.length)].position;

	if (isNaN(circle1.position.x) == true || isNaN(circle1.position.y) == true) {
		alert("NOOOO!");
	}

	if (isNaN(circle2.position.x) == true || isNaN(circle2.position.y) == true) {
		alert("NOOOO!");
	}

	for (var i = 0; i < testObjs.length; i++) {
		if (testObjs[i] instanceof pgEngine.Physics.ObjectConstraint) {
			continue;
		}

		testObjs[i].update(ctx);

		// if (isNaN(testObjs[i].position.x) == true || isNaN(testObjs[i].position.y) == true) {
		// 	alert("NOOOO!");
		// }
	}

	var gravitationalStrength = (/*6.6726e-11*/10 * rect1.collider.mass * circle1.collider.mass) / rect1.position.subtract(circle1.position).lengthSquared();

	var gravityDir = circle1.position.subtract(rect1.position).normalized;

	// pgPhy.gravity.direction = circle1.position.subtract(rect1.position).normalized;
	// pgPhy.lineDebugList.push({ a: rect1.position.clone(), b: rect1.position.add(pgPhy.gravity.direction.multiply(512)), color: "#0080ff", offset: new pgEngine.Vec2(0, 0) });
	// pgPhy.gravity.strength = 0//(/*6.6726e-11*/0.2 * rect1.collider.mass * circle1.collider.mass) / rect1.position.subtract(circle1.position).lengthSquared();

	// rect1.collider.applyForce(gravityDir.multiply(gravitationalStrength));
	// circle1.collider.applyForce(gravityDir.multiply(-gravitationalStrength));

	// rect1.collider.position = new pgEngine.Vec2(0, 0);
	// rect1.collider.velocity = new pgEngine.Vec2(0, 0);

	// camera.rotation = (rect1.position.subtract(circle1.position).direction() * pgEngine.Utils.radToDeg) + 90;

	for (var i = 0; i < testPoints.length; i++) {
		var p = testPoints[i];

		p.t++;

		if (p.t > 3600) {
			testPoints.splice(i, 1);
			i--;
		}
	}

	// if (tick % 2 === 0 && tick !== 0) {
	// 	testPoints.push({ p: rect1.position, t: 0 });
	// 	tick = 0;
	// }

	ctx.save();
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	ctx.lineWidth = 2;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.clearRect(0, 0, vWidth, vHeight);
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, vWidth, vHeight);
	camera.applyToCtx(ctx, vWidth, vHeight);

	var bounds = camera.getScreenBounds(vWidth, vHeight);
	// if (aabb1.max.x <= aabb2.min.x || aabb2.max.x <= aabb1.min.x ||
	// 	aabb1.max.y <= aabb2.min.y || aabb2.max.y <= aabb1.min.y) {
	// 	return false;
	// }
	
	// ctx.save();
	// ctx.globalAlpha = 1;

	// ctx.fillStyle = "#ff0000";
	// ctx.fillRect(bounds.worldAABB.min.x, bounds.worldAABB.min.y, bounds.worldAABB.max.x - bounds.worldAABB.min.x, bounds.worldAABB.max.y - bounds.worldAABB.min.y);

	// ctx.fillStyle = "#00ff00";
	// ctx.beginPath();
	// ctx.moveTo(bounds.topLeft.x, bounds.topLeft.y);
	// ctx.lineTo(bounds.topRight.x, bounds.topRight.y);
	// ctx.lineTo(bounds.bottomRight.x, bounds.bottomRight.y);
	// ctx.lineTo(bounds.bottomLeft.x, bounds.bottomLeft.y);
	// ctx.fill();
	// ctx.closePath();
	// ctx.restore();

	// ctx.strokeStyle = "#ff0000";
	// ctx.beginPath();
	// ctx.moveTo(bounds.topLeft.x, bounds.topLeft.y);
	// ctx.lineTo(bounds.topRight.x, bounds.topRight.y);
	// ctx.lineTo(bounds.bottomRight.x, bounds.bottomRight.y);
	// ctx.lineTo(bounds.bottomLeft.x, bounds.bottomLeft.y);
	// ctx.closePath();
	// ctx.stroke();

	// ctx.beginPath();
	// ctx.moveTo(bounds.topLeft.x, bounds.topLeft.y);
	// ctx.lineTo(bounds.bottomRight.x, bounds.bottomRight.y);
	// ctx.stroke();
	// ctx.closePath();

	circle1.draw(ctx);
	circle2.draw(ctx);

	floor.draw(ctx);
	testPolygon.draw(ctx);

	rect1.draw(ctx);
	rect2.draw(ctx);

	slope1.draw(ctx);
	slope2.draw(ctx);

	for (var i = 0; i < testObjs.length; i++) {
		testObjs[i].draw(ctx);
	}

	// ref.draw(ctx);

	// ctx.fillStyle = "#00ff00";
	// ctx.beginPath();
	// for (var i = 0; i < rect1.collider.vertices.length; i++) {
	// 	if (i === 0) {
	// 		ctx.moveTo(rect1.collider.vertices[i].x, rect1.collider.vertices[i].y);
	// 	} else {
	// 		ctx.lineTo(rect1.collider.vertices[i].x, rect1.collider.vertices[i].y);
	// 	}
	// }
	// ctx.fill();
	// ctx.closePath();

	// ctx.beginPath();
	// for (var i = 0; i < rect2.collider.vertices.length; i++) {
	// 	if (i === 0) {
	// 		ctx.moveTo(rect2.collider.vertices[i].x, rect2.collider.vertices[i].y);
	// 	} else {
	// 		ctx.lineTo(rect2.collider.vertices[i].x, rect2.collider.vertices[i].y);
	// 	}
	// }
	// ctx.fill();
	// ctx.closePath();

	// ctx.save();
	// ctx.globalCompositeOperation = "difference";
	// ctx.fillStyle = "#ffffff";
	// for (var i = 0; i < pgPhy.collisionsListDebug.length; i++) {
	// 	var c = pgPhy.collisionsListDebug[i];
	// 	ctx.beginPath();
	// 	ctx.arc(c.contact1.x, c.contact1.y, 4, 0, pgEngine.Utils.tau, 0);
	// 	ctx.fill();
	// 	ctx.closePath();
	// 	if (c.contactCount > 1) {
	// 		ctx.beginPath();
	// 		ctx.arc(c.contact2.x, c.contact2.y, 4, 0, pgEngine.Utils.tau, 0);
	// 		ctx.fill();
	// 		ctx.closePath();
	// 	}
	// }
	// ctx.restore();

	ctx.save();
	// ctx.globalCompositeOperation = "difference";
	ctx.globalAlpha = 1 / 2// pgPhy.lineDebugList.length;
	ctx.lineWidth = 1;
	for (var i = 0; i < pgPhy.lineDebugList.length; i++) {
		var line = pgPhy.lineDebugList[i];

		if (line.color) {
			ctx.strokeStyle = line.color;
		} else {
			ctx.strokeStyle = "#ffffff";
		}

		ctx.beginPath();
		ctx.moveTo(line.a.x + line.offset.x, line.a.y + line.offset.y);
		ctx.lineTo(line.b.x + line.offset.x, line.b.y + line.offset.y);
		ctx.stroke();
		ctx.closePath();
	}
	ctx.restore();

	ctx.save();
	ctx.strokeStyle = "#00ff00";
	ctx.lineCap = "butt";
	ctx.lineWidth = 2 / camera.viewScale;
	if (testPoints.length > 1) {
		for (var i = 0; i < testPoints.length - 1; i++) {
			var p = testPoints[i];
			var p2 = testPoints[i + 1];
			ctx.globalAlpha = 1 - (p2.t / 3600);
			ctx.beginPath();
			ctx.moveTo(p.p.x, p.p.y);
			ctx.lineTo(p2.p.x, p2.p.y);
			ctx.stroke();
			ctx.closePath();
		}
	}
	ctx.restore();

	// ctx.strokeStyle = "#ff0000";
	// ctx.fillStyle = "#000000";

	// ctx.strokeRect(-256, -256, 512, 512);

	// ctx.fillRect(-512, -512, 256, 1024);
	// ctx.fillRect(256, -512, 256, 1024);

	// ctx.fillRect(-512, -512, 1024, 256);
	// ctx.fillRect(-512, 256, 1024, 256);

	// ctx.fillStyle = "#ffffff";
	// ctx.font = "16px arial";
	// ctx.fillText(rect1.collider.position.x.toFixed(4) + " : " + rect1.collider.position.y.toFixed(4) + " : " + rect1.collider.velocity.x.toFixed(4) + " : " + rect1.collider.velocity.y.toFixed(4) + " : " + rect1.collider.angularVelocity.toFixed(4), camera.position.x + 8, camera.position.y - 16);

	ctx.restore();

	ctx.save();
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	ctx.lineWidth = 2;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	ctx.fillStyle = "#ffffff";
	ctx.font = 16 + "px arial";
	ctx.textBaseline = "top";
	ctx.fillText("Current FPS: " + curFPS.toFixed(1), 8, 8);
	ctx.fillText("Min FPS: " + minFPS.toFixed(1), 8, 32);
	ctx.fillText("Max FPS: " + maxFPS.toFixed(1), 8, 56);
	ctx.fillText("Average FPS: " + avgFPS.toFixed(1), 8, 80);

	ctx.restore();

	mouse.velocity.x = 0;
	mouse.velocity.y = 0;
	mouse.previous.x = mouse.position.x;
	mouse.previous.y = mouse.position.y;

	// if (adt >= 1) {
	// 	alert(circle1.collider.velocity.y / meterSizeInPixels)
	// }

	requestAnimationFrame(main);
	// tick++;
}

window.addEventListener("load", () => {
	prevTime = performance.now();
	// updateIdx = setInterval(main, 1000 / tFps);
	requestAnimationFrame(main);
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

	if (mouse.rightdown == true) {
		var newObj = new CircleTest(mouse.position.x / meterSizeInPixels, mouse.position.y / meterSizeInPixels, 0.5, 1, new pgEngine.Vec2(0, 0), "#ff0000", false, true);
		testObjs.push(newObj);
		pgPhy.addObject(newObj.collider);
	}

	if (mouse.down == true) {
		for (var i = 0; i < pgPhy.objects.length; i++) {
			var obj = pgPhy.objects[i];

			if (obj instanceof pgEngine.Physics.ObjectConstraint) {
				continue;
			}

			var objAABB = obj.GetAABB();
			if (mouse.position.x > objAABB.min.x && objAABB.max.x > mouse.position.x && mouse.position.y > objAABB.min.y && objAABB.max.y > mouse.position.y) {
				selectedObj.obj = obj;
			}
		}
	}
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

	selectedObj.obj = null;
});