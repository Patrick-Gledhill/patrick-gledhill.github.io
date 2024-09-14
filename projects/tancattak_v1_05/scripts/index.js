if (typeof CanvasRenderingContext2D.prototype.roundRect !== "function") {
	CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius = 5, fill = false, stroke = true) {
		var ctx = this;

		if (typeof radius === 'number') {
			radius = { tl: radius * 1.25, tr: radius * 1.25, br: radius * 1.25, bl: radius * 1.25 };
		} else {
			radius = { ...{ tl: 0, tr: 0, br: 0, bl: 0 }, ...radius };
		}
		// ctx.beginPath();
		ctx.moveTo(x + radius.tl, y);
		ctx.lineTo(x + width - radius.tr, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
		ctx.lineTo(x + width, y + height - radius.br);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
		ctx.lineTo(x + radius.bl, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
		ctx.lineTo(x, y + radius.tl);
		ctx.quadraticCurveTo(x, y, x + radius.tl, y);
		// ctx.closePath();
		// if (fill) {
		//     ctx.fill();
		// }
		// if (stroke) {
		//     ctx.stroke();
		// }
	}
}

var calls = 0;
function iSuspectToBeLoopingInfinitely() {
	calls += 1;
	if (calls > 250) { debugger; };
}

window.onerror = function (ev, src, lineno, colno, err) {
	document.writeln("<p>" + ev + "</p>");
	document.writeln("<p>" + src + "</p>");
	document.writeln("<p>" + lineno + ":" + colno + "</p>");
	document.writeln("<p>" + err + "</p>");

	alert(`${ev}, ${src}, ${lineno}:${colno}, ${err}`);
}

async function fetchJSONFile(url) {
	try {
		var response = await fetch(url);
		var jsonData = await response.json();
		return jsonData;
	} catch (error) {
		throw error;
	}
}

var trueDev = false;
var devMode = false;
var secretUnlocked = false;

var mobile = false;

function getDeviceType() {
	if (navigator.userAgent.match(/Android/i)
		|| navigator.userAgent.match(/webOS/i)
		|| navigator.userAgent.match(/iPhone/i)
		|| navigator.userAgent.match(/iPad/i)
		|| navigator.userAgent.match(/iPod/i)
		|| navigator.userAgent.match(/BlackBerry/i)
		|| navigator.userAgent.match(/Windows Phone/i)) {
		mobile = true;
	} else {
		mobile = false;
	}
}

getDeviceType();

/**
 * @type { HTMLCanvasElement }
 */
var scene = document.getElementById("scene");
var ctx = scene.getContext("2d");

var tankColors = [
	{
		color: "#ff0000",
		bc: "#800000"
	},
	{
		color: "#ffff00",
		bc: "#808000"
	},
	{
		color: "#00ff00",
		bc: "#008000"
	},
	{
		color: "#0000ff",
		bc: "#000080"
	},
	{
		color: "#00ffff",
		bc: "#008080"
	},
	{
		color: "#ff00ff",
		bc: "#800080"
	},
	{
		color: "#ff8000",
		bc: "#804000"
	},
	{
		color: "#0080ff",
		bc: "#004080"
	}
]

ctx.imageSmoothingEnabled = false;
var vWidth = window.innerWidth;
var vHeight = window.innerHeight;

var zoomingDampener = 0.95;

function resizeCanvas() {
	vWidth = window.innerWidth;
	vHeight = window.innerHeight;
	scene.width = vWidth * window.devicePixelRatio;
	scene.height = vHeight * window.devicePixelRatio;
}

resizeCanvas();

var gameLoop;

var cameraOffsetX = 0;
var cameraOffsetY = 0;

var workshopImage = new Image();
workshopImage.src = "./assets/192_scaled_workshop_2.png";

var breakableWallImage = new Image();
breakableWallImage.src = "./assets/breakable_wall.png";

var damagedImage01 = new Image();
damagedImage01.src = "./assets/damaged_01.png";
var damagedImage02 = new Image();
damagedImage02.src = "./assets/damaged_02.png";
var damagedImage03 = new Image();
damagedImage03.src = "./assets/damaged_03_3.png";
var damagedImage04 = new Image();
damagedImage04.src = "./assets/damaged_03_4.png";

var explosion01 = new Image();
explosion01.src = "./assets/roundexplosion.png";
var explosion02 = new Image();
explosion02.src = "./assets/explosion2.png";

var fire01 = new Image();
fire01.src = "./assets/fireSheet5x5.png";

var playerStartImage = new Image();
playerStartImage.src = "./assets/player_start_icon_02.png";
var enemySpawnerImage = new Image();
enemySpawnerImage.src = "./assets/enemy_spawner_icon.png";
var allySpawnerImage = new Image();
allySpawnerImage.src = "./assets/ally_spawner_icon.png";

var mouse = {
	x: 0,
	y: 0,
	previous: {
		x: 0,
		y: 0
	},
	down: false,
	rightdown: false
}

var joystick = {
	x: 0,
	y: 0,
	vx: 0,
	vy: 0,
	previous: {
		x: 0,
		y: 0
	},
	active: false
}

var joystick2 = {
	x: 0,
	y: 0,
	vx: 0,
	vy: 0,
	previous: {
		x: 0,
		y: 0
	},
	active: false
}

var fps = 60;
var keysDown = [];
var friction = 0.8;

function rectangleToRectangleCollisionDetection(obj1, obj2) {
	if (obj1.x + obj1.width > obj2.x && obj1.x < obj2.x + obj2.width &&
		obj1.y + obj1.height > obj2.y && obj1.y < obj2.y + obj2.height) {
		return true;
	}

	return false;
}

function pointToRectangleCollisionDetection(obj1, obj2) {
	if (obj1.x > obj2.x && obj1.x < obj2.x + obj2.width &&
		obj1.y > obj2.y && obj1.y < obj2.y + obj2.height) {
		return true;
	}

	return false;
}

function rectangleToRectangleCollisionResolution(obj1, obj2) {
	var vx = (obj1.x + obj1.width / 2) - (obj2.x + obj2.width / 2);
	var vy = (obj1.y + obj1.height / 2) - (obj2.y + obj2.height / 2);

	if (Math.abs(vx / obj2.width) > Math.abs(vy / obj2.height)) {
		if (vx < 0) {
			obj1.x = obj2.x - obj1.width;
		} else {
			obj1.x = obj2.x + obj2.width;
		}
	} else {
		if (vy < 0) {
			obj1.y = obj2.y - obj1.height;
		} else {
			obj1.y = obj2.y + obj2.height;
		}
	}

	// var vx = (obj2.x + obj2.width / 2) - (obj1.x + obj1.width / 2);
	// var vy = (obj2.y + obj2.height / 2) - (obj1.y + obj1.height / 2);
	// 
	// 
}

function rectangleToRectangleCollisionResolutionTwoMovingObjects(obj1, obj2) {
	var vx = (obj1.x + obj1.width / 2) - (obj2.x + obj2.width / 2);
	var vy = (obj1.y + obj1.height / 2) - (obj2.y + obj2.height / 2);

	var refX1 = obj1.x;
	var refX2 = obj2.x;
	var refY1 = obj1.y;
	var refY2 = obj2.y;

	if (Math.abs(vx / obj2.width) > Math.abs(vy / obj2.height)) {
		if (vx < 0) {
			obj1.x = refX2 - obj1.width;
			obj2.x = refX1 + obj1.width;
		} else {
			obj1.x = refX2 + obj2.width;
			obj2.x = refX1 - obj2.width;
		}
	} else {
		if (vy < 0) {
			obj1.y = refY2 - obj1.height;
			obj2.y = refY1 + obj1.height;
		} else {
			obj1.y = refY2 + obj2.height;
			obj2.y = refY1 - obj2.height;
		}
	}
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

function pointToPolygonCollisionDetection(point, vertices) {
	var collision = false;

	for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
		var xi = vertices[i].x;
		var yi = vertices[i].y;

		var xj = vertices[j].x;
		var yj = vertices[j].y;

		var intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

		if (intersect) {
			collision = !collision;
		}
	}

	return collision;
}

var startScreen = document.getElementById("main-menu");
var playButton = document.getElementById("play-button");

playButton.addEventListener("click", () => {
	gameLoop = setInterval(main, 1000 / fps);
	startScreen.style.display = "none";
});

class Store {
	constructor(storeElement) {
		this.storeElement = storeElement;
	}

	open() {
		this.storeElement.style.display = "flex";
	}

	close() {
		this.storeElement.style.display = "none";
	}
}

/**
 * @description A set of helper functions to make drawing on a 2d canvas easier.
 */
class Draw {
	/**
	 * @param context The canvas context to use for drawing.
	 */
	constructor(context) {
		this.ctx = context;
	}

	/**
	 * @description Clears the specified rectangular area, making it fully transparent.
	 */
	clear(x, y, width, height) {
		this.ctx.clearRect(x, y, width, height);
	}

	rectangle(x, y, width, height, roundness = 0, fill = true, stroke = false, options = {}) {
		this.ctx.save();
		Object.assign(this.ctx, options);
		this.ctx.beginPath();
		this.ctx.roundRect(x, y, width, height, roundness);
		// roundRect(this.ctx, x, y, width, height, roundness);
		this.ctx.closePath();
		if (fill) this.ctx.fill();
		if (stroke) this.ctx.stroke();
		this.ctx.restore();
	}

	arc(x, y, radius, a1, a2 = Math.PI * 2, fill = true, stroke = false, options = {}, counterClockwise = false) {
		this.ctx.save();
		Object.assign(this.ctx, options);
		this.ctx.beginPath();
		this.ctx.arc(x, y, radius, a1, a2, counterClockwise);
		this.ctx.closePath();
		if (fill) this.ctx.fill();
		if (stroke) this.ctx.stroke();
		this.ctx.restore();
	}

	text(text, x, y, fill = true, stroke = false, options = {}, maxWidth = undefined) {
		this.ctx.save();
		Object.assign(this.ctx, options);
		if (fill) this.ctx.fillText(text, x, y, maxWidth);
		if (stroke) this.ctx.strokeText(text, x, y, maxWidth);
		this.ctx.restore();
	}

	path(path, fill = true, stroke = false, options = {}) {
		this.ctx.save();
		Object.assign(this.ctx, options);
		this.ctx.beginPath();
		if (fill) this.ctx.fill(path);
		if (stroke) this.ctx.stroke(path);
		this.ctx.closePath();
		this.ctx.restore();
	}

	image(image, x = 0, y = 0, width = image.width, height = image.height, options = {}, sx = 0, sy = 0, sWidth = image.width, sHeight = image.height) {
		this.ctx.save();
		Object.assign(this.ctx, options);
		this.ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, width, height);
		this.ctx.restore();
	}

	grid(x, y, width, height, gridCellSize, options = {}) {
		this.ctx.save();
		this.ctx.beginPath();
		this.ctx.lineWidth = 1;

		for (var lx = x; lx <= x + width; lx += gridCellSize) {
			this.ctx.moveTo(lx, y);
			this.ctx.lineTo(lx, y + height);
		}

		for (var ly = y; ly <= y + height; ly += gridCellSize) {
			this.ctx.moveTo(x, ly);
			this.ctx.lineTo(x + width, ly);
		}

		this.ctx.stroke();
		this.ctx.closePath();
		this.ctx.restore();
	}
}

class Vertex2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Vector2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	static add(vector1, vector2) {
		return new Vector2(vector1.x + vector2.x, vector1.y + vector2.y);
	}

	static magnitude(vector) {
		return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
	}

	static normalize(vector) {
		var len = this.magnitude(vector);
		if (len != 0) {
			return new Vector2(vector.x / len, vector.y / len);
		}

		return new Vector2(0, 0);
	}

	static multiplyScalar(vector, scalar) {
		return new Vector2(vector.x * scalar, vector.y * scalar);
	}

	static subtract(vector1, vector2) {
		return new Vector2(vector1.x - vector2.x, vector1.y - vector2.y);
	}
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
	return start + ((end - start) * t);
}

function lerpAngle(a1, a2, t) {
	return Math.atan2(lerp(Math.sin(a1), Math.sin(a2), t), lerp(Math.cos(a1), Math.cos(a2), t));
}

// function lerpAngle(startAngle, endAngle, t) {
// 	var angleDiff = Math.abs(endAngle - startAngle);

// 	if (angleDiff > Math.PI) {
// 		if (startAngle < endAngle) {
// 			startAngle += 2 * Math.PI;
// 		} else {
// 			endAngle += 2 * Math.PI;
// 		}
// 	}

// 	var lerpedAngle = lerp(startAngle, endAngle, t);

// 	return ((lerpedAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
// }

function random(min, max) {
	return Math.random() * (max - min) + min;
}

function degreesToRadians(degrees) {
	return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians) {
	return radians * (180 / Math.PI);
}

function findDistanceFromXYToXY(fromX, fromY, toX, toY) {
	var dx = fromX - toX;
	var dy = fromY - toY;

	return Math.sqrt((dx * dx) + (dy * dy));
}

function distAB(a, b) {
	var dx = (b.x - a.x);
	var dy = (b.y - a.y);

	return Math.sqrt((dx * dx) + (dy * dy));
}

function snapNumberToGrid(number, gridSize) {
	return Math.floor(number / gridSize) * gridSize;
}

function pickRandomItemFromArray(array) {
	return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function findClosestToObject(object, array = []) {
	var closestObject = object;
	var distance = Infinity;

	for (var i = 0; i < array.length; i++) {
		var obj = array[i];
		var dx = (obj.x + (obj.width / 2)) - (object.x + (object.width / 2));
		var dy = (obj.y + (obj.height / 2)) - (object.y + (object.height / 2));

		var dist = Math.sqrt((dx * dx) + (dy * dy));

		if (dist < distance) {
			distance = dist;
			closestObject = obj;
		}
	}

	return closestObject;
}

function getRectangleCorners(rect, rotation, rotationPoint) {
	var cx;
	var cy;

	if (rotationPoint === "center") {
		cx = rect.x + (rect.width / 2);
		cy = rect.y + (rect.height / 2);
	} else {
		cx = rotationPoint.x;
		cy = rotationPoint.y;
	}

	var corners = [
		new Vertex2(rect.x, rect.y),
		new Vertex2(rect.x + rect.width, rect.y),
		new Vertex2(rect.x + rect.width, rect.y + rect.height),
		new Vertex2(rect.x, rect.y + rect.height)
	];

	var cosR = Math.cos(rotation);
	var sinR = Math.sin(rotation);

	for (var corner of corners) {
		var dx = corner.x - cx;
		var dy = corner.y - cy;

		corner.x = cx + dx * cosR - dy * sinR;
		corner.y = cy + dx * sinR + dy * cosR;
	}

	return corners;
}

function getRotatedPoint(point, rotation, rotationPoint) {
	var cosR = Math.cos(rotation);
	var sinR = Math.sin(rotation);

	var dx = point.x - rotationPoint.x;
	var dy = point.y - rotationPoint.y;

	return new Vertex2(rotationPoint.x + dx * cosR - dy * sinR, rotationPoint.y + dx * sinR + dy * cosR);
}

class Particle {
	constructor(x, y, radius, color, type = "bouncy", velX = 0, velY = 0, maxLife) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.bounciness = type === "bouncy" ? 0.4 + random(-0.01, 0.01) : 0.2 + random(-0.01, 0.01);
		this.velX = velX + random(-0.25, 0.25);
		this.velY = velY + random(-0.25, 0.25);
		this.mass = this.radius * this.radius;
		this.terminalVelocity = this.mass * 15;
		this.prevX = x;
		this.prevY = y;
		this.maxLife = maxLife;
		this.life = this.maxLife;
	}
}

class ParticleSpawner {
	constructor(pgPhyEngine, x, y, radius, particleSizeRange = { min: 3, max: 10 }, velXRange = { min: 5, max: 15 }, velYRange = { min: 5, max: 15 }, particleCount = 100, particleColorsArray = ["#ff8000", "#808080"], lifeTimeRange = { min: 10, max: 30 }) {
		this.parent = pgPhyEngine;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.particleSizeRange = particleSizeRange;
		this.velXRange = velXRange;
		this.velYRange = velYRange;
		this.particleCount = particleCount;
		this.particleColors = particleColorsArray;
		this.lifeTimeRange = lifeTimeRange;
	}

	activate() {
		for (var i = 0; i < this.particleCount; i++) {
			var randomDir = degreesToRadians(random(-180, 180));
			this.parent.createParticle(this.x + (Math.cos(randomDir) * random(0, this.radius)), this.y + (Math.sin(randomDir) * random(0, this.radius)), random(this.particleSizeRange.min, this.particleSizeRange.max), pickRandomItemFromArray(this.particleColors), true, random(this.velXRange.min, this.velXRange.max) * Math.cos(randomDir), random(this.velYRange.min, this.velYRange.max) * Math.sin(randomDir), getRandomInt(this.lifeTimeRange.min, this.lifeTimeRange.max));
		}
	}
}

class DirectionalParticleSpawner {
	constructor(pgPhyEngine, x, y, radius, particleSizeRange = { min: 3, max: 10 }, particleSpeedRange = { min: 1, max: 10 }, particleCount = 1, particleColorsArray = ["#ff8000", "#808080"], directionRange = { min: Math.atan2(1, 1), max: Math.atan2(1, 0) }, offsetX, offsetY, lifeTimeRange = { min: 10, max: 30 }) {
		this.parent = pgPhyEngine;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.particleSizeRange = particleSizeRange;
		this.particleSpeedRange = particleSpeedRange;
		this.particleColors = particleColorsArray;
		this.particleCount = particleCount;
		this.directionRange = directionRange;
		this.offsetX = offsetX;
		this.offsetY = offsetY;
		this.lifeTimeRange = lifeTimeRange;
	}

