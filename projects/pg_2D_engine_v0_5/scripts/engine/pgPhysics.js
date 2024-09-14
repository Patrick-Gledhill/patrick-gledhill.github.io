import { Vec2 } from "./vec.js";
import * as utils from "./utils.js";

export class Matrix {
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

export class Transformer {
	constructor(position, rotation) {
		this.position = position;
		this.rotation = rotation;
		this.matrix = null;
		this.setMatrix();
	}

	setMatrix() {
		this.matrix = new Matrix([
			[Math.cos(this.rotation), -Math.sin(this.rotation), this.position.x],
			[Math.sin(this.rotation), Math.cos(this.rotation), this.position.y]
		]);
	}

	set(position, rotation) {
		this.position = position;
		this.rotation = rotation;
		this.setMatrix();
	}

	applyToVec2(vector) {
		// return new Vec2(vector.x + this.position.x, vector.y + this.position.y);
		return new Vec2(this.matrix.data[0][0] * vector.x + this.matrix.data[0][1] * vector.y + this.matrix.data[0][2],
			this.matrix.data[1][0] * vector.x + this.matrix.data[1][1] * vector.y + this.matrix.data[1][2]);
	}

	applyToVec2Array(vectors) {
		var newVA = [];

		for (var i = 0; i < vectors.length; i++) {
			newVA.push(this.applyToVec2(vectors[i]));
		}

		return newVA;
	}
}

export class PgPhysicsAABB {
	constructor(min, max) {
		this.min = min;
		this.max = max;
	}
}

export class PgPhysicsObject {
	constructor(parent, positionOffset = new Vec2(0, 0), isStatic = false, density, centerOfMass, cOR, staticFriction, dynamicFriction, type = "circle", width, height, radius, srcVertices, isRect, isPinned = false) {
		this.parent = parent;
		this.positionOffset = positionOffset;

		this.inject = function () { };

		this.previousPosition = new Vec2(this.parent.position.x, this.parent.position.y).add(positionOffset);
		this.position = new Vec2(this.parent.position.x, this.parent.position.y).add(positionOffset);
		this.acceleration = new Vec2(0, 0);
		this.velocity = new Vec2(0, 0);
		this.rotation = 0;
		this.angularAcceleration = 0;
		this.angularVelocity = 0;

		this.isStatic = isStatic;
		this.isPinned = isPinned;
		this.type = type;

		this.transformer = new Transformer(this.position, this.rotation);

		this.width = width;
		this.height = height;
		this.radius = radius;

		this.srcVertices = srcVertices;
		this.vertices = srcVertices;

		this.area = 1;
		this.density = density;
		this.mass = this.density * this.area;
		this.centerOfMass = centerOfMass;

		if (this.type === PgPhysicsObject.Shape.CIRCLE) {
			this.area = Math.PI * (this.radius * this.radius);

			this.mass = this.density * this.area;
			this.momentOfInertia = 0.5 * this.mass * (this.radius * this.radius);

			this.invMass = 1 / this.mass;
			this.invMomentOfInertia = 1 / this.momentOfInertia;
		} else if (this.type === PgPhysicsObject.Shape.POLYGON && isRect) {
			this.srcVertices = PgPhysicsObject.createRectVertices(this.width, this.height);
			this.vertices = this.transformer.applyToVec2Array(this.srcVertices);

			this.area = this.width * this.height;

			this.mass = this.density * this.area;
			this.momentOfInertia = (1 / 12) * this.mass * (this.width * this.width + this.height * this.height);

			this.invMass = 1 / this.mass;
			this.invMomentOfInertia = 1 / this.momentOfInertia;
		} else if (this.type === PgPhysicsObject.Shape.POLYGON) {
			this.srcVertices = this.vertices;
			this.vertices = this.transformer.applyToVec2Array(this.srcVertices);

			this.area = 32;

			this.mass = this.density * this.area;
			this.momentOfInertia = 512;

			this.invMass = 1 / this.mass;
			this.invMomentOfInertia = 1 / this.momentOfInertia;
		}

		if (this.isStatic || this.isPinned) {
			this.invMass = 0;
		}

		if (this.isStatic) {
			this.invMomentOfInertia = 0;
		}

		this.staticFriction = staticFriction;
		this.dynamicFriction = dynamicFriction;
		this.cOR = cOR;
	}

	static Shape = {
		UNKNOWN: "N/A",
		CIRCLE: "circle",
		POLYGON: "polygon"
	};

	static createRectVertices(width, height) {
		var hW = width / 2;
		var hH = height / 2;

		return [
			new Vec2(-hW, -hH),
			new Vec2(hW, -hH),
			new Vec2(hW, hH),
			new Vec2(-hW, hH)
		];
	}

