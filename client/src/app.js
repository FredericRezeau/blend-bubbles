/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

import { System } from './system.js';
import { Utils } from './utils.js';
import { Canvas } from './canvas.js';
import './elements/header.js';
import './elements/footer.js';
import './elements/tooltip.js';
import './elements/dialog.js';

class App {
    #canvas;

    constructor() {
        this.#canvas = new Canvas();
    }

    async initialize() {
        await this.#canvas.initialize('canvas');
        this.resize();
        return this;
    }

    run() {
        const loop = (timestamp) => {
            window.requestAnimationFrame(loop);
            const elapsed = Math.min(timestamp - (Utils.currentTime), 1 / 20 * 1000) / 1000;
            Utils.currentTime = timestamp;
            this.#canvas.updateFrame(elapsed);
            this.#canvas.renderFrame(elapsed);
        };
        window.requestAnimationFrame(loop);
        return this;
    }

    resize() {
        System.resize();
        this.#canvas.recalcLayout();
    }
}

(async function(namespace) {
    let resizeTimeout;
    namespace.window = { isResizing: false };
    namespace.App = new App();
    window.addEventListener('resize', (event) => {
        clearTimeout(resizeTimeout);
        namespace.window.isResizing = true;
        resizeTimeout = setTimeout(() => {
            namespace.window.isResizing = false;
        }, 100);
        namespace.App.resize(event);
    });
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }
    (await namespace.App.initialize()).run();
})(window.BlendBubblesApp = window.BlendBubblesApp || {});