	activate() {
		for (var i = 0; i < this.particleCount; i++) {
			var selectedSpeed = random(this.particleSpeedRange.min, this.particleSpeedRange.max);
			var selectedDirection = random(this.directionRange.min, this.directionRange.max);
			this.parent.createParticle(this.x + (Math.cos(selectedDirection) * random(0, this.radius)), this.y + (Math.sin(selectedDirection) * random(0, this.radius)), random(this.particleSizeRange.min, this.particleSizeRange.max), pickRandomItemFromArray(this.particleColors), true, (Math.cos(selectedDirection) * selectedSpeed) + this.offsetX, (Math.sin(selectedDirection) * selectedSpeed) + this.offsetY, getRandomInt(this.lifeTimeRange.min, this.lifeTimeRange.max));
		}
	}
}

class PgPhysics {
	constructor(canvas, context) {
		this.canvas = canvas;
		this.ctx = context;
		this.draw = new Draw(this.ctx);
		this.particles = [];
		// this.gravity = 0.9;
		this.friction = {
			surface: 0.85,
			air: 0.99
			// air: 0.8
		};
		this.fps = 60;
	}

	createParticle(x, y, radius, color, bouncy = true, velX = 0, velY = 0, lifetime) {
		this.particles.push(new Particle(x, y, radius, color, bouncy == true ? "bouncy" : "no", velX, velY, lifetime));
	}

	update() {
		for (var i = 0; i < this.particles.length; i++) {
			var particle = this.particles[i];

			particle.life--;

			if (particle.life <= 0) {
				this.particles.splice(i, 1);
				i--;
				continue;
			}

			particle.prevX = particle.x;
			particle.prevY = particle.y;

			particle.velX *= this.friction.surface;
			particle.velY *= this.friction.surface;

			// if (particle.velY > particle.terminalVelocity) {
			// 	particle.velY = particle.terminalVelocity;
			// }

			particle.y += particle.velY;
			particle.x += particle.velX;
		}
		// this.checkCollisions();
	}

	render(experimentalMotionBlur = false, experimentalGlow = false) {
		for (var i = 0; i < this.particles.length; i++) {
			var particle = this.particles[i];
			this.ctx.save();

			if (experimentalGlow == true) {
				this.ctx.shadowBlur = particle.radius * 2;
				// this.ctx.shadowBlur = 10;
				this.ctx.shadowColor = particle.color;
				// this.ctx.shadowColor = "#ff0000";
			}

			// this.ctx.globalAlpha = 1;
			this.ctx.globalAlpha = particle.life / particle.maxLife;

			this.ctx.strokeStyle = particle.color;
			this.ctx.fillStyle = particle.color;
			this.ctx.lineWidth = particle.radius * 2;
			// this.ctx.lineWidth = 1;
			this.ctx.beginPath();
			// this.ctx.arc(particle.x, particle.y, particle.radius, 0, 2 * Math.PI);
			this.ctx.moveTo(particle.prevX, particle.prevY);
			this.ctx.lineTo(particle.x, particle.y);
			// this.ctx.fill();
			this.ctx.stroke();
			this.ctx.closePath();

			this.ctx.shadowBlur = 0;
			this.ctx.shadowColor = "#000000";

			if (experimentalMotionBlur == true) {
				this.ctx.globalAlpha = 0.6;
				this.ctx.beginPath();
				this.ctx.arc(particle.x + particle.velX / 4, particle.y + particle.velY / 4, particle.radius, 0, 2 * Math.PI);
				this.ctx.globalAlpha = 0.5;
				this.ctx.arc(particle.x - particle.velX / 6, particle.y - particle.velY / 6, particle.radius, 0, 2 * Math.PI);
				this.ctx.globalAlpha = 0.3;
				this.ctx.arc(particle.x - particle.velX / 4, particle.y - particle.velY / 4, particle.radius, 0, 2 * Math.PI);
				this.ctx.globalAlpha = 0.2;
				this.ctx.arc(particle.x - particle.velX / 2, particle.y - particle.velY / 2, particle.radius, 0, 2 * Math.PI);
				this.ctx.fill();
				// this.ctx.stroke();
				this.ctx.closePath();
			}

			this.ctx.restore();
		}
	}

	checkCollisions() {
		for (var i = 0; i < this.particles.length; i++) {
			var particle1 = this.particles[i];
			for (var j = i + 1; j < this.particles.length; j++) {
				var particle2 = this.particles[j];
				this.resolveCircleCollision(particle1, particle2);
			}
		}
	}

	circleToCircleCollision(obj1, obj2) {
		var dx = obj2.x - obj1.x;
		var dy = obj2.y - obj1.y;
		var distance = Math.sqrt(dx * dx + dy * dy);

		var radiiSum = obj1.radius + obj2.radius;

		if (distance <= radiiSum) {
			return true;
		}

		return false;
	}

	resolveCircleCollision(circle1, circle2) {
		var dx = circle2.x - circle1.x;
		var dy = circle2.y - circle1.y;
		var distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < circle1.radius + circle2.radius) {
			// Collision detected

			// Calculate collision normal
			var collisionNormal = {
				x: dx / distance,
				y: dy / distance
			};

			// Calculate relative velocity along the collision normal
			var relativeVelocity = {
				x: circle2.velX - circle1.velX,
				y: circle2.velY - circle1.velY
			};
			var velAlongNormal = relativeVelocity.x * collisionNormal.x + relativeVelocity.y * collisionNormal.y;

			if (velAlongNormal > 0) {
				return; // Circles are already separating
			}

			// Calculate impulse magnitude
			var restitution = 0.9; // Coefficient of restitution (1 for perfectly elastic collision)
			var impulseMagnitude = -(1 + restitution) * velAlongNormal;
			impulseMagnitude /= (1 / circle1.mass) + (1 / circle2.mass);

			// Apply impulse to the circles
			var impulse = {
				x: impulseMagnitude * collisionNormal.x,
				y: impulseMagnitude * collisionNormal.y
			};
			circle1.velX -= (1 / circle1.mass) * impulse.x;
			circle1.velY -= (1 / circle1.mass) * impulse.y;
			circle2.velX += (1 / circle2.mass) * impulse.x;
			circle2.velY += (1 / circle2.mass) * impulse.y;

			// Adjust positions to resolve overlap
			var epsilon = 0.1; // Small epsilon value to prevent overlap
			var overlap = circle1.radius + circle2.radius - distance + epsilon;
			var displacement = {
				x: overlap * collisionNormal.x,
				y: overlap * collisionNormal.y
			};

			var totalMass = circle1.mass + circle2.mass;
			var ratio1 = circle2.mass / totalMass;
			var ratio2 = circle1.mass / totalMass;

			circle1.x -= displacement.x * ratio1;
			circle1.y -= displacement.y * ratio1;
			circle2.x += displacement.x * ratio2;
			circle2.y += displacement.y * ratio2;
		}
	}

	// resolveCircleCollision(circle1, circle2) {
	// 	var vx = circle2.x - circle1.x;
	// 	var vy = circle2.y - circle1.y;
	// 	var distance = Math.sqrt(vx * vx + vy * vy);

	// 	if (distance <= circle1.radius + circle2.radius) {
	// 		var sepLine = Math.atan2(vy, vx);

	// 		circle1.x = circle2.x + -Math.cos(sepLine) * (circle1.radius + circle2.radius);
	// 		circle1.y = circle2.y + -Math.sin(sepLine) * (circle1.radius + circle2.radius);
	// 		circle1.x = circle2.x + -Math.cos(sepLine) * (circle1.radius + circle2.radius);
	// 		circle1.y = circle2.y + -Math.sin(sepLine) * (circle1.radius + circle2.radius);
	// 	}
	// }


	clear() {
		this.particles.splice(0, 1000000);
	}
}

class SpriteSheetRenderer {
	constructor(ctx) {
		this.ctx = ctx;
		this.currentsEffects = [];
	}

	renderSpriteSheet(image, x, y, width, height, rows, columns, renderDuration, loopIterations = 1, blackBG = false) {
		this.currentsEffects.push({
			image: image,
			x: x,
			y: y,
			width: width,
			height: height,
			rows: rows,
			columns: columns,
			frameDuration: renderDuration / (rows * columns),
			frame: 0,
			totalFrames: (rows * columns),
			currentFrameDuration: renderDuration / (rows * columns),
			renderDuration: renderDuration,
			loopIterations: loopIterations,
			blackBG: blackBG
		});
	}

	draw() {
		for (var i = 0; i < this.currentsEffects.length; i++) {
			var effect = this.currentsEffects[i];

			if (effect.currentFrameDuration <= 0) {
				effect.frame++;
				effect.currentFrameDuration = effect.frameDuration;
			}

			if (effect.frame >= effect.totalFrames) {
				effect.loopIterations--;
				if (effect.loopIterations <= 0) {
					this.currentsEffects.splice(i, 1);
					i--;
					continue;
				}
				effect.frame = 0;
			}

			var row = Math.floor(effect.frame / effect.columns);
			var column = effect.frame % effect.columns;

			this.ctx.save();
			if (effect.blackBG == true) {
				this.ctx.globalCompositeOperation = "lighter";
			}
			this.ctx.drawImage(effect.image, column * (effect.image.width / effect.columns), row * (effect.image.height / effect.rows), (effect.image.width / effect.columns), (effect.image.height / effect.rows), effect.x, effect.y, effect.width, effect.height);
			this.ctx.restore();

			effect.currentFrameDuration -= 1;
		}
	}
}

var spriteSheet = new SpriteSheetRenderer(ctx);

// parent, x, y, width, height, color, bc, rotation, bulletHealth, bulletSpeed, bulletDamage, isADetail = false, overideBulletColor, overideBulletBC
function centeredGun(parent, offsetX, offsetY, width, height, color, bc, rotation, bulletHealth, bulletSpeed, bulletDamage, isADetail, reloadAni, reloadTime, delay, spread, bulletColor, bulletBC) {
	return new Gun(parent, offsetX, (-height / 2) + offsetY, width, height, color, bc, rotation, bulletHealth, bulletSpeed, bulletDamage, isADetail, reloadAni, reloadTime, delay, spread, bulletColor, bulletBC);
}

var devTestS = "basic";

var tankWeapons = {
	basic: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "basic";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 0.8, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height, false, true, 60, 0, 2)
		];
	},

	sniper: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "sniper";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 1.3, tank.height * 0.3, "#606060", "#404040", 0, tank.height * 5, 6, tank.height * 1.1, false, true, 60, 0, 0.5),
		];
	},

	shotgun: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "shotgun";
		return [
			new Gun(tank, 0, -tank.height * 0.2, tank.width, tank.height * 0.2, "#606060", "#404040", -4, tank.height * 0.8, 7, tank.height * 0.8, false, true, 60, 0, 4),
			new Gun(tank, 0, 0, tank.width, tank.height * 0.2, "#606060", "#404040", 4, tank.height * 0.8, 7, tank.height * 0.8, false, true, 60, 0, 5),
			new Gun(tank, 0, -tank.height * 0.1, tank.width, tank.height * 0.2, "#606060", "#404040", -2, tank.height * 0.8, 7, tank.height * 0.8, false, true, 60, 0, 5),
			new Gun(tank, 0, -tank.height * 0.1, tank.width, tank.height * 0.2, "#606060", "#404040", 2, tank.height * 0.8, 7, tank.height * 0.8, false, true, 60, 0, 4),
			new Gun(tank, 0, -tank.height * 0.3, tank.width, tank.height * 0.6, "#606060", "#404040", 0, 0, 0, 0, true, true, 60, 0, 5)
		];
	},

	devS: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "devS";
		return [
			new Gun(tank, 0, -tank.height * 0.2, tank.width, tank.height * 0.2, "#606060", "#404040", -4, tank.height * 100, 15, tank.height * 100, false, true, 15, 0, 4),
			new Gun(tank, 0, 0, tank.width, tank.height * 0.2, "#606060", "#404040", 4, tank.height * 100, 15, tank.height * 100, false, true, 15, 0, 5),
			new Gun(tank, 0, -tank.height * 0.1, tank.width, tank.height * 0.2, "#606060", "#404040", -2, tank.height * 100, 15, tank.height * 100, false, true, 15, 0, 5),
			new Gun(tank, 0, -tank.height * 0.1, tank.width, tank.height * 0.2, "#606060", "#404040", 2, tank.height * 100, 15, tank.height * 100, false, true, 15, 0, 4),
			new Gun(tank, 0, -tank.height * 0.3, tank.width, tank.height * 0.6, "#606060", "#404040", 0, 0, 0, 0, true, true, 15, 0, 5)
		];
	},

	twinFire: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "twinFire";

		return [
			// new Gun(tank, 0, -tank.height * 0.25, tank.width * 0.8, tank.height * 0.25, "#606060", "#404040", 0, tank.height, 6, tank.height * 1.2),
			// new Gun(tank, 0, tank.height * 0.1, tank.width * 0.8, tank.height * 0.25, "#606060", "#404040", 0, tank.height, 6, tank.height * 1.2)
			centeredGun(tank, 0, -tank.height * 0.2, tank.width * 0.8, tank.height * 0.25, "#606060", "#404040", 0, tank.height, 6, tank.height * 1.2, false, true, 60, 0, 2),
			centeredGun(tank, 0, tank.height * 0.2, tank.width * 0.8, tank.height * 0.25, "#606060", "#404040", 0, tank.height, 6, tank.height * 1.2, false, true, 60, 30, 2)
		];
	},

	stationary: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "stationary";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height, false, true, 60, 0, 2)
		];
	},

	dev: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "dev";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 0.8, tank.height * 0.3, "#606060", "#404040", 0, tank.height * 10, 10, tank.height * 10, false, true, 60, 0, 2)
		];
	},

	supressor: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "supressor";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 1.3, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height, false, true, 60, 0, 3),
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 1.2, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height, false, true, 60, 15, 3),
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 1.1, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height, false, true, 60, 30, 3),
			new Gun(tank, 0, -tank.height * 0.15, tank.width, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height, false, true, 60, 45, 3)
		];
	},

	minigun: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "minigun";
		return [
			new Gun(tank, 0, -tank.height * 0.25, tank.width * 1.05, tank.height * 0.1, "#606060", "#404040", 0, tank.height * 0.8, 7, tank.height * 0.8, true, true, 12, 4, 0),
			new Gun(tank, 0, tank.height * 0.15, tank.width * 1.05, tank.height * 0.1, "#606060", "#404040", 0, tank.height * 0.8, 7, tank.height * 0.8, true, true, 12, 8, 0),
			new Gun(tank, 0, -tank.height * 0.05, tank.width * 1.05, tank.height * 0.1, "#606060", "#404040", 0, tank.height * 0.7, 7, tank.height * 0.6, false, true, 12, 0, 1),
			new Gun(tank, tank.width * 0.5, -tank.height * 0.3, tank.width * 0.1, tank.height * 0.6, "#606060", "#404040", 0, tank.height * 0.8, 7, tank.height * 0.8, true, false),
			new Gun(tank, tank.width * 0.8, -tank.height * 0.3, tank.width * 0.1, tank.height * 0.6, "#606060", "#404040", 0, tank.height * 0.8, 7, tank.height * 0.8, true, false)
		];
	},

	cannon: function (tank) {
		tank.gunSfx = "./assets/gun_cannon.wav";
		tank.weaponClass = "cannon";
		return [
			new Gun(tank, 0, -tank.height * 0.35, tank.width * 1.5, tank.height * 0.7, "#606060", "#404040", 0, tank.height * 8, 6, tank.height * 2, false, true, 240, 0, 3)
		];
	},

	tmpFlamethrower: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "tmpFlamethrower";
		return [
			new Gun(tank, -tank.width * 0.4, tank.height * 0.15, tank.width * 0.7, tank.height * 0.3, "#606060", "#404040", 90, tank.height * 0.6, 5, tank.height * 0.4, true, false),
			new Gun(tank, tank.width * 0.35, tank.height * 0.2, tank.width * 0.2, tank.height * 0.2, "#ff8000", "#804000", 90, tank.height * 0.6, 5, tank.height * 0.4, true, false),
			new Gun(tank, 0, -tank.height * 0.15, tank.width, tank.height * 0.3, "#606060", "#404040", -2, tank.height * 0.6, 5, tank.height * 0.4, false, true, 12, 8, 6, "#ffcc00", "#ffcc00"),
			new Gun(tank, 0, -tank.height * 0.15, tank.width, tank.height * 0.3, "#606060", "#404040", 2, tank.height * 0.6, 5, tank.height * 0.4, false, true, 12, 4, 6, "#ffcc00", "#ffcc00"),
			new Gun(tank, 0, -tank.height * 0.15, tank.width, tank.height * 0.3, "#606060", "#404040", 0, tank.height * 0.6, 5, tank.height * 0.4, false, true, 12, 0, 6, "#ffcc00", "#ffcc00")
		];
	},

	fieldGun: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "fieldGun";
		return [
			new Gun(tank, 0, -tank.height * 0.3, tank.width * 0.7, tank.height * 0.3, "#606060", "#404040", -12, tank.height * 0.5, 6, tank.height * 0.5),
			new Gun(tank, 0, tank.height * 0, tank.width * 0.7, tank.height * 0.3, "#606060", "#404040", 12, tank.height * 0.5, 6, tank.height * 0.5),
			new Gun(tank, 0, -tank.height * 0.2, tank.width * 0.9, tank.height * 0.4, "#606060", "#404040", 0, tank.height * 1.8, 7, tank.height * 1.2),
			new Gun(tank, 0, -tank.height * 0.25, tank.width * 0.8, tank.height * 0.5, "#606060", "#404040", 0, tank.height * 1.2, 7, tank.height * 1.2)
		];
	},

	liquidNitrogenDispenser: function (tank) {
		tank.gunSfx = "./assets/gun_nemp_3.mp3";
		tank.weaponClass = "liquidNitrogenDispenser";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 0.8, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 3, tank.height, true, "#80ccff", "#80ccff"),
			new Gun(tank, 0, -tank.height * 0.05, tank.width * 0.8, tank.height * 0.1, "#606060", "#404040", 0, tank.height, 3, tank.height, false, "#80ccff", "#80ccff")
		];
	},

	neutralizerEMP: function (tank) {
		tank.gunSfx = "./assets/gun_nemp_3.mp3";
		tank.weaponClass = "neutralizerEMP";
		return [
			// new Gun(tank, -tank.height * 0.5, -tank.height * 0.5, tank.width, tank.height, "#606060", "#404040", 0, tank.height, 3, tank.height, false, "#80ccff", "#80ccff"),
			// new Gun(tank, 0, -tank.height * 0.05, tank.width * 0.8, tank.height * 0.1, "#606060", "#404040", 0, tank.height, 3, tank.height, false, "#80ccff", "#80ccff")
		];
	},

	d360: function (tank) {
		tank.gunSfx = "./assets/gun_generic.wav";
		tank.weaponClass = "d360";

		var guns = [];

		var gunA = 10;

		for (var i = 0; i < gunA; i++) {
			guns.push(new Gun(tank, 0, (-tank.height * 0.15) / gunA, tank.width * 0.8, (tank.height * 0.3) / gunA, "#606060", "#404040", i * (360 / gunA), tank.height, 6, tank.height));
		}

		return guns;
	}
}


