function setPixel(imgDataObj, x, y, width, r, g, b, numSamples) {
    var index = (y * width + x) * 4;

    var scale = 1 / numSamples;
    r *= scale;
    g *= scale;
    b *= scale;

    // alert(r + " : " + g + " : " + b);

    // r = Math.sqrt(r);
    // g = Math.sqrt(g);
    // b = Math.sqrt(b);

    // Gamma correction
    var gamma = 2.2;
    r = Math.pow(r, 1 / gamma);
    g = Math.pow(g, 1 / gamma);
    b = Math.pow(b, 1 / gamma);

    if (prevFrameData != null) {
        var weight = 1 / (numRenderedFrames + 1);
        var pixColorN = new vec3(r, g, b);
        var prevPixCol = new vec3(prevFrameData[index] / 255, prevFrameData[index + 1] / 255, prevFrameData[index + 2] / 255);
        var accumulatedAvg = prevPixCol.multiply(1 - weight).add(pixColorN.multiply(weight));
        pixColorN = accumulatedAvg;

        r = pixColorN.r;
        g = pixColorN.g;
        b = pixColorN.b;
    }

    // var intensity = new Interval(0, 1);

    imgDataObj[index] = r * 255;
    imgDataObj[index + 1] = g * 255;
    imgDataObj[index + 2] = b * 255;
    imgDataObj[index + 3] = 255;

    // imgDataObj[index] = intensity.clamp(r) * 255;
    // imgDataObj[index + 1] = intensity.clamp(g) * 255;
    // imgDataObj[index + 2] = intensity.clamp(b) * 255;
    // imgDataObj[index + 3] = 255;
}

function getImgDataPixelIndex(imgDataObj, x, y) {
    return (y * imgDataObj.width + x) * 4;
}

function grayscaleFilter(pixColor) {
    var avg = (pixColor.x + pixColor.y + pixColor.z) / 3;
    return new vec3(avg, avg, avg);
}

function sepiaFilter(pixColor) {
    var avg = (pixColor.x + pixColor.y + pixColor.z) / 3;
    return new vec3(avg * 0.9, avg * 0.6, avg * 0.3);
}

function testFilter(pixColor) {
    return new vec3(pixColor.x, pixColor.y, pixColor.z);
}

function invertColorFilter(pixColor) {
    return new vec3(1, 1, 1).subtract(pixColor);
}

function darkenColorFilter(pixColor) {
    return pixColor.multiply(0.5);
}

function redFilter(pixColor) {
    return pixColor.multiply(new vec3(1, 0, 0));
}

function greenFilter(pixColor) {
    return pixColor.multiply(new vec3(0, 1, 0));
}

function blueFilter(pixColor) {
    return pixColor.multiply(new vec3(0, 0, 1));
}

// Tonemapper adapted from https://64.github.io/tonemapping/
function luminance(v) {
    return v.dot(new vec3(0.2126, 0.7152, 0.0722));
}

function changeLuminance(cIn, lOut) {
    var lIn = luminance(cIn);
    return cIn.multiply(lOut / lIn);
}

function reinhardExtendedLuminance(v, maxWhiteL) {
    var lOld = luminance(v);
    var numerator = lOld * (1 + (lOld / (maxWhiteL * maxWhiteL)));
    var lNew = numerator / (1 + lOld);
    return changeLuminance(v, lNew);
}

class Camera {
    constructor() {
        this.aspectRatio = 16 / 9;
        // this.sWidth = 384;
        this.sWidth = 256;
        this.sHeight = this.sWidth;
        this.center = new vec3(0, 0, 0);
        this.pixel00Loc;
        this.pixelDeltaU;
        this.pixelDeltaV;
        this.samplesPerPixel = 2;
        this.maxRayBounces = 8;
        this.colorFilter;
        this.useFilter = false;

        this.vFov = 20;
        this.lookFrom = new vec3(-2, 2, 1);
        this.lookAt = new vec3(0, 0, -1);
        this.vUp = new vec3(0, 1, 0);

        this.u;
        this.v;
        this.w;

        this.defocusAngle = 0;
        this.focusDist = 10;
        this.defocusDiskU;
        this.defocusDiskV;
    }

