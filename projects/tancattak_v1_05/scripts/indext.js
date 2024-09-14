window.onerror = function (ev, src, lineno, colno, err) {
	document.writeln("<p>" + ev + "</p>");
	document.writeln("<p>" + src + "</p>");
	document.writeln("<p>" + lineno + ":" + colno + "</p>");
	document.writeln("<p>" + err + "</p>");
}

var pSizeSlider = document.getElementById("particle-size-slider");

pSizeSlider.value = 1;

var trueDev = false;
var devMode = false;

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
var gCtx = scene.getContext("2d");

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

gCtx.imageSmoothingEnabled = false;
var vWidth = window.innerWidth;
var vHeight = window.innerHeight;
var gameLoop;

var cameraOffsetX = 0;
var cameraOffsetY = 0;

var workshopImage = new Image();
workshopImage.src = "./assets/workshop.png";
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

var playerStartImage = new Image();
playerStartImage.src = "./assets/player_start_icon_02.png";

var mouse = {
	x: 0,
	y: 0,
	previous: {
		x: 0,
		y: 0
	},
	down: false
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

scene.width = vWidth * window.devicePixelRatio;
scene.height = vHeight * window.devicePixelRatio;

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
			// obj1.velX *= -obj1.mass;
			// obj2.velX *= -obj2.mass;
		} else {
			obj1.x = refX2 + obj2.width;
			obj2.x = refX1 - obj2.width;
			// obj1.velX *= -obj1.mass;
			// obj2.velX *= -obj2.mass;
		}
	} else {
		if (vy < 0) {
			obj1.y = refY2 - obj1.height;
			obj2.y = refY1 + obj1.height;
			// obj1.velY *= -obj1.mass;
			// obj2.velY *= -obj2.mass;
		} else {
			obj1.y = refY2 + obj2.height;
			obj2.y = refY1 - obj2.height;
			// obj1.velY *= -obj1.mass;
			// obj2.velY *= -obj2.mass;
		}
	}
}

class Store {
	constructor(storeElement) {
		this.storeElement = storeElement;
	}

	open() {
		this.storeElement.style.display = "block";
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
		roundRect(this.ctx, x, y, width, height, roundness);
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

function clamp(min, max, value) {
	if (value < min) {
		return min;
	}

	if (value > max) {
		return max;
	}

	return value;
}

function random(min, max) {
	return Math.random() * (max - min) + min;
}

function degreesToRadians(degrees) {
	return degrees * Math.PI / 180;
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

class Particle {
	constructor(x, y, radius, color, type = "bouncy", velX = 0, velY = 0) {
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
		this.life = 20;
	}
}

class ParticleSpawner {
	constructor(pgPhyEngine, x, y, radius, particleSizeRange = { min: 3, max: 10 }, velXRange = { min: 5, max: 15 }, velYRange = { min: 5, max: 15 }, particleCount = 100, particleColorsArray = ["#ff8000", "#808080"]) {
		this.parent = pgPhyEngine;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.particleSizeRange = particleSizeRange;
		this.velXRange = velXRange;
		this.velYRange = velYRange;
		this.particleCount = particleCount;
		this.particleColors = particleColorsArray;
	}

	activate() {
		for (var i = 0; i < this.particleCount; i++) {
			var randomDir = degreesToRadians(random(-180, 180));
			this.parent.createParticle(this.x + (Math.cos(randomDir) * random(0, this.radius)), this.y + (Math.sin(randomDir) * random(0, this.radius)), random(this.particleSizeRange.min, this.particleSizeRange.max), pickRandomItemFromArray(this.particleColors), true, random(this.velXRange.min, this.velXRange.max) * Math.cos(randomDir), random(this.velYRange.min, this.velYRange.max) * Math.sin(randomDir));
		}
	}
}

class DirectionalParticleSpawner {
	constructor(pgPhyEngine, x, y, radius, particleSizeRange = { min: 3, max: 10 }, particleSpeedRange = { min: 1, max: 10 }, particleCount = 1, particleColorsArray = ["#ff8000", "#808080"], directionRange = { min: Math.atan2(1, 1), max: Math.atan2(1, 0) }) {
		this.parent = pgPhyEngine;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.particleSizeRange = particleSizeRange;
		this.particleSpeedRange = particleSpeedRange;
		this.particleColors = particleColorsArray;
		this.particleCount = particleCount;
		this.directionRange = directionRange;
	}

	activate() {
		for (var i = 0; i < this.particleCount; i++) {
			var selectedSpeed = random(this.particleSpeedRange.min, this.particleSpeedRange.max);
			var selectedDirection = random(this.directionRange.min, this.directionRange.max);
			this.parent.createParticle(this.x + (Math.cos(selectedDirection) * random(0, this.radius)), this.y + (Math.sin(selectedDirection) * random(0, this.radius)), random(this.particleSizeRange.min, this.particleSizeRange.max), pickRandomItemFromArray(this.particleColors), true, Math.cos(selectedDirection) * selectedSpeed, Math.sin(selectedDirection) * selectedSpeed);
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

	createParticle(x, y, radius, color, bouncy = true, velX = 0, velY = 0) {
		this.particles.push(new Particle(x, y, radius * +pSizeSlider.value, color, bouncy == true ? "bouncy" : "no", velX, velY));
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
				// this.ctx.shadowBlur = particle.radius * 2;
				this.ctx.shadowBlur = 10;
				this.ctx.shadowColor = particle.color;
				// this.ctx.shadowColor = "#ff0000";
			}

			this.ctx.globalAlpha = 1;

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
				if (j != i) {
					this.resolveCircleCollision(particle1, particle2);
				}
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

	renderSpriteSheet(image, x, y, width, height, rows, columns, renderDuration) {
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
			renderDuration: renderDuration
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
				this.currentsEffects.splice(i, 1);
				i--;
				continue;
			}

			var row = Math.floor(effect.frame / effect.columns);
			var column = effect.frame % effect.columns;

			this.ctx.drawImage(effect.image, column * (effect.image.width / effect.columns), row * (effect.image.height / effect.rows), (effect.image.width / effect.columns), (effect.image.height / effect.rows), effect.x, effect.y, effect.width, effect.height);

			effect.currentFrameDuration -= 1;
		}
	}
}

var spriteSheet = new SpriteSheetRenderer(gCtx);

var tankWeapons = {
	basic: function (tank) {
		tank.weaponClass = "basic";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 0.8, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height)
		];
	},

	sniper: function (tank) {
		tank.weaponClass = "sniper";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 1.3, tank.height * 0.3, "#606060", "#404040", 0, tank.height * 5, 6, tank.height * 1.1),
		];
	},

	shotgun: function (tank) {
		tank.weaponClass = "shotgun";
		return [
			new Gun(tank, 0, -tank.height * 0.2, tank.width, tank.height * 0.2, "#606060", "#404040", 0, tank.height * 0.8, 7, tank.height * 0.8),
			new Gun(tank, 0, 0, tank.width, tank.height * 0.2, "#606060", "#404040", 0, tank.height * 0.8, 7, tank.height * 0.8),
			new Gun(tank, 0, -tank.height * 0.1, tank.width, tank.height * 0.2, "#606060", "#404040", 0, tank.height * 0.8, 7, tank.height * 0.8),
			new Gun(tank, 0, -tank.height * 0.1, tank.width, tank.height * 0.2, "#606060", "#404040", 0, tank.height * 0.8, 7, tank.height * 0.8),
			new Gun(tank, 0, -tank.height * 0.3, tank.width, tank.height * 0.6, "#606060", "#404040", 0, 0, 0, 0, true)
		];
	},

	devS: function (tank) {
		tank.weaponClass = "devS";
		return [
			new Gun(tank, 0, -tank.height * 0.2, tank.width, tank.height * 0.2, "#606060", "#404040", 0, tank.height * 1000, 15, tank.height * 1000),
			new Gun(tank, 0, 0, tank.width, tank.height * 0.2, "#606060", "#404040", 0, tank.height * 1000, 15, tank.height * 1000),
			new Gun(tank, 0, -tank.height * 0.1, tank.width, tank.height * 0.2, "#606060", "#404040", 0, tank.height * 1000, 15, tank.height * 1000),
			new Gun(tank, 0, -tank.height * 0.1, tank.width, tank.height * 0.2, "#606060", "#404040", 0, tank.height * 1000, 15, tank.height * 1000),
			new Gun(tank, 0, -tank.height * 0.3, tank.width, tank.height * 0.6, "#606060", "#404040", 0, 0, 0, 0, true)
		];
	},

	twinFire: function (tank) {
		tank.weaponClass = "twinFire";
		return [
			new Gun(tank, 0, -tank.height * 0.3, tank.width * 0.8, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height * 1.2),
			new Gun(tank, 0, 0, tank.width * 0.8, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height * 1.2)
		];
	},

	stationary: function (tank) {
		tank.weaponClass = "stationary";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height)
		];
	},

	dev: function (tank) {
		tank.weaponClass = "dev";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 0.8, tank.height * 0.3, "#606060", "#404040", 0, tank.height * 10, 10, tank.height * 10)
		];
	},

	supressor: function (tank) {
		tank.weaponClass = "supressor";
		return [
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 1.3, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height),
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 1.2, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height),
			new Gun(tank, 0, -tank.height * 0.15, tank.width * 1.1, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height),
			new Gun(tank, 0, -tank.height * 0.15, tank.width, tank.height * 0.3, "#606060", "#404040", 0, tank.height, 6, tank.height)
		];
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

	draw(ctx) {
		var dValue = this.value;

		if (dValue < 0) {
			dValue = 0;
		}

		if (dValue > this.maxValue) {
			dValue = this.maxValue;
		}

		ctx.save();
		ctx.fillStyle = this.bgColor;
		ctx.beginPath();
		ctx.rect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
		ctx.fill();
		ctx.closePath();

		ctx.fillStyle = this.fillColor;
		ctx.beginPath();
		ctx.rect(this.x - this.width / 2, this.y - this.height / 2, (dValue / this.maxValue) * this.width, this.height);
		ctx.fill();
		ctx.closePath();
		ctx.restore();
	}
}