class MeterBar {
	constructor(x, y, width, height, bgColor, fillColor, value, maxValue) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.bgColor = bgColor;
		this.fillColor = fillColor;
		this.value = value;
		this.maxValue = maxValue;
	}

	draw(context) {
		var dValue = this.value;

		if (dValue < 0) {
			dValue = 0;
		}

		if (dValue > this.maxValue) {
			dValue = this.maxValue;
		}

		context.save();
		context.fillStyle = this.bgColor;
		context.beginPath();
		context.rect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
		context.fill();
		context.closePath();

		context.fillStyle = this.fillColor;
		context.beginPath();
		context.rect(this.x - this.width / 2, this.y - this.height / 2, (dValue / this.maxValue) * this.width, this.height);
		context.fill();
		context.closePath();
		context.restore();
	}
}

function drawMeterBar(context, x, y, width, height, bgColor, fillColor, value) {
	var dValue = clamp(0, 1, value);

	context.save();
	context.fillStyle = bgColor;
	context.beginPath();
	context.rect(x - width / 2, y - height / 2, width, height);
	context.fill();
	context.closePath();

	context.fillStyle = fillColor;
	context.beginPath();
	context.rect(x - width / 2, y - height / 2, dValue * width, height);
	context.fill();
	context.closePath();
	context.restore();
}

class NPCTank {
	constructor(x, y, width, height, color, bc, weapons = "basic", gunAngle = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.velX = 0;
		this.velY = 0;
		this.color = color;
		this.bc = bc;
		this.gunAngle = gunAngle;
		this.reloadDampener = 1;
		this.weapons = this.getWeaponsArray(weapons);
		this.weaponClass = weapons;
	}

	getWeaponsArray(weapons) {
		var newWeapons = tankWeapons[weapons];
		return newWeapons(this);
	}

	setWeapons(weapons) {
		var newWeapons = tankWeapons[weapons];
		this.weapons = newWeapons(this);
	}

	draw(context) {
		context.save();
		context.lineWidth = Math.min(this.height, this.width) * 0.1;

		context.save();
		context.translate(this.x + this.width / 2, this.y + this.height / 2);
		context.rotate(Math.atan2(this.velY, this.velX));
		context.fillStyle = this.color;
		context.strokeStyle = this.bc;
		context.beginPath();
		context.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, Math.min(this.height, this.width) * 0.15);
		// roundRect(context, -this.width / 2, -this.height / 2, this.width, this.height, Math.min(this.height, this.width) * 0.15);
		context.fill();
		context.stroke();
		context.closePath();
		context.restore();

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.draw(context);
		}

		// context.save();
		// context.translate(this.x + this.width / 2, this.y + this.height / 2);
		// context.rotate(this.gunAngle);
		context.fillStyle = this.color;
		context.strokeStyle = this.bc;
		context.beginPath();
		context.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
		// context.roundRect(-(this.width * 0.35), -(this.height * 0.35), this.height * 0.7, this.height * 0.7, this.height * 0.1);
		context.fill();
		context.stroke();
		context.closePath();
		// context.restore();
		context.restore();
	}
}

class TankPart {
	constructor(parent, x, y, width, height, maxHealth) {
		this.parent = parent;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.maxHealth = maxHealth;
		this.health = maxHealth;
		this.healthPC = 1;
	}

	update() {
		if (this.health < 0) {
			this.health = 0;
		}

		if (this.health > this.maxHealth) {
			this.health = this.maxHealth;
		}

		this.healthPC = clamp(0, 1, this.health / this.maxHealth);
	}

	draw(context) {
		context.save();
		context.translate(this.parent.x + this.parent.width / 2, this.parent.y + this.parent.height / 2);
		context.rotate(this.parent.bodyRotation);
		context.fillStyle = "#ff0000";
		context.fillRect(this.x, this.y, this.width, this.height);
		context.restore();
	}

	testCollision(bullets) {
		for (var i = 0; i < bullets.length; i++) {
			var bullet = bullets[i];

			var hitbox = getRectangleCorners({ x: (this.parent.x + this.parent.width / 2) + this.x - bullet.radius, y: (this.parent.y + this.parent.height / 2) + this.y - bullet.radius, width: this.width + bullet.radius * 2, height: this.height + bullet.radius * 2 }, this.parent.bodyRotation, { x: this.parent.x + this.parent.width / 2, y: this.parent.y + this.parent.height / 2 });

			if (pointToPolygonCollisionDetection(bullet, hitbox)) {
				this.health -= bullet.damage;
			}
		}
	}
}

class Player {
	constructor(x, y, width, height, color, bc, weapons = "basic", health = 1) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.gunSfx = "./assets/tank_shoot_test.wav";
		this.bc = bc;
		this.velX = 0;
		this.velY = 0;
		this.mass = ((this.width / 4) + (this.height / 4)) / (((this.width / 4) + 1) + ((this.height / 4) + 1));
		this.acceleration = 1;
		this.gunAngle = 0;
		this.tGunAngle = 0;
		this.bullets = [];
		this.reloadDampener = 1;
		this.coins = 5250;
		// this.coins = 0;
		this.tBodyRotation = 0;
		this.bodyRotation = 0;
		this.weapons = this.getWeaponsArray(weapons);
		this.weaponClass = weapons;
		this.maxHealth = (this.width + this.height) * 4;
		this.health = this.maxHealth * health;
		this.healthPC = this.health / this.maxHealth;
		this.lAngle = 0;

		this.movementMode = "default";

		this.engine = new TankPart(this, -this.width / 2, -this.height * 0.3, this.width * 0.2, this.height * 0.6, this.maxHealth * 1.1);
		this.lTread = new TankPart(this, -this.width / 2, -this.height * 0.5, this.width, this.height * 0.2, this.maxHealth * 1.2);
		this.rTread = new TankPart(this, -this.width / 2, this.height * 0.3, this.width, this.height * 0.2, this.maxHealth * 1.2);
	}

	get cx() {
		return this.x + (this.width / 2);
	}

	get cy() {
		return this.y + (this.height / 2);
	}

	getWeaponsArray(weapons) {
		var newWeapons = tankWeapons[weapons];
		return newWeapons(this);
	}

	setWeapons(weapons) {
		var newWeapons = tankWeapons[weapons];
		this.weapons = newWeapons(this);
	}

	reset() {
		this.bullets = [];
		this.health = this.maxHealth;
		this.velX = 0;
		this.velY = 0;
		this.tBodyRotation = 0;
		this.bodyRotation = 0;
		this.setWeapons(this.weaponClass);
		this.engine = new TankPart(this, -this.width / 2, -this.height * 0.3, this.width * 0.2, this.height * 0.6, this.maxHealth * 1.1);
		this.lTread = new TankPart(this, -this.width / 2, -this.height * 0.5, this.width, this.height * 0.2, this.maxHealth * 1.2);
		this.rTread = new TankPart(this, -this.width / 2, this.height * 0.3, this.width, this.height * 0.2, this.maxHealth * 1.2);
	}

	update() {
		this.gunAngle = lerpAngle(this.gunAngle, this.tGunAngle, 0.5);

		if (this.health < 0) {
			this.health = 0;
		}

		if (this.health > this.maxHealth) {
			this.health = this.maxHealth;
		}

		this.maxHealth = (this.width + this.height) * 4;
		this.mass = (this.width * this.height) / 4;

		this.healthPC = this.health / this.maxHealth;

		this.engine.update();

		this.lTread.update();

		this.rTread.update();

		// this.lTread.healthPC = 0.2;

		if (joystick.active == false) {
			var dir = 0;
			var dx = 0;
			var dy = 0;

			var turning = false;

			if (this.movementMode === "realistic") {
				var adjAcceleration = this.acceleration;

				if (keysDown["s"]) {
					dx = Math.cos(this.bodyRotation + degreesToRadians(180));
					dy = Math.sin(this.bodyRotation + degreesToRadians(180));
					dir = 1;
				}

				if (keysDown["w"]) {
					dx = Math.cos(this.bodyRotation);
					dy = Math.sin(this.bodyRotation);
					dir = 0;
				}

				if (keysDown["d"] && this.lTread.healthPC > 0.3/* && (Math.abs(this.velX) > 0.3 || Math.abs(this.velY) > 0.3)*/) {
					this.tBodyRotation += degreesToRadians(2);
					turning = true;
				}

				if (keysDown["a"] && this.rTread.healthPC > 0.3/* && (Math.abs(this.velX) > 0.3 || Math.abs(this.velY) > 0.3)*/) {
					this.tBodyRotation += degreesToRadians(-2);

					if (turning == true) {
						turning = false;
					} else {
						turning = true;
					}
				}

				if (turning == true) {
					adjAcceleration *= 0.7;
				}

				if (dx !== 0 || dy !== 0) {
					if (this.rTread.healthPC > 0.3 && this.lTread.healthPC > 0.3) {
						var directionToMove = Math.atan2(dy, dx);
						var vx = Math.cos(directionToMove);
						var vy = Math.sin(directionToMove);

						this.velX += vx * adjAcceleration * this.engine.healthPC;
						this.velY += vy * adjAcceleration * this.engine.healthPC;
					} else if (this.rTread.healthPC <= 0.3 && this.lTread.healthPC <= 0.3) {
						var directionToMove = Math.atan2(dy, dx);
						var vx = Math.cos(directionToMove);
						var vy = Math.sin(directionToMove);

						this.velX += vx * adjAcceleration * this.engine.healthPC * this.rTread.healthPC * this.lTread.healthPC;
						this.velY += vy * adjAcceleration * this.engine.healthPC * this.rTread.healthPC * this.lTread.healthPC;
						this.health -= Math.max(this.width, this.height) / 256;
					} else if (this.lTread.healthPC <= 0.3) {
						this.tBodyRotation += degreesToRadians(3 * ((dir - 0.5) * 2));
						var directionToMove = this.bodyRotation + degreesToRadians(180 * dir);

						var vx = Math.cos(directionToMove);
						var vy = Math.sin(directionToMove);

						this.velX += vx * adjAcceleration * this.engine.healthPC;
						this.velY += vy * adjAcceleration * this.engine.healthPC;
					} else if (this.rTread.healthPC <= 0.3) {
						this.tBodyRotation += degreesToRadians(-3 * ((dir - 0.5) * 2));
						var directionToMove = this.bodyRotation + degreesToRadians(180 * dir);

						var vx = Math.cos(directionToMove);
						var vy = Math.sin(directionToMove);

						this.velX += vx * adjAcceleration * this.engine.healthPC;
						this.velY += vy * adjAcceleration * this.engine.healthPC;
					}
				}
			} else {
				if (keysDown["w"]) {
					dy -= 1;
				}

				if (keysDown["a"]) {
					dx -= 1;
				}

				if (keysDown["s"]) {
					dy += 1;
				}

				if (keysDown["d"]) {
					dx += 1;
				}

				if (dx !== 0 || dy !== 0) {
					var angle = Math.atan2(dy, dx);
					var vx = Math.cos(angle);
					var vy = Math.sin(angle);

					this.velX += vx * this.engine.healthPC;
					this.velY += vy * this.engine.healthPC;
				}
			}
		} else {
			// alert(joystick.vx)
			this.velX += joystick.vx /* adjAcceleration * this.engine.healthPC*/;
			this.velY += joystick.vy /* adjAcceleration * this.engine.healthPC*/;
			if (joystick2.active == true) {
				this.tGunAngle = Math.atan2(joystick2.vy, joystick2.vx);
			}
		}

		// this.tBodyRotation = Math.atan2(this.velY / 2, this.velX / 2);

		this.bodyRotation = lerpAngle(this.bodyRotation, this.tBodyRotation, 0.5);

		if (this.movementMode === "default") {
			this.tBodyRotation = Math.atan2(this.velY / 2, this.velX / 2);
		}

		// if (keysDown["w"]) {
		// 	this.velY -= this.acceleration;
		// }

		// if (keysDown["a"]) {
		// 	this.velX -= this.acceleration;
		// }

		// if (keysDown["s"]) {
		// 	this.velY += this.acceleration;
		// }

		// if (keysDown["d"]) {
		// 	this.velX += this.acceleration;
		// }

		this.velX *= friction;
		this.velY *= friction;

		this.x += this.velX;
		this.y += this.velY;

		if (this.x < -1024) {
			this.x = -1024;
		}

		if (this.y < -1024) {
			this.y = -1024;
		}

		if (keysDown["u"] && this.cx > -992 && this.cx < -960 && this.cy > -992 && this.cy < -960) {
			secretUnlocked = true;
		}

		if (this.x + this.width > 1024) {
			if (secretUnlocked == true) {
				if (this.y + this.height > -1024 + this.height) {
					if (this.x < 1056) {
						this.x = 1024 - Math.sign(1024 - this.x) * this.width;
					}
				}
			} else {
				this.x = 1024 - this.width;
			}
		}

		if (this.y + this.height > 1024) {
			this.y = 1024 - this.height;
		}

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.update(mouse.down);
		}

		for (var i = 0; i < this.bullets.length; i++) {
			var bullet = this.bullets[i];

			if (devMode == false) {
				bullet.update();
			}

			if (bullet.health <= 0 || bullet.x < (-1024 - bullet.radius) || bullet.y < (-1024 - bullet.radius) || bullet.x > (1024 + bullet.radius) || bullet.y > (1024 + bullet.radius)) {
				this.bullets.splice(i, 1);
				i--;
			}
		}

		if (this.engine.healthPC < 1) {
			var engineSmokeSpawn = getRotatedPoint({ x: this.x, y: this.y + this.height / 2 }, this.bodyRotation, { x: this.x + this.width / 2, y: this.y + this.height / 2 });
			var particleSizeMin = (Math.max(this.width, this.height) / 8) * clamp(0.5, 1, Math.abs(this.velX) + Math.abs(this.velY));
			var particleSizeMax = Math.max(this.width, this.height) * clamp(0.7, 1, Math.abs(this.velX) + Math.abs(this.velY));
			// alert(particleAmnt)
			var engineSmoke = new DirectionalParticleSpawner(pgPhy, engineSmokeSpawn.x, engineSmokeSpawn.y, 0, { min: particleSizeMin, max: particleSizeMax }, { min: (Math.abs(this.velX) + Math.abs(this.velY)) + 2, max: (Math.abs(this.velX) + Math.abs(this.velY)) * 1.25 + 4 }, 1, ["#80808020", "#60606020"], { min: this.bodyRotation + degreesToRadians(-150), max: this.bodyRotation + degreesToRadians(150) }, 0, 0, { min: 10, max: 30 });
			engineSmoke.activate();
		}
	}

	draw(context) {
		context.save();
		context.lineWidth = Math.min(this.height, this.width) * 0.1;

		// this.lAngle = lerp(this.lAngle, Math.atan2(this.velY / 2, this.velX / 2), 0.5);

		context.save();
		context.translate(this.x + this.width / 2, this.y + this.height / 2);
		context.rotate(this.bodyRotation);
		// context.rotate(this.lAngle);
		context.fillStyle = this.color;
		context.strokeStyle = this.bc;
		context.beginPath();
		context.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, Math.min(this.height, this.width) * 0.15);
		// roundRect(context, -this.width / 2, -this.height / 2, this.width, this.height, Math.min(this.height, this.width) * 0.15);
		context.fill();
		context.stroke();
		context.closePath();

		if (this.healthPC < 0.3) {
			draw.image(damagedImage03, -this.width / 2, -this.height / 2, this.width, this.height);
		} else if (this.healthPC < 0.6) {
			draw.image(damagedImage02, -this.width / 2, -this.height / 2, this.width, this.height);
		} else if (this.healthPC < 0.8) {
			draw.image(damagedImage01, -this.width / 2, -this.height / 2, this.width, this.height);
		}

		context.restore();

		for (var i = 0; i < this.bullets.length; i++) {
			var bullet = this.bullets[i];

			bullet.draw(context);
		}

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.draw(context);
		}

		context.fillStyle = this.color;
		context.strokeStyle = this.bc;
		context.beginPath();
		context.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
		context.fill();
		context.stroke();
		context.closePath();

		// context.fillStyle = this.color;
		// context.strokeStyle = this.bc;
		// context.save();
		// context.translate(this.x + this.width / 2, this.y + this.height / 2);
		// context.rotate(this.gunAngle);
		// context.beginPath();
		// context.roundRect(-(this.width * 0.3), -(this.height * 0.35), this.width * 0.6, this.height * 0.7, Math.min(this.height, this.width) * 0.15);
		// context.fill();
		// context.stroke();
		// context.closePath();
		// context.restore();

		context.save();
		context.translate(this.x + this.width / 2, this.y + this.height / 2);
		context.rotate(this.gunAngle);
		if (this.healthPC < 0.6) {
			draw.image(damagedImage04, -Math.min(this.width, this.height) / 2, -Math.min(this.width, this.height) / 2, Math.min(this.width, this.height), Math.min(this.width, this.height));
		}
		context.restore();

		if (this.healthPC < 1) {
			drawMeterBar(context, this.x + (this.width / 2), this.y + (this.height * 1.2), this.width, this.height * 0.2, "#000000", "#00ff00", this.healthPC);
		}

		if (this.lTread.healthPC < 1) {
			drawMeterBar(context, this.x + (this.width * 0.15), this.y + (this.height * 1.4), this.width * 0.3, this.height * 0.1, "#000000", "#00ffff", this.lTread.healthPC);
		}

		if (this.engine.healthPC < 1) {
			drawMeterBar(context, this.x + (this.width / 2), this.y + (this.height * 1.4), this.width * 0.3, this.height * 0.1, "#000000", "#ffff00", this.engine.healthPC);
		}

		if (this.rTread.healthPC < 1) {
			drawMeterBar(context, this.x + (this.width * 0.85), this.y + (this.height * 1.4), this.width * 0.3, this.height * 0.1, "#000000", "#00ffff", this.rTread.healthPC);
		}

		// this.lTread.draw(context);
		// this.engine.draw(context);
		// this.rTread.draw(context);

		context.restore();
	}
}