    setVFovWithHFov(hFov) {
        this.vFov = calculateVerticalFOVFromHorizontalFOV(hFov, this.aspectRatio);
    }

    initialize() {
        this.sHeight = Math.floor(this.sWidth / this.aspectRatio);
        this.sHeight = this.sHeight < 1 ? 1 : this.sHeight;

        this.center = this.lookFrom;

        // this.lookAt.z += 0.01;

        // var focalLength = (this.lookFrom.subtract(this.lookAt)).length();
        var theta = degreesToRadians(this.vFov);
        var h = Math.tan(theta / 2);
        var viewportHeight = 2 * h * this.focusDist;
        var viewportWidth = viewportHeight * (this.sWidth / this.sHeight);

        this.w = this.lookFrom.subtract(this.lookAt).normalized();
        this.u = this.vUp.cross(this.w).normalized();
        this.v = this.w.cross(this.u);

        var viewportU = this.u.multiply(viewportWidth);
        var viewportV = this.v.multiply(-1).multiply(viewportHeight);

        this.pixelDeltaU = viewportU.divide(this.sWidth);
        this.pixelDeltaV = viewportV.divide(this.sHeight);

        var halfVU = viewportU.divide(2);
        var halfVV = viewportV.divide(2);

        var viewportUpperLeft = this.center.subtract(this.w.multiply(this.focusDist)).subtract(halfVU).subtract(halfVV);
        var pixDeltaHUV = this.pixelDeltaU.add(this.pixelDeltaV).multiply(0.5);
        this.pixel00Loc = viewportUpperLeft.add(pixDeltaHUV);

        var defocusRadius = this.focusDist * Math.tan(degreesToRadians(this.defocusAngle / 2));
        this.defocusDiskU = this.u.multiply(defocusRadius);
        this.defocusDiskV = this.v.multiply(defocusRadius);
    }

    getEnvLight(r) {
        // return new vec3(0, 0, 0);
        // // var skyColorHorizon = new vec3(0, 0, 0);
        // // var skyColorZenith = new vec3(0, 0, 0);
        // // var groundColor = new vec3(0, 0, 0);

        // // var skyColorHorizon = new vec3(0.4, 0.5, 0.6);
        // // var skyColorZenith = new vec3(0.2, 0.25, 0.3);
        // // var groundColor = new vec3(0.4, 0.5, 0.6);

        // // var skyColorHorizon = new vec3(0.9, 0.9, 1).multiply(0.3);
        // // var skyColorZenith = new vec3(0.5, 0.7, 1).multiply(0.3);
        // // var groundColor = new vec3(0.25, 0.25, 0.25).multiply(0.3);

        // var skyColorHorizon = new vec3(0, 0, 0);
        // var skyColorZenith = new vec3(0, 0, 0);
        var skyColorHorizon = new vec3(0.9, 0.9, 1);
        var skyColorZenith = new vec3(0.5, 0.7, 1);
        var groundColor = new vec3(0.9, 0.9, 1);
        var unitDir = r.direction().normalized();
        // var sunDir = new vec3(-1, -0.4, 0.92).normalized();
        var sunDir = new vec3(1, -0.5, 1).normalized();
        var sunFocus = 64;
        var sunIntensity = 16; // 50
        var sunCol = new vec3(1, 0.9, 0.7);

        var skyGradT = Math.pow(smoothstep(0, 0.4, unitDir.y), 0.6);
        var skyGrad = lerpVec3(skyColorHorizon, skyColorZenith, skyGradT);
        var sun = Math.pow(Math.max(0, unitDir.dot(sunDir.multiply(-1))), sunFocus) * sunIntensity;

        var groundToSkyT = smoothstep(-0.01, 0, unitDir.y);
        var sunMask = (groundToSkyT >= 1);
        return lerpVec3(groundColor, skyGrad, groundToSkyT).add(sunCol.multiply(sun * sunMask));

        var unitDir = r.direction().normalized();
        var tm = (unitDir.y + 1) / 2;
        // if (unitDir.y > -0.01) {
        return new vec3(lerp(1, 0.5, tm), lerp(1, 0.7, tm), 1).multiply(0.99);
        // return new vec3(lerp(10, 5, tm), lerp(10, 7, tm), 10);
        // return new vec3(lerp(0.75, 0.375, tm), lerp(0.75, 0.525, tm), 1);
        // } else {
            // return new vec3(0.01, 1, 1);
        //     return new vec3(0.5, 0.5, 0.5);
            // return new vec3(1, 1, 1);
        // }
    }