class NPCTank {
	constructor(x, y, width, height, color, bc, weapons = "basic", gunAngle = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.bc = bc;
		this.gunAngle = gunAngle;
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

	draw(ctx) {
		ctx.save();
		ctx.lineWidth = ((this.height + this.width) / 2) * 0.1;

		ctx.save();
		ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
		ctx.rotate(Math.atan2(this.velY, this.velX));
		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.bc;
		ctx.beginPath();
		roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, ((this.height + this.width) / 2) * 0.15);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		ctx.restore();

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.draw(ctx);
		}

		// ctx.save();
		// ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
		// ctx.rotate(this.gunAngle);
		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.bc;
		ctx.beginPath();
		ctx.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
		// roundRect(ctx, -(this.width * 0.35), -(this.height * 0.35), this.height * 0.7, this.height * 0.7, this.height * 0.1);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		// ctx.restore();
		ctx.restore();
	}
}

class Player {
	constructor(x, y, width, height, color, bc, weapons = "basic", health = 1) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.bc = bc;
		this.velX = 0;
		this.velY = 0;
		this.mass = ((this.width / 4) + (this.height / 4)) / (((this.width / 4) + 1) + ((this.height / 4) + 1));
		this.acceleration = 1;
		this.gunAngle = 0;
		this.bullets = [];
		this.reloadTime = 60;
		this.curReloadTime = 0;
		this.reloadDampener = 1;
		this.coins = 0;
		this.weapons = this.getWeaponsArray(weapons);
		this.weaponClass = weapons;
		this.maxHealth = (this.width / 2) * (this.height / 2);
		this.health = this.maxHealth * health;
		this.healthPC = this.health / this.maxHealth;
		this.healthBar = new MeterBar(this.x + this.width / 2, this.y + this.height * 1.3, this.width, this.height * 0.2, "#000000", "#00ff00", this.health, this.maxHealth);
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
		this.curReloadTime = 0;
		this.velX = 0;
		this.velY = 0;
		this.setWeapons(this.weaponClass);
	}

	update() {
		if (this.health > this.maxHealth) {
			this.health = this.maxHealth;
		}

		this.maxHealth = (this.width / 2) * (this.height / 2);
		this.mass = ((this.width / 4) + (this.height / 4)) / (((this.width / 4) + 1) + ((this.height / 4) + 1));

		this.healthPC = this.health / this.maxHealth;

		if (this.curReloadTime > 0) {
			this.curReloadTime--;
		}

		if (mouse.down && devMode == false) {
			if (this.curReloadTime <= 0) {
				this.shoot();
				this.curReloadTime = this.reloadTime;
			}
		}

		if (joystick.active == false) {
			var dx = 0;
			var dy = 0;

			if (keysDown["d"]) {
				dx += 1;
			}

			if (keysDown["a"]) {
				dx -= 1;
			}

			if (keysDown["w"]) {
				dy -= 1;
			}

			if (keysDown["s"]) {
				dy += 1;
			}

			if (dx !== 0 || dy !== 0) {
				var direction = Math.atan2(dy, dx);

				var vx = Math.cos(direction);
				var vy = Math.sin(direction);

				this.velX += vx * this.acceleration;
				this.velY += vy * this.acceleration;
			}
		} else {
			this.velX += joystick.vx * this.acceleration;
			this.velY += joystick.vy * this.acceleration;
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

		if (this.x + this.width > 1024) {
			this.x = 1024 - this.width;
		}

		if (this.y + this.height > 1024) {
			this.y = 1024 - this.height;
		}

		Object.assign(this.healthBar, { x: this.x + this.width / 2, y: this.y + this.height * 1.2, width: this.width, height: this.height * 0.2, value: this.health, maxValue: this.maxHealth });

		for (var i = 0; i < this.bullets.length; i++) {
			var bullet = this.bullets[i];
			var bb = bullet.boundingBox;

			if (devMode == false) {
				bullet.update();
			}

			if (bb.x < (-1024 - bb.width) || bb.y < (-1024 - bb.height) || bb.x + bb.width > (1024 + bb.width) || bb.y + bb.height > (1024 + bb.height)) {
				this.bullets.splice(i, 1);
				i--;
			}
		}
	}

	draw(ctx) {
		ctx.save();
		ctx.lineWidth = ((this.height + this.width) / 2) * 0.1;

		ctx.save();
		ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
		ctx.rotate(Math.atan2(this.velY / 2, this.velX / 2));
		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.bc;
		ctx.beginPath();
		roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, ((this.height + this.width) / 2) * 0.15);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();

		if (this.healthPC < 0.3) {
			draw.image(damagedImage03, -this.width / 2, -this.height / 2, this.width, this.height);
		} else if (this.healthPC < 0.6) {
			draw.image(damagedImage02, -this.width / 2, -this.height / 2, this.width, this.height);
		} else if (this.healthPC < 0.8) {
			draw.image(damagedImage01, -this.width / 2, -this.height / 2, this.width, this.height);
		}

		ctx.restore();

		for (var i = 0; i < this.bullets.length; i++) {
			var bullet = this.bullets[i];

			bullet.draw(ctx);
		}

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.draw(ctx);
		}

		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.bc;
		ctx.beginPath();
		ctx.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
		// roundRect(ctx, -(this.width * 0.35), -(this.height * 0.35), this.height * 0.7, this.height * 0.7, this.height * 0.1);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();

		ctx.save();
		ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
		ctx.rotate(this.gunAngle);
		if (this.healthPC < 0.6) {
			draw.image(damagedImage04, -Math.min(this.width, this.height) / 2, -Math.min(this.width, this.height) / 2, Math.min(this.width, this.height), Math.min(this.width, this.height));
		}
		ctx.restore();

		this.healthBar.draw(ctx);
		ctx.restore();
	}

	shoot() {
		for (var i = 0; i < this.weapons.length; i++) {
			var gun = this.weapons[i];

			gun.shoot();
		}
	}
}

