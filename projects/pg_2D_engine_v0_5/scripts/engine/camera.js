import { degToRad } from "./utils.js";
import { Vec2 } from "./vec.js";

export class Camera {
	constructor(x, y, viewScale, rotation = 0) {
		this.position = new Vec2(x, y);
		this.previous = this.position;
		this.viewScale = viewScale;
		this.rotation = rotation;
		this.translated = new Vec2(0, 0);
	}

	applyToCtxOld(context, cWidth, cHeight) {
		context.scale(this.viewScale, this.viewScale);
		context.translate(-(this.position.x - (cWidth / (this.viewScale * 2))), -(this.position.y - (cHeight / (this.viewScale * 2))));

		this.translated.x = -(this.position.x - (cWidth / (this.viewScale * 2)));
		this.translated.y = -(this.position.y - (cHeight / (this.viewScale * 2)));

		return {
			x: -(this.position.x - (cWidth / (this.viewScale * 2))),
			y: -(this.position.y - (cHeight / (this.viewScale * 2)))
		};
	}

	applyToMouseOld(cWidth, cHeight, mouseX, mouseY) {
		var translatedMouse = { x: mouseX, y: mouseY };
		translatedMouse.x = (mouseX + (this.position.x * this.viewScale) - (cWidth / 2)) / this.viewScale;
		translatedMouse.y = (mouseY + (this.position.y * this.viewScale) - (cHeight / 2)) / this.viewScale;

		return translatedMouse;
	}

	applyToCtx(context, cWidth, cHeight) {
		var tX = -this.position.x * this.viewScale;
		var tY = -this.position.y * this.viewScale;

		context.translate(cWidth / 2, cHeight / 2);
		context.rotate((-this.rotation % 360) * degToRad);
		context.translate(tX, tY);
		context.scale(this.viewScale, this.viewScale);

		this.translated.x = tX;
		this.translated.y = tY;

		return {
			x: tY,
			y: tY
		};
	}

	applyToMouse(cWidth, cHeight, mouseX, mouseY) {
		var hCWidth = cWidth / 2;
		var hCHeight = cHeight / 2;

		var mX = (mouseX - hCWidth) / this.viewScale;
		var mY = (mouseY - hCHeight) / this.viewScale;

		var cosR = Math.cos((this.rotation % 360) * degToRad);
		var sinR = Math.sin((this.rotation % 360) * degToRad);

		var rX = mX * cosR - mY * sinR;
		var rY = mX * sinR + mY * cosR;

		return {
			x: rX + this.position.x,
			y: rY + this.position.y,
		};
	}

	getScreenBounds(cWidth, cHeight) {
		var topLeft = new Vec2((-cWidth / 2) / this.viewScale, (-cHeight / 2) / this.viewScale);
		var topRight = new Vec2((cWidth / 2) / this.viewScale, (-cHeight / 2) / this.viewScale);
		var bottomRight = new Vec2((cWidth / 2) / this.viewScale, (cHeight / 2) / this.viewScale);
		var bottomLeft = new Vec2((-cWidth / 2) / this.viewScale, (cHeight / 2) / this.viewScale);

		var cosR = Math.cos((this.rotation % 360) * degToRad);
		var sinR = Math.sin((this.rotation % 360) * degToRad);

		var tlOffset = topLeft.clone();
		var trOffset = topRight.clone();
		var brOffset = bottomRight.clone();
		var blOffset = bottomLeft.clone();

		topLeft.set(tlOffset.x * cosR - tlOffset.y * sinR, tlOffset.x * sinR + tlOffset.y * cosR);
		topRight.set(trOffset.x * cosR - trOffset.y * sinR, trOffset.x * sinR + trOffset.y * cosR);
		bottomRight.set(brOffset.x * cosR - brOffset.y * sinR, brOffset.x * sinR + brOffset.y * cosR);
		bottomLeft.set(blOffset.x * cosR - blOffset.y * sinR, blOffset.x * sinR + blOffset.y * cosR);

		topLeft.plusEquals(this.position);
		topRight.plusEquals(this.position);
		bottomRight.plusEquals(this.position);
		bottomLeft.plusEquals(this.position);

		var min = new Vec2(Math.min(topLeft.x, topRight.x, bottomRight.x, bottomLeft.x), Math.min(topLeft.y, topRight.y, bottomRight.y, bottomLeft.y));
		var max = new Vec2(Math.max(topLeft.x, topRight.x, bottomRight.x, bottomLeft.x), Math.max(topLeft.y, topRight.y, bottomRight.y, bottomLeft.y));

		return { topLeft: topLeft, topRight: topRight, bottomRight: bottomRight, bottomLeft: bottomLeft, worldAABB: { min: min, max: max } };
	}
}