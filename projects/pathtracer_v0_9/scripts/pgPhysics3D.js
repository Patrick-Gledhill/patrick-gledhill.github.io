/**
 * @type { HTMLCanvasElement }
 */
var scene = document.getElementById("scene");
var ctx = scene.getContext("2d");

var vWidth = window.innerWidth;
var vHeight = window.innerHeight;

var updateLoop;
var keysDown = [];

var tFps = 60;

var cloud01 = new Image();
cloud01.src = "./assets/cloud.png";

var vColors = [
	"#00ff00", "#ff0000",
	"#0000ff", "#ffff00",
	"#00ffff", "#ff00ff"
];

function sphericalToCartesian(radius, theta, phi) {
	var x = radius * Math.sin(theta) * Math.cos(phi);
	var y = radius * Math.sin(theta) * Math.sin(phi);
	var z = radius * Math.cos(theta);
	return { x, y, z };
}


function random(min, max) {
	return Math.random() * (max - min) + min;
}

function pickRandomItemFromArray(array = []) {
	return array[Math.floor(Math.random() * array.length)];
}

var degToRad = (Math.PI / 180);

function clamp(min, max, value) {
	return Math.min(Math.max(value, min), max);
}

function resizeCanvas() {
	vWidth = window.innerWidth;
	vHeight = window.innerHeight;
	scene.width = vWidth;
	scene.height = vHeight;
}

resizeCanvas();

class Particle {
	constructor(x, y, z, radius, velX, velY, velZ, color, bounciness = 0.6) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.radius = radius;
		this.velX = velX;
		this.velY = velY;
		this.velZ = velZ;
		this.color = color;
		this.bounciness = bounciness;
		this.proj = {};
		this.prevProj = {};
	}
}

class Matrix {
	constructor(data) {
		this.data = data;
		this.rows = data.length;
		this.cols = data[0].length;
	}

	static identity(size) {
		var data = [];
		for (var i = 0; i < size; i++) {
			data[i] = [];
			for (var j = 0; j < size; j++) {
				data[i][j] = i === j ? 1 : 0;
			}
		}
		return new Matrix(data);
	}

	add(other) {
		if (this.rows !== other.rows || this.cols !== other.cols) {
			throw new Error("Matrices must have the same dimensions to add");
		}
		var result = [];
		for (var i = 0; i < this.rows; i++) {
			result[i] = [];
			for (var j = 0; j < this.cols; j++) {
				result[i][j] = this.data[i][j] + other.data[i][j];
			}
		}
		return new Matrix(result);
	}

	subtract(other) {
		if (this.rows !== other.rows || this.cols !== other.cols) {
			throw new Error("Matrices must have the same dimensions to subtract");
		}
		var result = [];
		for (var i = 0; i < this.rows; i++) {
			result[i] = [];
			for (var j = 0; j < this.cols; j++) {
				result[i][j] = this.data[i][j] - other.data[i][j];
			}
		}
		return new Matrix(result);
	}

	multiply(other) {
		if (this.cols !== other.rows) {
			throw new Error("Matrix multiplication not possible with these dimensions");
		}
		var result = [];
		for (var i = 0; i < this.rows; i++) {
			result[i] = [];
			for (var j = 0; j < other.cols; j++) {
				result[i][j] = 0;
				for (var k = 0; k < this.cols; k++) {
					result[i][j] += this.data[i][k] * other.data[k][j];
				}
			}
		}
		return new Matrix(result);
	}
}