class AITank {
	constructor(x, y, width, height, color, bc, weapons = "basic", health = 1, ai = true, moveable = true, canShoot = true) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.bc = bc;
		this.velX = 0;
		this.velY = 0;
		this.mass = ((this.width / 4) + (this.height / 4)) / (((this.width / 4) + 1) + ((this.height / 4) + 1));
		this.acceleration = 0.8;
		this.gunAngle = 0;
		this.weapons = this.getWeaponsArray(weapons);
		this.weaponClass = weapons;
		this.bullets = [];
		this.reloadTime = 60;
		this.curReloadTime = 0;
		this.maxHealth = (this.width / 2) * (this.height / 2);
		this.health = this.maxHealth * health;
		this.healthPC = this.health / this.maxHealth;
		this.healthBar = new MeterBar(this.x + this.width / 2, this.y + this.height * 1.3, this.width, this.height * 0.2, "#000000", "#00ff00", this.health, this.maxHealth);
		this.ai = ai;
		this.canMove = moveable;
		this.canShoot = canShoot;
		this.pOffset = degreesToRadians(random(-8, 8) * random(1, 1.5));
	}

	getWeaponsArray(weapons) {
		var newWeapons = tankWeapons[weapons];
		return newWeapons(this);
	}

	setWeapons(weapons) {
		var newWeapons = tankWeapons[weapons];
		this.weapons = newWeapons(this);
	}

	update(enemyTarget = { x: 0, y: 0, width: 32, height: 32, velX: 0, velY: 0 }, shoot = true) {
		this.maxHealth = (this.width / 2) * (this.height / 2);
		this.mass = ((this.width / 4) + (this.height / 4)) / (((this.width / 4) + 1) + ((this.height / 4) + 1));

		this.healthPC = this.health / this.maxHealth;

		if (this.ai && this.canShoot) {
			if (this.curReloadTime > 0) {
				this.curReloadTime--;
			}

			if (this.curReloadTime <= 0 && shoot == true) {
				this.shoot();
				this.curReloadTime = this.reloadTime;
			}
		}

		if (this.ai) {
			var enemyAttackAngle = Math.atan2((enemyTarget.y + enemyTarget.height / 2 + (enemyTarget.velY * 2)) - (this.y + this.height / 2), (enemyTarget.x + enemyTarget.width / 2 + (enemyTarget.velX * 2)) - (this.x + this.width / 2));

			var enemyTargetBB = {
				x: enemyTarget.x - 32,
				y: enemyTarget.y - 32,
				width: enemyTarget.width + 96,
				height: enemyTarget.height + 96
			}

			this.gunAngle = enemyAttackAngle;

			var avoidV = Math.atan2(mouse.y - (this.y + this.height / 2), mouse.x - (this.x + this.width / 2));

			if (this.canMove) {
				if (rectangleToRectangleCollisionDetection(enemyTargetBB, this) == false) {
					this.velX += (Math.cos(enemyAttackAngle + this.pOffset) * this.acceleration);
					this.velY += (Math.sin(enemyAttackAngle + this.pOffset) * this.acceleration);
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

		Object.assign(this.healthBar, { x: this.x + this.width / 2, y: this.y + this.height * 1.2, width: this.width, height: this.height * 0.2, value: this.health, maxValue: this.maxHealth });

		for (var i = 0; i < this.bullets.length; i++) {
			var bullet = this.bullets[i];
			var bb = bullet.boundingBox;

			bullet.update();

			if (bb.x < (-1024 - bb.width) || bb.y < (-1024 - bb.height) || bb.x + bb.width > (1024 + bb.width) || bb.y + bb.height > (1024 + bb.height)) {
				this.bullets.splice(i, 1);
				i--;
			}
		}
	}

	draw(ctx) {
		ctx.save();
		ctx.lineWidth = ((this.height + this.width) / 2) * 0.1;

		if (this.canMove) {
			ctx.save();
			ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
			ctx.rotate(Math.atan2(this.velY, this.velX));
			ctx.fillStyle = this.color;
			ctx.strokeStyle = this.bc;
			ctx.beginPath();
			roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, ((this.height + this.width) / 2) * 0.15);
			ctx.fill();
			ctx.stroke();
			ctx.closePath();

			if (this.healthPC < 0.3) {
				draw.image(damagedImage03, -this.width / 2, -this.height / 2, this.width, this.height);
			} else if (this.healthPC < 0.6) {
				draw.image(damagedImage02, -this.width / 2, -this.height / 2, this.width, this.height);
			} else if (this.healthPC < 0.8) {
				draw.image(damagedImage01, -this.width / 2, -this.height / 2, this.width, this.height);
			}
			ctx.restore();
		}

		for (var i = 0; i < this.bullets.length; i++) {
			var bullet = this.bullets[i];

			bullet.draw(ctx);
		}

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.draw(ctx);
		}

		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.bc;
		ctx.beginPath();
		ctx.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();

		ctx.save();
		ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
		ctx.rotate(this.gunAngle);
		if (this.healthPC < 0.6) {
			draw.image(damagedImage04, -Math.min(this.width, this.height) / 2, -Math.min(this.width, this.height) / 2, Math.min(this.width, this.height), Math.min(this.width, this.height));
		}
		ctx.restore();

		this.healthBar.draw(ctx);
		ctx.restore();
	}

	shoot() {
		for (var i = 0; i < this.weapons.length; i++) {
			var gun = this.weapons[i];

			gun.shoot();
		}
	}
}