class AITank {
	constructor(x, y, width, height, color, bc, weapons = "basic", health = 1, ai = true, moveable = true, canShoot = true, type = "b") {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.type = type;
		this.bc = bc;
		this.shouldMove = true;
		this.velX = 0;
		this.velY = 0;
		this.mass = ((this.width / 4) + (this.height / 4)) / (((this.width / 4) + 1) + ((this.height / 4) + 1));
		this.acceleration = 0.8;
		this.gunAngle = 0;
		this.weapons = this.getWeaponsArray(weapons);
		this.weaponClass = weapons;
		this.bullets = [];
		this.maxHealth = (this.width + this.height) * 4;
		this.health = this.maxHealth * health;
		this.healthPC = this.health / this.maxHealth;
		this.reloadDampener = 1;
		this.ai = ai;
		this.canMove = moveable;
		this.canShoot = canShoot;
	}

	getWeaponsArray(weapons) {
		var newWeapons = tankWeapons[weapons];
		return newWeapons(this);
	}

	setWeapons(weapons) {
		var newWeapons = tankWeapons[weapons];
		this.weapons = newWeapons(this);
	}

	calculateAwayFromWallsAngle(obstacles) {
		var avoidRadius = ((this.width + this.height) / 2) * 2.75;

		var totalAvoidanceAngle = new Vector2(0, 0);

		for (var obstacle of obstacles) {
			var dx = (obstacle.x + (obstacle.width / 2)) - (this.x + (this.width / 2));
			var dy = (obstacle.y + (obstacle.height / 2)) - (this.y + (this.height / 2));
			var distance = Math.sqrt(dx * dx + dy * dy);

			if (rectangleToCircleCollisionDetection(obstacle, { x: this.x + (this.width / 2), y: this.y + (this.height / 2), radius: avoidRadius }) == true) {
				var angleAwayFromWalls = new Vector2(-dx, -dy);

				var wallAvoidRadius = (Math.max(obstacle.width, obstacle.height) * 2.2) + 1;

				// var avoidanceStrength = 1 - (distance / avoidRadius) + 1;
				var avoidanceStrength = clamp(0, 1, 1 - (distance / wallAvoidRadius));
				// var avoidanceStrength = (distance / avoidRadius);

				angleAwayFromWalls = Vector2.normalize(angleAwayFromWalls);
				angleAwayFromWalls = Vector2.multiplyScalar(angleAwayFromWalls, avoidanceStrength);

				totalAvoidanceAngle = Vector2.add(totalAvoidanceAngle, angleAwayFromWalls);
			}
		}

		// for (var obstacle of obstacles) {
		// 	var dx = (obstacle.x + (obstacle.width / 2)) - (this.x + (this.width / 2));
		// 	var dy = (obstacle.y + (obstacle.height / 2)) - (this.y + (this.height / 2));
		// 	var distance = Math.sqrt(dx * dx + dy * dy);

		// 	if (distance < avoidRadius) {
		// 		totalWalls++;

		// 		avX += obstacle.x + (obstacle.width / 2);
		// 		avY += obstacle.y + (obstacle.height / 2);
		// 	}
		// }

		// avX = avX / totalWalls;
		// avY = avY / totalWalls;

		// var dx = avX - (this.x + (this.width / 2));
		// var dy = avY - (this.y + (this.height / 2));

		// totalAvoidanceAngle = new Vector2(-dx, -dy);

		// console.log(Vector2.normalize(totalAvoidanceAngle));
		this.testV = totalAvoidanceAngle;
		return totalAvoidanceAngle;
	}

	update(enemyTarget = { x: 0, y: 0, width: 32, height: 32, velX: 0, velY: 0 }, moveToward = { x: 0, y: 0, width: 32, height: 32, velX: 0, velY: 0 }, shoot = true, obstacles = [], infoMapVar) {
		this.maxHealth = (this.width + this.height) * 4;
		this.mass = (this.width * this.height) / 4;

		if (this.health < 0) {
			this.health = 0;
		}

		if (this.health > this.maxHealth) {
			this.health = this.maxHealth;
		}

		this.healthPC = this.health / this.maxHealth;

		if (this.ai) {
			var enemyAttackAngle = Math.atan2((enemyTarget.y + enemyTarget.height / 2 + (enemyTarget.velY * 2)) - (this.y + this.height / 2), (enemyTarget.x + enemyTarget.width / 2 + (enemyTarget.velX * 2)) - (this.x + this.width / 2));
			// var moveAngle = Math.atan2((moveToward.y + moveToward.height / 2 + (moveToward.velY * 2)) - (this.y + this.height / 2), (moveToward.x + moveToward.width / 2 + (moveToward.velX * 2)) - (this.x + this.width / 2));

			var enemyAttackVector = new Vector2((enemyTarget.x + (enemyTarget.width / 2)) - (this.x + (this.width / 2)),);
			var moveVector = new Vector2((moveToward.x + (moveToward.width / 2)) - (this.x + (this.width / 2)), (moveToward.y + (moveToward.height / 2)) - (this.y + (this.height / 2)));

			var nMV = Vector2.normalize(moveVector);

			var avoidV = new Vector2(0, 0);

			if (obstacles.length > 0) {
				avoidV = this.calculateAwayFromWallsAngle(obstacles);
				// avoidV = Vector2.multiplyScalar(avoidV, 4);
			}

			// var avoidV = enemyTarget.gunAngle;

			this.gunAngle = enemyAttackAngle;

			// var avoidV = -Math.atan2(mouse.y - (this.y + this.height / 2), mouse.x - (this.x + this.width / 2));

			if (this.canMove && this.shouldMove) {
				// var finalAngle = moveAngle + this.pOffset;
				var finalAngle = Vector2.normalize(Vector2.add(avoidV, nMV));
				if (distAB({ x: this.x + (this.width / 2), y: this.y + (this.height / 2) }, { x: moveToward.x + (moveToward.width / 2), y: moveToward.y + (moveToward.height / 2) }) > (Math.max(moveToward.width, moveToward.height) + Math.max(this.width, this.height)) * 2) {
					this.velX += (finalAngle.x * this.acceleration);
					this.velY += (finalAngle.y * this.acceleration);
				}

				this.velX *= friction;
				this.velY *= friction;

				this.x += this.velX;
				this.y += this.velY;
			}
		}

		if (this.x < -1024) {
			this.x = -1024;
		}

		if (this.y < -1024) {
			this.y = -1024;
		}

		if (this.x + this.width > 1024) {
			this.x = 1024 - this.width;
		}

		if (this.y + this.height > 1024) {
			this.y = 1024 - this.height;
		}

		if (this.ai && this.canShoot) {
			for (var i = 0; i < this.weapons.length; i++) {
				var weapon = this.weapons[i];

				weapon.update(shoot);
			}
		}

		for (var i = 0; i < this.bullets.length; i++) {
			var bullet = this.bullets[i];

			bullet.update();

			if (bullet.health <= 0 || bullet.x < (-1024 - bullet.radius) || bullet.y < (-1024 - bullet.radius) || bullet.x > (1024 + bullet.radius) || bullet.y > (1024 + bullet.radius)) {
				this.bullets.splice(i, 1);
				i--;
			}
		}
	}

	draw(context) {
		context.save();
		context.lineWidth = Math.min(this.height, this.width) * 0.1;

		if (this.canMove) {
			context.save();
			context.translate(this.x + this.width / 2, this.y + this.height / 2);
			context.rotate(Math.atan2(this.velY, this.velX));
			context.fillStyle = this.color;
			context.strokeStyle = this.bc;
			context.beginPath();
			context.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, Math.min(this.height, this.width) * 0.15);
			// roundRect(context, -this.width / 2, -this.height / 2, this.width, this.height, Math.min(this.height, this.width) * 0.15);
			context.fill();
			context.stroke();
			context.closePath();

			if (this.healthPC < 0.3) {
				draw.image(damagedImage03, -this.width / 2, -this.height / 2, this.width, this.height);
			} else if (this.healthPC < 0.6) {
				draw.image(damagedImage02, -this.width / 2, -this.height / 2, this.width, this.height);
			} else if (this.healthPC < 0.8) {
				draw.image(damagedImage01, -this.width / 2, -this.height / 2, this.width, this.height);
			}
			context.restore();
		}

		for (var i = 0; i < this.bullets.length; i++) {
			var bullet = this.bullets[i];

			bullet.draw(context);
		}

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.draw(context);
		}

		if (this.type === "md") {
			context.fillStyle = "#ffffff";
			context.strokeStyle = "#808080";
			context.beginPath();
			context.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
			context.fill();
			context.stroke();
			context.closePath();
		} else {
			context.fillStyle = this.color;
			context.strokeStyle = this.bc;
			context.beginPath();
			context.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
			context.fill();
			context.stroke();
			context.closePath();
		}

		if (this.type === "md") {
			context.fillStyle = "#ff0000";
			context.save();
			context.translate(this.x + (this.width / 2), this.y + (this.height / 2));
			context.rotate(this.gunAngle);
			context.beginPath();
			context.rect(-(Math.min(this.height, this.width) * 0.35) / 2, -Math.min(this.height, this.width) * 0.05, Math.min(this.height, this.width) * 0.35, Math.min(this.height, this.width) * 0.1);
			context.fill();
			context.closePath();
			context.beginPath();
			context.rect(-Math.min(this.height, this.width) * 0.05, -(Math.min(this.height, this.width) * 0.35) / 2, Math.min(this.height, this.width) * 0.1, Math.min(this.height, this.width) * 0.35);
			context.fill();
			context.closePath();
			context.restore();
		}

		// context.fillStyle = "#00ff00";
		// context.fillText(this.testV.x + " : " + this.testV.y, this.x, this.y);

		context.save();
		context.translate(this.x + this.width / 2, this.y + this.height / 2);
		context.rotate(this.gunAngle);
		if (this.healthPC < 0.6) {
			draw.image(damagedImage04, -Math.min(this.width, this.height) / 2, -Math.min(this.width, this.height) / 2, Math.min(this.width, this.height), Math.min(this.width, this.height));
		}
		context.restore();

		if (this.health < this.maxHealth) {
			drawMeterBar(context, this.x + (this.width / 2), this.y + (this.height * 1.2), this.width, this.height * 0.2, "#000000", "#00ff00", this.health / this.maxHealth);
		}
		context.restore();
	}
}

class HealthStation {
	constructor(x, y, width, height, color, bc, crossColor, weapons = "basic", gunAngle = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.bc = bc;
		this.crossColor = crossColor;
		this.gunAngle = gunAngle;
		this.weapons = this.getWeaponsArray(weapons);
		this.weaponClass = weapons;
		this.reloadDampener = 5;
	}

	getWeaponsArray(weapons) {
		var newWeapons = tankWeapons[weapons];
		return newWeapons(this);
	}

	setWeapons(weapons) {
		var newWeapons = tankWeapons[weapons];
		this.weapons = newWeapons(this);
	}

	update(infoMapVar) {
		if (this.curReloadTime > 0) {
			this.curReloadTime--;
		}

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];
			weapon.update(true, true, infoMapVar);
		}
	}

	draw(context) {
		context.save();
		context.lineWidth = Math.min(this.height, this.width) * 0.1;

		context.fillStyle = this.color;
		context.strokeStyle = this.bc;
		context.beginPath();
		context.roundRect(this.x, this.y, this.width, this.height, Math.min(this.height, this.width) * 0.15);
		// roundRect(context, this.x, this.y, this.width, this.height, Math.min(this.height, this.width) * 0.15);
		context.fill();
		context.stroke();
		context.closePath();

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.draw(context);
		}

		context.fillStyle = this.color;
		context.beginPath();
		context.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
		context.fill()
		context.stroke();
		context.closePath();

		context.fillStyle = this.crossColor;
		context.save();
		context.translate(this.x + (this.width / 2), this.y + (this.height / 2));
		context.beginPath();
		context.rect(-(Math.min(this.height, this.width) * 0.35) / 2, -Math.min(this.height, this.width) * 0.05, Math.min(this.height, this.width) * 0.35, Math.min(this.height, this.width) * 0.1);
		context.fill();
		context.closePath();
		context.beginPath();
		context.rect(-Math.min(this.height, this.width) * 0.05, -(Math.min(this.height, this.width) * 0.35) / 2, Math.min(this.height, this.width) * 0.1, Math.min(this.height, this.width) * 0.35);
		context.fill();
		context.closePath();
		context.restore();
		context.restore();
	}

	// shoot(infoMapVar) {
	// 	for (var i = 0; i < this.weapons.length; i++) {
	// 		var gun = this.weapons[i];

	// 		if (gun.isADetail) {
	// 			continue;
	// 		}

	// 		var shouldShoot = gun.update(true, true);

	// 		if (shouldShoot) {
	// 			var bulletSpeed = (this.width + this.height) * 0.15;

	// 			var gunAngle = this.gunAngle + gun.rotation + degreesToRadians(random(-gun.spread, gun.spread));

	// 			var bulletVel = new Vector2(Math.cos(gunAngle) * ((gun.bulletSpeed / 2) + bulletSpeed), Math.sin(gunAngle) * ((gun.bulletSpeed / 2) + bulletSpeed));

	// 			var spawnPoint = getRotatedPoint(new Vertex2(this.x + (this.width / 2) + gun.x + (gun.width - (gun.height / 2)), this.y + (this.height / 2) + gun.y + (gun.height / 2)), gunAngle, new Vertex2(this.x + (this.width / 2), this.y + (this.height / 2)));

	// 			infoMapVar.createPickup(spawnPoint.x - (gun.height / 2), spawnPoint.y - (gun.height / 2), gun.height, gun.height, bulletVel.x, bulletVel.y, "healthkit");
	// 		}
	// 	}
	// }
}

class Gun {
	constructor(parent, x, y, width, height, color, bc, rotation, bulletHealth, bulletSpeed, bulletDamage, isADetail = false, reloadAni = true, reloadTime = 60, delay = 0, spread = 0, bulletColor = "default", bulletBC = "default") {
		this.parent = parent;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.bc = bc;
		this.rotation = degreesToRadians(rotation);
		this.bulletHealth = bulletHealth;
		this.bulletSpeed = bulletSpeed;
		this.bulletDamage = bulletDamage;
		this.isADetail = isADetail;
		this.reloadAni = reloadAni;
		this.reloadTime = reloadTime;
		this.curReloadTime = 0;
		this.delay = delay;
		this.curDelay = delay;
		this.spread = spread;
		this.bulletColor = bulletColor;
		this.bulletBC = bulletBC;
	}

	update(shoot, ishs = false, infoMapVar) {
		if (ishs) {
			if (this.curReloadTime > 0) {
				this.curReloadTime--;
			}

			if (shoot) {
				if (this.curDelay > 0) {
					this.curDelay--;
				}

				if (this.curReloadTime <= 0 && this.curDelay <= 0) {
					this.shoot(true, infoMapVar);
					this.curReloadTime = this.reloadTime * this.parent.reloadDampener;
				}
			} else {
				this.curDelay = this.delay * this.parent.reloadDampener;
			}

			return;
		}

		if (this.curReloadTime > 0) {
			this.curReloadTime--;
		}

		if (shoot) {
			if (this.curDelay > 0) {
				this.curDelay--;
			}

			if (this.curReloadTime <= 0 && this.curDelay <= 0) {
				this.shoot(false);
				this.curReloadTime = this.reloadTime * this.parent.reloadDampener;
			}
		} else {
			this.curDelay = this.delay * this.parent.reloadDampener;
		}
	}

	draw(context) {
		context.save();
		context.translate(this.parent.x + this.parent.width / 2, this.parent.y + this.parent.height / 2);
		context.rotate(this.parent.gunAngle + this.rotation);
		context.fillStyle = this.color;
		context.strokeStyle = this.bc;
		context.beginPath();
		if (this.reloadAni == true) {
			context.roundRect(this.x, this.y, this.width - ((this.curReloadTime / (this.reloadTime * this.parent.reloadDampener)) * Math.min(this.parent.height, this.parent.width) * 0.05), this.height, this.parent.height * 0.07);
			// roundRect(context, this.x, this.y, this.width - ((this.curReloadTime / (this.reloadTime * this.parent.reloadDampener)) * Math.min(this.parent.height, this.parent.width) * 0.05), this.height, this.parent.height * 0.07);
		} else {
			context.roundRect(this.x, this.y, this.width, this.height, this.parent.height * 0.07);
			// roundRect(context, this.x, this.y, this.width, this.height, this.parent.height * 0.07);
		}
		context.stroke();
		context.fill();
		context.closePath();
		context.restore();
	}

