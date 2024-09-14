window.onerror = function (ev, src, lineno, colno, err) {
	alert(`${ev}\n${src}\n${lineno}:${colno}\n${err}`);
}

/**
 * @type { HTMLCanvasElement }
 */
var scene = document.getElementById("scene");
var ctx = scene.getContext("2d");

var keysDown = [];
var tFps = 1000;
var updateLoop;

async function passiveSetInterval(func, ms) {
	await wait(ms);
	await func();
	passiveSetInterval(func, ms);
}

function resizeCanvas(width = 1024, height = 576) {
	vWidth = window.innerWidth;
	vHeight = window.innerHeight;

	if (renderingMode === "simple") {
		width = vWidth * window.devicePixelRatio;
		height = vHeight * window.devicePixelRatio;
	}

	scene.width = width;
	scene.height = height;
}

resizeCanvas();

function hitSphere(center, radius, ray) {
	var oc = ray.origin().subtract(center);
	var a = ray.direction().dot(ray.direction());
	var halfB = oc.dot(ray.direction());
	var c = oc.dot(oc) - radius * radius;
	var discriminant = halfB * halfB - a * c;

	if (discriminant < 0) {
		return -1;
	} else {
		return (-halfB - Math.sqrt(discriminant)) / a;
	}
}

var world = new HittableList();

// world.add(new Sphere(new vec3(0, 0.6, -1.5), new vec3(0, 0.6, -1.5), 0.25, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 10, new vec3(1, 1, 1)), false));


var curScene = 4;

// OLD CAMERA SCENES
/*if (curScene === 0) {
	world.add(new Sphere(new vec3(0, -30000, -20), 30000, new ParameterMaterial(new vec3(0.9, 0.9, 0.9), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false));

	world.add(new Sphere(new vec3(0, 3, -24), 3, new ParameterMaterial(new vec3(0.9, 0.45, 0.1), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.95, 0.95, 0.95)), false));
	world.add(new Sphere(new vec3(-12, 12, -24), 3, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 10, new vec3(0.95, 0.95, 0.95)), false));
} else if (curScene === 1) {
	// Floor
	world.add(new Sphere(new vec3(0, -30000, 0), 30000, new ParameterMaterial(new vec3(0.9, 0.9, 0.9), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false));
	// Ceiling
	world.add(new Sphere(new vec3(0, 30020, 0), 30000, new ParameterMaterial(new vec3(0.9, 0.9, 0.9), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false));
	// Left Wall
	world.add(new Sphere(new vec3(-30020, 10, 0), 30000, new ParameterMaterial(new vec3(0.9, 0.45, 0), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false));
	// Right Wall
	world.add(new Sphere(new vec3(30020, 10, 0), 30000, new ParameterMaterial(new vec3(0, 0.45, 0.9), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false));
	// Back Wall
	world.add(new Sphere(new vec3(0, 10, -30030), 30000, new ParameterMaterial(new vec3(0.7, 0.7, 0.7), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false));
	// Front Wall
	world.add(new Sphere(new vec3(0, 10, 30020), 30000, new ParameterMaterial(new vec3(0.7, 0.7, 0.7), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false));
	// Light
	world.add(new Sphere(new vec3(0, 20, 0), 3, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 10), false));


	world.add(new Sphere(new vec3(-7, 4, -15), 4, new ParameterMaterial(new vec3(0, 0, 0), 0.05, 1, new vec3(0, 0, 0), 0, new vec3(0, 0.95, 0.95)), false));
	world.add(new Sphere(new vec3(7, 4, -15), 4, new ParameterMaterial(new vec3(0.95, 0.95, 0.95), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.95, 0.95, 0.95)), false));
}*/

// world.add(new Sphere(new vec3(0, 0.5, -2), new vec3(0, 0.5, -2), 0.5, new Dielectric(new vec3(1, 1, 1), 1.2), false));

// world.add(new Sphere(new vec3(0, 0, -2), new vec3(0, 0, -2), 1.25, new Lambertian(new vec3(1, 1, 1))))