	static createCircle(parent, positionOffset = new Vec2(0, 0), radius, isStatic = false, density, centerOfMass, cOR, staticFriction, dynamicFriction, isPinned = false) {
		return new PgPhysicsObject(parent, positionOffset, isStatic, density, centerOfMass, cOR, staticFriction, dynamicFriction, this.Shape.CIRCLE, null, null, radius, null, false, isPinned);
	}

	static createRectangle(parent, positionOffset = new Vec2(0, 0), width, height, isStatic = false, density, centerOfMass, cOR, staticFriction, dynamicFriction, isPinned = false) {
		return new PgPhysicsObject(parent, positionOffset, isStatic, density, centerOfMass, cOR, staticFriction, dynamicFriction, this.Shape.POLYGON, width, height, null, null, true, isPinned);
	}

	static createPolygon(parent, positionOffset = new Vec2(0, 0), vertices, isStatic = false, density, centerOfMass, cOR, staticFriction, dynamicFriction, isPinned = false) {
		return new PgPhysicsObject(parent, positionOffset, isStatic, density, centerOfMass, cOR, staticFriction, dynamicFriction, this.Shape.POLYGON, null, null, null, vertices, false, isPinned);
	}

	GetAABB() {
		var min = new Vec2(0, 0);
		var max = new Vec2(0, 0);

		if (this.type === PgPhysicsObject.Shape.POLYGON) {
			min = this.vertices[0].add(128);
			max = this.vertices[0].add(-128);

			for (var i = 0; i < this.vertices.length; i++) {
				var vertex = this.vertices[i];

				min.x = Math.min(vertex.x, min.x);
				min.y = Math.min(vertex.y, min.y);

				max.x = Math.max(vertex.x, max.x);
				max.y = Math.max(vertex.y, max.y);
			}
		} else if (this.type === PgPhysicsObject.Shape.CIRCLE) {
			var radVec = new Vec2(this.radius, this.radius);

			min = this.position.subtract(radVec);
			max = this.position.add(radVec);
		}

		return new PgPhysicsAABB(min, max);
	}

	applyToParent() {
		this.parent.position = this.position.subtract(this.positionOffset);
		// if (this.canRotate) {
		this.parent.rotation = this.rotation;
		// }
	}

	applyForce(force) {
		this.acceleration.plusEquals(force.divide(this.mass));
	}
}

export class CollisionData {
	constructor(objA, objB, normal, depth, contact1, contact2, contactCount) {
		this.objA = objA;
		this.objB = objB;
		this.normal = normal;
		this.depth = depth;
		this.contact1 = contact1;
		this.contact2 = contact2;
		this.contactCount = contactCount;
	}

	static getColPoints(objA, objB) {
		var cp1 = new Vec2(0, 0);
		var cp2 = new Vec2(0, 0);
		var cpCount = 0;

		var sCir = PgPhysicsObject.Shape.CIRCLE;
		var sPoly = PgPhysicsObject.Shape.POLYGON;

		if (objA.type === sPoly) {
			if (objB.type === sPoly) {
				// Poly - Poly
				var result = this.getPolyToPolyColPoints(objA, objB);
				cp1 = result.cp1;
				cp2 = result.cp2;
				cpCount = result.cpCount;
			} else if (objB.type === sCir) {
				// Poly - Circle
				cp1 = this.getCircleToPolyColPoint(objB, objA);
				cpCount = 1;
			}
		} else if (objA.type === sCir) {
			if (objB.type === sCir) {
				// Circle - Circle
				cp1 = this.getCircleToCircleColPoint(objA, objB);
				cpCount = 1;
			} else if (objB.type === sPoly) {
				// Circle - Poly
				cp1 = this.getCircleToPolyColPoint(objA, objB);
				cpCount = 1;
			}
		}

		return {
			cp1: cp1,
			cp2: cp2,
			cpCount: cpCount
		};
	}

	static getCircleToCircleColPoint(circle1, circle2) {
		var dir = circle2.position.subtract(circle1.position);
		dir.normalize();

		return circle1.position.add(dir.multiply(circle1.radius));
	}

	static getCircleToPolyColPoint(circle, poly) {
		var closestDistSq = Number.MAX_VALUE;
		var cp = new Vec2(0, 0);

		for (var i = 0; i < poly.vertices.length; i++) {
			var vertA = poly.vertices[i];
			var vertB = poly.vertices[(i + 1) % poly.vertices.length];

			var point = utils.distanceToPointFromLine(circle.position, vertA, vertB);

			if (point.distSq < closestDistSq) {
				closestDistSq = point.distSq;
				cp = point.pointOnLine;
			}
		}

		return cp;
	}

