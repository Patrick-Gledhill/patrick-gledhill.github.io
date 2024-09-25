window.onerror = function (err, src, lineno, colno) {
	alert(err + " " + lineno + ":" + colno + " " + src);
}

function toScientificNotation(num, precision = 2) {
	var exponent = Math.floor(Math.log10(Math.abs(num)));
	var coefficient = (num / Math.pow(10, exponent)).toFixed(precision);

	var superscriptDigits = {
		"0": "⁰",
		"1": "¹",
		"2": "²",
		"3": "³",
		"4": "⁴",
		"5": "⁵",
		"6": "⁶",
		"7": "⁷",
		"8": "⁸",
		"9": "⁹",
		"-": "⁻"
	};

	var exponentStr = exponent.toString().split("").map(digit => superscriptDigits[digit]).join("");

	return `${coefficient} × 10${exponentStr}`;
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

var dt = 1;
var prevTime = 0;
var curTime = 0;

var keysDown = [];

var wasInactive = false;
var completelyPaused = false;

var paused = false;

// var spaceBg = new Image();
// spaceBg.src = "./assets/milky_way_galaxy_dark.jpg";

function resizeCanvas() {
	vWidth = window.innerWidth;
	vHeight = window.innerHeight;
	scene.width = vWidth * window.devicePixelRatio;
	scene.height = vHeight * window.devicePixelRatio;
}

resizeCanvas();

var selectedObjRadius = document.getElementById("selected-obj-radius");
var selectedObjDensity = document.getElementById("selected-obj-density");
var selectedObjVolume = document.getElementById("selected-obj-volume");
var selectedObjMass = document.getElementById("selected-obj-mass");
var selectedObjVelocity = document.getElementById("selected-obj-velocity");

var selectedObjPropertiesContainer = document.getElementById("selected-obj-properties-container");

var slidesContainer = document.getElementById("project-slides-container");

var openSlidesBtn = document.getElementById("open-slides");
var closeSlidesBtn = document.getElementById("close-slides");

var timeScaleDisplay = document.getElementById("time-scale-display");

openSlidesBtn.addEventListener("click", () => {
	slidesContainer.style.display = "block";
	paused = true;
});

closeSlidesBtn.addEventListener("click", () => {
	slidesContainer.style.display = "none";
	paused = false;
});

var selectedObj = null;

function updateSelectedObjValues() {
	if (selectedObj == null) {
		selectedObjPropertiesContainer.style.display = "none";
	} else {
		selectedObjPropertiesContainer.style.display = "block";

		var objVolume = selectedObj.volume > 1e7 ? toScientificNotation(selectedObj.volume, 4) : selectedObj.volume;
		var objRadius = selectedObj.radius > 1e7 ? toScientificNotation(selectedObj.radius, 4) : selectedObj.radius;
		var objMass = selectedObj.mass > 1e7 ? toScientificNotation(selectedObj.mass, 4) : selectedObj.mass;

		var calcVel = selectedObj.velocity.length();
		var objVelocity = calcVel > 1e7 ? toScientificNotation(calcVel, 4) : calcVel.toFixed(2);

		selectedObjRadius.innerText = objRadius;
		selectedObjDensity.innerText = selectedObj.density;
		selectedObjVolume.innerText = objVolume;
		selectedObjMass.innerText = objMass;
		selectedObjVelocity.innerText = objVelocity;
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

var BigG = 6.6743e-11;

var mouse = {
	position: new Vec2(0, 0),
	previous: new Vec2(0, 0),
	velocity: new Vec2(0, 0),
	down: false,
	rightdown: false
}

var camera = new Camera(0, 0, 1, 0);

class CircleObj {
	constructor(x, y, z, radius, density, color, glow = true, glowColor = "#ffffff") {
		this.position = new Vec3(x, y, z);
		this.velocity = Vec3.zero;
		this.acceleration = Vec3.zero;
		this.radius = radius;
		this.density = density;
		this.volume = (4 / 3) * Math.PI * (radius * radius * radius);
		this.mass = this.density * this.volume;

		this.glow = glow;
		this.glowColor = glowColor;
		this.color = color;
	}

	applyForce(force) {
		this.acceleration.plusEquals(force.divide(this.mass));
	}

	calculateOrbitalVelocity(otherObj) {
		var dist = this.position.subtract(otherObj.position).length();

		var orbitalVelocity = Math.sqrt((BigG * otherObj.mass) / dist);

		return orbitalVelocity;
	}

	calculateBinaryOrbitalVelocity(otherObj) {
		var dist = this.position.subtract(otherObj.position).length();

		var totalMass = this.mass + otherObj.mass;
		var centerOfMass = this.position.multiply(this.mass).add(otherObj.position.multiply(otherObj.mass)).divide(totalMass);

		var r1 = this.position.subtract(centerOfMass).length();
		var r2 = otherObj.position.subtract(centerOfMass).length();

		var orbitalVelocity1 = Math.sqrt(BigG * otherObj.mass / (r1 + r2) * (r2 / dist));
		var orbitalVelocity2 = Math.sqrt(BigG * this.mass / (r1 + r2) * (r1 / dist));

		return {
			obj1Velocity: orbitalVelocity1,
			obj2Velocity: orbitalVelocity2
		};
	}

	getCenterOfMass(otherObj) {
		var totalMass = this.mass + otherObj.mass;
		var centerOfMass = this.position.multiply(this.mass).add(otherObj.position.multiply(otherObj.mass)).divide(totalMass);

		return centerOfMass;
	}

	getCenterOfMassWithTotalMass(otherObj) {
		var totalMass = this.mass + otherObj.mass;
		var centerOfMass = this.position.multiply(this.mass).add(otherObj.position.multiply(otherObj.mass)).divide(totalMass);

		return {
			position: centerOfMass,
			totalMass: totalMass
		};
	}

	static calculateBinaryOrbitalVelocityAroundStar(binaryCenterOfMass, star) {
		var dist = binaryCenterOfMass.subtract(star.position).length();

		var orbitalVelocity = Math.sqrt((BigG * star.mass) / dist);

		return orbitalVelocity;
	}

	static calculateBinaryOrbitalVelocityAroundCenterOfMass(binaryCenterOfMass, centerOfMass = { position: new Vec3(0, 0, 0), totalMass: 1 }) {
		var dist = binaryCenterOfMass.subtract(centerOfMass.position).length();
		var orbitalVelocity = Math.sqrt((BigG * centerOfMass.totalMass) / dist);

		return orbitalVelocity;
	}

	draw(context) {
		context.save();
		context.fillStyle = this.color;
		if (this.glow == true) {
			context.globalCompositeOperation = "lighter";
			context.shadowBlur = 32;
			context.shadowColor = this.glowColor;
		}
		context.beginPath();
		context.arc(this.position.x / 20000000, this.position.y / 20000000, this.radius / 20000000, 0, tau, false);
		context.fill();
		context.closePath();
		context.restore();
	}
}

class PhysicsEngine {
	constructor() {
		this.objects = [];
	}

	addObject(object) {
		this.objects.push(object);
	}

	removeObject(object) {
		var idx = this.objects.indexOf(object);

		if (idx !== -1) {
			this.objects.splice(idx, 1);
		}
	}

	update(time) {
		for (var i = 0; i < this.objects.length - 1; i++) {
			var obj1 = this.objects[i];

			for (var j = i + 1; j < this.objects.length; j++) {
				var obj2 = this.objects[j];

				var axis = obj2.position.subtract(obj1.position);
				var dist = axis.length();
				axis.normalize();

				if (dist > 0) {
					var force = (BigG * obj1.mass * obj2.mass) / (dist * dist);

					// obj1.acceleration.plusEquals(axis.multiply(scaledForce / obj1.mass));
					// obj2.acceleration.plusEquals(axis.multiply(-scaledForce / obj2.mass));

					obj1.applyForce(axis.multiply(force));
					obj2.applyForce(axis.multiply(-force));
				}
			}
		}

		for (var i = 0; i < this.objects.length; i++) {
			var obj = this.objects[i];

			obj.velocity.plusEquals(obj.acceleration.multiply(time));
			obj.position.plusEquals(obj.velocity.multiply(time));
		}

		for (var i = 0; i < this.objects.length; i++) {
			var obj = this.objects[i];

			obj.acceleration = Vec3.zero;
		}
	}

	draw(context) {
		for (var i = 0; i < this.objects.length; i++) {
			var obj = this.objects[i];

			obj.draw(context);
		}
	}
}

function pointToCircleCollisionDetection(point, circle) {
	var dist = circle.position.subtract(point.position).length();

	return dist < circle.radius;
}

var engine = new PhysicsEngine();

// position and radius: kilometers		density: kg/m^3

function createTrinaryStarSystem() {
	var star1 = new CircleObj(0, 0, 0, 6957000000, 1410, "#ffffb3", true, "#ff8000");

	var star2 = new CircleObj(-112198403000, 1495978710, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");
	var star3 = new CircleObj(-112198403000, -1495978710, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");

	var binaryVel = star3.calculateBinaryOrbitalVelocity(star2);

	star3.velocity.x = binaryVel.obj1Velocity;
	star2.velocity.x = -binaryVel.obj2Velocity;

	var binaryCenterOfMass = star3.getCenterOfMass(star2);
	var orbitVel = CircleObj.calculateBinaryOrbitalVelocityAroundStar(binaryCenterOfMass, star1);

	star3.velocity.y = orbitVel;
	star2.velocity.y = orbitVel;

	engine.objects = [star1, star2, star3];
}

function createQuaternaryStarSystem() {
	var star1 = new CircleObj(0, 0, 0, 6957000000, 1410, "#ffffb3", true, "#ff8000");

	var star2 = new CircleObj(-112198403000, 1495978710, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");
	var star3 = new CircleObj(-112198403000, -1495978710, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");

	var star4 = new CircleObj(112198403000, 0, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");

	var binaryVel = star3.calculateBinaryOrbitalVelocity(star2);

	star3.velocity.x = binaryVel.obj1Velocity;
	star2.velocity.x = -binaryVel.obj2Velocity;

	var binaryCenterOfMass = star3.getCenterOfMass(star2);
	var orbitVel = CircleObj.calculateBinaryOrbitalVelocityAroundStar(binaryCenterOfMass, star1);

	star3.velocity.y = orbitVel;
	star2.velocity.y = orbitVel;

	star4.velocity.y = -star4.calculateOrbitalVelocity(star1);

	engine.objects = [star1, star2, star3, star4];
}

function createQuinaryStarSystem() {
	var star1 = new CircleObj(0, 0, 0, 6957000000, 1410, "#ffffb3", true, "#ff8000");

	var star2 = new CircleObj(-112198403000, 1495978710, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");
	var star3 = new CircleObj(-112198403000, -1495978710, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");

	var star4 = new CircleObj(112198403000, 1495978710, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");
	var star5 = new CircleObj(112198403000, -1495978710, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");

	var binary1Vel = star3.calculateBinaryOrbitalVelocity(star2);

	star3.velocity.x = binary1Vel.obj1Velocity;
	star2.velocity.x = -binary1Vel.obj2Velocity;

	var binary2Vel = star5.calculateBinaryOrbitalVelocity(star4);

	star5.velocity.x = binary2Vel.obj1Velocity;
	star4.velocity.x = -binary2Vel.obj2Velocity;

	var binary1CenterOfMass = star3.getCenterOfMass(star2);
	var orbitVel1 = CircleObj.calculateBinaryOrbitalVelocityAroundStar(binary1CenterOfMass, star1);

	star3.velocity.y = orbitVel1;
	star2.velocity.y = orbitVel1;

	var binary2CenterOfMass = star5.getCenterOfMass(star4);
	var orbitVel2 = CircleObj.calculateBinaryOrbitalVelocityAroundStar(binary2CenterOfMass, star1);

	star5.velocity.y = -orbitVel2;
	star4.velocity.y = -orbitVel2;

	star4.velocity.y = -star4.calculateOrbitalVelocity(star1);

	engine.objects = [star1, star2, star3, star4, star5];
}

function createSolarSystem() {
	var sun = new CircleObj(0, 0, 0, 696340000, 1410, "#ffffb3", true, "#ff8000");
	var mercury = new CircleObj(-50478000000, 0, 0, 2439700, 5430, "#bfbfbf", false);
	var venus = new CircleObj(-108520000000, 0, 0, 6051800, 5240, "#bfa050", false);
	var earth = new CircleObj(-150240000000, 0, 0, 6378100, 5510, "#00bfff", false);
	var mars = new CircleObj(-224000000000, 0, 0, 3389500, 3930, "#ff4010", false);
	var jupiter = new CircleObj(-778000000000, 0, 0, 69911000, 1326, "#bfa080", false);

	mercury.velocity.y = mercury.calculateOrbitalVelocity(sun);
	venus.velocity.y = venus.calculateOrbitalVelocity(sun);
	earth.velocity.y = earth.calculateOrbitalVelocity(sun);
	mars.velocity.y = mars.calculateOrbitalVelocity(sun);
	jupiter.velocity.y = jupiter.calculateOrbitalVelocity(sun);

	engine.objects = [sun, mercury, venus, earth, mars, jupiter];
}

createTrinaryStarSystem();

// var testObj = new CircleObj(-74798935.5, 1495978.71, 0, 695700, 1000, "#ffffb3", true, "#ff8000");
// var testObj2 = new CircleObj(-74798935.5, -1495978.71, 0, 695700, 1000, "#ffffb3", true, "#ff8000"); // 149597871

// var testObj3 = new CircleObj(0, 0, 0, 6957000, 1000, "#ffffb3", true, "#ff8000");

var testPoints = [];

var simStep = 0;
var timeAcceleration = 16384;

function main() {
	curTime = performance.now();
	dt = (curTime - prevTime) / 1000;
	prevTime = curTime;
	// dt = (1000 / 60) / 1000;

	if (completelyPaused == true || (completelyPaused == false && wasInactive == true)) {
		dt = 0;
		wasInactive = false;
	}

	// if (simStep < 2) {
	// 	dt = 0;
	// }

	if (keysDown["w"]) {
		camera.position.y -= 1 / camera.viewScale;
	}

	if (keysDown["a"]) {
		camera.position.x -= 1 / camera.viewScale;
	}

	if (keysDown["s"]) {
		camera.position.y += 1 / camera.viewScale;
	}

	if (keysDown["d"]) {
		camera.position.x += 1 / camera.viewScale;
	}

	// if (keysDown["ArrowLeft"]) {
	// 	camera.rotation -= 2;
	// }

	// if (keysDown["ArrowRight"]) {
	// 	camera.rotation += 2;
	// }

	if (paused == false) {
		for (var i = 0; i < testPoints.length; i++) {
			var p = testPoints[i];

			p.t++;

			if (p.t >= tFps * 10) {
				testPoints.splice(i, 1);
				i--;
			}
		}

		// if (simStep % Math.ceil(tFps / timeAcceleration) === 0) {
		// 	testPoints.push({ position: testObj2.position.divide(20000000), t: 0 });
		// }

		engine.update(dt * timeAcceleration);
	}

	if (selectedObj != null) {
		camera.position = selectedObj.position.clone().divide(20000000);
	}

	ctx.save();
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	ctx.lineWidth = 2;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.clearRect(0, 0, vWidth, vHeight);
	ctx.fillStyle = "#000000";
	// var bgGrad = ctx.createLinearGradient(0, vHeight, vWidth, 0);
	// bgGrad.addColorStop(0, "#000000");
	// bgGrad.addColorStop(0.4, "#100520");
	// bgGrad.addColorStop(0.5, "#102020");
	// bgGrad.addColorStop(0.6, "#051020");
	// bgGrad.addColorStop(1, "#000000");
	// ctx.fillStyle = bgGrad;
	// var imageAspect = spaceBg.width / spaceBg.height;
	// var largerDimension = Math.max(vWidth, vHeight);
	// ctx.drawImage(spaceBg, 0, 0, largerDimension * imageAspect, largerDimension);
	ctx.fillRect(0, 0, vWidth, vHeight);
	// ctx.fillRect(0, 0, vWidth, vHeight);
	camera.applyToCtx(ctx, vWidth, vHeight);

	engine.draw(ctx);

	ctx.save();
	ctx.lineWidth = 2 / camera.viewScale;
	ctx.strokeStyle = "#ff0000";
	ctx.beginPath();
	for (var i = 0; i < testPoints.length; i++) {
		var p = testPoints[i];
		if (i === 0) {
			ctx.moveTo(p.position.x, p.position.y);
		} else {
			ctx.lineTo(p.position.x, p.position.y);
		}
	}
	ctx.stroke();
	ctx.closePath();
	ctx.restore();

	if (engine.objects.length > 0) {
		var modPos = engine.objects[0].position.divide(20000000).toVec2();
		ctx.save();
		ctx.lineWidth = 2 / camera.viewScale;
		ctx.strokeStyle = "#80808080";
		ctx.beginPath();
		ctx.arc(modPos.x, modPos.y, mouse.position.subtract(modPos).length(), 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.stroke();
		ctx.restore();

		// ctx.beginPath();
		// ctx.moveTo(engine.objects[0].position.x / 20000000, engine.objects[0].position.y / 20000000);
		// ctx.lineTo(mouse.position.x, mouse.position.y);
		// ctx.stroke();
		// ctx.closePath();
	}

	ctx.restore();

	ctx.save();
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	ctx.lineWidth = 2;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.font = 16 + "px arial";
	ctx.textBaseline = "top";

	// ctx.fillStyle = "#ffffff";
	// ctx.fillText("Time Scale: " + timeAcceleration, 8, 8);

	ctx.restore();

	updateSelectedObjValues();

	timeScaleDisplay.innerText = timeAcceleration;

	simStep++;

	mouse.velocity.x = 0;
	mouse.velocity.y = 0;
	mouse.previous.x = mouse.position.x;
	mouse.previous.y = mouse.position.y;

	updateIdx = requestAnimationFrame(main);
}

window.addEventListener("load", () => {
	prevTime = performance.now();

	// updateIdx = setInterval(main, 1000 / tFps);
	updateIdx = requestAnimationFrame(main);
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("wheel", (e) => {
	if (paused == false) {
		if (e.deltaY < 0) {
			camera.viewScale /= 0.96;
		} else {
			camera.viewScale *= 0.96;
		}
	}
});

window.addEventListener("keydown", (e) => {
	keysDown[e.key] = true;
	// e.preventDefault();

	if (e.key === "ArrowLeft") {
		timeAcceleration = clamp(0.25, 32768, timeAcceleration / 2); 
	}

	if (e.key === "ArrowRight") {
		timeAcceleration = clamp(0.25, 32768, timeAcceleration * 2); 
	}
});

window.addEventListener("keyup", (e) => {
	keysDown[e.key] = false;

});

window.addEventListener("contextmenu", (e) => {
	e.preventDefault();
});

scene.addEventListener("mousedown", (e) => {
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

	if (mouse.down == true) {
		var hitOne = false;

		for (var i = 0; i < engine.objects.length; i++) {
			var obj = engine.objects[i];

			var objPosition = obj.position.divide(20000000);

			if (pointToCircleCollisionDetection(mouse, { position: objPosition.toVec2(), radius: obj.radius / 20000000 })) {
				selectedObj = obj;
				hitOne = true;
			}
		}

		if (hitOne == false) {
			selectedObj = null;
		}
	}

	if (mouse.rightdown == true && engine.objects.length > 0) {
		var star = new CircleObj(mouse.position.x * 20000000, mouse.position.y * 20000000, 0, 695700000, 1410, "#ffffb3", true, "#ff8000");
		var speed = -star.calculateOrbitalVelocity(engine.objects[0]);
		var rotation = mouse.position.multiply(20000000).subtract(engine.objects[0].position.toVec2()).direction();
		var vel = new Vec2(0, speed).rotateAroundPoint(Vec2.zero, rotation);
		star.velocity.x = vel.x;
		star.velocity.y = vel.y;
		// alert(star.position.x)
		engine.addObject(star);
	}
});

scene.addEventListener("mousemove", (e) => {
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

scene.addEventListener("mouseup", () => {
	mouse.down = false;
	mouse.rightdown = false;
});

document.addEventListener("visibilitychange", function () {
	if (document.hidden) {
		completelyPaused = true;
		wasInactive = true;
	} else {
		completelyPaused = false;
		wasInactive = true;
	}
});

var selectedStarSystem = document.getElementById("selected-star-system");

selectedStarSystem.addEventListener("input", () => {
	selectedObj = null;

	if (selectedStarSystem.value === "3") {
		createTrinaryStarSystem();
	} else if (selectedStarSystem.value === "4") {
		createQuaternaryStarSystem();
	} else if (selectedStarSystem.value === "5") {
		createQuinaryStarSystem();
	} else if (selectedStarSystem.value === "solar-system") {
		createSolarSystem();
	}
});