/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

import { System } from './system.js';

export class Camera {
    constructor() {
        this.reset();
        this.update();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.sx = 1;
        this.sy = 1;
        this.tx = 0;
        this.ty = 0;
        this.angle = 0;
        this.matrix = [1, 0, 0, 1, 0, 0];
    }

    update() {
        this.matrix = [1, 0, 0, 1, 0, 0];
        this.translate(this.x, this.y);
        this.scale(this.sx, this.sy);
        this.rotate(this.angle);
    }

    translate(t, i) {
        this.matrix[4] += this.matrix[0] * t + this.matrix[2] * i;
        this.matrix[5] += this.matrix[1] * t + this.matrix[3] * i;
    }

    scale(t, i) {
        this.matrix[0] *= t;
        this.matrix[1] *= t;
        this.matrix[2] *= i;
        this.matrix[3] *= i;
    }

    rotate(t) {
        const i = Math.cos(t);
        const a = Math.sin(t);
        const r = this.matrix[0] * i + this.matrix[2] * a;
        const s = this.matrix[1] * i + this.matrix[3] * a;
        const m = this.matrix[0] * -a + this.matrix[2] * i;
        const h = this.matrix[1] * -a + this.matrix[3] * i;
        this.matrix[0] = r;
        this.matrix[1] = s;
        this.matrix[2] = m;
        this.matrix[3] = h;
    }

    screenToCamera(t, i) {
        const a = t;
        const r = i;
        const s = 1 / (this.matrix[0] * this.matrix[3] - this.matrix[1] * this.matrix[2]);
        // eslint-disable-next-line no-return-assign
        return {
            x: t = a * (this.matrix[3] * s) + r * (-this.matrix[2] * s) + s * (this.matrix[2] * this.matrix[5] - this.matrix[3] * this.matrix[4]),
            y: i = a * (-this.matrix[1] * s) + r * (this.matrix[0] * s) + s * (this.matrix[1] * this.matrix[4] - this.matrix[0] * this.matrix[5])
        };
    }

    cameraToScreen(t, i) {
        const a = t;
        const r = i;
        // eslint-disable-next-line no-return-assign
        return {
            x: t = a * this.matrix[0] + r * this.matrix[2] + this.matrix[4],
            y: i = a * this.matrix[1] + r * this.matrix[3] + this.matrix[5]
        };
    }

    multiply(t) {
        const i = this.matrix[0] * t.matrix[0] + this.matrix[2] * t.matrix[1];
        const a = this.matrix[1] * t.matrix[0] + this.matrix[3] * t.matrix[1];
        const r = this.matrix[0] * t.matrix[2] + this.matrix[2] * t.matrix[3];
        const s = this.matrix[1] * t.matrix[2] + this.matrix[3] * t.matrix[3];
        const m = this.matrix[0] * t.matrix[4] + this.matrix[2] * t.matrix[5] + this.matrix[4];
        const h = this.matrix[1] * t.matrix[4] + this.matrix[3] * t.matrix[5] + this.matrix[5];
        this.matrix[0] = i;
        this.matrix[1] = a;
        this.matrix[2] = r;
        this.matrix[3] = s;
        this.matrix[4] = m;
        this.matrix[5] = h;
    }
}

export class Utils {
    static #cssVars = {};
    static #unitCamera = new Camera();
    static #hudCamera = new Camera();
    static #ratio = null;
    static #currentTime = performance.now();

    static applyCameraRatio(ratio) {
        Utils.#ratio = ratio;
        Utils.#unitCamera.sx = 1;
        Utils.#unitCamera.sy = 1;
        Utils.#unitCamera.update();
    }

    static updateCameras() {
        Utils.#unitCamera.update();
        Utils.#hudCamera.update();
    }