	static getPolyToPolyColPoints(poly1, poly2) {
		var cp1 = new Vec2(0, 0);
		var cp2 = new Vec2(0, 0);
		var cpCount = 0;

		var closestDistSq = Number.MAX_VALUE;

		for (var i = 0; i < poly1.vertices.length; i++) {
			var vertP = poly1.vertices[i];

			for (var j = 0; j < poly2.vertices.length; j++) {
				var vertA = poly2.vertices[j];
				var vertB = poly2.vertices[(j + 1) % poly2.vertices.length];

				var point = utils.distanceToPointFromLine(vertP, vertA, vertB);

				if (utils.almostEquals(point.distSq, closestDistSq)) {
					if (!point.pointOnLine.almostEquals(cp1)) {
						cp2 = point.pointOnLine;
						cpCount = 2;
					}
				} else if (point.distSq < closestDistSq) {
					closestDistSq = point.distSq;
					cpCount = 1;
					cp1 = point.pointOnLine;
				}
			}
		}

		for (var i = 0; i < poly2.vertices.length; i++) {
			var vertP = poly2.vertices[i];

			for (var j = 0; j < poly1.vertices.length; j++) {
				var vertA = poly1.vertices[j];
				var vertB = poly1.vertices[(j + 1) % poly1.vertices.length];

				var point = utils.distanceToPointFromLine(vertP, vertA, vertB);

				if (utils.almostEquals(point.distSq, closestDistSq)) {
					if (!point.pointOnLine.almostEquals(cp1)) {
						cp2 = point.pointOnLine;
						cpCount = 2;
					}
				} else if (point.distSq < closestDistSq) {
					closestDistSq = point.distSq;
					cpCount = 1;
					cp1 = point.pointOnLine;
				}
			}
		}

		return {
			cp1: cp1,
			cp2: cp2,
			cpCount: cpCount
		};
	}
}

export class ObjectConstraint {
	constructor(obj1, obj2, length, strength = 512, damping = 0) {
		this.obj1 = obj1;
		this.obj2 = obj2;
		this.length = length;
		this.strength = strength;
		this.damping = damping;
	}

	update(dT) {
		// var delta = this.obj2.position.subtract(this.obj1.position);
		// var dist = delta.length();
		// var forceMag = (dist - this.length) * this.strength;
		// var force = delta.normalized.multiply(forceMag);
		// var relVel = this.obj2.velocity.subtract(this.obj1.velocity);
		// var dampingForce = relVel.multiply(this.damping);

		// this.obj1.applyForce(force.add(dampingForce));
		// this.obj2.applyForce(force.add(dampingForce).multiply(-1));

		var lineCenter = this.obj1.position.add(this.obj2.position).divide(2);
		var lineDir = this.obj2.position.subtract(this.obj1.position).normalized;
		var currentLengthXY = this.obj2.position.subtract(this.obj1.position);
		var currentLength = currentLengthXY.length();

		if (utils.almostEquals(currentLength, 0, 0.0001)) {
			currentLength = 0.0001;
			lineDir = new Vec2(Math.random() * 2 - 1, 1).normalized;
		}

		var pointPos = lineCenter.subtract(lineDir.multiply(this.length / 2));
		var pointPos2 = lineCenter.add(lineDir.multiply(this.length / 2));

		if (!utils.almostEquals(this.length, currentLength, 0.00001)) {
			if (!this.obj1.isStatic) {
				this.obj1.applyForce(pointPos.subtract(this.obj1.position).multiply(this.strength));
			}

			if (!this.obj2.isStatic) {
				this.obj2.applyForce(pointPos2.subtract(this.obj2.position).multiply(this.strength));
			}
		}

	}

	draw(context) {
		context.save();
		context.strokeStyle = "#ffffff";
		context.beginPath();
		context.moveTo(this.obj1.position.x, this.obj1.position.y);
		context.lineTo(this.obj2.position.x, this.obj2.position.y);
		context.stroke();
		context.closePath();
		context.restore();
	}
}

export class PgPhysics {
	#_substeps = 1;

	constructor(gravity = { direction: new Vec2(0, 1), strength: 1 }, airFriction = 0.98) {
		this.objects = [];
		this.gravity = gravity;
		this.airFriction = airFriction;
		this.collisionsList = [];
		this.collisionsListDebug = [];
		this.#_substeps = 1;
		this.lineDebugList = [];
	}

	get substeps() {
		return this.#_substeps;
	}

	addObject(object = new PgPhysicsObject()) {
		this.objects.push(object);
	}

	removeObject(object) {
		var index = this.objects.indexOf(object);

		if (index > -1) {
			if (object instanceof ObjectConstraint == false) {
				for (var i = 0; i < this.objects.length; i++) {
					var obj = this.objects[i];

					if (i === index) {
						continue;
					}

					if (obj instanceof ObjectConstraint && (obj.obj1 == object || obj.obj2 == object)) {
						this.objects.splice(i, 1);
						i--;
						continue;
					}
				}
			}

			this.objects.splice(index, 1);
		}
	}

