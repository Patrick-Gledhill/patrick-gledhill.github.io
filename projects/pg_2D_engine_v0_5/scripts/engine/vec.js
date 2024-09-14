export class Vec2 {
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

	cross(vector) {
		return this.x * vector.y - this.y * vector.x;
	}

	perp() {
		return new Vec2(-this.y, this.x);
	}

	floor() {
		return new Vec2(Math.floor(this.x), Math.floor(this.y));
	}

	round() {
		return new Vec2(Math.round(this.x), Math.round(this.y));
	}

	ceil() {
		return new Vec2(Math.ceil(this.x), Math.ceil(this.y));
	}

	length() {
		return Math.sqrt(this.dot(this));
	}

	lengthSquared() {
		return this.dot(this);
	}

	almostEquals(vector, epsilon = 0.0005) {
		var dx = Math.abs(vector.x - this.x);
		var dy = Math.abs(vector.y - this.y);

		var distSq = dx * dx + dy * dy;

		return distSq <= epsilon * epsilon;
	}

	distance(vector) {
		var d = vector.subtract(this);
		return Math.sqrt(d.x * d.x + d.y * d.y);
	}

	distanceSquared(vector) {
		var d = vector.subtract(this);
		return d.x * d.x + d.y * d.y;
	}

	get normalized() {
		var mag = Math.sqrt(this.dot(this));

		if (mag < 1e-8) {
			mag = 1;
		}

		return this.divide(mag);
	}

	normalize() {
		var mag = Math.sqrt(this.dot(this));

		if (mag < 1e-8) {
			mag = 1;
		}
		
		this.divideEquals(mag);
		return this.divide(mag);
	}

	clone() {
		return new Vec2(this.x, this.y);
	}

	direction() {
		return Math.atan2(this.y, this.x);
	}

	reflect(normal) {
		return this.subtract(normal.multiply(2 * this.dot(normal)));
	}

	set(x, y) {
		this.x = x;
		this.y = y;
	}
}

export class Vec3 {
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

	cross(vector) {
		return new Vec3(this.y * vector.z - this.z * vector.y, this.z * vector.x - this.x * vector.z, this.x * vector.y - this.y * vector.x);
	}

	length() {
		return Math.sqrt(this.dot(this));
	}

	floor() {
		return new Vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
	}

	round() {
		return new Vec3(Math.round(this.x), Math.round(this.y), Math.round(this.z));
	}

	ceil() {
		return new Vec3(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z));
	}

	get normalized() {
		var mag = Math.sqrt(this.dot(this));
		
		if (mag < 1e-8) {
			mag = 1;
		}

		return this.divide(mag);
	}

	normalize() {
		var mag = Math.sqrt(this.dot(this));

		if (mag < 1e-8) {
			mag = 1;
		}
		
		this.divideEquals(mag)
		return this.divide(mag);
	}

	// direction() {
	//     return Math.atan2(this.y, this.x);
	// }

	reflect(normal) {
		return this.subtract(normal.multiply(2 * this.dot(normal)));
	}

	set(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}