	shoot(ishs = false, infoMapVar) {
		if (this.isADetail || this.curReloadTime > 0 || this.curDelay > 0) {
			return;
		}

		if (ishs) {
			var bulletSpeed = (this.parent.width + this.parent.height) * 0.15;

			var gunAngle = this.parent.gunAngle + this.rotation + degreesToRadians(random(-this.spread, this.spread));

			var bulletVel = new Vector2(Math.cos(gunAngle) * ((this.bulletSpeed / 2) + bulletSpeed), Math.sin(gunAngle) * ((this.bulletSpeed / 2) + bulletSpeed));

			var spawnPoint = getRotatedPoint(new Vertex2(this.parent.x + (this.parent.width / 2) + this.x + (this.width - (this.height / 2)), this.parent.y + (this.parent.height / 2) + this.y + (this.height / 2)), gunAngle, new Vertex2(this.parent.x + (this.parent.width / 2), this.parent.y + (this.parent.height / 2)));

			infoMapVar.createPickup(spawnPoint.x - (this.height / 2), spawnPoint.y - (this.height / 2), this.height, this.height, bulletVel.x, bulletVel.y, "healthkit");

			return;
		}

		// alert()

		// var audioS = new Audio("./assets/tank_shoot_test.wav");
		// audioS.play();

		var particleSpeed = this.width + this.height;

		var gunAngle = this.parent.gunAngle + this.rotation + degreesToRadians(random(-this.spread, this.spread));

		var bulletVel = new Vector2(Math.cos(gunAngle) * this.bulletSpeed, Math.sin(gunAngle) * this.bulletSpeed);

		var spawnPoint = getRotatedPoint(new Vertex2(this.parent.x + (this.parent.width / 2) + this.x + (this.width - (this.height / 2)), this.parent.y + (this.parent.height / 2) + this.y + (this.height / 2)), gunAngle, new Vertex2(this.parent.x + (this.parent.width / 2), this.parent.y + (this.parent.height / 2)));


		// parent, x, y, radius, color, bc, velX, velY, health, speed, damage
		if (this.bulletColor !== "default" && this.bulletBC !== "default") {
			this.parent.bullets.push(new Bullet(this.parent, spawnPoint.x, spawnPoint.y, this.height / 2, this.bulletColor, this.bulletBC, bulletVel.x, bulletVel.y, this.bulletHealth, this.bulletSpeed, this.bulletDamage));
		} else {
			this.parent.bullets.push(new Bullet(this.parent, spawnPoint.x, spawnPoint.y, this.height / 2, this.parent.color, this.parent.bc, bulletVel.x, bulletVel.y, this.bulletHealth, this.bulletSpeed, this.bulletDamage));
		}

		var particleS = new DirectionalParticleSpawner(pgPhy, spawnPoint.x, spawnPoint.y, this.height / 2, { min: this.height / 8, max: this.height / 3 }, { min: (this.bulletSpeed * 0.6), max: (this.bulletSpeed * 1.6) }, 10, ["#ffdd20"], /*17,*/ { min: gunAngle, max: gunAngle }, this.parent.velX, this.parent.velY, { min: 10, max: 30 });
		particleS.activate();
	}
}

class Bullet {
	constructor(parent, x, y, radius, color, bc, velX, velY, health, speed, damage) {
		this.parent = parent;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.bc = bc;
		this.velX = velX;
		this.velY = velY;
		this.damage = damage;
		this.speed = speed;
		this.health = health;
	}

	update() {
		this.x += this.velX;
		this.y += this.velY;
	}

	draw(context) {
		context.save();
		context.lineWidth = context.lineWidth * 1.1;
		context.fillStyle = this.color;
		context.strokeStyle = this.bc;
		context.beginPath();
		context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		context.stroke();
		context.fill();
		context.closePath();
		context.restore();
	}
}

var enemies = [];
var allies = [];

var pgPhy = new PgPhysics(scene, ctx);

function spawnAlly(x = snapNumberToGrid(random(-1024, 1024), 32), y = snapNumberToGrid(random(-1024, 1024), 32), width = 32, height = 32, color = "#0000ff", bc = "#000080", weapons = "basic", health = 1, ai = true, moveable = true, canShoot = true) {
	for (var i = 0; i < infoMap.walls.length; i++) {
		if (rectangleToRectangleCollisionDetection({ x: x, y: y, width: width, height: height }, infoMap.walls[i])) {
			return;
		}
	}

	allies.push(new AITank(x, y, width, height, color, bc, weapons, health, ai, moveable, canShoot));
}

function spawnTeammate(x = snapNumberToGrid(random(-1024, 1024), 32), y = snapNumberToGrid(random(-1024, 1024), 32), width = 32, height = 32, color = "#00ff00", bc = "#008000", weapons = "basic", health = 1, ai = true, moveable = true, canShoot = true) {
	for (var i = 0; i < infoMap.walls.length; i++) {
		if (rectangleToRectangleCollisionDetection({ x: x, y: y, width: width, height: height }, infoMap.walls[i])) {
			return;
		}
	}

	allies.push(new AITank(x, y, width, height, color, bc, weapons, health, ai, moveable, canShoot, "tm"));
}

function spawnMedic(x = snapNumberToGrid(random(-1024, 1024), 32), y = snapNumberToGrid(random(-1024, 1024), 32), width = 32, height = 32, color = "#00ff00", bc = "#008000", weapons = "basic", health = 1, ai = true, moveable = true, canShoot = true) {
	for (var i = 0; i < infoMap.walls.length; i++) {
		if (rectangleToRectangleCollisionDetection({ x: x, y: y, width: width, height: height }, infoMap.walls[i])) {
			return;
		}
	}

	allies.push(new AITank(x, y, width, height, color, bc, weapons, health, ai, moveable, canShoot, "md"));
}

function spawnEnemy(checkCol = true, x = snapNumberToGrid(random(-1024, 1024), 32), y = snapNumberToGrid(random(-1024, 1024), 32), width = 32, height = 32, color = "#ff0000", bc = "#800000", weapons = "basic", health = 1, ai = true, moveable = true, canShoot = true) {
	if (checkCol == true) {
		for (var i = 0; i < infoMap.walls.length; i++) {
			if (rectangleToRectangleCollisionDetection({ x: x, y: y, width: width, height: height }, infoMap.walls[i])) {
				return;
			}
		}
	}

	enemies.push(new AITank(x, y, width, height, color, bc, weapons, health, ai, moveable, canShoot));
}

class Info_Map {
	constructor(gridSize) {
		this.gridSize = gridSize;
		this.walls = [];
		this.pickups = [];
		this.healthStations = [];
		this.dummies = [];
		this.images = [];
		this.hs = [];
		this.dm = [];
		this.spawners = [];
		this.playerStart = {
			x: -16,
			y: -16,
			width: 32,
			height: 32,
			active: true
		};
	}

	setPlayerStart(x, y, width = 32, height = 32) {
		this.playerStart.x = x;
		this.playerStart.y = y;
		this.playerStart.width = width;
		this.playerStart.height = height;
	}

	createWall(x, y, width, height, color, bc, type = "") {
		this.walls.push({
			x: x,
			y: y,
			width: width,
			height: height,
			color: color,
			bc: bc,
			type: type
		});
	}

	createImage(x, y, width, height, image) {
		this.images.push({
			x: x,
			y: y,
			width: width,
			height: height,
			image: image
		});
	}

	createPickup(x, y, width, height, velX, velY, type = "") {
		this.pickups.push({
			x: x,
			y: y,
			width: width,
			height: height,
			velX: velX,
			velY: velY,
			type: type
		});
	}

	createSpawner(x, y, radius, spawnTankType = "t", spawnTime = 60, spawnAmount = 1) {
		this.spawners.push({
			x: x,
			y: y,
			radius: radius,
			spawnTankType: spawnTankType,
			spawnTime: spawnTime,
			spawnAmount: spawnAmount,
			curSpawnTime: spawnTime
		});
	}

	createDummy(x, y, width, height, color, bc, weapons, gunAngle) {
		this.dummies.push(new NPCTank(x, y, width, height, color, bc, weapons, gunAngle));
		this.dm.push({ x: x, y: y, width: width, height: height, color: color, bc: bc, weapons: weapons, gunAngle: gunAngle });
	}

	createHealthStation(x, y, width, height, color, bc, crossColor, weapons = "basic", gunAngle) {
		this.healthStations.push(new HealthStation(x, y, width, height, color, bc, crossColor, weapons, gunAngle));
		this.hs.push({ x: x, y: y, width: width, height: height, color: color, bc: bc, crossColor: crossColor, weapons: weapons });
	}

	load(map, clearMap = true, offsetX = 0, offsetY = 0, gridSize = this.gridSize) {
		var tileOffsetX = -1024 + offsetX;
		var tileOffsetY = -1024 + offsetY;

		if (clearMap == true) {
			this.walls = [];
		}

		for (var i = 0; i < map.length; i++) {
			for (var j = 0; j < map[i].length; j++) {
				if (map[i][j] === 1) {
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "#808080", "#606060", 1);
				}

				if (map[i][j] === 2) {
					this.createPickup(tileOffsetX + (gridSize / 2) - 16, tileOffsetY + (gridSize / 2) - 16, 32, 32, 0, 0, "healthkit");
				}

				if (map[i][j] === 2.5) {
					this.createPickup(tileOffsetX + (gridSize / 2) - 16, tileOffsetY + (gridSize / 2) - 16, 32, 32, 0, 0, "repairkit");
				}

				if (map[i][j] === 3) {
					this.createHealthStation(tileOffsetX + (gridSize / 4), tileOffsetY + (gridSize / 4), gridSize / 2, gridSize / 2, "#ff0000", "#800000", "#ffffff", "basic", 0);
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "#808080", "#606060", 1);
				}

				if (map[i][j] === 3.25) {
					this.createHealthStation(tileOffsetX + (gridSize / 4), tileOffsetY + (gridSize / 4), gridSize / 2, gridSize / 2, "#ff0000", "#800000", "#ffffff", "basic", degreesToRadians(90));
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "#808080", "#606060", 1);
				}

				if (map[i][j] === 3.5) {
					this.createHealthStation(tileOffsetX + (gridSize / 4), tileOffsetY + (gridSize / 4), gridSize / 2, gridSize / 2, "#ff0000", "#800000", "#ffffff", "basic", degreesToRadians(180));
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "#808080", "#606060", 1);
				}

				if (map[i][j] === 3.75) {
					this.createHealthStation(tileOffsetX + (gridSize / 4), tileOffsetY + (gridSize / 4), gridSize / 2, gridSize / 2, "#ff0000", "#800000", "#ffffff", "basic", degreesToRadians(-90));
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "#808080", "#606060", 1);
				}

				if (map[i][j] === 4) {
					this.createWall(tileOffsetX, tileOffsetY, gridSize * 3, gridSize * 3, "transparent", "transparent", 2);
					this.createDummy(tileOffsetX + (gridSize * 1.5), tileOffsetY + (gridSize * 1.5), 32, 32, "#00ffff", "#008080", "shotgun", degreesToRadians(190));
					this.createImage(tileOffsetX, tileOffsetY, gridSize * 3, gridSize * 3, workshopImage);
				}

				if (map[i][j] === 5) {
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "transparent", "transparent", 1);
				}

				if (map[i][j] === 6) {
					this.setPlayerStart(tileOffsetX, tileOffsetY, 32, 32);
				}

				if (map[i][j] === 7) {
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "#dddddd", "#aaaaaa", 3);
				}

				if (map[i][j] === 8) {
					this.createSpawner(tileOffsetX + (gridSize / 2), tileOffsetY + (gridSize / 2), gridSize / 2, "e", 180, 1);
				}

				if (map[i][j] === 9) {
					this.createSpawner(tileOffsetX + (gridSize / 2), tileOffsetY + (gridSize / 2), gridSize / 2, "a", 180, 1);
				}

				if (map[i][j] === 10) {
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "#606060", "#454545", 4);
				}

				tileOffsetX += gridSize;
			}

			tileOffsetX = -1024 + offsetX;
			tileOffsetY += gridSize;
		}

		tileOffsetX = -1024 + offsetX;
		tileOffsetY = -1024 + offsetY;
	}

	update() {
		for (var i = 0; i < this.healthStations.length; i++) {
			var healthStation = this.healthStations[i];
			healthStation.update(this);
		}

		if (this.pickups.length > 30) {
			this.pickups.splice(0, 1);
		}

		for (var i = 0; i < this.pickups.length; i++) {
			var pickup = this.pickups[i];

			pickup.velX *= friction;
			pickup.velY *= friction;

			pickup.x += pickup.velX;
			pickup.y += pickup.velY;
		}

		for (var i = 0; i < this.spawners.length; i++) {
			var spawner = this.spawners[i];

			spawner.curSpawnTime--;

			if (spawner.curSpawnTime <= 0) {
				spawner.curSpawnTime = spawner.spawnTime;
				var randomDir = random(-180, 180);

				var spawnX = spawner.x + (Math.cos(degreesToRadians(randomDir)) * random(0, spawner.radius));
				var spawnY = spawner.y + (Math.sin(degreesToRadians(randomDir)) * random(0, spawner.radius));

				if (spawner.spawnTankType === "e") {
					spawnEnemy(true, spawnX - 16, spawnY - 16);
				} else if (spawner.spawnTankType === "a") {
					spawnAlly(spawnX - 16, spawnY - 16);
				}
			}
		}
	}

	draw(context) {
		for (var i = 0; i < this.walls.length; i++) {
			var wall = this.walls[i];

			if (wall.type === 1) {
				context.save();
				context.lineWidth = ((wall.width / 4) + (wall.height / 4)) * 0.05;
				context.strokeStyle = wall.bc;
				context.fillStyle = wall.color;
				context.beginPath();
				context.rect(wall.x, wall.y, wall.width, wall.height);
				context.fill();
				context.stroke();
				context.closePath();
				context.restore();
			} else {
				context.save();
				context.lineWidth = ((wall.width / 4) + (wall.height / 4)) * 0.05;
				context.strokeStyle = wall.bc;
				context.fillStyle = wall.color;
				context.beginPath();
				context.rect(wall.x, wall.y, wall.width, wall.height);
				context.fill();
				context.stroke();
				context.closePath();
				context.restore();
			}

			if (wall.type === 2) {
				context.drawImage(workshopImage, wall.x, wall.y, wall.width, wall.height);
			}
		}

		for (var i = 0; i < this.images.length; i++) {
			var decal = this.images[i];

			context.drawImage(decal.image, decal.x, decal.y, decal.width, decal.height);
		}

		for (var i = 0; i < this.pickups.length; i++) {
			var pickup = this.pickups[i];

			if (pickup.type === "healthkit") {
				context.save();
				context.lineWidth = ((pickup.width / 4) + (pickup.height / 4)) * 0.05;
				context.fillStyle = "#ffffff";
				context.strokeStyle = "#000000";
				context.beginPath();
				context.rect(pickup.x, pickup.y, pickup.width, pickup.height);
				context.fill();
				context.stroke();
				context.closePath();

				context.fillStyle = "#ff0000";
				context.beginPath();
				context.rect(pickup.x + (pickup.width / 2) - (pickup.width * 0.1), pickup.y + (pickup.height * 0.1), pickup.width * 0.2, pickup.height * 0.8);
				context.fill();
				context.closePath();
				context.beginPath();
				context.rect(pickup.x + (pickup.width * 0.1), pickup.y + (pickup.height / 2) - (pickup.height * 0.1), pickup.width * 0.8, pickup.height * 0.2);
				context.fill();
				context.closePath();
				context.restore();
			} else if (pickup.type === "repairkit") {
				context.save();
				context.lineWidth = ((pickup.width / 4) + (pickup.height / 4)) * 0.05;
				context.fillStyle = "#ffffff";
				context.strokeStyle = "#000000";
				context.beginPath();
				context.rect(pickup.x, pickup.y, pickup.width, pickup.height);
				context.fill();
				context.stroke();
				context.closePath();

				context.fillStyle = "#0000ff";
				context.save();
				context.translate(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2);
				context.rotate(degreesToRadians(-45));
				context.fillRect(-pickup.width * 0.5, -pickup.height * 0.1, pickup.width * 0.7, pickup.height * 0.2);
				context.fillRect(pickup.width * 0.1, -pickup.height * 0.2, pickup.width * 0.3, pickup.height * 0.1);
				context.fillRect(pickup.width * 0.1, pickup.height * 0.1, pickup.width * 0.3, pickup.height * 0.1);
				// context.fillRect(pickup.x + pickup.width * 0.5, pickup.y + pickup.height * 0.18, pickup.width * 0.4, pickup.height * 0.15);
				context.restore();

				// context.fillStyle = "#0000ff";
				// context.beginPath();
				// context.rect(pickup.x + (pickup.width / 2) - (pickup.width * 0.1), pickup.y + (pickup.height * 0.1), pickup.width * 0.2, pickup.height * 0.8);
				// context.fill();
				// context.closePath();
				// context.beginPath();
				// context.rect(pickup.x + (pickup.width * 0.1), pickup.y + (pickup.height / 2) - (pickup.height * 0.1), pickup.width * 0.8, pickup.height * 0.2);
				// context.fill();
				// context.closePath();
				context.restore();
			}
		}

		for (var i = 0; i < this.healthStations.length; i++) {
			var healthStation = this.healthStations[i];
			healthStation.draw(context);
		}

		for (var i = 0; i < this.dummies.length; i++) {
			var dummy = this.dummies[i];

			dummy.draw(context);
		}
	}

	import() {
		var code = prompt("WARNING: Importing a map will wipe the current map. Import Code Here:");
		if (code) {
			var map = JSON.parse(code);
			this.healthStations = [];
			this.dummies = [];
			this.hs = map.hs;
			this.dm = map.dm;
			this.walls = map.walls;

			for (var i = 0; i < map.hs.length; i++) {
				var hs = map.hs[i];
				this.healthStations.push(new HealthStation(hs.x, hs.y, hs.width, hs.height, hs.color, hs.bc, hs.crossColor, hs.weapons));
			}

			for (var i = 0; i < map.dm.length; i++) {
				var dm = map.dm[i];
				this.dummies.push(new NPCTank(dm.x, dm.y, dm.width, dm.height, dm.color, dm.bc, dm.weapons, dm.gunAngle));
			}

			this.images = map.images;
			this.pickups = map.pickups;
			this.playerStart = map.playerStart;
		}
	}

	export() {
		var modifiedData = Object.assign({}, this);
		Object.assign(modifiedData, { healthStations: [], dummies: [] });
		return JSON.stringify(modifiedData);
	}
}