	update(time) {
		var substeps = 16;

		this.collisionsListDebug = [];
		this.lineDebugList = [];

		for (var i = 0; i < this.objects.length; i++) {
			var obj = this.objects[i];

			if (obj instanceof ObjectConstraint) {
				continue;
			}

			if (obj.position.y > 10240000 && !(obj.isPinned || obj.isStatic)) {
				this.removeObject(obj);
				i--;
				continue;
			}

			if (obj.isPinned) {
				continue;
			}

			var speed = obj.velocity.length() + (obj.area / 128);

			if (speed > substeps) {
				substeps = utils.clamp(0, 64, Math.ceil(speed));
			}

			obj.applyForce(this.gravity.direction.multiply(this.gravity.strength * obj.mass));
		}

		var deltaT = time / substeps;

		this.#_substeps = substeps;

		for (var substep = 0; substep < substeps; substep++) {
			for (var i = 0; i < this.objects.length; i++) {
				var obj = this.objects[i];

				if (obj instanceof ObjectConstraint) {
					obj.update(deltaT);
					continue;
				}

				if (!obj.isStatic) {
					if (!obj.isPinned) {
						obj.velocity.plusEquals(obj.acceleration.multiply(deltaT));
						// obj.velocity.plusEquals(this.gravity.direction.multiply(this.gravity.strength).multiply(deltaT));

						obj.velocity.timesEquals(this.airFriction);

						obj.position.plusEquals(obj.velocity.multiply(deltaT));
					} else {
						obj.velocity = new Vec2(0, 0);
					}

					obj.angularVelocity += obj.angularAcceleration * deltaT;
					// obj.angularVelocity *= this.airFriction;

					obj.rotation += obj.angularVelocity * deltaT;

					obj.rotation %= 360;

					// obj.acceleration = new Vec2(0, 0);
					// obj.angularAcceleration = 0;
				} else {
					obj.velocity = new Vec2(0, 0);
				}

				obj.inject();

				if (obj.type === PgPhysicsObject.Shape.POLYGON) {
					obj.transformer.set(obj.position, obj.rotation);
					obj.vertices = obj.transformer.applyToVec2Array(obj.srcVertices);
				}

				// obj.parent.color = "#00ff00";
			}

			// alert(this.collisionsList.length);
			this.collisionsList = [];

			for (var i = 0; i < this.objects.length - 1; i++) {
				if (this.objects[i] instanceof ObjectConstraint) {
					continue;
				}

				for (var j = i + 1; j < this.objects.length; j++) {
					if (this.objects[j] instanceof ObjectConstraint) {
						continue;
					}

					var obj1 = this.objects[i];
					var obj1AABB = obj1.GetAABB();
					var obj2 = this.objects[j];
					var obj2AABB = obj2.GetAABB();

					if (obj1.isStatic && obj2.isStatic) {
						continue;
					}

					if (this.axisAlignedBoundingBoxCollisionDetection(obj1AABB, obj2AABB) == false) {
						continue;
					}

					var colData = this.checkCollision(obj1, obj2, false);

					if (colData.collided) {
						// obj1.parent.color = "#ff0000";
						// obj2.parent.color = "#ff0000";
						var colD = new CollisionData(obj1, obj2, colData.normal, colData.depth, new Vec2(0, 0), new Vec2(0, 0), 0);
						if (!this.collisionsList.includes(colD)) {
							// alert(obj1.type + " : " + obj2.type)
							this.collisionsList.push(colD);
						}

					}
				}
			}

			for (var i = 0; i < this.collisionsList.length; i++) {

				this.resolveCollision(this.collisionsList[i], substep, substeps);
			}
		}

		for (var i = 0; i < this.objects.length; i++) {
			var obj = this.objects[i];

			if (obj instanceof ObjectConstraint) {
				continue;
			}

			obj.inject();

			obj.acceleration = new Vec2(0, 0);
			obj.angularAcceleration = 0;

			obj.applyToParent();
		}
	}

	checkCollision(objA = new PgPhysicsObject(), objB = new PgPhysicsObject(), debug = false) {
		var sCir = PgPhysicsObject.Shape.CIRCLE;
		var sPoly = PgPhysicsObject.Shape.POLYGON;

		if (objA.type === sPoly) {
			if (objB.type === sPoly) {
				// Poly - Poly
				return this.polygonToPolygonCollisionDetection(objA, objB, debug);
			} else if (objB.type === sCir) {
				// Poly - Circle
				return this.circleToPolygonCollisionDetection(objB, objA, true);
			}
		} else if (objA.type === sCir) {
			if (objB.type === sCir) {
				// Circle - Circle
				return this.circleToCircleCollisionDetection(objA, objB);
			} else if (objB.type === sPoly) {
				// Circle - Poly
				return this.circleToPolygonCollisionDetection(objA, objB, false);
			}
		}
	}