    static prepareContext(context) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.setTransform.apply(context, Utils.#unitCamera.matrix);
        context.transform.apply(context, Utils.#hudCamera.matrix);
    }

    static screenToHud(point, useRatio) {
        const camera = new Camera();
        camera.multiply(Utils.#unitCamera);
        camera.multiply(Utils.#hudCamera);
        const hudPoint = camera.screenToCamera(point.x, point.y);
        return { x: hudPoint.x / (Utils.#ratio && useRatio ? Utils.#ratio.x : 1), y: hudPoint.y / (Utils.#ratio && useRatio ? Utils.#ratio.y : 1) };
    };

    static hudToScreen(point, useRatio) {
        const camera = new Camera();
        camera.multiply(Utils.#unitCamera);
        camera.multiply(Utils.#hudCamera);
        const screenPoint = camera.cameraToScreen(point.x, point.y);
        return { x: screenPoint.x * (Utils.#ratio && useRatio ? Utils.#ratio.x : 1), y: screenPoint.y * (Utils.#ratio && useRatio ? Utils.#ratio.y : 1) };
    };

    static isPointInCircle(pt, x, y, radius) {
        const dx = pt.x - x;
        const dy = pt.y - y;
        return dx * dx + dy * dy <= radius * radius;
    }

    static formatNumber(number, abbrv, digits = 2) {
        if (abbrv) {
            if (number >= 1e9) {
                return (number / 1e9).toFixed(digits) + 'B';
            } else if (number >= 1e6) {
                return (number / 1e6).toFixed(digits) + 'M';
            } else if (number >= 1e3) {
                return (number / 1e3).toFixed(digits) + 'K';
            } else {
                return number.toFixed(digits);
            }
        }
        return number?.toLocaleString('en-US',
            { minimumFractionDigits: digits, maximumFractionDigits: digits }) || '';
    }

    static deflateRect(rect, x, y) {
        return {
            left: rect.left + x,
            top: rect.top + y,
            width: Math.max(0, rect.width - 2 * x),
            height: Math.max(0, rect.height - 2 * y)
        };
    }

    static getCssVar(name) {
        if (!Utils.#cssVars[name]) {
            const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            Utils.#cssVars[name] = value;
        }
        return Utils.#cssVars[name];
    }

    static get currentTime() {
        return Utils.#currentTime;
    }

    static set currentTime(time) {
        Utils.#currentTime = time;
    }

    static drawText(context, text, x, y, scale, color, weight, align, baseline, font, stroke, strokeColor) {
        context.save();
        context.translate(x, y);
        context.scale(scale / System.renderFontScaling, scale / System.renderFontScaling);
        context.translate(-x, -y);
        context.textAlign = align || 'center';
        context.textBaseline = baseline || 'middle';
        context.font = `${weight || 400} ${System.scaleUnit * System.renderFontScaling + 'px'} ${(font || Utils.getCssVar('--font'))}`;
        if (stroke) {
            context.strokeStyle = strokeColor;
            context.lineWidth = stroke;
            context.strokeText(text, x, y);
        }
        context.fillStyle = color || '#000000';
        context.fillText(text, x, y);
        context.restore();
    }

    static async fetch(endpoint, params) {
        try {
            const query = new URLSearchParams(params || {}).toString();
            const response = await fetch(query ? endpoint + '?' + query : endpoint);
            if (!response.ok) {
                throw new Error('HTTP error. Status: ' + response.status);
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    static timeToMinutes(time) {
        switch (time) {
            case '1D': return 1440;
            case '1W': return 10080;
            case '1M': return 43800;
            default: return 720;
        }
    }
}

export const StellarLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 236.36 200">
<path fill="white" d="M203,26.16l-28.46,14.5-137.43,70a82.49,82.49,0,0,1-.7-10.69A81.87,81.87,0,0,1,158.2,28.6l16.29-8.3,2.43-1.24A100,100,0,0,0,18.18,100q0,3.82.29,7.61a18.19,18.19,0,0,1-9.88,17.58L0,129.57V150l25.29-12.89,0,0,8.19-4.18,8.07-4.11v0L186.43,55l16.28-8.29,33.65-17.15V9.14Z"/>
<path fill="white" d="M236.36,50,49.78,145,33.5,153.31,0,170.38v20.41l33.27-16.95,28.46-14.5L199.3,89.24A83.45,83.45,0,0,1,200,100,81.87,81.87,0,0,1,78.09,171.36l-1,.53-17.66,9A100,100,0,0,0,218.18,100c0-2.57-.1-5.14-.29-7.68a18.2,18.2,0,0,1,9.87-17.58l8.6-4.38Z"/>
</svg>`;

Object.freeze(Camera);
Object.freeze(Utils);