class Camera {
	constructor(x, y, z, hfov, zNear, zFar) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.hfov = hfov;
		this.zNear = zNear;
		this.zFar = zFar;
		this.velX = 0;
		this.velY = 0;
		this.velZ = 0;
		this.rotation = {
			x: 0,
			y: 0,
			z: 0
		};
	}

	project3DPointTo2D(point) {
		var cosX = Math.cos(this.rotation.x * degToRad);
		var sinX = Math.sin(this.rotation.x * degToRad);
		var cosY = Math.cos(this.rotation.y * degToRad);
		var sinY = Math.sin(this.rotation.y * degToRad);
		var cosZ = Math.cos(this.rotation.z * degToRad);
		var sinZ = Math.sin(this.rotation.z * degToRad);

		var focalLength = (vWidth / 2) / Math.tan((this.hfov / 2) * degToRad);

		var rotX = new Matrix([
			[1, 0, 0, 0],
			[0, cosX, -sinX, 0],
			[0, sinX, cosX, 0],
			[0, 0, 0, 1]
		]);

		var rotY = new Matrix([
			[cosY, 0, sinY, 0],
			[0, 1, 0, 0],
			[-sinY, 0, cosY, 0],
			[0, 0, 0, 1]
		]);

		var rotZ = new Matrix([
			[cosZ, -sinZ, 0, 0],
			[sinZ, cosZ, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		]);

		var rotationMatrix = rotX.multiply(rotY).multiply(rotZ);

		var translationMatrix = new Matrix([
			[1, 0, 0, -this.x],
			[0, 1, 0, -this.y],
			[0, 0, 1, -this.z],
			[0, 0, 0, 1]
		]);

		var transformationMatrix = rotationMatrix.multiply(translationMatrix);

		var transformedPoint = {
			x: transformationMatrix.data[0][0] * point.x + transformationMatrix.data[0][1] * point.y + transformationMatrix.data[0][2] * point.z + transformationMatrix.data[0][3],
			y: transformationMatrix.data[1][0] * point.x + transformationMatrix.data[1][1] * point.y + transformationMatrix.data[1][2] * point.z + transformationMatrix.data[1][3],
			z: transformationMatrix.data[2][0] * point.x + transformationMatrix.data[2][1] * point.y + transformationMatrix.data[2][2] * point.z + transformationMatrix.data[2][3]
		}

		var scaleFactor = focalLength / transformedPoint.z;

		return {
			x: (transformedPoint.x * scaleFactor) + vWidth / 2,
			y: (-transformedPoint.y * scaleFactor) + vHeight / 2,
			z: transformedPoint.z,
			scale: scaleFactor
		};
	}
}

class ParticleSpawner {
	constructor(pgPhyEngine, x, y, z, particleSizeRange = { min: 1, max: 5 }, particleSpeedRange = { min: 0, max: 10 }, particleCount, particleColors = ["#00ff00"]) {
		this.pgPhyEngine = pgPhyEngine;
		this.x = x;
		this.y = y;
		this.z = z;
		this.particleSizeRange = particleSizeRange;
		this.particleSpeedRange = particleSpeedRange;
		this.particleCount = particleCount;
		this.particleColors = particleColors;
	}

	activate() {
		// Problem Here
		for (var i = 0; i < this.particleCount; i++) {
			var speed = random(this.particleSpeedRange.min, this.particleSpeedRange.max);
			var radius = random(this.particleSizeRange.min, this.particleSizeRange.max);
			var theta = random(0, Math.PI);  // Polar angle
			var phi = random(0, 2 * Math.PI); // Azimuthal angle

			// Convert spherical coordinates to Cartesian coordinates
			var cartesianCoords = sphericalToCartesian(speed, theta, phi);

			var velX = cartesianCoords.x;
			var velY = cartesianCoords.y;
			var velZ = cartesianCoords.z;

			this.pgPhyEngine.createParticle(this.x, this.y, this.z, radius, velX, velY, velZ, pickRandomItemFromArray(this.particleColors), 0.7);

		}
	}
}