	resolveCollisionBasic(cData = new CollisionData(), substep, substeps) {
		if (cData.objA.isStatic) {
			cData.objB.position.plusEquals(cData.normal.multiply(cData.depth));
		} else if (cData.objB.isStatic) {
			cData.objA.position.minusEquals(cData.normal.multiply(cData.depth));
		} else {
			var totalMass = cData.objA.mass + cData.objB.mass;
			var ratio1 = cData.objB.mass / totalMass;
			var ratio2 = cData.objA.mass / totalMass;

			cData.objA.position.minusEquals(cData.normal.multiply(cData.depth * ratio1));
			cData.objB.position.plusEquals(cData.normal.multiply(cData.depth * ratio2));
		}

		var cPoints = CollisionData.getColPoints(cData.objA, cData.objB);
		cData.contact1 = cPoints.cp1;
		cData.contact2 = cPoints.cp2;
		cData.contactCount = cPoints.cpCount;


		if (substep === substeps - 1) {
			this.collisionsListDebug.push(cData);
		}

		var relativeVelocity = cData.objB.velocity.subtract(cData.objA.velocity);

		if (relativeVelocity.dot(cData.normal) > 0) {
			return;
		}

		var e = Math.min(cData.objA.cOR, cData.objB.cOR);

		var j = -(1 + e) * relativeVelocity.dot(cData.normal);
		j /= cData.objA.invMass + cData.objB.invMass;

		var imp = cData.normal.multiply(j);

		cData.objA.velocity.minusEquals(imp.multiply(cData.objA.invMass));
		cData.objB.velocity.plusEquals(imp.multiply(cData.objB.invMass));
	}

	resolveCollisionNoFriction(cData = new CollisionData(), substep, substeps) {
		if (cData.objA.isStatic) {
			cData.objB.position.plusEquals(cData.normal.multiply(cData.depth));
		} else if (cData.objB.isStatic) {
			cData.objA.position.minusEquals(cData.normal.multiply(cData.depth));
		} else {
			var totalMass = cData.objA.mass + cData.objB.mass;
			var ratio1 = cData.objB.mass / totalMass;
			var ratio2 = cData.objA.mass / totalMass;

			cData.objA.position.minusEquals(cData.normal.multiply(cData.depth * ratio1));
			cData.objB.position.plusEquals(cData.normal.multiply(cData.depth * ratio2));
		}

		var cPoints = CollisionData.getColPoints(cData.objA, cData.objB);
		cData.contact1 = cPoints.cp1;
		cData.contact2 = cPoints.cp2;
		cData.contactCount = cPoints.cpCount;

		if (substep === substeps - 1) {
			this.collisionsListDebug.push(cData);
		}

		var e = Math.min(cData.objA.cOR, cData.objB.cOR);

		var cpArr = [cData.contact1, cData.contact2];

		var impulses = [];

		for (var i = 0; i < cData.contactCount; i++) {
			var ra = cpArr[i].subtract(cData.objA.position);
			var rb = cpArr[i].subtract(cData.objB.position);
			var raPerp = new Vec2(-ra.y, ra.x);
			var rbPerp = new Vec2(-rb.y, rb.x);

			var angularLinearVelocityA = raPerp.multiply(cData.objA.angularVelocity);
			var angularLinearVelocityB = rbPerp.multiply(cData.objB.angularVelocity);

			var relativeVelocity = (cData.objB.velocity.add(angularLinearVelocityB)).subtract(cData.objA.velocity.add(angularLinearVelocityA));

			var rVNormal = relativeVelocity.dot(cData.normal);

			if (rVNormal > 0) {
				continue;
			}

			var raPerpDotN = raPerp.dot(cData.normal);
			var rbPerpDotN = rbPerp.dot(cData.normal);

			var denom = cData.objA.invMass + cData.objB.invMass +
				(raPerpDotN * raPerpDotN) * cData.objA.invMomentOfInertia +
				(rbPerpDotN * rbPerpDotN) * cData.objB.invMomentOfInertia;

			var j = -(1 + e) * rVNormal;
			j /= denom;
			j /= cData.contactCount;

			var imp = cData.normal.multiply(j);

			var impData = { imp: imp, ra: ra, rb: rb, raPerp: raPerp, rbPerp: rbPerp };

			impulses.push(impData);
		}

		for (var i = 0; i < impulses.length; i++) {
			var impD = impulses[i];

			cData.objA.velocity.plusEquals(impD.imp.multiply(-cData.objA.invMass));
			cData.objA.angularVelocity += -impD.ra.cross(impD.imp) * cData.objA.invMomentOfInertia;
			cData.objB.velocity.plusEquals(impD.imp.multiply(cData.objB.invMass));
			cData.objB.angularVelocity += impD.rb.cross(impD.imp) * cData.objB.invMomentOfInertia;
		}
	}