    rayColor(r = new Ray(), depth, world = new HittableList(), colorFilter = function (pixColor) { return pixColor; }, mode = 1) {
        var col = this.rayColorMain(r, depth, world, mode);

        if (this.useFilter) {
            return colorFilter(col);
        } else {
            return col;
        }
    }

    rayColorMain(r = new Ray(), depth, world = new HittableList(), mode = 1) {
        // EXPERIMENTAL CODE

        var incomingLight = new vec3(0, 0, 0);
        var rayColor = new vec3(1, 1, 1);

        for (var i = 0; i <= depth; i++) {
            if (rayColor.x <= 0 && rayColor.y <= 0 && rayColor.z <= 0) {
                break;
            }

            var rec = new HitInfo();
            var col = world.hit(r, new Interval(0.001, Infinity), rec);
            if (col.hit) {
                rec = col.hInfo;
                var scatterRes = rec.material.scatter(r, rec);
                if (scatterRes.hit) {
                    r = scatterRes.ray;
                    var material = scatterRes;

                    var emittedLight = material.emissionColor.multiply(material.emissionStrength);

                    if (mode === 2) {
                        var lightPos = new vec3(0, 100, -250);
                        var dirToLight = lightPos.subtract(rec.p);
                        var distToLight = dirToLight.lengthSq();
                        dirToLight = dirToLight.normalized();

                        // if (distToLight < 1e-8) {
                        distToLight = 100;//1e-8;
                        // }

                        var generalCol = material.attenuation.add(emittedLight);
                        incomingLight = generalCol.multiply(clamp(0, 1, rec.normal.dot(dirToLight)) * ((100 * 256) / distToLight)).add(generalCol.multiply(new vec3(0.5, 0.5, 0.5)));
                        return incomingLight;
                    } else if (mode === 1) {
                        incomingLight = incomingLight.add(emittedLight.multiply(rayColor));
                        rayColor = rayColor.multiply(material.attenuation);
                    }
                }
            } else {
                incomingLight = incomingLight.add(this.getEnvLight(r).multiply(rayColor));
                break;
            }
        }

        return incomingLight;

        if (depth <= 0) {
            return new vec3(0, 0, 0);
        }

        var rec = new HitInfo();

        var col = world.hit(r, new Interval(0.001, Infinity), rec);
        rec = col.hInfo;

        if (col.hit) {
            var scatteredRay;
            var attenuation;

            var scatterResult = rec.material.scatter(r, rec);

            if (scatterResult.hit) {
                return this.rayColor(scatterResult.ray, depth - 1, world).multiply(scatterResult.attenuation);
            }

            return new vec3(0, 0, 0);

            // alert(rec.normal.x);
            // return new vec3(1, 0, 0);
            // var direction = vec3.randomOnHemisphere(rec.normal);
            // return this.rayColor(new Ray(rec.p, direction), depth - 1, world).multiply(0.5);
            // return (rec.normal.add(new vec3(1, 1, 1))).multiply(0.5);
        }

        var unitDir = r.direction().normalized();
        var tm = (unitDir.y + 1) / 2;
        return this.getEnvLight(r);
        // return new vec3(lerp(1, 0.5, tm), lerp(1, 0.7, tm), 1);
        // return new vec3(lerp(1, 1, tm), lerp(1, 1, tm), 1);
    }