class HealthStation {
	constructor(x, y, width, height, color, bc, crossColor, weapons = "basic") {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.bc = bc;
		this.crossColor = crossColor;
		this.gunAngle = 0;
		this.weapons = this.getWeaponsArray(weapons);
		this.weaponClass = weapons;
		this.reloadTime = 300;
		this.curReloadTime = 0;
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

		if (this.curReloadTime <= 0) {
			this.shoot(infoMapVar);
			this.curReloadTime = this.reloadTime;
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
	}

	draw(ctx) {
		ctx.save();
		ctx.lineWidth = ((this.height + this.width) / 2) * 0.1;

		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.bc;
		ctx.beginPath();
		roundRect(ctx, this.x, this.y, this.width, this.height, ((this.height + this.width) / 2) * 0.15);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();

		for (var i = 0; i < this.weapons.length; i++) {
			var weapon = this.weapons[i];

			weapon.draw(ctx);
		}

		// ctx.lineWidth = ((this.height + this.width) / 2) * 0.1;
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.height, this.width) * 0.35, 0, 2 * Math.PI);
		ctx.fill()
		ctx.stroke();
		ctx.closePath();

		ctx.fillStyle = this.crossColor;
		ctx.save();
		ctx.translate(this.x + (this.width / 2), this.y + (this.height / 2));
		ctx.beginPath();
		ctx.rect(-(Math.min(this.height, this.width) * 0.35) / 2, -Math.min(this.height, this.width) * 0.05, Math.min(this.height, this.width) * 0.35, Math.min(this.height, this.width) * 0.1);
		ctx.fill();
		ctx.closePath();
		ctx.beginPath();
		ctx.rect(-Math.min(this.height, this.width) * 0.05, -(Math.min(this.height, this.width) * 0.35) / 2, Math.min(this.height, this.width) * 0.1, Math.min(this.height, this.width) * 0.35);
		ctx.fill();
		ctx.closePath();
		ctx.restore();
		ctx.restore();
	}

	shoot(infoMapVar) {
		for (var i = 0; i < this.weapons.length; i++) {
			var gun = this.weapons[i];
			var rawVelX = Math.cos(this.gunAngle + gun.rotation);
			var rawVelY = Math.sin(this.gunAngle + gun.rotation + degreesToRadians(random(-5, 5)));
			var averageWH = (this.width + this.height) * 0.15;

			var velX = rawVelX * averageWH;
			var velY = rawVelY * averageWH;
			infoMapVar.createPickup((this.x + this.width / 2) + (rawVelX * (gun.width - gun.height)), (this.y + (this.height / 2) - (gun.height / 2)) + (rawVelY * (gun.width - gun.height / 2)), gun.height, gun.height, velX, velY, "healthkit");
		}
	}
}

class Gun {
	constructor(parent, x, y, width, height, color, bc, rotation, bulletHealth, bulletSpeed, bulletDamage, isADetail = false, overideBulletColor, overideBulletBC) {
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
		this.overideBulletColor = overideBulletColor;
		this.overideBulletBC = overideBulletBC;
		this.delay = 0;
	}

	draw(ctx) {
		ctx.save();
		ctx.translate(this.parent.x + this.parent.width / 2, this.parent.y + this.parent.height / 2);
		ctx.rotate(this.parent.gunAngle);
		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.bc;
		ctx.beginPath();
		if (this.parent.curReloadTime) {
			roundRect(ctx, this.x - ((this.parent.curReloadTime / this.parent.reloadTime) * Math.min(this.parent.height, this.parent.width) * 0.2), this.y, this.width, this.height, this.parent.height * 0.07);
		} else {
			roundRect(ctx, this.x, this.y, this.width, this.height, this.parent.height * 0.07);
		}
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		ctx.restore();
	}

	shoot() {
		if (this.isADetail) {
			return;
		}

		var particleSpeed = this.width + this.height;

		var rawVel = this.parent.gunAngle + this.rotation + degreesToRadians(random(-2, 2));

		var rawVelX = Math.cos(rawVel);
		var rawVelY = Math.sin(rawVel);

		var velX = rawVelX * this.bulletSpeed;
		var velY = rawVelY * this.bulletSpeed;

		var barrelRadius = this.width - (this.height / 2);
		var parentCX = this.parent.x + (this.parent.width / 2);
		var parentCY = this.parent.y + (this.parent.height / 2);
		var gunY = this.y + (this.height / 2);

		if (this.parent == player) {
			var particleS = new DirectionalParticleSpawner(pgPhy, parentCX + (rawVelX * (barrelRadius + this.x)), parentCY + (rawVelY * (barrelRadius + this.x)), this.height / 2, { min: this.height / 8, max: this.height / 3 }, { min: this.bulletSpeed * 0.1, max: this.bulletSpeed * 1.2 }, 10, ["#ffdd20"], /*17,*/ { min: rawVel, max: rawVel });
			particleS.activate();
		}

		if (this.overideBulletColor) {
			this.parent.bullets.push(new Bullet(this.parent, parentCX + (rawVelX * (barrelRadius + this.x)), parentCY + (rawVelY * (barrelRadius + this.x)), this.height / 2, this.overideBulletColor, this.overideBulletBC, velX, velY, this.bulletHealth, this.bulletSpeed, this.bulletDamage));
		} else {
			this.parent.bullets.push(new Bullet(this.parent, parentCX + (rawVelX * (barrelRadius + this.x)) + gunY, parentCY + (rawVelY * (barrelRadius + this.x)) + gunY, this.height / 2, this.parent.color, this.parent.bc, velX, velY, this.bulletHealth, this.bulletSpeed, this.bulletDamage));
		}
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
		this.boundingBox = {
			x: this.x - this.radius,
			y: this.y - this.radius,
			width: this.radius * 2,
			height: this.radius * 2
		}
	}