	resolveCollision(cData = new CollisionData(), substep, substeps) {
		if (cData.objA.isStatic || cData.objA.isPinned) {
			cData.objB.position.plusEquals(cData.normal.multiply(cData.depth));
		} else if (cData.objB.isStatic || cData.objB.isPinned) {
			cData.objA.position.minusEquals(cData.normal.multiply(cData.depth));
		} else {
			var totalMass = cData.objA.mass + cData.objB.mass;
			var ratio1 = cData.objB.mass / totalMass;
			var ratio2 = cData.objA.mass / totalMass;

			// if (ratio1 > ratio2) {
			// 	ratio1 = 0.8;
			// 	ratio2 = 0.2;
			// } else {
			// 	ratio1 = 0.8;
			// 	ratio2 = 0.2;
			// }

			cData.objA.position.minusEquals(cData.normal.multiply(cData.depth * ratio1));
			cData.objB.position.plusEquals(cData.normal.multiply(cData.depth * ratio2));
		}

		var cPoints = CollisionData.getColPoints(cData.objA, cData.objB);
		cData.contact1 = cPoints.cp1;
		cData.contact2 = cPoints.cp2;
		cData.contactCount = cPoints.cpCount;

		if (substep === substeps - 1) {
			this.collisionsListDebug.push(cData);
		}

		var e = Math.min(cData.objA.cOR, cData.objB.cOR);
		var sf = (cData.objA.staticFriction + cData.objB.staticFriction) / 2;
		var df = (cData.objA.dynamicFriction + cData.objB.dynamicFriction) / 2;

		var cpArr = [cData.contact1, cData.contact2];

		var impulses = [];
		var fImpulses = [];
		var jArr = [0, 0];

		// Velocity Impulses (linear and angular)

		for (var i = 0; i < cData.contactCount; i++) {
			var ra = cpArr[i].subtract(cData.objA.position);
			var rb = cpArr[i].subtract(cData.objB.position);
			var raPerp = new Vec2(-ra.y, ra.x);
			var rbPerp = new Vec2(-rb.y, rb.x);

			var angularLinearVelocityA = raPerp.multiply(cData.objA.angularVelocity);
			var angularLinearVelocityB = rbPerp.multiply(cData.objB.angularVelocity);

			var relativeVelocity = (cData.objB.velocity.add(angularLinearVelocityB)).subtract(cData.objA.velocity.add(angularLinearVelocityA));

			var rVNormal = relativeVelocity.dot(cData.normal);

			if (rVNormal > 0) {
				continue;
			}

			var raPerpDotN = raPerp.dot(cData.normal);
			var rbPerpDotN = rbPerp.dot(cData.normal);

			var denom = cData.objA.invMass + cData.objB.invMass +
				(raPerpDotN * raPerpDotN) * cData.objA.invMomentOfInertia +
				(rbPerpDotN * rbPerpDotN) * cData.objB.invMomentOfInertia;

			var j = -(1 + e) * rVNormal;
			j /= denom;
			j /= cData.contactCount;

			jArr[i] = j;

			var imp = cData.normal.multiply(j);

			var impData = { imp: imp, ra: ra, rb: rb, raPerp: raPerp, rbPerp: rbPerp };

			impulses.push(impData);
		}

		for (var i = 0; i < impulses.length; i++) {
			var impD = impulses[i];

			cData.objA.velocity.plusEquals(impD.imp.multiply(-cData.objA.invMass));
			cData.objA.angularVelocity += -impD.ra.cross(impD.imp) * cData.objA.invMomentOfInertia;
			cData.objB.velocity.plusEquals(impD.imp.multiply(cData.objB.invMass));
			cData.objB.angularVelocity += impD.rb.cross(impD.imp) * cData.objB.invMomentOfInertia;
		}

		// Friction Impulses (static and dynamic)

		for (var i = 0; i < cData.contactCount; i++) {
			var ra = cpArr[i].subtract(cData.objA.position);
			var rb = cpArr[i].subtract(cData.objB.position);
			var raPerp = new Vec2(-ra.y, ra.x);
			var rbPerp = new Vec2(-rb.y, rb.x);

			var angularLinearVelocityA = raPerp.multiply(cData.objA.angularVelocity);
			var angularLinearVelocityB = rbPerp.multiply(cData.objB.angularVelocity);

			var relativeVelocity = (cData.objB.velocity.add(angularLinearVelocityB)).subtract(cData.objA.velocity.add(angularLinearVelocityA));

			var tangent = relativeVelocity.subtract(cData.normal.multiply(relativeVelocity.dot(cData.normal)));

			if (tangent.almostEquals(new Vec2(0, 0), 0.0002)) {
				continue;
			}

			tangent.normalize();

			var raPerpDotT = raPerp.dot(tangent);
			var rbPerpDotT = rbPerp.dot(tangent);

			var denom = cData.objA.invMass + cData.objB.invMass +
				(raPerpDotT * raPerpDotT) * cData.objA.invMomentOfInertia +
				(rbPerpDotT * rbPerpDotT) * cData.objB.invMomentOfInertia;

			var j = -relativeVelocity.dot(tangent);
			j /= denom;
			j /= cData.contactCount;

			var impF = new Vec2(0, 0);

			if (Math.abs(j) <= jArr[i] * sf) {
				impF = tangent.multiply(j);
			} else {
				impF = tangent.multiply(-jArr[i] * df);
			}

			var impFData = { imp: impF, ra: ra, rb: rb, raPerp: raPerp, rbPerp: rbPerp };

			fImpulses.push(impFData);
		}

		for (var i = 0; i < fImpulses.length; i++) {
			var impFD = fImpulses[i];

			cData.objA.velocity.plusEquals(impFD.imp.multiply(-cData.objA.invMass));
			cData.objA.angularVelocity += -impFD.ra.cross(impFD.imp) * cData.objA.invMomentOfInertia;
			cData.objB.velocity.plusEquals(impFD.imp.multiply(cData.objB.invMass));
			cData.objB.angularVelocity += impFD.rb.cross(impFD.imp) * cData.objB.invMomentOfInertia;
		}
	}