    pixelSampleSquare() {
        if (this.samplesPerPixel >= 2) {
            var px = -0.5 + Math.random();
            var py = -0.5 + Math.random();
            return (this.pixelDeltaU.multiply(px)).add(this.pixelDeltaV.multiply(py));
        }

        return vec3.zero();
    }

    defocusDiskSample() {
        var p = vec3.randomPointInDisk();
        return this.center.add(this.defocusDiskU.multiply(p.x)).add(this.defocusDiskV.multiply(p.y));
    }

    getRay(x, y) {
        var cPixDeltU = this.pixelDeltaU.multiply(x);
        var cPixDeltV = this.pixelDeltaV.multiply(y);
        var pixelCenter = this.pixel00Loc.add(cPixDeltU).add(cPixDeltV);

        var pixelSample = pixelCenter.add(this.pixelSampleSquare());

        var rayOrigin = (this.defocusAngle <= 0) ? this.center : this.defocusDiskSample();
        var rayDir = pixelSample.subtract(rayOrigin);
        var rayTime = Math.random();

        return new Ray(rayOrigin, rayDir.normalized(), rayTime);
    }

    denoiseImgData(imgdata) {
        var referenceImgData = imgdata;

        for (var x = 0; x < referenceImgData.width; x++) {
            for (var y = 0; y < referenceImgData.height; y++) {
                var pixIndex = getImgDataPixelIndex(referenceImgData, x, y);
                var newPixColor = new vec3(referenceImgData.data[pixIndex], referenceImgData.data[pixIndex + 1], referenceImgData.data[pixIndex + 2]);
                var totalAvgNum = 1;

                if (x > 0) {
                    var otherPixIndexL = getImgDataPixelIndex(referenceImgData, x - 1, y);
                    var otherPixL = new vec3(referenceImgData.data[otherPixIndexL], referenceImgData.data[otherPixIndexL + 1], referenceImgData.data[otherPixIndexL + 2]);
                    newPixColor = newPixColor.add(otherPixL);
                    totalAvgNum += 1;
                    // newPixColor = newPixColor.divide(2);
                }

                if (x < referenceImgData.width - 1) {
                    var otherPixIndexR = getImgDataPixelIndex(referenceImgData, x + 1, y);
                    var otherPixR = new vec3(referenceImgData.data[otherPixIndexR], referenceImgData.data[otherPixIndexR + 1], referenceImgData.data[otherPixIndexR + 2]);
                    newPixColor = newPixColor.add(otherPixR);
                    totalAvgNum += 1;
                    // newPixColor = newPixColor.divide(2);
                }

                if (y > 0) {
                    var otherPixIndexT = getImgDataPixelIndex(referenceImgData, x, y - 1);
                    var otherPixT = new vec3(referenceImgData.data[otherPixIndexT], referenceImgData.data[otherPixIndexT + 1], referenceImgData.data[otherPixIndexT + 2]);
                    newPixColor = newPixColor.add(otherPixT);
                    totalAvgNum += 1;
                    // newPixColor = newPixColor.divide(2);
                }

                if (y < referenceImgData.height - 1) {
                    var otherPixIndexB = getImgDataPixelIndex(referenceImgData, x, y + 1);
                    var otherPixB = new vec3(referenceImgData.data[otherPixIndexB], referenceImgData.data[otherPixIndexB + 1], referenceImgData.data[otherPixIndexB + 2]);
                    newPixColor = newPixColor.add(otherPixB);
                    totalAvgNum += 1;
                    // newPixColor = newPixColor.divide(2);
                }

                newPixColor = newPixColor.divide(totalAvgNum);

                imgdata.data[pixIndex] = newPixColor.x;
                imgdata.data[pixIndex + 1] = newPixColor.y;
                imgdata.data[pixIndex + 2] = newPixColor.z;
            }
        }
    }

