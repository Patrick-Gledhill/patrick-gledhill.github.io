import { Vec2, Vec3 } from "./vec.js";

export function wait(ms) {
	return new Promise((resolve) => { setTimeout(resolve, ms) });
}

export function clamp(min, max, value) {
	return Math.min(Math.max(min, value), max);
}

export function random(min, max) {
	return (Math.random() * (max - min)) + min;
}

export function pickRandomItemFromArray(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomPropertyFromObject(obj) {
	var keys = Object.keys(obj);
	var val = obj[keys[keys.length * Math.random() << 0]];
	return val;
}

export var degToRad = Math.PI / 180;

export var radToDeg = 180 / Math.PI;

export var tau = 2 * Math.PI;

export function lerp(a, b, t) {
	return a + (b - a) * t;
}

export function lerpVec2(v1, v2, t) {
	return new Vec2(lerp(v1.x, v2.x, t), lerp(v1.y, v2.y, t));
}

export function lerpVec3(v1, v2, t) {
	return new Vec3(lerp(v1.x, v2.x, t), lerp(v1.y, v2.y, t), lerp(v1.z, v2.z, t));
}

export function snapNumberToGrid(number, gridSize) {
	return Math.round(number / gridSize) * gridSize;
}

export function distAB(ax, ay, bx, by) {
	var dx = bx - ax;
	var dy = by - ay;
	return Math.sqrt(dx * dx + dy * dy);
}

export function distanceToPointFromLine(point, lineA, lineB) {
	var lineD = lineB.subtract(lineA);
	var aDir = point.subtract(lineA);

	var closestP = lineA;

	var proj = aDir.dot(lineD);
	var lineDLenSq = lineD.lengthSquared();
	var d = proj / lineDLenSq;

	if (d <= 0) {
		closestP = lineA;
	} else if (d >= 1) {
		closestP = lineB;
	} else {
		closestP = lineA.add(lineD.multiply(d));
	}

	return {
		pointOnLine: closestP,
		distSq: point.distanceSquared(closestP)
	};
}

export function almostEquals(num1 = 1, num2 = 2, epsilon = 0.0005) {
	return Math.abs(num2 - num1) < epsilon;
}