var map00 = [
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

var map01 = [
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
	[0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
	[0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 1],
	[0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
	[0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
	[0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 2, 0, 0, 1],
	[0, 0, 1, 0, 0, 2.5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

var map02 = [
	[0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 1, 1, 1, 1, 1, 1, 1],
	[0, 0, 1, 2, 0, 4, 0, 0, 1],
	[0, 0, 1, 0, 1, 0, 0, 0, 1],
	[0, 0, 1, 0, 1, 0, 0, 0, 1],
	[0, 0, 0, 0, 1, 1, 1, 1, 1],
	[0, 0, 1, 1, 1, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0]
];

var map03 = [
	[0, 0, 0, 5, 5, 5],
	[0, 0, 0, 5, 5, 5],
	[0, 0, 0, 5, 5, 5],
	[5, 5, 5, 5, 5, 5],
	[5, 5, 5, 5, 5, 5],
	[5, 5, 5, 5, 5, 5]
];

var mapSpecial = [
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 3.5],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2.5, 2.5, 2.5, 0, 0]
];

class Camera {
	constructor(x, y, viewScale) {
		this.x = x;
		this.y = y;
		this.viewScale = viewScale;
	}
}

var camera = new Camera(0, 0, 1);

var player = new Player(-16, -16, 32, 32, "#00ff00", "#008000", devTestS);

// var player2 = new NPCTank(16, -16, 32, 32, "#00ffff", "#008080", "shotgun", 0);

var infoMap = new Info_Map(128);
var draw = new Draw(ctx);

var devSelectItem = document.getElementById("devSelectItem");
var devGridSize = document.getElementById("devGridSize");
var devMouseAction = document.getElementById("devMouseAction");
var exportMapButton = document.getElementById("exportMapButton");
var importMapButton = document.getElementById("importMapButton");
var exportCodeDisplay = document.getElementById("exportCodeDisplay");

exportMapButton.addEventListener("click", () => {
	var exportSave = infoMap.export();
	// window.navigator.clipboard.writeText(`${exportSave}`).catch();
	exportCodeDisplay.innerText = exportSave;
	// alert(exportSave);
});

importMapButton.addEventListener("click", () => {
	infoMap.import();
});

devGridSize.value = 32;
devMouseAction.value = "create";
devSelectItem.value = "wall";

class DevEditor {
	constructor() {
		this.gridMouseX = 0;
		this.gridMouseY = 0;
		this.prevGridMouseX = 0;
		this.prevGridMouseY = 0;
		this.selectedBlock = devSelectItem.value;
		this.gridSize = 32;
		this.mouseAction = devMouseAction.value;
	}

	update() {
		// if (keysDown["0"]) {
		// 	this.selectedBlock = "wall";
		// 	this.hlWidth = 64;
		// 	this.hlHeight = 64;
		// } else if (keysDown["1"]) {
		// 	this.selectedBlock = "enemy";
		// 	this.hlWidth = 32;
		// 	this.hlHeight = 32;
		// } else if (keysDown["2"]) {
		// 	this.selectedBlock = "hs";
		// 	this.hlWidth = 64;
		// 	this.hlHeight = 64;
		// } else if (keysDown["3"]) {
		// 	this.selectedBlock = "store";
		// 	this.hlWidth = 192;
		// 	this.hlHeight = 192;
		// } else if (keysDown["4"]) {
		// 	this.selectedBlock = "hk";
		// 	this.hlWidth = 32;
		// 	this.hlHeight = 32;
		// }
		if (keysDown["Alt"]) {
			this.gridMouseX = snapNumberToGrid(mouse.x, this.gridSize / 2);
			this.gridMouseY = snapNumberToGrid(mouse.y, this.gridSize / 2);
		} else if (keysDown["Shift"]) {
			this.gridMouseX = mouse.x;
			this.gridMouseY = mouse.y;
		} else {
			this.gridMouseX = snapNumberToGrid(mouse.x, this.gridSize);
			this.gridMouseY = snapNumberToGrid(mouse.y, this.gridSize);
		}
	}

	draw(context) {
		if (infoMap.playerStart.active == true) {
			draw.image(playerStartImage, infoMap.playerStart.x - (infoMap.playerStart.width / 2), infoMap.playerStart.y - (infoMap.playerStart.height / 2), infoMap.playerStart.width * 2, infoMap.playerStart.height * 2);
		}

		for (var i = 0; i < infoMap.spawners.length; i++) {
			var spawner = infoMap.spawners[i];

			if (spawner.spawnTankType === "e") {
				draw.image(enemySpawnerImage, spawner.x - spawner.radius, spawner.y - spawner.radius, spawner.radius * 2, spawner.radius * 2);
			} else if (spawner.spawnTankType === "a") {
				draw.image(allySpawnerImage, spawner.x - spawner.radius, spawner.y - spawner.radius, spawner.radius * 2, spawner.radius * 2);
			}
		}

		if (this.mouseAction === "create") {
			if (typeof this.gridSize === "number") {
				context.fillStyle = "#ffffff80";
				context.beginPath();
				context.rect(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize);
				context.fill();
				context.closePath();
			} else if (typeof this.gridSize === "object") {
				context.fillStyle = "#ffffff80";
				context.beginPath();
				context.rect(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize);
				context.fill();
				context.closePath();
			}
		}
	}

	place() {
		var tankC = pickRandomItemFromArray(tankColors);
		switch (this.selectedBlock) {
			case "wall":
				infoMap.createWall(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#808080", "#606060", 1);
				break;
			case "breakable_wall":
				infoMap.createWall(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#dddddd", "#aaaaaa", 3);
				break;
			case "short_wall":
				infoMap.createWall(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#606060", "#454545", 4);
				break;
			case "enemy":
				spawnEnemy(false, this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#ff0000", "#800000", "basic", 1, true, true, true);
				break;
			case "stationary_enemy":
				spawnEnemy(false, this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#ff0000", "#800000", "basic", 1, true, false, true);
				break;
			case "ally":
				spawnAlly(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#0000ff", "#000080", "basic", 1, true, true, true);
				break;
			case "teammate":
				spawnTeammate(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#00ff00", "#008000", "basic", 1, true, true, true);
				break;
			case "medic":
				spawnMedic(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#00ff00", "#008000", "basic", 1, true, true, true);
				break;
			case "health_station":
				infoMap.createHealthStation(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#ff0000", "#800000", "#ffffff", "basic");
				break;
			case "bb_store":
				infoMap.createWall(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "transparent", "transparent", 2);
				break;
			case "health_kit":
				infoMap.createPickup(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, 0, 0, "healthkit");
				break;
			case "repair_kit":
				infoMap.createPickup(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, 0, 0, "repairkit");
				break;
			case "dummy":
				infoMap.createDummy(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, tankC.color, tankC.bc, "basic", 0);
				break;
			case "player_start":
				infoMap.setPlayerStart(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize);
				infoMap.playerStart.active = true;
				break;
			case "enemy_spawner":
				infoMap.createSpawner(this.gridMouseX + (this.gridSize / 2), this.gridMouseY + (this.gridSize / 2), this.gridSize / 2, "e", 240, 1);
				break;
			case "ally_spawner":
				infoMap.createSpawner(this.gridMouseX + (this.gridSize / 2), this.gridMouseY + (this.gridSize / 2), this.gridSize / 2, "a", 240, 1);
				break;
		}
	}

	delete() {
		for (var i = 0; i < infoMap.walls.length; i++) {
			var wall = infoMap.walls[i];
			if (pointToRectangleCollisionDetection(mouse, wall)) {
				infoMap.walls.splice(i, 1);
				i--;
			}
		}

		for (var i = 0; i < infoMap.spawners.length; i++) {
			var spawner = infoMap.spawners[i];
			if (pointToRectangleCollisionDetection(mouse, { x: spawner.x - (spawner.radius / 2), y: spawner.y - (spawner.radius / 2), width: spawner.radius, height: spawner.radius })) {
				infoMap.spawners.splice(i, 1);
				i--;
			}
		}

		for (var i = 0; i < enemies.length; i++) {
			var enemy = enemies[i];
			if (pointToRectangleCollisionDetection(mouse, enemy)) {
				enemies.splice(i, 1);
				i--;
			}
		}

		for (var i = 0; i < allies.length; i++) {
			var ally = allies[i];
			if (pointToRectangleCollisionDetection(mouse, ally)) {
				allies.splice(i, 1);
				i--;
			}
		}

		for (var i = 0; i < infoMap.healthStations.length; i++) {
			var hs = infoMap.healthStations[i];
			if (pointToRectangleCollisionDetection(mouse, hs)) {
				infoMap.healthStations.splice(i, 1);
				infoMap.hs.splice(i, 1);
				i--;
			}
		}

		for (var i = 0; i < infoMap.images.length; i++) {
			var image = infoMap.images[i];
			if (pointToRectangleCollisionDetection(mouse, image)) {
				infoMap.images.splice(i, 1);
				i--;
			}
		}

		for (var i = 0; i < infoMap.pickups.length; i++) {
			var pickup = infoMap.pickups[i];
			if (pointToRectangleCollisionDetection(mouse, pickup)) {
				infoMap.pickups.splice(i, 1);
				i--;
			}
		}

		for (var i = 0; i < infoMap.dummies.length; i++) {
			var dummy = infoMap.dummies[i];
			if (pointToRectangleCollisionDetection(mouse, dummy)) {
				infoMap.dummies.splice(i, 1);
				infoMap.dm.splice(i, 1);
				i--;
			}
		}

		if (pointToRectangleCollisionDetection(mouse, { x: infoMap.playerStart.x - 16, y: infoMap.playerStart.y - 16, width: 64, height: 64 })) {
			infoMap.playerStart.active = false;
		}
	}
}

var devEditor = new DevEditor();

devSelectItem.addEventListener("input", () => {
	devEditor.selectedBlock = devSelectItem.value;
	scene.focus();
});

devGridSize.addEventListener("input", () => {
	devEditor.gridSize = +devGridSize.value;
	// devEditor.gridSize = +devGridSize.value;
	scene.focus();
});

devMouseAction.addEventListener("input", () => {
	devEditor.mouseAction = devMouseAction.value;
	scene.focus();
});

function resetGame(clearEnemies = true) {
	if (infoMap.playerStart.active == true) {
		player.x = infoMap.playerStart.x;
		player.y = infoMap.playerStart.y;
	}
	player.update();
	player.reset();

	if (clearEnemies == true) {
		allies = [];
		enemies = [];
	}

	for (var i = 0; i < 1; i++) {
		spawnTeammate();
	}

	infoMap.pickups = [];
	infoMap.healthStations = [];
	infoMap.walls = [];
	infoMap.dummies = [];
	infoMap.images = [];

	infoMap.load(map01, true);
	infoMap.load(map02, false, 1216, 1216, 64); // 1250
	infoMap.load(map03, false, 1536, 1344, 32); //1368
	// infoMap.load(mapSpecial, false, 2048, 0, 64); //1368

	for (var i = 0; i < 3; i++) {
		spawnEnemy();
	}
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

function setPlayerStats(setSize) {
	if (setSize == true && infoMap.playerStart.active) {
		player.width = infoMap.playerStart.width;
		player.height = infoMap.playerStart.height;
	}

	if (infoMap.playerStart.active) {
		player.x = infoMap.playerStart.x;
		player.y = infoMap.playerStart.y;
	}
	player.update();
	player.reset();
}

/**
 * @type { HTMLCanvasElement }
 */
var storeCanvas = document.getElementById("store-canvas");
var sCtx = storeCanvas.getContext("2d");

var upgradeStore = document.getElementById("store");
var equippedWeaponSelect = document.getElementById("equippedWeapon");
var equippedPaintColor = document.getElementById("equippedColor");
var store = new Store(upgradeStore);
var shopDrawLoop;

var tankClasses = [...document.querySelectorAll("[data-tank-class]")];
var tankUpgrades = [...document.querySelectorAll("[data-tank-upgrade]")];

equippedWeaponSelect.addEventListener("input", () => {
	player.setWeapons(equippedWeaponSelect.value);
});

equippedPaintColor.addEventListener("input", () => {
	if (equippedPaintColor.value === "green") {
		player.color = "#00ff00";
		player.bc = "#008000";
	} else if (equippedPaintColor.value === "blue") {
		player.color = "#0000ff";
		player.bc = "#000080";
	} if (equippedPaintColor.value === "light blue") {
		player.color = "#00ffff";
		player.bc = "#008080";
	} if (equippedPaintColor.value === "purple") {
		player.color = "#8000ff";
		player.bc = "#400080";
	}
});

tankClasses.forEach((weapon) => {
	weapon.addEventListener("click", () => {
		var weaponCost = +weapon.dataset.tankClassCost;
		if (player.coins >= weaponCost) {
			player.coins -= weaponCost;
			player.setWeapons(weapon.dataset.tankClass);
			equippedWeaponSelect.innerHTML += `<option value="${weapon.dataset.tankClass}">Equip Weapon: ${weapon.dataset.className}</option>`;
			equippedWeaponSelect.value = player.weaponClass;
			weapon.remove();
		}
	});
});

tankUpgrades.forEach((upgrade) => {
	upgrade.addEventListener("click", () => {
		var upgradeCost = +upgrade.dataset.tankUpgradeCost;
		if (player.coins >= upgradeCost) {
			player.coins -= upgradeCost;

			if (upgrade.dataset.tankUpgradeType === "speed") {
				player.acceleration += +upgrade.dataset.tankUpgrade;
			}

			upgrade.remove();
		}
	});
});

var shopX = 0;
var shopY = 0;

window.addEventListener("mousemove", (e) => {
	shopX = e.clientX - storeCanvas.getBoundingClientRect().left;
	shopY = e.clientY - storeCanvas.getBoundingClientRect().top;
});

function shopTick() {
	var sWidth = window.innerWidth * 0.25;
	var sHeight = window.innerWidth * 0.25;

	storeCanvas.width = sWidth * window.devicePixelRatio;
	storeCanvas.height = sHeight * window.devicePixelRatio;

	document.getElementById("coin-display").innerText = `Coins: ${player.coins}`;

	tankClasses.forEach((weapon) => {
		var weaponCost = +weapon.dataset.tankClassCost;
		if (player.coins >= weaponCost) {
			weapon.className = "green-btn";
		} else {
			weapon.className = "red-btn";
		}
	});

	tankUpgrades.forEach((weapon) => {
		var weaponCost = +weapon.dataset.tankUpgradeCost;
		if (player.coins >= weaponCost) {
			weapon.className = "green-btn";
		} else {
			weapon.className = "red-btn";
		}
	});

	sCtx.save();
	sCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
	var gradient01 = sCtx.createRadialGradient(sWidth / 2, sHeight / 2, 10, sWidth / 2, sHeight / 2, sWidth / 2);
	gradient01.addColorStop(0, "#303030");
	gradient01.addColorStop(1, "#202020");
	sCtx.fillStyle = gradient01;
	sCtx.fillRect(0, 0, sWidth, sHeight);

	drawGrid(sCtx, 0, 0, sWidth, sHeight, sWidth / 4, { strokeStyle: "#707070", lineWidth: 1 });
	// drawGrid(sCtx, storeCanvas.width / 2, 0, storeCanvas.width / 2, storeCanvas.height / 2, (storeCanvas.width / 4), { strokeStyle: "#707070", lineWidth: 1 });
	// drawGrid(sCtx, storeCanvas.width / 2, storeCanvas.height / 2, storeCanvas.width / 2, storeCanvas.height / 2, (storeCanvas.width / 4), { strokeStyle: "#707070", lineWidth: 1 });
	// drawGrid(sCtx, 0, storeCanvas.height / 2, storeCanvas.width / 2, storeCanvas.height / 2, (storeCanvas.width / 4), { strokeStyle: "#707070", lineWidth: 1 });

	var eWTD = new NPCTank((sWidth / 2) - (sWidth / 8), (sHeight / 2) - (sWidth / 8), (sWidth / 4), (sWidth / 4), player.color, player.bc, player.weaponClass, Math.atan2(shopY - (sHeight / 2), shopX - (sWidth / 2)));

	// eWTD.gunAngle = Math.atan2(sMouse.y - (eWTD.y + (eWTD.height / 2)), sMouse.x - (eWTD.x + (eWTD.width / 2)));
	eWTD.draw(sCtx);
	sCtx.restore();
}

// var tick = 0;

function updateCoreLogic() {
	if (devMode == false) {

		// tick %= 60;
		// if (tick === 0) {
		// 	var upPlayer = await fetchJSONFile("./player.json");

		// 	player2.setWeapons(upPlayer.weapons);

		// 	delete upPlayer.weapons;

		// 	Object.assign(player2, upPlayer);
		// }

		// tick++;

		infoMap.update();

		for (var i = 0; i < infoMap.pickups.length; i++) {
			var pickup = infoMap.pickups[i];

			if (pickup.type === "healthkit") {
				if (rectangleToRectangleCollisionDetection(player, pickup)) {
					if (player.health < player.maxHealth) {
						player.health += pickup.width + pickup.height;
						infoMap.pickups.splice(i, 1);
						i--;
						continue;
					}
				}

				var nextIL = false;

				for (var j = 0; j < allies.length; j++) {
					var ally = allies[j];

					if (rectangleToRectangleCollisionDetection(ally, pickup)) {
						if (ally.health < ally.maxHealth) {
							ally.health += pickup.width + pickup.height;
							infoMap.pickups.splice(i, 1);
							i--;
							nextIL = true;
							break;
						}
					}
				}

				if (nextIL == true) {
					continue;
				}
			} else if (pickup.type === "repairkit") {
				if (rectangleToRectangleCollisionDetection(player, pickup)) {
					var consumed = false;

					if (player.engine.healthPC < 1) {
						player.engine.health += pickup.width + pickup.height;
						consumed = true;
					}

					if (player.lTread.healthPC < 1) {
						player.lTread.health += pickup.width + pickup.height;
						consumed = true;
					}

					if (player.rTread.healthPC < 1) {
						player.rTread.health += pickup.width + pickup.height;
						consumed = true;
					}

					if (consumed == true) {
						infoMap.pickups.splice(i, 1);
						i--;
						continue;
					}
				}

				var nextIL = false;

				// for (var j = 0; j < allies.length; j++) {
				// 	var ally = allies[j];

				// 	if (rectangleToRectangleCollisionDetection(ally, pickup)) {
				// 		if (ally.health < ally.maxHealth) {
				// 			ally.health += pickup.width + pickup.height;
				// 			infoMap.pickups.splice(i, 1);
				// 			i--;
				// 			nextIL = true;
				// 			break;
				// 		}
				// 	}
				// }

				if (nextIL == true) {
					continue;
				}
			}
		}

		for (var i = 0; i < enemies.length; i++) {
			var enemy = enemies[i];
			if (enemy.health <= 0) {
				var averagel = ((enemy.width + enemy.height) / 2);
				var particleS3 = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel, { min: averagel * 0.1, max: averagel * 0.15 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 25, ["#ffdd20", "#606060"], { min: 10, max: 30 });
				particleS3.activate();
				var particleS3_2 = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel, { min: averagel * 0.1, max: averagel * 0.3 }, { min: averagel * 0.01, max: averagel * 0.02 }, { min: averagel * 0.01, max: averagel * 0.02 }, 5, ["#9f6060", "#804040"], { min: 240, max: 480 });
				particleS3_2.activate();

				enemies.splice(i, 1);
				i--;
				continue;
			}

			// if (allies.length > 0) {
			// 	enemy.update(allies[i % allies.length], allies[i % allies.length], true, /*infoMap.wall*/);
			// } else {
			// 	enemy.update(player, player, true, /*infoMap.wall*/);
			// }

			var target = findClosestToObject(enemy, [...allies, player]);
			enemy.update(target, target, true, infoMap.walls);

			if (rectangleToRectangleCollisionDetection(player, enemy)) {
				if (enemy.canMove == true) {
					rectangleToRectangleCollisionResolutionTwoMovingObjects(player, enemy);
				} else {
					rectangleToRectangleCollisionResolution(player, enemy);
				}

				player.health -= ((enemy.width + enemy.height) / 2) * 0.05;
				enemy.health -= ((player.width + player.height) / 2) * 0.05;
			}

			for (var j = i + 1; j < enemies.length; j++) {
				var enemy2 = enemies[j];
				if (rectangleToRectangleCollisionDetection(enemy, enemy2)) {
					rectangleToRectangleCollisionResolutionTwoMovingObjects(enemy, enemy2);
				}

			}

			for (var j = 0; j < allies.length; j++) {
				var ally = allies[j];
				if (rectangleToRectangleCollisionDetection(ally, enemy)) {
					rectangleToRectangleCollisionResolutionTwoMovingObjects(ally, enemy);
				}
			}
		}

		for (var i = 0; i < allies.length; i++) {
			var ally = allies[i];

			if (ally.health <= 0) {
				var averagel = ((ally.width + ally.height) / 2);
				var particleS3 = new ParticleSpawner(pgPhy, (ally.x + ally.width / 2), (ally.y + ally.height / 2), averagel, { min: averagel * 0.1, max: averagel * 0.15 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 25, ["#ffdd20", "#606060"], { min: 10, max: 30 });
				particleS3.activate();

				allies.splice(i, 1);
				i--;
				continue;
			}

			// if (enemies.length > 0 && ally.type !== "md") {
			// 	if (ally.type === "tm") {
			// 		ally.update(enemies[i % enemies.length], player);
			// 	} else {
			// 		ally.update(enemies[i % enemies.length], enemies[i % enemies.length]);
			// 	}
			// } else {
			// 	if (ally.type === "md" && player.health < player.maxHealth) {
			// 		ally.update(player, player, true, [], infoMap);
			// 	} else {
			// 		ally.update(player, player, false);
			// 	}
			// }
			// var target = findClosestToObject(enemy, [...allies, player]);
			if (ally.type === "tm") {
				if (enemies.length > 0) {
					var target = findClosestToObject(ally, enemies);
					ally.update(target, player, true, infoMap.walls);
				} else {
					ally.update(player, player, false, infoMap.walls);
				}
			} else if (ally.type === "md") {
				if (player.health < player.maxHealth) {
					ally.update(player, player, true, infoMap.walls, infoMap);
				} else {
					ally.update(player, player, false, infoMap.walls, infoMap);
				}
			} else {
				if (enemies.length > 0) {
					var target = findClosestToObject(ally, enemies);
					ally.update(target, target, true, infoMap.walls);
				} else {
					ally.update(player, player, false, infoMap.walls);
				}
			}

			if (rectangleToRectangleCollisionDetection(player, ally)) {
				rectangleToRectangleCollisionResolutionTwoMovingObjects(player, ally);
			}

			for (var j = i + 1; j < allies.length; j++) {
				var ally2 = allies[j];
				if (rectangleToRectangleCollisionDetection(ally, ally2)) {
					rectangleToRectangleCollisionResolutionTwoMovingObjects(ally, ally2);
				}

			}
		}

		for (var i = 0; i < infoMap.walls.length; i++) {
			var wall = infoMap.walls[i];

			var nextW = false;

			if (wall.type !== 2) {
				if (rectangleToRectangleCollisionDetection(player, wall)) {
					rectangleToRectangleCollisionResolution(player, wall);
				}

				for (var j = 0; j < player.bullets.length; j++) {
					var bullet = player.bullets[j];

					if (rectangleToCircleCollisionDetection(wall, bullet)) {
						if (wall.type === 3) {
							nextW = true;

							bullet.health -= ((wall.width + wall.height) / 2) / 2;

							if (Math.min(wall.width, wall.height) < 16) {
								infoMap.walls.splice(i, 1);
								i--;
							} else {
								infoMap.createWall(wall.x, wall.y, wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
								infoMap.createWall(wall.x + (wall.width / 2), wall.y, wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
								infoMap.createWall(wall.x + (wall.width / 2), wall.y + (wall.height / 2), wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
								infoMap.createWall(wall.x, wall.y + (wall.height / 2), wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
								infoMap.walls.splice(i, 1);
								i--;
							}

							break;
						} else if (wall.type !== 4) {
							bullet.health = 0;
							continue;
						}
					}
				}

				if (nextW == true) {
					continue;
				}

				for (var j = 0; j < enemies.length; j++) {
					var enemy = enemies[j];

					if (rectangleToRectangleCollisionDetection(enemy, wall) && enemy.canMove) {
						rectangleToRectangleCollisionResolution(enemy, wall);
					}

					for (var k = 0; k < enemy.bullets.length; k++) {
						var bullet = enemy.bullets[k];

						if (rectangleToCircleCollisionDetection(wall, bullet)) {
							if (wall.type === 3) {
								nextW = true;

								bullet.health -= ((wall.width + wall.height) / 2) / 2;

								if (Math.min(wall.width, wall.height) < 16) {
									infoMap.walls.splice(i, 1);
									i--;
								} else {
									infoMap.createWall(wall.x, wall.y, wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
									infoMap.createWall(wall.x + (wall.width / 2), wall.y, wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
									infoMap.createWall(wall.x + (wall.width / 2), wall.y + (wall.height / 2), wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
									infoMap.createWall(wall.x, wall.y + (wall.height / 2), wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
									infoMap.walls.splice(i, 1);
									i--;
								}

								break;
							} else if (wall.type !== 4) {
								bullet.health = 0;
								continue;
							}
						}
					}
				}

				if (nextW == true) {
					continue;
				}

				for (var j = 0; j < allies.length; j++) {
					var ally = allies[j];

					if (rectangleToRectangleCollisionDetection(ally, wall) && ally.canMove) {
						rectangleToRectangleCollisionResolution(ally, wall);
					}

					for (var k = 0; k < ally.bullets.length; k++) {
						var bullet = ally.bullets[k];

						if (rectangleToCircleCollisionDetection(wall, bullet)) {
							if (wall.type === 3) {
								nextW = true;

								bullet.health -= ((wall.width + wall.height) / 2) / 2;

								if (Math.min(wall.width, wall.height) < 16) {
									infoMap.walls.splice(i, 1);
									i--;
								} else {
									infoMap.createWall(wall.x, wall.y, wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
									infoMap.createWall(wall.x + (wall.width / 2), wall.y, wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
									infoMap.createWall(wall.x + (wall.width / 2), wall.y + (wall.height / 2), wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
									infoMap.createWall(wall.x, wall.y + (wall.height / 2), wall.width / 2, wall.height / 2, wall.color, wall.bc, 3);
									infoMap.walls.splice(i, 1);
									i--;
								}

								break;
							} else if (wall.type !== 4) {
								bullet.health = 0;
								continue;
							}
						}
					}
				}

				if (nextW == true) {
					continue;
				}
			} else {
				if (rectangleToRectangleCollisionDetection(player, wall)) {
					if (keysDown["e"]) {
						store.open();
						clearInterval(gameLoop);
						shopDrawLoop = setInterval(shopTick, 1000 / fps);
					}
				}
			}
		}

		for (var i = 0; i < enemies.length; i++) {
			var enemy = enemies[i];

			for (var j = 0; j < player.bullets.length; j++) {
				var bullet = player.bullets[j];

				if (bullet.health <= 0) {
					continue;
				}

				if (rectangleToCircleCollisionDetection(enemy, bullet)) {
					var averagel = ((enemy.width + enemy.height) / 2);
					var particleS = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel / 2, { min: averagel * 0.02, max: averagel * 0.05 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 8, ["#ffdd20"], { min: 10, max: 30 });
					// var particleS2 = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel / 2, { min: averagel * 0.05, max: averagel * 0.1 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 2, ["#ff2020"]);
					particleS.activate();
					// particleS2.activate();
					enemy.health -= bullet.damage;
					bullet.health -= ((enemy.width + enemy.height) / 2) / 1.5;

					if (enemy.health <= 0) {
						player.coins += 50;
						// var particleS3 = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel, { min: averagel * 0.1, max: averagel * 0.15 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 25, ["#ffdd20", "#606060"], { min: 10, max: 30 });
						// particleS3.activate();
						// // spriteSheet.renderSpriteSheet(explosion01, enemy.x - (enemy.width * 2), enemy.y - (enemy.height * 2), enemy.width * 6, enemy.height * 6, 4, 4, 32, 1, false);
						// // spriteSheet.renderSpriteSheet(fire01, enemy.x - enemy.width, enemy.y - enemy.height, enemy.width * 3, enemy.height * 3, 5, 5, 25, 25, true);
						// enemies.splice(i, 1);
						// i--;
						// break;
					}
				}
			}
		}

		for (var i = 0; i < enemies.length; i++) {
			var enemy = enemies[i];

			for (var j = 0; j < enemy.bullets.length; j++) {
				var bullet = enemy.bullets[j];

				if (bullet.health <= 0) {
					continue;
				}

				for (var k = 0; k < allies.length; k++) {
					var ally = allies[k];

					if (bullet.health <= 0) {
						break;
					}

					if (rectangleToCircleCollisionDetection(ally, bullet)) {
						ally.health -= bullet.damage;
						bullet.health -= ((ally.width + ally.height) / 2) / 1.5;

						var averagel = ((ally.width + ally.height) / 2);

						var particleS = new ParticleSpawner(pgPhy, (ally.x + ally.width / 2), (ally.y + ally.height / 2), averagel / 2, { min: averagel * 0.02, max: averagel * 0.05 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 8, ["#ffdd20"], { min: 10, max: 30 });
						particleS.activate();

						if (ally.health <= 0) {
							// var particleS3 = new ParticleSpawner(pgPhy, (ally.x + ally.width / 2), (ally.y + ally.height / 2), averagel, { min: averagel * 0.1, max: averagel * 0.15 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 25, ["#ffdd20", "#606060"], { min: 10, max: 30 });
							// particleS3.activate();
							// allies.splice(k, 1);
							// k--;
						}
					}
				}

				if (bullet.health <= 0) {
					continue;
				}

				if (rectangleToCircleCollisionDetection(player, bullet)) {
					var averagel = ((player.width + player.height) / 2);
					var particleS = new ParticleSpawner(pgPhy, (player.x + player.width / 2), (player.y + player.height / 2), averagel / 2, { min: averagel * 0.02, max: averagel * 0.05 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 8, ["#ffdd20"], { min: 10, max: 30 });
					particleS.activate();
					// var particleS2 = new ParticleSpawner(pgPhy, (player.x + player.width / 2), (player.y + player.height / 2), averagel / 2, { min: averagel * 0.05, max: averagel * 0.1 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 2, ["#20ff20"]);
					// particleS2.activate();
					player.health -= bullet.damage;
					bullet.health -= ((player.width + player.height) / 2) / 1.5;

					if (player.health <= 0) {
						player.coins -= 100;
						resetGame();
					}
				}
			}
		}

		for (var i = 0; i < allies.length; i++) {
			var ally = allies[i];

			for (var j = 0; j < ally.bullets.length; j++) {
				var bullet = ally.bullets[j];

				if (bullet.health <= 0) {
					continue;
				}

				for (var k = 0; k < enemies.length; k++) {
					var enemy = enemies[k];

					if (bullet.health <= 0) {
						break;
					}

					if (rectangleToCircleCollisionDetection(enemy, bullet)) {
						enemy.health -= bullet.damage;
						bullet.health -= ((enemy.width + enemy.height) / 2) / 1.5;

						var averagel = ((enemy.width + enemy.height) / 2);
						var particleS = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel / 2, { min: averagel * 0.02, max: averagel * 0.05 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 8, ["#ffdd20"], { min: 10, max: 30 });
						particleS.activate();

						if (enemy.health <= 0) {
							// var particleS3 = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel, { min: averagel * 0.1, max: averagel * 0.15 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 25, ["#ffdd20", "#606060"], { min: 10, max: 30 });
							// particleS3.activate();
							// enemies.splice(k, 1);
							// k--;
						}
					}
				}
			}
		}
	}
}

function main() {
	controllerInput();

	ctx.lineWidth = 3;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	if (devMode == true && trueDev == false) {
		devMode = false;
	}

	if (camera.viewScale <= 0) {
		camera.viewScale = 0.001;
	}

	if (devMode == false) {
		camera.viewScale = 1;
	}

	if (devMode == true) {
		devEditor.update();
	}

	if (devMode == true) {
		document.getElementById("devMenu").style.display = "flex";
	} else {
		document.getElementById("devMenu").style.display = "none";
	}

	if (player.health <= 0) {
		player.coins -= 100;
		resetGame();
	}

	player.update();
	// player.gunAngle = Math.atan2(mouse.y - player.cy, mouse.x - player.cx);

	if (enemies.length < 1) {
		spawnEnemy();
	}

	updateCoreLogic();

	var enemyBullets = [];
	for (var i = 0; i < enemies.length; i++) {
		enemyBullets = [...enemyBullets, ...enemies[i].bullets];
	}
	player.engine.testCollision(enemyBullets);
	player.lTread.testCollision(enemyBullets);
	player.rTread.testCollision(enemyBullets);

	// for (var i = 0; i < enemies.length; i++) {
	// 	var enemy = enemies[i];
	// }

	// for (var i = 0; i < allies.length; i++) {
	// 	var ally = allies[i];
	// }

	pgPhy.update();

	camera.x = lerp(camera.x, player.x + (player.width / 2), 0.05);
	camera.y = lerp(camera.y, player.y + (player.height / 2), 0.05);

	// if (vWidth < 2048) {
	// 	if (camera.x - (vWidth / 2) < -1024) {
	// 		camera.x = -1024 + (vWidth / 2);
	// 	}

	// 	if (camera.x + (vWidth / 2) > 1024) {
	// 		camera.x = 1024 - (vWidth / 2);
	// 	}
	// }

	// if (vHeight < 2048) {
	// 	if (camera.y - (vHeight / 2) < -1024) {
	// 		camera.y = -1024 + (vHeight / 2);
	// 	}

	// 	if (camera.y + (vHeight / 2) > 1024) {
	// 		camera.y = 1024 - (vHeight / 2);
	// 	}
	// }

	ctx.save();

	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

	ctx.clearRect(0, 0, vWidth, vHeight);
	ctx.fillStyle = "#808080";
	ctx.fillRect(0, 0, vWidth, vHeight);

	ctx.scale(camera.viewScale, camera.viewScale);
	ctx.translate(-(camera.x - (vWidth / (camera.viewScale * 2))), -(camera.y - (vHeight / (camera.viewScale * 2))));

	if (devMode == true) {
		ctx.fillStyle = "#202020";
		ctx.fillRect(-1024, -1024, 2048, 2048);

		drawGrid(ctx, -1024, -1024, 2048, 2048, devEditor.gridSize, { strokeStyle: "#606060", lineWidth: 1 });
	} else {
		var gradient01 = ctx.createRadialGradient(0, 0, 10, 0, 0, 1024);
		gradient01.addColorStop(0, "#303030");
		gradient01.addColorStop(1, "#202020");
		ctx.fillStyle = gradient01;
		ctx.fillRect(-1024, -1024, 2048, 2048);
		drawGrid(ctx, -1024, -1024, 2048, 2048, 32, { strokeStyle: "#707070", lineWidth: 1 });
	}

	infoMap.draw(ctx);

	pgPhy.render(false, false);

	if (devMode == false) {
		// if (gameControllerActive == false) {
		// 	ctx.save();
		// 	ctx.lineWidth = 2;

		// 	var lGrad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, (((player.width + player.height) / 2) * 5));
		// 	lGrad.addColorStop(0, "#ffffff80");
		// 	lGrad.addColorStop(1, "#ffffff00");

		// 	ctx.strokeStyle = lGrad;
		// 	ctx.beginPath();
		// 	ctx.moveTo(player.cx, player.cy);
		// 	ctx.lineTo(player.cx + (Math.cos(player.gunAngle) * (((player.width + player.height) / 2) * 5)), player.cy + (Math.sin(player.gunAngle) * (((player.width + player.height) / 2) * 5)));
		// 	ctx.stroke();
		// 	ctx.closePath();
		// 	ctx.restore();
		// }

		player.draw(ctx);
	}

	// player2.draw(ctx);

	for (var i = 0; i < allies.length; i++) {
		var ally = allies[i];

		ally.draw(ctx);
	}

	for (var i = 0; i < enemies.length; i++) {
		var enemy = enemies[i];

		enemy.draw(ctx);
	}

	spriteSheet.draw();

	if (devMode == true) {
		devEditor.draw(ctx);
	}

	ctx.restore();

	// ctx.save();
	// ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	// ctx.translate(vWidth / 2, vHeight / 2);

	// var gradientVignette = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(vWidth, vHeight));
	// gradientVignette.addColorStop(0, "#ffffff");
	// gradientVignette.addColorStop(1, "#000000");

	// ctx.globalCompositeOperation = "multiply";
	// ctx.fillStyle = gradientVignette;
	// ctx.beginPath();
	// ctx.rect(-vWidth / 2, -vHeight / 2, vWidth, vHeight);
	// ctx.closePath();
	// ctx.fill();

	// ctx.restore();

	ctx.save();
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

	if (devMode == true) {
		draw.text("DEV MODE", 15, 15, true, false, { textBaseline: "top", textAlign: "left", fillStyle: "#ffffff", font: "bold 16px arial" });
	} else {
		draw.text(`Coins: ${player.coins}`, 15, 15, true, false, { textBaseline: "top", textAlign: "left", fillStyle: "#ffffff", font: "bold 16px arial" });
	}

	draw.text(`Beta 1.01`, 15, vHeight - 15, true, false, { textBaseline: "bottom", textAlign: "left", fillStyle: "#ffffff", font: "bold 16px arial" });

	if (joystick.active == true) {
		ctx.fillStyle = "#80808080";
		ctx.beginPath();
		ctx.arc(joystick.previous.x, joystick.previous.y, 50, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#cccccc80";
		ctx.beginPath();
		ctx.arc(joystick.previous.x + (joystick.vx * 25), joystick.previous.y + (joystick.vy * 25), 25, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
	}

	if (joystick2.active == true) {
		ctx.fillStyle = "#80808080";
		ctx.beginPath();
		ctx.arc(joystick2.previous.x, joystick2.previous.y, 50, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#cccccc80";
		ctx.beginPath();
		ctx.arc(joystick2.previous.x + (joystick2.vx * 25), joystick2.previous.y + (joystick2.vy * 25), 25, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();

	// ctx.beginPath();
	// ctx.strokeStyle = "#ff0000";
	// ctx.moveTo(vWidth / 2, 0);
	// ctx.lineTo(vWidth / 2, vHeight);
	// ctx.moveTo(0, vHeight / 2);
	// ctx.lineTo(vWidth, vHeight / 2);
	// ctx.stroke();
	// ctx.closePath();
}

window.addEventListener("load", () => {
	resetGame();

	new URLSearchParams(window.location.search).forEach((value, name) => {
		if (name === "dev") {
			devMode = true;
			trueDev = true;
		}
	});

	// main();
});

window.addEventListener("keydown", (e) => {
	gameControllerActive = false;

	keysDown[e.key] = true;

	if (keysDown["x"] && trueDev == true) {
		if (devMode == true) {
			setPlayerStats(true);
			devMode = false;
		} else {
			devMode = true;
		}
	}
});

window.addEventListener("keyup", (e) => {
	keysDown[e.key] = false;
});

scene.addEventListener("wheel", (e) => {
	if (devMode == true) {
		if (e.wheelDelta) {
			if (e.wheelDelta > 0) {
				camera.viewScale /= zoomingDampener;
				return -1;
			} else {
				camera.viewScale *= zoomingDampener;
				return 1;
			}
		}

		if (e.deltaY < 0) {
			camera.viewScale /= zoomingDampener;
			return -1;
		} else {
			camera.viewScale *= zoomingDampener;
			return 1;
		}
	}
});

window.addEventListener("resize", resizeCanvas);

scene.addEventListener("mousemove", (e) => {
	if (!mobile) {
		// mouse.x = (e.clientX + (player.x * camera.viewScale) + (player.width / 2 * camera.viewScale) - (vWidth / 2)) / camera.viewScale + cameraOffsetX;
		// mouse.y = (e.clientY + (player.y * camera.viewScale) + (player.height / 2 * camera.viewScale) - (vHeight / 2)) / camera.viewScale + cameraOffsetY;
		mouse.x = (e.clientX + (camera.x * camera.viewScale) - (vWidth / 2)) / camera.viewScale;
		mouse.y = (e.clientY + (camera.y * camera.viewScale) - (vHeight / 2)) / camera.viewScale;

		// -(player.x - (vWidth / (camera.viewScale * 2)) + player.width / 2 + cameraOffsetX);
		// -(player.y - (vHeight / (camera.viewScale * 2)) + player.height / 2 + cameraOffsetY);

		// mouse.x = (e.clientX + (player.x * camera.viewScale) + (player.width / 2 * camera.viewScale) - (vWidth / 2)) / camera.viewScale + cameraOffsetX;
		// mouse.y = (e.clientY + (player.y * camera.viewScale) + (player.height / 2 * camera.viewScale) - (vHeight / 2)) / camera.viewScale + cameraOffsetY;

		// player.gunAngle = Math.atan2(e.clientY - (vHeight / 2), e.clientX - (vWidth / 2));

		player.tGunAngle = Math.atan2(mouse.y - player.cy, mouse.x - player.cx);

		// player2.gunAngle = Math.atan2(mouse.y - player2.cy, mouse.x - player2.cx);

		if (devMode == true) {
			if (mouse.rightdown == true) {
				devEditor.delete();
			} else if (devEditor.mouseAction === "create" && mouse.down == true) {
				if (devEditor.gridMouseX !== devEditor.prevGridMouseX || devEditor.gridMouseY !== devEditor.prevGridMouseY) {
					devEditor.prevGridMouseX = devEditor.gridMouseX;
					devEditor.prevGridMouseY = devEditor.gridMouseY;

					devEditor.place();
				}
			} else if (devEditor.mouseAction === "delete" && mouse.down == true) {
				devEditor.delete();
			}
		}
	}
});

scene.addEventListener("touchmove", (e) => {
	e.preventDefault();
	// mouse.x = (e.touches[0].clientX + (player.x * camera.viewScale) + (player.width / 2 * camera.viewScale) - (vWidth / 2)) / camera.viewScale + cameraOffsetX;
	// mouse.y = (e.touches[0].clientY + (player.y * camera.viewScale) + (player.height / 2 * camera.viewScale) - (vHeight / 2)) / camera.viewScale + cameraOffsetY;

	if (e.touches[1]) {
		mouse.x = (e.touches[1].clientX + (camera.x * camera.viewScale) - (vWidth / 2)) / camera.viewScale;
		mouse.y = (e.touches[1].clientY + (camera.y * camera.viewScale) - (vHeight / 2)) / camera.viewScale;
	} else {
		mouse.x = (e.touches[0].clientX + (camera.x * camera.viewScale) - (vWidth / 2)) / camera.viewScale;
		mouse.y = (e.touches[0].clientY + (camera.y * camera.viewScale) - (vHeight / 2)) / camera.viewScale;
	}

	joystick.x = e.touches[0].clientX;
	joystick.y = e.touches[0].clientY;

	if (e.touches[1]) {
		joystick2.x = e.touches[1].clientX;
		joystick2.y = e.touches[1].clientY;
	}

	var joyV = Math.atan2(joystick.y - joystick.previous.y, joystick.x - joystick.previous.x);

	var powerX = clamp(0, 25, Math.abs(joystick.x - joystick.previous.x)) / 25;
	var powerY = clamp(0, 25, Math.abs(joystick.y - joystick.previous.y)) / 25;

	joystick.vx = Math.cos(joyV) * powerX;
	joystick.vy = Math.sin(joyV) * powerY;

	var joy2V = Math.atan2(joystick2.y - joystick2.previous.y, joystick2.x - joystick2.previous.x);

	var power2X = clamp(0, 25, Math.abs(joystick2.x - joystick2.previous.x)) / 25;
	var power2Y = clamp(0, 25, Math.abs(joystick2.y - joystick2.previous.y)) / 25;

	joystick2.vx = Math.cos(joy2V) * power2X;
	joystick2.vy = Math.sin(joy2V) * power2Y;

	if (joystick2.active == false) {
		if (e.touches[1]) {
			player.tGunAngle = Math.atan2(mouse.y - player.cy, mouse.x - player.cx);
		} else {
			player.tGunAngle = Math.atan2(joystick.vy, joystick.vx);
		}
	}

	if (mouse.down && devMode == true) {
		if (devEditor.mouseAction === "create") {
			if (devEditor.gridMouseX !== devEditor.prevGridMouseX || devEditor.gridMouseY !== devEditor.prevGridMouseY) {
				devEditor.prevGridMouseX = devEditor.gridMouseX;
				devEditor.prevGridMouseY = devEditor.gridMouseY;

				devEditor.place();
			}
		} else if (devEditor.mouseAction === "delete") {
			devEditor.delete();
		}
	}
});

window.addEventListener("contextmenu", (e) => {
	e.preventDefault();
});

scene.addEventListener("mousedown", (e) => {
	gameControllerActive = false;
	if (!mobile) {
		if (e.button === 0) {
			mouse.down = true;
		}

		if (e.button === 2) {
			mouse.rightdown = true;
		}

		mouse.x = (e.clientX + (camera.x * camera.viewScale) - (vWidth / 2)) / camera.viewScale;
		mouse.y = (e.clientY + (camera.y * camera.viewScale) - (vHeight / 2)) / camera.viewScale;

		if (keysDown["Alt"]) {
			devEditor.gridMouseX = snapNumberToGrid(mouse.x, devEditor.gridSize / 2);
			devEditor.gridMouseY = snapNumberToGrid(mouse.y, devEditor.gridSize / 2);
		} else if (keysDown["Shift"]) {
			devEditor.gridMouseX = mouse.x;
			devEditor.gridMouseY = mouse.y;
		} else {
			devEditor.gridMouseX = snapNumberToGrid(mouse.x, devEditor.gridSize);
			devEditor.gridMouseY = snapNumberToGrid(mouse.y, devEditor.gridSize);
		}

		if (devMode == true) {
			if (mouse.rightdown == true) {
				devEditor.delete();
			} else if (devEditor.mouseAction === "create") {
				devEditor.prevGridMouseX = devEditor.gridMouseX;
				devEditor.prevGridMouseY = devEditor.gridMouseY;

				devEditor.place();
			} else if (devEditor.mouseAction === "delete") {
				devEditor.delete();
			}
		}
	}
});

scene.addEventListener("touchstart", (e) => {
	e.preventDefault();
	gameControllerActive = false;

	mouse.down = true;

	// mouse.x = (e.touches[0].clientX + (player.x * camera.viewScale) + (player.width / 2 * camera.viewScale) - (vWidth / 2)) / camera.viewScale + cameraOffsetX;
	// mouse.y = (e.touches[0].clientY + (player.y * camera.viewScale) + (player.height / 2 * camera.viewScale) - (vHeight / 2)) / camera.viewScale + cameraOffsetY;

	if (e.touches[1]) {
		mouse.x = (e.touches[1].clientX + (camera.x * camera.viewScale) - (vWidth / 2)) / camera.viewScale;
		mouse.y = (e.touches[1].clientY + (camera.y * camera.viewScale) - (vHeight / 2)) / camera.viewScale;
	} else {
		mouse.x = (e.touches[0].clientX + (camera.x * camera.viewScale) - (vWidth / 2)) / camera.viewScale;
		mouse.y = (e.touches[0].clientY + (camera.y * camera.viewScale) - (vHeight / 2)) / camera.viewScale;
	}

	if (keysDown["Alt"]) {
		devEditor.gridMouseX = snapNumberToGrid(mouse.x, devEditor.gridSize / 2);
		devEditor.gridMouseY = snapNumberToGrid(mouse.y, devEditor.gridSize / 2);
	} else if (keysDown["Shift"]) {
		devEditor.gridMouseX = mouse.x;
		devEditor.gridMouseY = mouse.y;
	} else {
		devEditor.gridMouseX = snapNumberToGrid(mouse.x, devEditor.gridSize);
		devEditor.gridMouseY = snapNumberToGrid(mouse.y, devEditor.gridSize);
	}

	joystick.active = true;
	if (!e.touches[1]) {
		joystick.previous.x = e.touches[0].clientX;
		joystick.previous.y = e.touches[0].clientY;
	} else {
		joystick2.active = true;
		joystick2.previous.x = e.touches[1].clientX;
		joystick2.previous.y = e.touches[1].clientY;
		joystick2.x = e.touches[1].clientX;
		joystick2.y = e.touches[1].clientY;
	}
	joystick.x = e.touches[0].clientX;
	joystick.y = e.touches[0].clientY;

	if (devMode == true) {
		if (devEditor.mouseAction === "create") {
			devEditor.prevGridMouseX = devEditor.gridMouseX;
			devEditor.prevGridMouseY = devEditor.gridMouseY;

			devEditor.place();
		} else if (devEditor.mouseAction === "delete") {
			devEditor.delete();
		}

	}
});

scene.addEventListener("mouseup", (e) => {
	if (!mobile) {
		mouse.down = false;
		mouse.rightdown = false;
	}
});

scene.addEventListener("touchend", (e) => {
	mouse.down = false;
	mouse.rightdown = false;

	if (!e.touches[0]) {
		joystick.active = false;
		joystick.previous.x = joystick.x;
		joystick.previous.y = joystick.y;
		joystick.vx = 0;
		joystick.vy = 0;
	}

	if (!e.touches[1]) {
		joystick2.active = false;
		joystick2.previous.x = joystick2.x;
		joystick2.previous.y = joystick2.y;
		joystick2.vx = 0;
		joystick2.vy = 0;
	}
});

var gameControllerActive = false;
var gameControllerIndex = null;
var gameControllerMoveAngle = 0;
var gameControllerMoveStrength = 0;

var timedBtnDelay = 15;
var cTimedBtnDelay = 0;

function controllerInput() {
	if (cTimedBtnDelay > 0) {
		cTimedBtnDelay--;
	}

	if (gameControllerIndex != null && gameControllerActive == false) {
		var gamepad = window.navigator.getGamepads()[gameControllerIndex];
		var buttons = gamepad.buttons;

		var deadZone = 0.1;

		var stick1X = gamepad.axes[0];
		var stick1Y = gamepad.axes[1];

		var stick2X = gamepad.axes[2];
		var stick2Y = gamepad.axes[3];

		var stick1Angle = Math.atan2(stick1Y, stick1X);

		var gunX = 0;
		var gunY = 0;

		if (Math.abs(stick1X) > deadZone) {
			player.velX += Math.cos(stick1Angle) * player.acceleration * Math.abs(stick1X);
		}

		if (Math.abs(stick1Y) > deadZone) {
			player.velY += Math.sin(stick1Angle) * player.acceleration * Math.abs(stick1Y);
		}

		if (Math.abs(stick2X) > deadZone) {
			gunX = stick2X;
		}

		if (Math.abs(stick2Y) > deadZone) {
			gunY = stick2Y;
		}

		if (Math.abs(gunX) > 0 || Math.abs(gunY) > 0) {
			player.tGunAngle = Math.atan2(gunY, gunX);
		}

		if (buttons[2].pressed) {
			keysDown["e"] = true;
		} else {
			keysDown["e"] = false;
		}

		if (buttons[8].pressed && cTimedBtnDelay <= 0) {
			cTimedBtnDelay = timedBtnDelay;

			if (trueDev == true) {
				if (devMode == true) {
					setPlayerStats(true);
					devMode = false;
				} else {
					devMode = true;
				}
			}
		}

		if (buttons[7].value > deadZone) {
			mouse.down = true;
		} else {
			mouse.down = false;
		}
	}
}

window.addEventListener("gamepadconnected", (e) => {
	gameControllerIndex = [e.gamepad.index];
	gameControllerActive = true;
});

window.addEventListener("gamepaddicconnected", (e) => {
	gameControllerIndex = null;
	gameControllerActive = false;
});

var openGameOptionsBtn = document.getElementById("options-button");

openGameOptionsBtn.addEventListener("click", () => {

});