if (curScene === 0) {
	world.add(new Sphere(new vec3(0, -1000000, 0), 1000000, new Lambertian(new vec3(0.8, 0.8, 0.8))));
	world.add(new Sphere(new vec3(200, 100, -500), 100, new Lambertian(new vec3(0.3, 0.6, 0.9))));
	world.add(new Sphere(new vec3(-200, 100, -500), 100, new Lambertian(new vec3(0.3, 0.9, 0.6))));
	// world.add(new Sphere(new vec3(-250, 300, -250), 50, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 10, new vec3(1, 1, 1))));

	for (var i = 0; i < 8; i++) {
		var col = vec3.random(0, 1);
		var rand = Math.random();
		var randAngle = random(0, 2 * Math.PI);
		// var rand2 = (Math.cos(randAngle) * random(1.4, 6));
		// var rand3 = ((Math.sin(randAngle) * random(1.4, 6)) - 2);
		var rand2 = (Math.cos(randAngle) * random(200, 1600));
		var rand3 = ((Math.sin(randAngle) * random(200, 1600)));

		if (rand < 0.8) {
			world.add(new Sphere(new vec3(rand2, 25, rand3), 25, new ParameterMaterial(col, random(0, 0.25), Math.random(), vec3.zero(), 0, col), false, new vec3(rand2, random(35, 100), rand3)));
		} else {
			world.add(new Sphere(new vec3(rand2, 25, rand3), 25, new ParameterMaterial(vec3.zero(), 0, 0, col, random(1, 5), vec3.zero()), false, new vec3(rand2, random(35, 100), rand3)));
		}
	}
} else if (curScene === 1) {
	world.add(new Sphere(new vec3(0, -300000, -200), 300000, new ParameterMaterial(new vec3(0.9, 0.9, 0.9), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false, new vec3(0, -30000, -200)));

	//world.add(new Sphere(new vec3(0, 0.3, -2), new vec3(0, 0.4, -2), 0.3, new ParameterMaterial(new vec3(0.9, 0.45, 0), 0, 1, new vec3(0, 0, 0), 0, new vec3(0.9, 0.45, 0)), false));

	world.add(new Sphere(new vec3(0, 130, -175), 30, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 10), false, new vec3(0, 130, -175)));
	world.add(new Sphere(new vec3(-200, 120, -200), 20, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 0.5, 0), 10), false, new vec3(-200, 120, -200)));
	world.add(new Sphere(new vec3(200, 120, -200), 20, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(0, 0.5, 1), 10), false, new vec3(200, 120, -200)));
	world.add(new Sphere(new vec3(-60, 7.5, -140), 7.5, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 0.8, 0.6), 2), false, new vec3(-60, 7.5, -140)));
	world.add(new Sphere(new vec3(60, 7.5, -140), 7.5, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(0.6, 0.8, 1), 2), false, new vec3(60, 7.5, -140)));

	world.add(new Sphere(new vec3(0, 30, -240), 30, new ParameterMaterial(new vec3(0.8, 0, 0.8), 0, 0.25, new vec3(0, 0, 0), 0, new vec3(0.8, 0.8, 0.8)), false, new vec3(0, 30, -240)));

	world.add(new Sphere(new vec3(90, 30, -225), 30, new ParameterMaterial(new vec3(0, 0.8, 0.8), 0, 1, new vec3(0, 0, 0), 0, new vec3(0, 0.8, 0.8)), false, new vec3(90, 30, -225)));

	world.add(new Sphere(new vec3(-90, 30, -225), 30, new ParameterMaterial(new vec3(0.8, 0.5, 0), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.8, 0.8, 0.8)), false, new vec3(-90, 30, -225)));

	world.add(new Sphere(new vec3(-55, 20, -290), 20, new ParameterMaterial(new vec3(0.8, 0, 0), 0, 0.25, new vec3(0, 0, 0), 0, new vec3(0.8, 0.8, 0.8)), false, new vec3(-55, 20, -290)));

	world.add(new Sphere(new vec3(55, 20, -290), 20, new ParameterMaterial(new vec3(0, 0.8, 0), 0, 0.25, new vec3(0, 0, 0), 0, new vec3(0.8, 0.8, 0.8)), false, new vec3(55, 20, -290)));

	world.add(new Sphere(new vec3(-90, 120, -400), 80, new ParameterMaterial(new vec3(0.8, 0.8, 0.8), 0, 1, new vec3(0, 0, 0), 0, new vec3(0.8, 0.8, 0.8)), false, new vec3(-90, 120, -400)));

	world.add(new Sphere(new vec3(90, 120, -400), 80, new ParameterMaterial(new vec3(0.8, 0.8, 0.8), 0, 1, new vec3(0, 0, 0), 0, new vec3(0.8, 0.8, 0.8)), false, new vec3(90, 120, -400)));

	for (var i = 0; i < 5; i++) {
		world.add(new Sphere(new vec3(((i / 4) - 0.5) * 60, 5, -165), 5, new ParameterMaterial(new vec3(0.4, 0.8, 0.2), i / 4, 1, new vec3(0, 0, 0), 0, new vec3(0.4, 0.8, 0.2)), false, new vec3(((i / 4) - 0.5) * 60, 5, -165)));
	}

	for (var i = 0; i < 5; i++) {
		world.add(new Sphere(new vec3(((i / 4) - 0.5) * 60, 5, -125), 5, new ParameterMaterial(new vec3(0.4, 0.8, 0.2), 0, 1 - (i / 4), new vec3(0, 0, 0), 0, new vec3(0.8, 0.8, 0.8)), false, new vec3(((i / 4) - 0.5) * 60, 5, -125)));
	}

	for (var i = 0; i < 20; i++) {
		var col = vec3.random(0, 1);
		var rand = Math.random();
		var randAngle = random(0, 2 * Math.PI);
		// var rand2 = (Math.cos(randAngle) * random(1.4, 6));
		// var rand3 = ((Math.sin(randAngle) * random(1.4, 6)) - 2);
		var rand2 = (Math.cos(randAngle) * random(200, 600));
		var rand3 = ((Math.sin(randAngle) * random(200, 600)) - 200);

		if (rand < 0.8) {
			world.add(new Sphere(new vec3(rand2, 10, rand3), 10, new ParameterMaterial(col, random(0, 0.25), Math.random(), vec3.zero(), 0, col), false, new vec3(rand2, 10, rand3)));
		} else {
			world.add(new Sphere(new vec3(rand2, 10, rand3), 10, new ParameterMaterial(vec3.zero(), 0, 0, col, random(1, 5), vec3.zero()), false, new vec3(rand2, 10, rand3)));
		}
	}
} else if (curScene === 2) {
	// Floor and Ceiling
	world.add(new Sphere(new vec3(0, -1000000, 0), 1000000, new Lambertian(new vec3(0.5, 0.5, 0.5))));
	world.add(new Sphere(new vec3(0, 1000300, 0), 1000000, new Lambertian(new vec3(0.5, 0.5, 0.5))));
	// world.add(new Sphere(new vec3(0, 1000300, 0), 1000000, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 1, new vec3(1, 1, 1))));

	// Walls Left - Right
	world.add(new Sphere(new vec3(-1000600, 150, 0), 1000000, new Lambertian(new vec3(0.9, 0.05, 0.05))));
	// world.add(new Sphere(new vec3(-1000600, 150, 0), 1000000, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(0.9, 0.05, 0.05), 1, new vec3(1, 1, 1))));
	world.add(new Sphere(new vec3(1000600, 150, 0), 1000000, new Lambertian(new vec3(0.05, 0.9, 0.05))));
	// world.add(new Sphere(new vec3(1000600, 150, 0), 1000000, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(0.05, 0.9, 0.05), 1, new vec3(1, 1, 1))));
	// world.add(new Sphere(new vec3(-1000600, 150, 0), 1000000, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 1, new vec3(1, 1, 1))));
	// world.add(new Sphere(new vec3(1000600, 150, 0), 1000000, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 1, new vec3(1, 1, 1))));

	// Walls Front - Back
	world.add(new Sphere(new vec3(0, 150, -1000600), 1000000, new Lambertian(new vec3(0.9, 0.9, 0.9))));
	world.add(new Sphere(new vec3(0, 150, 1000600), 1000000, new Lambertian(new vec3(0.9, 0.9, 0.9))));
	// world.add(new Sphere(new vec3(0, 150, -1000600), 1000000, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 1, new vec3(1, 1, 1))));
	// world.add(new Sphere(new vec3(0, 150, 1000600), 1000000, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 1, new vec3(1, 1, 1))));

	world.add(new Sphere(new vec3(0, 50299.5, 0), 50000, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 1, 1), 16, new vec3(1, 1, 1))));

	// Spheres Left to Right
	world.add(new Sphere(new vec3(-300, 75, -300), 75, new Lambertian(new vec3(0.5, 0.5, 0.5))));
	world.add(new Sphere(new vec3(0, 75, -300), 75, new Metal(new vec3(0.9, 0.675, 0.3), 0.01)));
	world.add(new Sphere(new vec3(300, 75, -300), 75, new Metal(new vec3(0.5, 0.5, 0.5), 0)));
} else if (curScene === 3) {
	world.add(new Sphere(new vec3(0, -1000000, 0), 1000000, new ParameterMaterial(new vec3(0.98, 0.01, 0.01), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false, new vec3(0, -1000000, 0)));
	world.add(new Sphere(new vec3(0, 91, 0), 91, new ParameterMaterial(new vec3(0.98, 0.01, 0.01), 0, 0, new vec3(0, 0, 0), 0, new vec3(0.9, 0.9, 0.9)), false, new vec3(0, 91, 0)));
} else if (curScene === 4) {
	world.add(new Sphere(new vec3(0, -1000000, 0), 1000000, new Lambertian(new vec3(0.5, 0.5, 0.5))));

	// world.add(new Sphere(new vec3(-60, 75, -300), 75, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(1, 0.8, 0.6), 2), false, new vec3(-60, 7.5, -140)));
	// world.add(new Sphere(new vec3(60, 75, -300), 75, new ParameterMaterial(new vec3(0, 0, 0), 0, 0, new vec3(0.6, 0.8, 1), 2), false, new vec3(60, 7.5, -140)));

	world.add(new Sphere(new vec3(-300, 75, -300), 75, new Lambertian(new vec3(0.99, 0.99, 0.99))));
	world.add(new Sphere(new vec3(-100, 75, -300), 75, new Lambertian(new vec3(0.9, 0.675, 0.3))));
	world.add(new Sphere(new vec3(100, 75, -300), 75, new Metal(new vec3(0.99, 0.99, 0.99), 0)));
	world.add(new Sphere(new vec3(300, 75, -300), 75, new Metal(new vec3(0.9, 0.675, 0.3), 0.01)));
}

var camX = 0; // 13
var camY = 75//168; // 2 0.4 4 new = 167
var camZ = 600;//275; // 3

var cam = new Camera();

// cam.vFov = 36;
cam.defocusAngle = 0; // 0.4
cam.focusDist = 10;
cam.lookFrom = new vec3(camX, camY, camZ);
cam.vUp = new vec3(0, 1, 0);

cam.setVFovWithHFov(60);

cam.useFilter = false;
cam.colorFilter = grayscaleFilter;

var downloadRenderBtn = document.getElementById("downloadRender");

downloadRenderBtn.onclick = function () {
	if (prevFrameData != null) {
		var rendCnvs = document.createElement("canvas");
		rendCnvs.width = rendImgWidth;
		rendCnvs.height = rendImgHeight;
		var rendCtx = rendCnvs.getContext("2d");

		var renderImg = rendCtx.createImageData(rendImgWidth, rendImgHeight);
		for (var i = 0; i < prevFrameData.length; i += 4) {
			renderImg.data[i] = prevFrameData[i];
			renderImg.data[i + 1] = prevFrameData[i + 1];
			renderImg.data[i + 2] = prevFrameData[i + 2];
			renderImg.data[i + 3] = prevFrameData[i + 3];
		}

		rendCtx.putImageData(renderImg, 0, 0);

		var dataUrl = rendCnvs.toDataURL("image/png");
		var linkD = document.createElement("a");
		linkD.download = "render_" + rendImgWidth + "x" + rendImgHeight + ".png";
		linkD.href = dataUrl;
		linkD.click();
	}
}

var pgCam = new PgCamera(camX, camY, camZ, calculateHorizontalFOVFromVerticalFOV(cam.vFov, cam.aspectRatio), 1 / 64, 1024);
// pgCam.rotation.y = 180;

function drawCircleOutline(context, x, y, radius) {
	context.beginPath();
	context.arc(x, y, radius, 0, 2 * Math.PI, false);
	context.stroke();
	context.closePath();
}

var camVelocity = vec3.zero();
var camAcceleration = 1;

async function main() {
	var refreshFrameData = false;

	if (keysDown["ArrowLeft"]) {
		pgCam.rotation.y += 1;
		refreshFrameData = true;
	}

	if (keysDown["ArrowRight"]) {
		pgCam.rotation.y -= 1;
		refreshFrameData = true;
	}

	if (keysDown["ArrowUp"]) {
		pgCam.rotation.x += 1;
		refreshFrameData = true;
	}

	if (keysDown["ArrowDown"]) {
		pgCam.rotation.x -= 1;
		refreshFrameData = true;
	}

	pgCam.rotation.x %= 360;
	pgCam.rotation.y %= 360;
	pgCam.rotation.z %= 360;

	pgCam.rotation.x = clamp(-89.9, 89.9, pgCam.rotation.x);

	var velocityDir = vec3.zero();

	if (keysDown["w"]) {
		velocityDir.x += Math.cos(pgCam.rotation.x * degToRad) * Math.cos((pgCam.rotation.y + 90) * degToRad);
		velocityDir.y += Math.sin(pgCam.rotation.x * degToRad);
		velocityDir.z -= Math.cos(pgCam.rotation.x * degToRad) * Math.sin((pgCam.rotation.y + 90) * degToRad);
		refreshFrameData = true;
	}

	if (keysDown["a"]) {
		velocityDir.x -= Math.cos(pgCam.rotation.y * degToRad);
		velocityDir.z += Math.sin(pgCam.rotation.y * degToRad);
		refreshFrameData = true;
	}

	if (keysDown["s"]) {
		velocityDir.x -= Math.cos(pgCam.rotation.x * degToRad) * Math.cos((pgCam.rotation.y + 90) * degToRad);
		velocityDir.y -= Math.sin(pgCam.rotation.x * degToRad);
		velocityDir.z += Math.cos(pgCam.rotation.x * degToRad) * Math.sin((pgCam.rotation.y + 90) * degToRad);
		refreshFrameData = true;
	}

	if (keysDown["d"]) {
		velocityDir.x += Math.cos(pgCam.rotation.y * degToRad);
		velocityDir.z -= Math.sin(pgCam.rotation.y * degToRad);
		refreshFrameData = true;
	}

	if (keysDown["."]) {
		velocityDir.y += 1;
		refreshFrameData = true;
	}

	if (keysDown[","]) {
		velocityDir.y -= 1;
		refreshFrameData = true;
	}

	if (velocityDir.nearZero() == false) {
		if (renderingMode === "pathtracing") {
			velocityDir = velocityDir.normalized().multiply(32);
		} else {
			velocityDir = velocityDir.normalized();
		}
	}

	camVelocity = camVelocity.add(velocityDir.multiply(camAcceleration));

	camVelocity = camVelocity.multiply(0.875);

	pgCam.position = pgCam.position.add(camVelocity);

	if (refreshFrameData == true) {
		prevFrameData = null;
		numRenderedFrames = 0;
	}

	// if (keysDown["w"]) {
	// 	cam.lookFrom.x += camCosXRotY * 5;
	// 	cam.lookFrom.z += camSinZRotY * 5;
	// 	cam.lookFrom.y += camSinYRotX * 5;
	// 	prevFrameData = null;
	// 	numRenderedFrames = 0;
	// }

	// if (keysDown["a"]) {
	// 	cam.lookFrom.x += Math.cos(camRotY - degreesToRadians(180)) * 5;
	// 	cam.lookFrom.z += Math.sin(camRotY - degreesToRadians(180)) * 5;
	// 	prevFrameData = null;
	// 	numRenderedFrames = 0;
	// }

	// if (keysDown["s"]) {
	// 	cam.lookFrom.x -= camCosXRotY * 5;
	// 	cam.lookFrom.z -= camSinZRotY * 5;
	// 	cam.lookFrom.y -= camSinYRotX * 5;
	// 	prevFrameData = null;
	// 	numRenderedFrames = 0;
	// }

	// if (keysDown["d"]) {
	// 	cam.lookFrom.x += Math.cos(camRotY) * 5;
	// 	cam.lookFrom.z += Math.sin(camRotY) * 5;
	// 	prevFrameData = null;
	// 	numRenderedFrames = 0;
	// }

	// if (keysDown["."]) {
	// 	cam.lookFrom.y += 5;
	// 	prevFrameData = null;
	// 	numRenderedFrames = 0;
	// }

	// if (keysDown[","]) {
	// 	cam.lookFrom.y -= 5;
	// 	prevFrameData = null;
	// 	numRenderedFrames = 0;
	// }

	ctx.save();
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	ctx.clearRect(0, 0, vWidth, vHeight);

	ctx.translate(vWidth / 2, vHeight / 2);

	// cam.lookAt = new vec3(cam.lookFrom.x + camCosXRotY, cam.lookFrom.y + camSinYRotX + camCosXRotY, cam.lookFrom.z + camSinZRotY);
	// prevFrameData = null;

	if (renderingMode === "pathtracing") {
		camVelocity = vec3.zero();
		cam.lookFrom = pgCam.position.clone();
		var laX = Math.cos(pgCam.rotation.x * degToRad) * Math.cos((pgCam.rotation.y + 90) * degToRad);
		var laY = Math.sin(pgCam.rotation.x * degToRad);
		var laZ = Math.cos(pgCam.rotation.x * degToRad) * Math.sin((pgCam.rotation.y + 90) * degToRad);

		cam.lookAt = cam.lookFrom.add(new vec3(laX, laY, -laZ));

		await cam.render(ctx, world, false, false, 1);
		numRenderedFrames += 1;
	} else if (renderingMode === "simple") {
		ctx.save();
		ctx.lineWidth = vWidth / 1366;
		ctx.strokeStyle = "#000000";
		for (var i = 0; i < world.objects.length; i++) {
			var obj = world.objects[i];

			if (obj instanceof Sphere) {
				var bb = obj.boundingBox();
				var p1 = pgCam.project3DPointTo2D(new vec3(bb.x.min, bb.y.min, -bb.z.min), vWidth, vHeight);
				var p2 = pgCam.project3DPointTo2D(new vec3(bb.x.max, bb.y.min, -bb.z.min), vWidth, vHeight);
				var p3 = pgCam.project3DPointTo2D(new vec3(bb.x.max, bb.y.max, -bb.z.min), vWidth, vHeight);
				var p4 = pgCam.project3DPointTo2D(new vec3(bb.x.min, bb.y.max, -bb.z.min), vWidth, vHeight);

				var p1_2 = pgCam.project3DPointTo2D(new vec3(bb.x.min, bb.y.min, -bb.z.max), vWidth, vHeight);
				var p2_2 = pgCam.project3DPointTo2D(new vec3(bb.x.max, bb.y.min, -bb.z.max), vWidth, vHeight);
				var p3_2 = pgCam.project3DPointTo2D(new vec3(bb.x.max, bb.y.max, -bb.z.max), vWidth, vHeight);
				var p4_2 = pgCam.project3DPointTo2D(new vec3(bb.x.min, bb.y.max, -bb.z.max), vWidth, vHeight);

				var topP = pgCam.project3DPointTo2D(new vec3((bb.x.min + bb.x.max) / 2, bb.y.max, -(bb.z.min + bb.z.max) / 2), vWidth, vHeight);
				var rightP = pgCam.project3DPointTo2D(new vec3(bb.x.max, (bb.y.min + bb.y.max) / 2, -(bb.z.min + bb.z.max) / 2), vWidth, vHeight);
				var bottomP = pgCam.project3DPointTo2D(new vec3((bb.x.min + bb.x.max) / 2, bb.y.min, -(bb.z.min + bb.z.max) / 2), vWidth, vHeight);
				var leftP = pgCam.project3DPointTo2D(new vec3(bb.x.min, (bb.y.min + bb.y.max) / 2, -(bb.z.min + bb.z.max) / 2), vWidth, vHeight);
				var frontP = pgCam.project3DPointTo2D(new vec3((bb.x.min + bb.x.max) / 2, (bb.y.min + bb.y.max) / 2, -bb.z.min), vWidth, vHeight);
				var backP = pgCam.project3DPointTo2D(new vec3((bb.x.min + bb.x.max) / 2, (bb.y.min + bb.y.max) / 2, -bb.z.max), vWidth, vHeight);

				var minSz = 1;
				var maxSz = 4;

				if (p1.scale > 0) { drawCircleOutline(ctx, p1.x, p1.y, clamp(minSz, maxSz, p1.scale * 8)); }
				if (p2.scale > 0) { drawCircleOutline(ctx, p2.x, p2.y, clamp(minSz, maxSz, p2.scale * 8)); }
				if (p3.scale > 0) { drawCircleOutline(ctx, p3.x, p3.y, clamp(minSz, maxSz, p3.scale * 8)); }
				if (p4.scale > 0) { drawCircleOutline(ctx, p4.x, p4.y, clamp(minSz, maxSz, p4.scale * 8)); }

				if (p1_2.scale > 0) { drawCircleOutline(ctx, p1_2.x, p1_2.y, clamp(minSz, maxSz, p1_2.scale * 8)); }
				if (p2_2.scale > 0) { drawCircleOutline(ctx, p2_2.x, p2_2.y, clamp(minSz, maxSz, p2_2.scale * 8)); }
				if (p3_2.scale > 0) { drawCircleOutline(ctx, p3_2.x, p3_2.y, clamp(minSz, maxSz, p3_2.scale * 8)); }
				if (p4_2.scale > 0) { drawCircleOutline(ctx, p4_2.x, p4_2.y, clamp(minSz, maxSz, p4_2.scale * 8)); }

				if (topP.scale > 0) { drawCircleOutline(ctx, topP.x, topP.y, clamp(minSz, maxSz, topP.scale * 8)); }
				if (rightP.scale > 0) { drawCircleOutline(ctx, rightP.x, rightP.y, clamp(minSz, maxSz, rightP.scale * 8)); }
				if (bottomP.scale > 0) { drawCircleOutline(ctx, bottomP.x, bottomP.y, clamp(minSz, maxSz, bottomP.scale * 8)); }
				if (leftP.scale > 0) { drawCircleOutline(ctx, leftP.x, leftP.y, clamp(minSz, maxSz, leftP.scale * 8)); }
				if (frontP.scale > 0) { drawCircleOutline(ctx, frontP.x, frontP.y, clamp(minSz, maxSz, frontP.scale * 8)); }
				if (backP.scale > 0) { drawCircleOutline(ctx, backP.x, backP.y, clamp(minSz, maxSz, backP.scale * 8)); }
			}
		}
		ctx.restore();
	}

	// ctx.strokeStyle = "#000000";
	// ctx.strokeRect(0, 0, 64, 64);

	// ctx.fillStyle = "#000000";
	// ctx.fillRect(30 + (pgCam.position.x / 18.75), (pgCam.position.z / 18.75) + 30, 4, 4);

	ctx.restore();
}

window.onload = function () {
	// updateLoop = setInterval(main, 1000 / tFps);
	// main();
	passiveSetInterval(main, 1000 / tFps);
}

function toggleRender() {
	if (renderingMode === "simple") {
		renderingMode = "pathtracing";
	} else if (renderingMode === "pathtracing") {
		renderingMode = "simple";
		resizeCanvas();
	}
}

var toggleRenderModeBtn = document.getElementById("toggleRender");

toggleRenderModeBtn.onclick = toggleRender;

window.addEventListener("keydown", (e) => {
	keysDown[e.key] = true;

	if (e.key === " ") {
		toggleRender();
	}

	if (e.key === "z") {
		if (document.pointerLockElement === null) {
			scene.requestPointerLock();
		} else if (document.pointerLockElement === scene) {
			document.exitPointerLock();
		}
	}

	// if (e.key === "w" || e.key === "a" || e.key === "s" || e.key === "d" || e.key === "." || e.key === ",") {
	// 	exitRender = true;
	// }
});

window.addEventListener("keyup", (e) => {
	keysDown[e.key] = false;
});

window.addEventListener("mousemove", (e) => {
	if (document.pointerLockElement === scene) {
		prevFrameData = null;
		numRenderedFrames = 0;
		pgCam.rotation.x += -e.movementY / 4;
		pgCam.rotation.y += -e.movementX / 4;
	}
});

var tMoveX = 0;
var tMoveY = 0;

var initFingerDist = 0;

scene.addEventListener("touchstart", (e) => {
	tMoveX = e.touches[0].pageX;
	tMoveY = e.touches[0].pageY;

	if (e.touches[1]) {
		var dx = e.touches[1].pageX - e.touches[0].pageX;
		var dy = e.touches[1].pageY - e.touches[0].pageY;

		initFingerDist = Math.sqrt(dx * dx + dy * dy);
	}
});

scene.addEventListener("touchmove", (e) => {
	prevFrameData = null;
	numRenderedFrames = 0;

	if (e.touches[2]) {
		var cosX = Math.cos(pgCam.rotation.x * degToRad);
		var sinX = Math.sin(pgCam.rotation.x * degToRad);
		var cosY = Math.cos(pgCam.rotation.y * degToRad);
		var sinY = Math.sin(pgCam.rotation.y * degToRad);
		var cosZ = Math.cos(pgCam.rotation.z * degToRad);
		var sinZ = Math.sin(pgCam.rotation.z * degToRad);

		var rotXMat = new Matrix([
			[1, 0, 0],
			[0, cosX, -sinX],
			[0, sinX, cosX]
		]);

		var rotYMat = new Matrix([
			[cosY, 0, sinY],
			[0, 1, 0],
			[-sinY, 0, cosY]
		]);

		var rotZMat = new Matrix([
			[cosZ, -sinZ, 0],
			[sinZ, cosZ, 0],
			[0, 0, 1],
		]);

		var rotXYZMat = rotXMat.multiply(rotYMat).multiply(rotZMat);

		var point = new vec3(-(e.touches[0].pageX - tMoveX), e.touches[0].pageY - tMoveY, 0);

		var xRot = rotXYZMat.data[0][0] * point.x + rotXYZMat.data[0][1] * point.y + rotXYZMat.data[0][2] * point.z;
		var yRot = rotXYZMat.data[1][0] * point.x + rotXYZMat.data[1][1] * point.y + rotXYZMat.data[1][2] * point.z;
		var zRot = rotXYZMat.data[2][0] * point.x + rotXYZMat.data[2][1] * point.y + rotXYZMat.data[2][2] * point.z;


		camVelocity.x += camAcceleration * xRot;
		camVelocity.y += camAcceleration * yRot;
		camVelocity.z += camAcceleration * zRot;
	} else if (e.touches[1]) {
		var dx = e.touches[1].pageX - e.touches[0].pageX;
		var dy = e.touches[1].pageY - e.touches[0].pageY;

		var curDist = Math.sqrt(dx * dx + dy * dy);

		var strengthMultiplier = (curDist - initFingerDist) / 4;

		if (Math.abs(strengthMultiplier) > 1e-8) {
			var velocityDir = vec3.zero();

			velocityDir.x += Math.cos(pgCam.rotation.x * degToRad) * Math.cos((pgCam.rotation.y + 90) * degToRad);
			velocityDir.y += Math.sin(pgCam.rotation.x * degToRad);
			velocityDir.z -= Math.cos(pgCam.rotation.x * degToRad) * Math.sin((pgCam.rotation.y + 90) * degToRad);

			velocityDir = velocityDir.normalized().multiply(camAcceleration * strengthMultiplier);

			camVelocity = camVelocity.add(velocityDir);

			initFingerDist = curDist;
		}
	} else {
		pgCam.rotation.x += -(e.touches[0].pageY - tMoveY) / 4;
		pgCam.rotation.y += -(e.touches[0].pageX - tMoveX) / 4;
	}

	tMoveX = e.touches[0].pageX;
	tMoveY = e.touches[0].pageY;
});

window.addEventListener("resize", resizeCanvas);