class PgPhysics3D {
	constructor(context, gravity = { x: 0, y: 1, z: 0 }, friction = { air: 0.98, surface: 0.97 }, halfBoundsX, halfBoundsY, halfBoundsZ) {
		this.ctx = context;
		this.gravity = gravity;
		this.friction = friction;
		this.halfBoundsX = halfBoundsX;
		this.halfBoundsY = halfBoundsY;
		this.halfBoundsZ = halfBoundsZ;
		this.particles = [];
		this.borderParticles = [];
		this.fps = 60;
		this.camera = new Camera(0, 0, -512, 70, 32, 4096);

		var borderSize = 16;
		this.borderParticles.push(new Particle(-this.halfBoundsX, -this.halfBoundsY, -this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		this.borderParticles.push(new Particle(this.halfBoundsX, -this.halfBoundsY, -this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		this.borderParticles.push(new Particle(this.halfBoundsX, this.halfBoundsY, -this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		this.borderParticles.push(new Particle(-this.halfBoundsX, this.halfBoundsY, -this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));

		this.borderParticles.push(new Particle(-this.halfBoundsX, -this.halfBoundsY, this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		this.borderParticles.push(new Particle(this.halfBoundsX, -this.halfBoundsY, this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		this.borderParticles.push(new Particle(this.halfBoundsX, this.halfBoundsY, this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		this.borderParticles.push(new Particle(-this.halfBoundsX, this.halfBoundsY, this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));

		var density = 4;
		for (var x = 1; x < density - 1; x++) {
			var xPC = (((x / (density - 1)) * 2) - 1);
			this.borderParticles.push(new Particle(xPC * this.halfBoundsX, -this.halfBoundsY, -this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(xPC * this.halfBoundsX, -this.halfBoundsY, this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(xPC * this.halfBoundsX, this.halfBoundsY, this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(xPC * this.halfBoundsX, this.halfBoundsY, -this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		}

		for (var y = 1; y < density - 1; y++) {
			var yPC = (((y / (density - 1)) * 2) - 1);
			this.borderParticles.push(new Particle(-this.halfBoundsX, yPC * this.halfBoundsY, this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(this.halfBoundsX, yPC * this.halfBoundsY, this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(this.halfBoundsX, yPC * this.halfBoundsY, -this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(-this.halfBoundsX, yPC * this.halfBoundsY, -this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		}

		for (var z = 1; z < density - 1; z++) {
			var zPC = (((z / (density - 1)) * 2) - 1);
			this.borderParticles.push(new Particle(-this.halfBoundsX, -this.halfBoundsY, zPC * this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(this.halfBoundsX, -this.halfBoundsY, zPC * this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(this.halfBoundsX, this.halfBoundsY, zPC * this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
			this.borderParticles.push(new Particle(-this.halfBoundsX, this.halfBoundsY, zPC * this.halfBoundsZ, borderSize, 0, 0, 0, "#ffffff", 0));
		}
	}

	createParticle(x, y, z, radius, velX, velY, velZ, color, bounciness = 0.7) {
		this.particles.push(new Particle(x, y, z, radius, velX, velY, velZ, color, bounciness));
	}

	update() {
		for (var i = 0; i < this.particles.length; i++) {
			var particle = this.particles[i];

			particle.velX *= this.friction.air;
			particle.velY *= this.friction.air;
			particle.velZ *= this.friction.air;

			particle.velX += this.gravity.x;
			particle.velY += this.gravity.y;
			particle.velZ += this.gravity.z;

			particle.x += particle.velX;
			particle.y += particle.velY;
			particle.z += particle.velZ;

			// x axis
			if (particle.x - particle.radius < -this.halfBoundsX) {
				particle.x = -this.halfBoundsX + particle.radius;
				particle.velX = -particle.velX * particle.bounciness;
				particle.velY *= this.friction.air;
				particle.velZ *= this.friction.air;
			}

			if (particle.x + particle.radius > this.halfBoundsX) {
				particle.x = this.halfBoundsX - particle.radius;
				particle.velX = -particle.velX * particle.bounciness;
				particle.velY *= this.friction.air;
				particle.velZ *= this.friction.air;
			}

			// y axis
			if (particle.y - particle.radius < -this.halfBoundsY) {
				particle.y = -this.halfBoundsY + particle.radius;
				particle.velY = -particle.velY * particle.bounciness;
				particle.velX *= this.friction.air;
				particle.velZ *= this.friction.air;
			}

			if (particle.y + particle.radius > this.halfBoundsY) {
				particle.y = this.halfBoundsY - particle.radius;
				particle.velY = -particle.velY * particle.bounciness;
				particle.velX *= this.friction.air;
				particle.velZ *= this.friction.air;
			}

			// z axis
			if (particle.z - particle.radius < -this.halfBoundsZ) {
				particle.z = -this.halfBoundsZ + particle.radius;
				particle.velZ = -particle.velZ * particle.bounciness;
				particle.velX *= this.friction.air;
				particle.velY *= this.friction.air;
			}

			if (particle.z + particle.radius > this.halfBoundsZ) {
				particle.z = this.halfBoundsZ - particle.radius;
				particle.velZ = -particle.velZ * particle.bounciness;
				particle.velX *= this.friction.air;
				particle.velY *= this.friction.air;
			}
		}
	}

	draw() {
		for (var i = 0; i < this.particles.length; i++) {
			var particle = this.particles[i];

			particle.prevProj = particle.proj;
			particle.proj = this.camera.project3DPointTo2D(particle);
		}

		for (var i = 0; i < this.borderParticles.length; i++) {
			var particle = this.borderParticles[i];

			particle.prevProj = particle.proj;
			particle.proj = this.camera.project3DPointTo2D(particle);
		}

		var particles = structuredClone(this.particles);
		var pt2 = structuredClone(this.borderParticles);

		particles.push(...pt2);

		// particles.sort((a, b) => b.z - a.z);
		particles.sort((a, b) => {
			return a.proj.scale - b.proj.scale;
		});

		for (var i = 0; i < particles.length; i++) {
			var particle = particles[i];

			if (particle.proj.z > this.camera.zNear && particle.proj.z < this.camera.zFar) {
				var projRadius = particle.radius * particle.proj.scale;
				ctx.save();

				// ctx.fillStyle = particle.color;
				// ctx.beginPath();
				// ctx.arc(particle.proj.x, particle.proj.y, projRadius * 0.99, 0, Math.PI * 2);
				// ctx.closePath();
				// ctx.fill();
				// ctx.drawImage(cloud01, particle.proj.x - projRadius, particle.proj.y - projRadius, projRadius * 2, projRadius * 2);

				// ctx.globalCompositeOperation = "lighter";
				// var grad = ctx.createRadialGradient(particle.proj.x - projRadius, particle.proj.y - projRadius, 0, particle.proj.x - projRadius, particle.proj.y - projRadius, projRadius * 2.5);
				// grad.addColorStop(0, "#ffffff");
				// grad.addColorStop(1, "#000000");
				// ctx.fillStyle = grad;
				// ctx.beginPath();
				// ctx.arc(particle.proj.x, particle.proj.y, projRadius, 0, Math.PI * 2);
				// ctx.closePath();
				// ctx.fill();

				ctx.save();
				ctx.lineJoin = "round";
				ctx.lineCap = "round";
				ctx.strokeStyle = particle.color;
				ctx.lineWidth = projRadius * 2;
				ctx.beginPath();
				ctx.moveTo(particle.prevProj.x, particle.prevProj.y);
				ctx.lineTo(particle.proj.x, particle.proj.y);
				ctx.stroke();
				ctx.closePath();
				ctx.restore();

				ctx.restore();
			} else {
				particle.prevProj.x = -vWidth / 2;
				particle.prevProj.y = -vHeight / 2;
				particle.prevProj.z = 1024;
				particle.prevProj.scale = 0;
			}
		}
	}
}

var pgPhy = new PgPhysics3D(ctx, { x: 0, y: -0.8 * 0, z: 0 }, { air: 1, surface: 0.97 }, 512, 512, 512);
// { air: 0.98, surface: 0.97 }
var particleSpawn = new ParticleSpawner(pgPhy, 0, 0, 0, { min: 4, max: 4 }, { min: 3, max: 50 }, 52, vColors);

particleSpawn.activate();

var cubeVerts = [
	{
		x: -600,
		y: -400,
		z: -400
	},
	{
		x: 600,
		y: -400,
		z: -400
	},
	{
		x: 600,
		y: 400,
		z: -400
	},
	{
		x: -600,
		y: 400,
		z: -400
	},
	{
		x: -600,
		y: -400,
		z: 400
	},
	{
		x: 600,
		y: -400,
		z: 400
	},
	{
		x: 600,
		y: 400,
		z: 400
	},
	{
		x: -600,
		y: 400,
		z: 400
	}
];

var cubeFaces = [
	[0, 1, 2, 3],
	[4, 5, 6, 7],
	[0, 4, 7, 3],
	[1, 5, 6, 2],
	[3, 7, 6, 2],
	[0, 4, 5, 1]
];

var theta = 0;

function main() {
	// theta += * degToRad(5);

	if (keysDown["w"]) {
		pgPhy.camera.velX += Math.cos(pgPhy.camera.rotation.x * degToRad) * Math.cos((pgPhy.camera.rotation.y + 90) * degToRad);
		pgPhy.camera.velY += Math.sin(pgPhy.camera.rotation.x * degToRad);
		pgPhy.camera.velZ += Math.cos(pgPhy.camera.rotation.x * degToRad) * Math.sin((pgPhy.camera.rotation.y + 90) * degToRad);
	}

	if (keysDown["a"]) {
		pgPhy.camera.velX -= Math.cos(pgPhy.camera.rotation.y * degToRad);
		pgPhy.camera.velZ -= Math.sin(pgPhy.camera.rotation.y * degToRad);
	}

	if (keysDown["s"]) {
		pgPhy.camera.velX -= Math.cos(pgPhy.camera.rotation.x * degToRad) * Math.cos((pgPhy.camera.rotation.y + 90) * degToRad);
		pgPhy.camera.velY -= Math.sin(pgPhy.camera.rotation.x * degToRad);
		pgPhy.camera.velZ -= Math.cos(pgPhy.camera.rotation.x * degToRad) * Math.sin((pgPhy.camera.rotation.y + 90) * degToRad);
	}

	if (keysDown["d"]) {
		pgPhy.camera.velX += Math.cos(pgPhy.camera.rotation.y * degToRad);
		pgPhy.camera.velZ += Math.sin(pgPhy.camera.rotation.y * degToRad);
	}

	if (keysDown["."]) {
		pgPhy.camera.velY += 1;
	}

	if (keysDown[","]) {
		pgPhy.camera.velY -= 1;
	}

	pgPhy.camera.velX *= 0.9;
	pgPhy.camera.velY *= 0.9;
	pgPhy.camera.velZ *= 0.9;

	pgPhy.camera.x += pgPhy.camera.velX;
	pgPhy.camera.y += pgPhy.camera.velY;
	pgPhy.camera.z += pgPhy.camera.velZ;

	pgPhy.camera.rotation.x %= 360;
	pgPhy.camera.rotation.y %= 360;
	pgPhy.camera.rotation.z %= 360;

	pgPhy.camera.rotation.x = clamp(-90, 90, pgPhy.camera.rotation.x);

	// var p1 = pgPhy.camera.project3DPointTo2D({ x: -100, y: 100, z: -100 });
	// var p2 = pgPhy.camera.project3DPointTo2D({ x: 100, y: 100, z: 100 });
	// var p1 = pgPhy.camera.project3DPointTo2D({ x: -100, y: 100, z: -100 });
	// var p1 = pgPhy.camera.project3DPointTo2D({ x: -100, y: 100, z: -100 });

	pgPhy.update();
	ctx.save();
	ctx.clearRect(0, 0, vWidth, vHeight);
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, vWidth, vHeight);

	// ctx.translate(vWidth / 2, vHeight / 2);

	pgPhy.draw();

	// ctx.save();
	// ctx.strokeStyle = "#ffffff";
	// for (var i = 0; i < cubeFaces.length; i++) {
	// 	var face = cubeFaces[i];
	// 	// ctx.fillStyle = `rgb(${i * 25}, ${i * 50}, ${i * 30}`;

	// 	var verts = [];
	// 	for (var j = 0; j < cubeVerts.length; j++) {
	// 		var vert = pgPhy.camera.project3DPointTo2D(cubeVerts[j]);
	// 		verts.push(vert);
	// 	}

	// 	ctx.beginPath();
	// 	ctx.moveTo(verts[face[0]].x, verts[face[0]].y);
	// 	for (var j = 1; j < face.length; j++) {
	// 		var vertex = face[j];
	// 		ctx.lineTo(verts[vertex].x, verts[vertex].y);
	// 	}
	// 	ctx.closePath();
	// 	// ctx.fill();
	// 	ctx.stroke();
	// }
	// ctx.restore();

	ctx.restore();
}

updateLoop = setInterval(main, 1000 / tFps);

window.addEventListener("keydown", (e) => {
	keysDown[e.key] = true;
});

window.addEventListener("keyup", (e) => {
	keysDown[e.key] = false;
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("mousedown", (e) => {
	scene.requestPointerLock();
});

window.addEventListener("mousemove", (e) => {
	pgPhy.camera.rotation.x += -e.movementY / 4;
	pgPhy.camera.rotation.y += -e.movementX / 4;

	// if (Math.abs(e.movementX + e.movementY) / 2 > 6) {
	// 	var point = {
	// 		x: e.clientX - (vWidth / 2),
	// 		y: e.clientY - (vHeight / 2),
	// 		z: pgPhy.camera.z
	// 	};

	// 	// var proj = pgPhy.camera.project3DPointTo2D(point);

	// 	pgPhy.createParticle(point.x, point.y, point.z, random(4, 8), e.movementX, e.movementY, (e.movementX + e.movementY) / 8, "#ffffff", 0.7);
	// }
});