	axisAlignedBoundingBoxCollisionDetection(aabb1, aabb2) {
		if (aabb1.max.x <= aabb2.min.x || aabb2.max.x <= aabb1.min.x ||
			aabb1.max.y <= aabb2.min.y || aabb2.max.y <= aabb1.min.y) {
			return false;
		}

		return true;
	}

	circleToCircleCollisionDetection(circle1, circle2) {
		var dx = circle2.position.x - circle1.position.x;
		var dy = circle2.position.y - circle1.position.y;
		var sqDist = dx * dx + dy * dy;

		if (sqDist < (circle1.radius + circle2.radius) ** 2) {
			return {
				collided: true,
				depth: (circle1.radius + circle2.radius) - Math.sqrt(sqDist),
				normal: circle2.position.subtract(circle1.position).normalized
			};
		}

		return {
			collided: false
		};
	}

	projectVerticesOntoAxis(vertices, axis) {
		var min = null;
		var max = null;

		for (var i = 0; i < vertices.length; i++) {
			var vertex = vertices[i];
			var proj = vertex.dot(axis);

			if (proj < min || min == null) {
				min = proj;
			}

			if (proj > max || max == null) {
				max = proj;
			}
		}

		return {
			min: min,
			max: max
		};
	}

	projectCircleOntoAxis(circle, axis) {
		var dir = axis.normalized;
		var edgeOfCircle = dir.multiply(circle.radius);

		var p1 = circle.position.add(edgeOfCircle);
		var p2 = circle.position.subtract(edgeOfCircle);

		var min = p1.dot(axis);
		var max = p2.dot(axis);

		if (min > max) {
			var temp = min;
			min = max;
			max = temp;
		}

		return {
			min: min,
			max: max
		};
	}

	indexOfVertexClosestToPoint(point, vertices) {
		var closestIdx = 0;
		var closestDist = Number.MAX_VALUE;

		for (var i = 0; i < vertices.length; i++) {
			var dist = point.subtract(vertices[i]).length();
			if (dist < closestDist) {
				closestDist = dist;
				closestIdx = i;
			}
		}

		return closestIdx;
	}

	getPolygonVertexAvgPos(poly) {
		var sum = new Vec2(0, 0);

		for (var i = 0; i < poly.vertices.length; i++) {
			sum.plusEquals(poly.vertices[i]);
		}

		return sum.divide(poly.vertices.length);
	}