	update() {
		Object.assign(this.boundingBox, {
			x: this.x - this.radius,
			y: this.y - this.radius,
			width: this.radius * 2,
			height: this.radius * 2
		});

		this.x += this.velX;
		this.y += this.velY;
	}

	draw(ctx) {
		ctx.save();
		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.bc;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		// roundRect(ctx, this.boundingBox.x, this.boundingBox.y, this.boundingBox.width, this.boundingBox.height, 2);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		ctx.restore();
	}
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

	createDummy(x, y, width, height, color, bc, weapons, gunAngle) {
		this.dummies.push(new NPCTank(x, y, width, height, color, bc, weapons, gunAngle));
		this.dm.push({ x: x, y: y, width: width, height: height, color: color, bc: bc, weapons: weapons, gunAngle: gunAngle });
	}

	createHealthStation(x, y, width, height, color, bc, crossColor, weapons = "basic") {
		this.healthStations.push(new HealthStation(x, y, width, height, color, bc, crossColor, weapons));
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

				if (map[i][j] === 3) {
					this.createHealthStation(tileOffsetX + (gridSize / 4), tileOffsetY + (gridSize / 4), gridSize / 2, gridSize / 2, "#ff0000", "#800000", "#ffffff", "basic");
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "#808080", "#606060", 1);
				}

				if (map[i][j] === 4) {
					this.createWall(tileOffsetX, tileOffsetY, gridSize * 3, gridSize * 3, "transparent", "transparent", 2);
					this.createDummy(tileOffsetX + (gridSize * 1.5), tileOffsetY + (gridSize * 1.5), 32, 32, "#00ffff", "#008080", "basic", degreesToRadians(190));
					this.createImage(tileOffsetX, tileOffsetY, gridSize * 3, gridSize * 3, workshopImage);
				}

				if (map[i][j] === 5) {
					this.createWall(tileOffsetX, tileOffsetY, gridSize, gridSize, "transparent", "transparent", 1);
				}

				if (map[i][j] === 6) {
					this.setPlayerStart(tileOffsetX, tileOffsetY, 32, 32);
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

		for (var i = 0; i < infoMap.pickups.length; i++) {
			var pickup = infoMap.pickups[i];

			pickup.velX *= friction;
			pickup.velY *= friction;

			pickup.x += pickup.velX;
			pickup.y += pickup.velY;
		}
	}

	draw(ctx) {
		for (var i = 0; i < this.walls.length; i++) {
			var wall = this.walls[i];

			ctx.save();
			ctx.lineWidth = ((wall.width / 4) + (wall.height / 4)) * 0.05;
			ctx.strokeStyle = wall.bc;
			ctx.fillStyle = wall.color;
			ctx.beginPath();
			ctx.rect(wall.x, wall.y, wall.width, wall.height);
			ctx.fill();
			ctx.stroke();
			ctx.closePath();
			ctx.restore();

			if (wall.type === 2) {
				ctx.drawImage(workshopImage, wall.x, wall.y, wall.width, wall.height);
			}
		}

		for (var i = 0; i < this.images.length; i++) {
			var decal = this.images[i];

			ctx.drawImage(decal.image, decal.x, decal.y, decal.width, decal.height);
		}

		for (var i = 0; i < this.pickups.length; i++) {
			var pickup = this.pickups[i];

			if (pickup.type = "healthkit") {
				ctx.save();
				ctx.lineWidth = ((pickup.width / 4) + (pickup.height / 4)) * 0.05;
				ctx.fillStyle = "#ffffff";
				ctx.strokeStyle = "#000000";
				ctx.beginPath();
				ctx.rect(pickup.x, pickup.y, pickup.width, pickup.height);
				ctx.fill();
				ctx.stroke();
				ctx.closePath();

				ctx.fillStyle = "#ff0000";
				ctx.beginPath();
				ctx.rect(pickup.x + (pickup.width / 2) - (pickup.width * 0.1), pickup.y + (pickup.height * 0.1), pickup.width * 0.2, pickup.height * 0.8);
				ctx.fill();
				ctx.closePath();
				ctx.beginPath();
				ctx.rect(pickup.x + (pickup.width * 0.1), pickup.y + (pickup.height / 2) - (pickup.height * 0.1), pickup.width * 0.8, pickup.height * 0.2);
				ctx.fill();
				ctx.closePath();
				ctx.restore();
			}
		}

		for (var i = 0; i < this.healthStations.length; i++) {
			var healthStation = this.healthStations[i];
			healthStation.draw(ctx);
		}

		for (var i = 0; i < this.dummies.length; i++) {
			var dummy = this.dummies[i];

			dummy.draw(ctx);
		}
	}