    tonemap(img) {
        var maxLum = 0;
        var numAvg = 1;
        for (var i = 0; i < img.length; i += 4) {
            var col = new vec3(img[i] / 255, img[i + 1] / 255, img[i + 2] / 255);
            var colLum = luminance(col);

            if (colLum >= maxLum) {
                maxLum = colLum;
            }

            // maxLum += colLum;

            // if (i > 0) {
            //     numAvg++;
            // }
        }

        // maxLum /= numAvg;

        for (var i = 0; i < img.length; i += 4) {
            var col = new vec3(img[i] / 255, img[i + 1] / 255, img[i + 2] / 255);
            var newCol = reinhardExtendedLuminance(col, maxLum);

            img[i] = newCol.x * 255;
            img[i + 1] = newCol.y * 255;
            img[i + 2] = newCol.z * 255;
        }

        return img;
    }


    async render(context = ctx, world, tonemap = true, denoise = true, mode = 1) {
        this.initialize();

        resizeCanvas(this.sWidth, this.sHeight);

        rendImgWidth = this.sWidth;
        rendImgHeight = this.sHeight;

        var outputImg = context.createImageData(this.sWidth, this.sHeight);
        var imgData = outputImg.data;
        var hdrData = [];

        if (prevFrameData != null) {
            for (var i = 0; i < imgData.length; i += 4) {
                imgData[i] = prevFrameData[i];
                imgData[i + 1] = prevFrameData[i + 1];
                imgData[i + 2] = prevFrameData[i + 2];
                imgData[i + 3] = prevFrameData[i + 3];
            }
        }

        // console.time("Render Time");
        for (var y = 0; y < this.sHeight; y++) {
            if (exitRender == true) {
                exitRender = false;
                return;
            }
            // console.log("Scanlines Remaining: " + (this.sHeight - y));
            for (var x = 0; x < this.sWidth; x++) {
                // setPixel(imgData, x, y, this.sWidth, x / this.sWidth, 0, 0, 1);
                var pixColor = new vec3(0, 0, 0);

                for (var i = 0; i < this.samplesPerPixel; i++) {
                    var ray = this.getRay(x, y);
                    pixColor = pixColor.add(this.rayColor(ray, this.maxRayBounces, world, this.colorFilter, mode));
                }

                setPixel(hdrData, x, y, this.sWidth, pixColor.r, pixColor.g, pixColor.b, this.samplesPerPixel);
                setPixel(imgData, x, y, this.sWidth, pixColor.r, pixColor.g, pixColor.b, this.samplesPerPixel);
            }

            // if (y % 32 === 0) {
            // await wait(0);
            // context.putImageData(outputImg, 0, 0);
            // }
        }

        // console.timeEnd("Render Time");

        // if (prevFrameData != null) {
        //     for (var i = 0; i < imgData.length; i += 4) {
        //         imgData[i] = (prevFrameData[i] + imgData[i]) / 2;
        //         imgData[i + 1] = (prevFrameData[i + 1] + imgData[i + 1]) / 2;
        //         imgData[i + 2] = (prevFrameData[i + 2] + imgData[i + 2]) / 2;
        //     }
        // }

        if (denoise == true) {
            // this.denoiseImgData(outputImg);
        }

        if (tonemap == true) {
            var toneImg = this.tonemap(hdrData);

            for (var i = 0; i < outputImg.data.length; i += 4) {
                outputImg.data[i] = toneImg[i];
                outputImg.data[i + 1] = toneImg[i + 1];
                outputImg.data[i + 2] = toneImg[i + 2];
            }
        } else {
            for (var i = 0; i < outputImg.data.length; i += 4) {
                outputImg.data[i] = hdrData[i];
                outputImg.data[i + 1] = hdrData[i + 1];
                outputImg.data[i + 2] = hdrData[i + 2];
            }
        }

        prevFrameData = imgData;

        context.putImageData(outputImg, 0, 0);
    }
}