	polygonToPolygonCollisionDetection(poly1, poly2, debug = false) {
		var depth = Number.MAX_VALUE;
		var normal = new Vec2(0, 0);

		for (var i = 0; i < poly1.vertices.length; i++) {
			var v1_1 = poly1.vertices[i];
			var v2_1 = poly1.vertices[(i + 1) % poly1.vertices.length];

			var edge_1 = v2_1.subtract(v1_1);
			var axis_1 = new Vec2(-edge_1.y, edge_1.x);

			axis_1.normalize();

			var minMaxA_1 = this.projectVerticesOntoAxis(poly1.vertices, axis_1);
			var minMaxB_1 = this.projectVerticesOntoAxis(poly2.vertices, axis_1);

			if (minMaxA_1.min > minMaxB_1.max || minMaxB_1.min > minMaxA_1.max) {
				return {
					collided: false
				};
			}

			var axisDepth_1 = Math.min(minMaxB_1.max - minMaxA_1.min, minMaxA_1.max - minMaxB_1.min);

			if (axisDepth_1 < depth) {
				if (debug == true) {
					this.lineDebugList.push({ a: poly1.position, b: edge_1.divide(2).add(poly1.position), color: "#ffffff", offset: new Vec2(0, 0) });
					this.lineDebugList.push({ a: poly1.position, b: axis_1.multiply(edge_1.length() / 2).add(poly1.position), color: "#ff0000", offset: new Vec2(0, 0) });
				}
				depth = axisDepth_1;
				normal = axis_1;
			}
		}

		for (var i = 0; i < poly2.vertices.length; i++) {
			var v1_2 = poly2.vertices[i];
			var v2_2 = poly2.vertices[(i + 1) % poly2.vertices.length];

			var edge_2 = v2_2.subtract(v1_2);
			var axis_2 = new Vec2(-edge_2.y, edge_2.x);

			axis_2.normalize();

			var minMaxA_2 = this.projectVerticesOntoAxis(poly1.vertices, axis_2);
			var minMaxB_2 = this.projectVerticesOntoAxis(poly2.vertices, axis_2);

			if (minMaxA_2.min > minMaxB_2.max || minMaxB_2.min > minMaxA_2.max) {
				return {
					collided: false
				};
			}

			var axisDepth_2 = Math.min(minMaxB_2.max - minMaxA_2.min, minMaxA_2.max - minMaxB_2.min);

			if (axisDepth_2 < depth) {
				if (debug == true) {
					this.lineDebugList.push({ a: poly2.position, b: edge_2.divide(2).add(poly2.position), color: "#ffffff", offset: new Vec2(0, 0) });
					this.lineDebugList.push({ a: poly2.position, b: axis_2.multiply(edge_2.length() / 2).add(poly2.position), color: "#ff0000", offset: new Vec2(0, 0) });
				}
				depth = axisDepth_2;
				normal = axis_2;
			}
		}

		var dir = this.getPolygonVertexAvgPos(poly2).subtract(this.getPolygonVertexAvgPos(poly1));

		if (dir.dot(normal) < 0) {
			normal.timesEquals(-1);
		}

		return {
			collided: true,
			depth: depth,
			normal: normal
		};
	}

	circleToPolygonCollisionDetection(circle, poly, invertNormal = false) {
		var depth = Number.MAX_VALUE;
		var normal = new Vec2(0, 0);

		for (var i = 0; i < poly.vertices.length; i++) {
			var v1 = poly.vertices[i];
			var v2 = poly.vertices[(i + 1) % poly.vertices.length];

			var edge = v2.subtract(v1);
			var axis = new Vec2(-edge.y, edge.x);
			axis.normalize();

			var minMaxA = this.projectVerticesOntoAxis(poly.vertices, axis);
			var minMaxB = this.projectCircleOntoAxis(circle, axis);

			if (minMaxA.min > minMaxB.max || minMaxB.min > minMaxA.max) {
				return {
					collided: false
				};
			}

			var axisDepth = Math.min(minMaxB.max - minMaxA.min, minMaxA.max - minMaxB.min);

			if (axisDepth < depth) {
				depth = axisDepth;
				normal = axis;
			}
		}

		var closestPoint = poly.vertices[this.indexOfVertexClosestToPoint(circle.position, poly.vertices)];

		var axis = closestPoint.subtract(circle.position);
		axis.normalize();

		var minMaxA = this.projectVerticesOntoAxis(poly.vertices, axis);
		var minMaxB = this.projectCircleOntoAxis(circle, axis);

		if (minMaxA.min > minMaxB.max || minMaxB.min > minMaxA.max) {
			return {
				collided: false
			};
		}

		var axisDepth = Math.min(minMaxB.max - minMaxA.min, minMaxA.max - minMaxB.min);

		if (axisDepth < depth) {
			depth = axisDepth;
			normal = axis;
		}

		var dir = this.getPolygonVertexAvgPos(poly).subtract(circle.position);

		if (dir.dot(normal) < 0) {
			normal.timesEquals(-1);
		}

		return {
			collided: true,
			depth: depth,
			normal: invertNormal == true ? normal.multiply(-1) : normal
		};
	}
}