	import() {
		var code = prompt("WARNING: Importing a map will wipe the current map. Import Code Here:");
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
	[0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
	[0, 0, 1, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

var player = new Player(-16, -16, 32, 32, "#00ff00", "#008000", "devS");

// var player2 = new Player(16, -16, 32, 32, "#00ffff", "#008080", "shotgun");

var infoMap = new Info_Map(128);
var worldScale = 1;
var zoomingDampener = 0.95;
var draw = new Draw(gCtx);

var devSelectItem = document.getElementById("devSelectItem");
var devGridSize = document.getElementById("devGridSize");
var devMouseAction = document.getElementById("devMouseAction");
var exportMapButton = document.getElementById("exportMapButton");
var importMapButton = document.getElementById("importMapButton");
var exportCodeDisplay = document.getElementById("exportCodeDisplay");

exportMapButton.onclick = function () {
	navigator.clipboard.writeText(infoMap.export());
	alert("Copied level to clipboard.");
}

importMapButton.onclick = function () {
	infoMap.import();
}

devGridSize.value = 32;
devMouseAction.value = "create";
devSelectItem.value = "wall";

var enemies = [];
var allies = [];

var pgPhy = new PgPhysics(scene, gCtx);

function spawnAlly(x = snapNumberToGrid(random(-1024, 1024), 32), y = snapNumberToGrid(random(-1024, 1024), 32), width = 32, height = 32, color = "#0000ff", bc = "#000080", weapons = "basic", health = 1, ai = true, moveable = true, canShoot = true) {
	allies.push(new AITank(x, y, width, height, color, bc, weapons, health, ai, moveable, canShoot));
}

function spawnEnemy(x = snapNumberToGrid(random(-1024, 1024), 32), y = snapNumberToGrid(random(-1024, 1024), 32), width = 32, height = 32, color = "#ff0000", bc = "#800000", weapons = "basic", health = 1, ai = true, moveable = false, canShoot = true) {
	enemies.push(new AITank(x, y, width, height, color, bc, weapons, health, ai, moveable, canShoot));
}

class DevEditor {
	constructor() {
		this.gridMouseX = 0;
		this.gridMouseY = 0;
		this.prevGridMouseX = 0;
		this.prevGridMouseY = 0;
		this.selectedBlock = devSelectItem.value;
		this.gridSize = +devGridSize.value;
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

	draw(ctx) {
		if (this.mouseAction === "create") {
			ctx.fillStyle = "#ffffff80";
			ctx.beginPath();
			ctx.rect(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize);
			ctx.fill();
			ctx.closePath();
		}

		if (infoMap.playerStart.active == true) {
			draw.image(playerStartImage, infoMap.playerStart.x - (infoMap.playerStart.width / 2), infoMap.playerStart.y - (infoMap.playerStart.height / 2), infoMap.playerStart.width * 2, infoMap.playerStart.height * 2);
		}
	}

	place() {
		var tankC = pickRandomItemFromArray(tankColors);
		switch (this.selectedBlock) {
			case "wall":
				infoMap.createWall(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#808080", "#606060", 1);
				break;
			case "enemy":
				spawnEnemy(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#ff0000", "#800000", "basic", 1, true, true, true);
				break;
			case "ally":
				spawnAlly(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, "#0000ff", "#000080", "basic", 1, true, true, true);
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
			case "dummy":
				infoMap.createDummy(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize, tankC.color, tankC.bc, "basic", 0);
				break;
			case "player_start":
				infoMap.setPlayerStart(this.gridMouseX, this.gridMouseY, this.gridSize, this.gridSize);
				infoMap.playerStart.active = true;
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

		for (var i = 0; i < enemies.length; i++) {
			var enemy = enemies[i];
			if (pointToRectangleCollisionDetection(mouse, enemy)) {
				enemies.splice(i, 1);
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

devSelectItem.oninput = function () {
	devEditor.selectedBlock = devSelectItem.value;
	scene.focus();
}

devGridSize.oninput = function () {
	devEditor.gridSize = +devGridSize.value;
	scene.focus();
}

devMouseAction.oninput = function () {
	devEditor.mouseAction = devMouseAction.value;
	scene.focus();
}

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

	// for (var i = 0; i < 2; i++) {
	// spawnAlly();
	// }
	// for (var i = 0; i < 5; i++) {
	// 	spawnEnemy();
	// }

	// infoMap.pickups = [];
	// infoMap.healthStations = [];
	// infoMap.walls = [];
	// infoMap.dummies = [];
	// infoMap.images = [];


	// infoMap.load(map01, false);
	// infoMap.load(map02, false, 1250, 1250, 64);
	// infoMap.load(map03, false, 1568, 1368, 32);
}

function drawGrid(ctx, x, y, width, height, gridCellSize = 16, options = {}) {
	ctx.save();
	Object.assign(ctx, options);
	ctx.beginPath();

	for (var lx = x; lx <= x + width; lx += gridCellSize) {
		ctx.moveTo(lx, y);
		ctx.lineTo(lx, y + height);
	}

	for (var ly = y; ly <= y + height; ly += gridCellSize) {
		ctx.moveTo(x, ly);
		ctx.lineTo(x + width, ly);
	}

	ctx.stroke();
	ctx.closePath();
	ctx.restore();
}

function setPlayerStats(setSize) {
	if (setSize == true) {
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

var upgradeStore = document.getElementById("store");
var equippedWeaponSelect = document.getElementById("equippedWeapon");
var store = new Store(upgradeStore);
var shopDrawLoop;

var tankClasses = [...document.querySelectorAll("[data-tank-class]")];

equippedWeaponSelect.oninput = function () {
	player.setWeapons(equippedWeaponSelect.value);
}

tankClasses.forEach((weapon) => {
	weapon.onclick = function () {
		var weaponCost = +weapon.dataset.tankClassCost;
		if (player.coins >= weaponCost) {
			player.coins -= weaponCost;
			player.setWeapons(weapon.dataset.tankClass);
			weapon.remove();
		}
	}
});

function shopTick() {
	tankClasses.forEach((weapon) => {
		var weaponCost = +weapon.dataset.tankClassCost;
		if (player.coins >= weaponCost) {
			weapon.className = "green-btn";
		} else {
			weapon.className = "red-btn";
		}
	});
}

function main() {
	gCtx.lineWidth = 3;
	gCtx.lineCap = "round";
	gCtx.lineJoin = "round";

	if (devMode == true && trueDev == false) {
		devMode = false;
	}

	if (worldScale <= 0) {
		worldScale = 0.001;
	}

	if (devMode == false) {
		worldScale = 1;
	}

	if (devMode == true) {
		devEditor.update();
	}

	if (devMode == true) {
		document.getElementById("devMenu").style.display = "flex";
	} else {
		document.getElementById("devMenu").style.display = "none";
	}

	// if (Math.random() < 0.01 && allies.length < 2) {
	// 	spawnAlly();
	// }

	// if (Math.random() < 0.01 && enemies.length < 5) {
	// 	spawnEnemy();
	// }

	player.update();

	if (devMode == false) {
		// player2.update();

		infoMap.update();

		for (var i = 0; i < infoMap.pickups.length; i++) {
			var pickup = infoMap.pickups[i];
			var pw = pickup.width;
			var ph = pickup.height;

			if (pickup.type === "healthkit") {
				if (rectangleToRectangleCollisionDetection(player, pickup)) {
					if (player.health < player.maxHealth) {
						infoMap.pickups.splice(i, 1);
						i--;
						player.health += ((pw) + (ph));
					}
				}
			}
		}

		for (var i = 0; i < enemies.length; i++) {
			var enemy = enemies[i];
			if (allies.length > 0) {
				enemy.update(allies[i % allies.length]);
			} else {
				enemy.update(player);
			}

			if (rectangleToRectangleCollisionDetection(player, enemy)) {
				rectangleToRectangleCollisionResolutionTwoMovingObjects(player, enemy);
			}

			for (var j = i + 1; j < enemies.length; j++) {
				var enemy2 = enemies[j];
				if (j != i) {
					if (rectangleToRectangleCollisionDetection(enemy, enemy2)) {
						rectangleToRectangleCollisionResolutionTwoMovingObjects(enemy, enemy2);
					}
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
			if (enemies.length > 0) {
				ally.update(enemies[i % enemies.length]);
			} else {
				ally.update(player, false);
			}

			if (rectangleToRectangleCollisionDetection(player, ally)) {
				rectangleToRectangleCollisionResolutionTwoMovingObjects(player, ally);
			}

			for (var j = i + 1; j < allies.length; j++) {
				var ally2 = allies[j];
				if (j != i) {
					if (rectangleToRectangleCollisionDetection(ally, ally2)) {
						rectangleToRectangleCollisionResolutionTwoMovingObjects(ally, ally2);
					}
				}
			}
		}

		for (var i = 0; i < infoMap.walls.length; i++) {
			var wall = infoMap.walls[i];

			if (wall.type === 1) {
				if (rectangleToRectangleCollisionDetection(player, wall)) {
					rectangleToRectangleCollisionResolution(player, wall);
				}

				for (var j = 0; j < player.bullets.length; j++) {
					var bullet = player.bullets[j];

					if (rectangleToRectangleCollisionDetection(bullet.boundingBox, wall)) {
						player.bullets.splice(j, 1);
						j--;
					}
				}

				for (var j = 0; j < enemies.length; j++) {
					var enemy = enemies[j];

					if (rectangleToRectangleCollisionDetection(enemy, wall) && enemy.canMove) {
						rectangleToRectangleCollisionResolution(enemy, wall);
					}

					for (var k = 0; k < enemy.bullets.length; k++) {
						var bullet = enemy.bullets[k];

						if (rectangleToRectangleCollisionDetection(bullet.boundingBox, wall)) {
							enemy.bullets.splice(k, 1);
							k--;
						}
					}
				}

				for (var j = 0; j < allies.length; j++) {
					var ally = allies[j];

					if (rectangleToRectangleCollisionDetection(ally, wall) && ally.canMove) {
						rectangleToRectangleCollisionResolution(ally, wall);
					}

					for (var k = 0; k < ally.bullets.length; k++) {
						var bullet = ally.bullets[k];

						if (rectangleToRectangleCollisionDetection(bullet.boundingBox, wall)) {
							ally.bullets.splice(k, 1);
							k--;
						}
					}
				}
			}

			if (wall.type === 2) {
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

				if (rectangleToRectangleCollisionDetection(bullet.boundingBox, enemy)) {
					var averagel = ((enemy.width + enemy.height) / 2);
					var particleS = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel / 2, { min: averagel * 0.02, max: averagel * 0.05 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 8, ["#ffdd20"]);
					var particleS2 = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel / 2, { min: averagel * 0.05, max: averagel * 0.1 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 2, ["#ff2020"]);
					particleS.activate();
					particleS2.activate();
					enemy.health -= bullet.damage;
					bullet.health -= enemy.width / 1.5;
					if (bullet.health <= 0) {
						player.bullets.splice(j, 1);
						j--;
					}

					if (enemy.health <= 0) {
						var particleS3 = new ParticleSpawner(pgPhy, (enemy.x + enemy.width / 2), (enemy.y + enemy.height / 2), averagel, { min: averagel * 0.1, max: averagel * 0.15 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 25, ["#ffdd20", "#606060"]);
						particleS3.activate();
						// spriteSheet.renderSpriteSheet(explosion01, enemy.x - enemy.width, enemy.y - enemy.height, enemy.width * 3, enemy.height * 3, 4, 4, 16);
						enemies.splice(i, 1);
						i--;
						break;
					}
				}
			}
		}

		for (var i = 0; i < enemies.length; i++) {
			var enemy = enemies[i];

			for (var j = 0; j < enemy.bullets.length; j++) {
				var bullet = enemy.bullets[j];

				for (var k = 0; k < allies.length; k++) {
					var ally = allies[k];

					if (rectangleToRectangleCollisionDetection(bullet.boundingBox, ally)) {
						ally.health -= bullet.damage;
						bullet.health -= ally.width / 1.5;
						if (bullet.health <= 0) {
							enemy.bullets.splice(j, 1);
							j--;
						}

						if (ally.health <= 0) {
							allies.splice(k, 1);
							k--;
						}
					}
				}

				if (rectangleToRectangleCollisionDetection(bullet.boundingBox, player)) {
					var averagel = ((player.width + player.height) / 2);
					var particleS = new ParticleSpawner(pgPhy, (player.x + player.width / 2), (player.y + player.height / 2), averagel / 2, { min: averagel * 0.02, max: averagel * 0.05 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 8, ["#ffdd20"]);
					var particleS2 = new ParticleSpawner(pgPhy, (player.x + player.width / 2), (player.y + player.height / 2), averagel / 2, { min: averagel * 0.05, max: averagel * 0.1 }, { min: averagel * 0.1, max: averagel / 2 }, { min: averagel * 0.1, max: averagel / 2 }, 2, ["#20ff20"]);
					particleS.activate();
					particleS2.activate();
					player.health -= bullet.damage;
					bullet.health -= player.width / 1.5;
					if (bullet.health <= 0) {
						enemy.bullets.splice(j, 1);
						j--;
					}

					if (player.health <= 0) {
						resetGame();
					}
				}
			}
		}

		for (var i = 0; i < allies.length; i++) {
			var ally = allies[i];

			for (var j = 0; j < ally.bullets.length; j++) {
				var bullet = ally.bullets[j];

				for (var k = 0; k < enemies.length; k++) {
					var enemy = enemies[k];
					if (rectangleToRectangleCollisionDetection(bullet.boundingBox, enemy)) {
						enemy.health -= bullet.damage;
						bullet.health -= enemy.width / 1.5;
						if (bullet.health <= 0) {
							ally.bullets.splice(j, 1);
							j--;
						}

						if (enemy.health <= 0) {
							enemies.splice(k, 1);
							k--;
						}
					}
				}
			}
		}

	}

	Object.assign(player.healthBar, { x: player.x + player.width / 2, y: player.y + player.height * 1.2, width: player.width, height: player.height * 0.2, value: player.health, maxValue: player.maxHealth });

	for (var i = 0; i < enemies.length; i++) {
		var enemy = enemies[i];
		Object.assign(enemy.healthBar, { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height * 1.2, width: enemy.width, height: enemy.height * 0.2, value: enemy.health, maxValue: enemy.maxHealth });
	}

	pgPhy.update();

	gCtx.save();

	gCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

	gCtx.clearRect(0, 0, vWidth, vHeight);
	gCtx.fillStyle = "#808080";
	gCtx.fillRect(0, 0, vWidth, vHeight);

	gCtx.scale(worldScale, worldScale);
	gCtx.translate(-(player.x - (vWidth / (worldScale * 2)) + player.width / 2 + cameraOffsetX), -(player.y - (vHeight / (worldScale * 2)) + player.height / 2 + cameraOffsetY));

	if (devMode == true) {
		gCtx.fillStyle = "#202020";
		gCtx.fillRect(-1024, -1024, 2048, 2048);

		drawGrid(gCtx, -1024, -1024, 2048, 2048, devEditor.gridSize, { strokeStyle: "#606060", lineWidth: 1 });
	} else {
		var gradient01 = gCtx.createRadialGradient(0, 0, 10, 0, 0, 1024);
		gradient01.addColorStop(0, "#303030");
		gradient01.addColorStop(1, "#202020");
		gCtx.fillStyle = gradient01;
		gCtx.fillRect(-1024, -1024, 2048, 2048);
		drawGrid(gCtx, -1024, -1024, 2048, 2048, 32, { strokeStyle: "#707070", lineWidth: 1 });
	}

	infoMap.draw(gCtx);

	pgPhy.render(false, false);

	if (devMode == false) {
		player.draw(gCtx);
	}

	// player2.draw(gCtx);

	for (var i = 0; i < allies.length; i++) {
		var ally = allies[i];

		ally.draw(gCtx);
	}

	for (var i = 0; i < enemies.length; i++) {
		var enemy = enemies[i];

		enemy.draw(gCtx);
	}

	spriteSheet.draw();

	if (devMode == true) {
		devEditor.draw(gCtx);
	}

	gCtx.restore();

	gCtx.save();
	gCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

	if (devMode == true) {
		draw.text("DEV MODE", 15, 15, true, false, { textBaseline: "top", textAlign: "left", fillStyle: "#ffffff", font: "bold 16px arial" });
	}

	if (joystick.active == true) {
		gCtx.fillStyle = "#80808080";
		gCtx.beginPath();
		gCtx.arc(joystick.previous.x, joystick.previous.y, 50, 0, Math.PI * 2);
		gCtx.closePath();
		gCtx.fill();

		gCtx.fillStyle = "#cccccc80";
		gCtx.beginPath();
		gCtx.arc(joystick.previous.x + (joystick.vx * 25), joystick.previous.y + (joystick.vy * 25), 25, 0, Math.PI * 2);
		gCtx.closePath();
		gCtx.fill();
	}
	gCtx.restore();

	// gCtx.beginPath();
	// gCtx.strokeStyle = "#ff0000";
	// gCtx.moveTo(vWidth / 2, 0);
	// gCtx.lineTo(vWidth / 2, vHeight);
	// gCtx.moveTo(0, vHeight / 2);
	// gCtx.lineTo(vWidth, vHeight / 2);
	// gCtx.stroke();
	// gCtx.closePath();
}

window.onload = function () {
	resetGame();
	gameLoop = setInterval(main, 1000 / fps);

	new URLSearchParams(window.location.search).forEach((value, name) => {
		if (name === "dev") {
			devMode = true;
			trueDev = true;
		}
	});
}

document.addEventListener("keydown", (e) => {
	keysDown[e.key] = true;

	if (keysDown["z"] && trueDev == true) {
		if (devMode == true) {
			setPlayerStats(true);
			devMode = false;
		} else {
			devMode = true;
		}
	}
});

document.addEventListener("keyup", (e) => {
	keysDown[e.key] = false;
});

document.body.onwheel = function (e) {
	if (devMode == true) {
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
}

window.addEventListener("resize", () => {
	vWidth = window.innerWidth;
	vHeight = window.innerHeight;
	scene.width = vWidth * window.devicePixelRatio;
	scene.height = vHeight * window.devicePixelRatio;
});

window.addEventListener("mousemove", (e) => {
	if (!mobile) {
		mouse.x = (e.clientX + (player.x * worldScale) + (player.width / 2 * worldScale) - (vWidth / 2)) / worldScale + cameraOffsetX;
		mouse.y = (e.clientY + (player.y * worldScale) + (player.height / 2 * worldScale) - (vHeight / 2)) / worldScale + cameraOffsetY;

		// player.gunAngle = Math.atan2(e.clientY - (vHeight / 2), e.clientX - (vWidth / 2));

		player.gunAngle = Math.atan2(mouse.y - player.cy, mouse.x - player.cx);

		// player2.gunAngle = Math.atan2(mouse.y - player2.cy, mouse.x - player2.cx);

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
	}
});

window.addEventListener("touchmove", (e) => {
	mouse.x = (e.touches[0].clientX + (player.x * worldScale) + (player.width / 2 * worldScale) - (vWidth / 2)) / worldScale + cameraOffsetX;
	mouse.y = (e.touches[0].clientY + (player.y * worldScale) + (player.height / 2 * worldScale) - (vHeight / 2)) / worldScale + cameraOffsetY;

	joystick.x = e.touches[0].clientX;
	joystick.y = e.touches[0].clientY;

	var joyV = Math.atan2(joystick.y - joystick.previous.y, joystick.x - joystick.previous.x);

	var powerX = clamp(0, 25, Math.abs(joystick.x - joystick.previous.x)) / 25;
	var powerY = clamp(0, 25, Math.abs(joystick.y - joystick.previous.y)) / 25;

	joystick.vx = Math.cos(joyV) * powerX;
	joystick.vy = Math.sin(joyV) * powerY;

	if (e.touches[1]) {
		player.gunAngle = Math.atan2(e.touches[1].clientY - (vHeight / 2), e.touches[1].clientX - (vWidth / 2));
	} else {
		player.gunAngle = Math.atan2(joystick.vy, joystick.vx);
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

window.oncontextmenu = function (e) {
	e.preventDefault();
}

scene.addEventListener("mousedown", (e) => {
	if (!mobile) {
		mouse.x = (e.clientX + (player.x * worldScale) + (player.width / 2 * worldScale) - (vWidth / 2)) / worldScale + cameraOffsetX;
		mouse.y = (e.clientY + (player.y * worldScale) + (player.height / 2 * worldScale) - (vHeight / 2)) / worldScale + cameraOffsetY;

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

		mouse.down = true;
		if (devMode == true) {
			if (devEditor.mouseAction === "create") {
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
	mouse.x = (e.touches[0].clientX + (player.x * worldScale) + (player.width / 2 * worldScale) - (vWidth / 2)) / worldScale + cameraOffsetX;
	mouse.y = (e.touches[0].clientY + (player.y * worldScale) + (player.height / 2 * worldScale) - (vHeight / 2)) / worldScale + cameraOffsetY;

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

	mouse.down = true;
	joystick.active = true;
	if (!e.touches[1]) {
		joystick.previous.x = e.touches[0].clientX;
		joystick.previous.y = e.touches[0].clientY;
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
	}
});

scene.addEventListener("touchend", (e) => {
	mouse.down = false;

	if (!e.touches[0]) {
		joystick.active = false;
		joystick.previous.x = joystick.x;
		joystick.previous.y = joystick.y;
		joystick.vx = 0;
		joystick.vy = 0;
	}
});