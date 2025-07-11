/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

import { System } from './system.js';
import { Utils, StellarLogo, MetricsType } from './utils.js';
import { Horizon, StellarToml } from 'stellar-sdk';

const horizon = new Horizon.Server(import.meta.env.VITE_HORIZON_ENDPOINT || 'https://horizon.stellar.org', { allowHttp: true });
const endpoint = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001';
const pollingFrequency = import.meta.env.VITE_POLLING_FREQ || 60;

class Bubble {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.targetRadius = 0;
        this.vx = 0;
        this.vy = 0;
        this.tx = 0;
        this.ty = 0;
        this.scale = 0;
        this.border = 0;
        this.hover = false;
        this.initialized = false;
        this.data = null;
    }
}

export class Scene {
    #canvas;
    #onRecalcLayout;
    #viewport;
    #bubbles = [];
    #data = null;
    #imageCache = new Map();
    #poolColorMap = [];
    #metric = null;
    #mode = null;
    #time = null;
    #touchStartTime = 0;
    #clickedItem = null;
    #jitterTime = 0;
    #jitterInterval = 5000;

    constructor(canvas, onRecalcLayout) {
        this.#canvas = canvas;
        this.#onRecalcLayout = onRecalcLayout;
        this.#viewport = { left: 0, top: 0, width: 0, height: 0 };
    }

    async fetchData(reset) {
        const fetchAssetImage = async(code, issuer) => {
            const assetKey = `${code}:${issuer}`;
            if (this.#imageCache.has(assetKey)) {
                return this.#imageCache.get(assetKey);
            }
            try {
                let entry, homeDomain;
                if (code === 'XLM') {
                    const blob = new Blob([StellarLogo], { type: 'image/svg+xml' });
                    entry = { image: URL.createObjectURL(blob) };
                } else if (code === 'EURC' && issuer === 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2') {
                    entry = { image: 'https://www.circle.com/eurc-icon' };
                } else {
                    const account = await horizon.accounts().accountId(issuer).call();
                    homeDomain = account.home_domain;
                    if (homeDomain) {
                        const toml = await StellarToml.Resolver.resolve(homeDomain);
                        entry = toml.CURRENCIES?.find(asset =>
                            asset.code === code && asset.issuer === issuer
                        );
                    }
                }

                if (entry?.image) {
                    const image = new Image();
                    image.src = entry?.image;
                    await new Promise((resolve, reject) => {
                        image.onload = resolve;
                        image.onerror = reject;
                    });
                    const resolved = { homeDomain, url: entry.image, image };
                    this.#imageCache.set(assetKey, resolved);
                    return resolved;
                }
                return null;
            } catch (err) {
                console.warn(`Image fetch failed for ${code}:${issuer}`, err);
                return null;
            }
        };

        if (reset) {
            this.#bubbles = [];
        }

        clearTimeout(this.pollingTimeout);

        const params = {
            minutes: Utils.timeToMinutes(this.#time),
            borrow: 1,
            supply: 1,
            borrowApy: 1,
            supplyApy: 1
        };

        try {
            const result = await Utils.fetch(endpoint + '/deltas', params);
            if (result.status === 'ok') {
                this.#data = result.data;
                this.#poolColorMap = this.createColorMap([...new Set(this.#data.map(p => p.poolId))].sort());
                this.#data?.forEach(p => {
                    const match = this.#bubbles.find(b => b.data.poolId === p.poolId && b.data.asset.code === p.asset.code
                        && b.data.asset.issuer === p.asset.issuer);
                    if (match) {
                        match.data = p;
                    } else {
                        const bubble = new Bubble();
                        bubble.data = p;
                        const { code, issuer } = p.asset || {};
                        fetchAssetImage(code, issuer).then(meta => {
                            if (meta) {
                                bubble.assetMeta = meta;
                            }
                        });

                        bubble.series = { supply: [], borrow: [], supplyApy: [], borrowApy: [] };
                        this.#bubbles.push(bubble);
                    }
                });

                Utils.fetch(endpoint + '/series', params).then(seriesResult => {
                    if (seriesResult.status !== 'ok') return;
                    const series = seriesResult.data;
                    for (const b of this.#bubbles) {
                        const { poolId, asset } = b.data;
                        const match = series.find(s =>
                            s.poolId === poolId
                            && s.asset.code === asset.code && s.asset.issuer === asset.issuer
                        );
                        if (match && match.series) {
                            b.series = {
                                supply: match.series.supply || [],
                                borrow: match.series.borrow || [],
                                supplyApy: match.series.supplyApy || [],
                                borrowApy: match.series.borrowApy || []
                            };
                        }
                    }
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            this.pollingTimeout = setTimeout(() => {
                this.fetchData();
            }, pollingFrequency * 1000);
        }
    }

    initialize() {
        this.fetchData(true);
    }

    resize(size) {
        this.#viewport = Object.assign({}, this.#onRecalcLayout(size));
    }

    update(elapsed) {
        const unit = System.getUnit(this.#viewport);
        const rect = this.getRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const bubbles = this.#bubbles;
        const isSupply = () => !this.#mode || this.#mode === 'SUPPLY';

        let maxValue = 0;
        for (const b of bubbles) {
            if (!this.#metric || this.#metric === MetricsType.DELTA_TOTAL) {
                if (isSupply()) {
                    b.value = (b.data?.delta?.supply || 0) / (b.data?.start?.supply || 0.0001);
                } else {
                    b.value = (b.data?.delta?.borrow || 0) / (b.data?.start?.borrow || 0.0001);
                }
                b.sign = Math.sign(b.value) === 1;
            } else if (this.#metric === MetricsType.DELTA_APY) {
                if (isSupply()) {
                    b.value = b.data?.delta?.supplyApy || 0;
                } else {
                    b.value = b.data?.delta?.borrowApy || 0;
                }
                b.sign = Math.sign(b.value) === 1;
            } else if (this.#metric === MetricsType.APY) {
                b.value = isSupply() ? b.data?.end?.supplyApy : b.data?.end?.borrowApy;
                if (isSupply()) {
                    b.sign = Math.sign(b.data?.delta?.supplyApy || 0) === 1;
                } else {
                    b.sign = Math.sign(b.data?.delta?.supplyApy || 0) === 1;
                }
            }
            b.displayLabel = Utils.formatLabel(b.value, this.#metric);
            maxValue = Math.max(maxValue, Math.abs(b.value));
        }

        let total = 0;
        for (const b of bubbles) {
            if (!b.initialized) {
                b.initialized = true;
                b.x = cx;
                b.y = cy;
                b.vx = (Math.random() * 2 - 1) * 5;
                b.vy = (Math.random() * 2 - 1) * 5;
                b.scale = 1;
                b.poolColor = this.#poolColorMap[b.data.poolId];
            }
            b.scale = (0.3 + 0.7 * Math.pow((maxValue > 0 ? Math.abs(b.value) / maxValue : 0), 0.25)) * 1.3;
            total += b.scale;
        }

        const targetFill = 0.8; // ≈ 80%
        const maxRadius = Math.sqrt(
            (rect.width * rect.height * (Math.sqrt(targetFill) * 2 / Math.PI))
            / (Math.PI * Math.pow((total / bubbles.length), 2) * bubbles.length)
        );

        for (const b of bubbles) {
            b.targetRadius = b.scale * maxRadius;
            b.border = maxRadius * 0.05;
            b.radius += (b.targetRadius - b.radius) * Math.min(unit * elapsed, unit);

            const damping = 0.8;
            const min = 0.05;
            b.x += b.vx * elapsed * unit;
            b.y += b.vy * elapsed * unit;
            if (b.x - b.radius < rect.left) {
                b.x = rect.left + b.radius;
                b.vx *= -damping;
                if (Math.abs(b.vx) < min) {
                    b.vx = 0;
                }
            } else if (b.x + b.radius > rect.left + rect.width) {
                b.x = rect.left + rect.width - b.radius;
                b.vx *= -damping;
                if (Math.abs(b.vx) < min) {
                    b.vx = 0;
                }
            }

            if (b.y - b.radius < rect.top) {
                b.y = rect.top + b.radius;
                b.vy *= -damping;
                if (Math.abs(b.vy) < min) {
                    b.vy = 0;
                }
            } else if (b.y + b.radius > rect.top + rect.height) {
                b.y = rect.top + rect.height - b.radius;
                b.vy *= -damping;
                if (Math.abs(b.vy) < min) {
                    b.vy = 0;
                }
            }
        }

        // Simple bubble collisions.
        for (let i = 0; i < bubbles.length; i++) {
            const a = bubbles[i];
            for (let j = i + 1; j < bubbles.length; j++) {
                const b = bubbles[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distSq = dx * dx + dy * dy;
                const sum = a.radius + b.radius;
                if (distSq < sum * sum) {
                    const dist = Math.sqrt(distSq) || 0.000001;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = (sum - dist) / 2;
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                    const dot = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                    if (dot > 0) continue;
                    a.vx += nx * dot;
                    a.vy += ny * dot;
                    b.vx -= nx * dot;
                    b.vy -= ny * dot;
                }
            }
        }

        const now = Date.now();
        if (now - this.#jitterTime > this.#jitterInterval) {
            for (const b of this.#bubbles) {
                const impulse = 1.5;
                b.vx += (Math.random() * 2 - 1) * impulse;
                b.vy += (Math.random() * 2 - 1) * impulse;
            }
            this.#jitterTime = now;
        }
    }

    render(context, elapsed) {
        const drawBubble = (x, y, radius, border, up, hover) => {
            if (radius <= 0) {
                return;
            }

            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = 'rgba(255,255,255,0.2)';
            context.fill();

            const glow = context.createRadialGradient(x, y, radius * 0.75, x, y, radius);
            if (up) {
                glow.addColorStop(0, 'rgba(58,242,111,0)');
                glow.addColorStop(1, 'rgba(58,242,111,0.2)');
            } else {
                glow.addColorStop(0, 'rgba(255,37,99,0)');
                glow.addColorStop(1, 'rgba(255,37,99,0.2)');
            }

            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = glow;
            context.fill();

            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.lineWidth = System.scaleUnit * border;
            context.strokeStyle = up ? 'rgba(58,242,111,1)' : 'rgba(255,37,99,1)';
            context.stroke();

            if (hover) {
                context.beginPath();
                context.arc(x, y, radius * 1.02, 0, Math.PI * 2);
                context.strokeStyle = 'rgba(255,255,255,0.95)';
                context.lineWidth = System.scaleUnit * border * 1.5;
                context.stroke();
            }
        };

        this.#bubbles.forEach(b => {
            drawBubble(b.x, b.y, b.radius - b.border, b.border / System.scaleUnit * 0.4, b.sign, b.hover);

            context.save();
            context.translate(0, b.radius * 0.24);
            const textUnit = 0.4 * b.radius / System.scaleUnit;
            const lineHeight = b.radius * 0.25;
            Utils.drawText(context, b.data.asset.symbol, b.x, b.y, textUnit * 0.9, 'rgba(255,255,255, 1)', 700, 'center', 'middle', Utils.getCssVar('--font'));
            Utils.drawText(context, b.data.poolName, b.x, b.y - lineHeight, textUnit * 0.6, b.poolColor || '#fff', 600, 'center', 'bottom', Utils.getCssVar('--font'));
            Utils.drawText(context, b.displayLabel || '', b.x, b.y + lineHeight, textUnit * 0.5, 'rgba(255,255,255, 1)', 400, 'center', 'top', Utils.getCssVar('--font'));
            context.restore();

            if (b.assetMeta?.image?.complete) {
                const img = b.assetMeta.image;
                const size = b.radius * 0.4;
                const ratio = img.naturalWidth / img.naturalHeight;
                let width, height;
                if (ratio >= 1) {
                    width = size;
                    height = size / ratio;
                } else {
                    height = size;
                    width = size * ratio;
                }
                context.drawImage(img, b.x - width * 0.5, b.y - lineHeight * 2.1 - height * 0.5, width, height);
            }
        });
    }

    setMode(mode) {
        this.#mode = mode;
    }

    setMetric(metric) {
        this.#metric = metric;
    }

    setTime(time) {
        this.#time = time;
        this.fetchData();
    }

    createColorMap(poolIds) {
        const palette = [
            '#cc66ff',
            '#66ccff',
            '#00cc99',
            '#66ccff',
            '#00cc99',
            '#ffcc00',
            '#3399ff',
            '#99ff66'
        ];
        const colorMap = {};
        poolIds.forEach((id, index) => {
            colorMap[id] = palette[index % palette.length];
        });
        return colorMap;
    }

    getRect() {
        const unit = System.getUnit(this.#viewport);
        const rect = Utils.deflateRect(this.#viewport, unit, !System.isLandscape ? unit * 30 : unit * 15);
        if (!System.isLandscape) {
            rect.top += unit * 5;
        }
        return rect;
    }

    clear() {
        const tooltip = document.querySelector('tooltip-element');
        if (tooltip) {
            tooltip.bubble = null;
        }
        this.#canvas.canvas.style.cursor = 'default';
        this.#clickedItem = false;
        for (const b of this.#bubbles) {
            b.hover = false;
        }
    }

    showDialog(bubble, title) {
        const dialog = document.querySelector('dialog-element');
        dialog.bubble = bubble;
        dialog.title = title;
        dialog.mode = this.#mode || 'SUPPLY';
        dialog.metric = this.#metric || MetricsType.DELTA_TOTAL;
        dialog.isVisible = true;
    }

    touchStart(hudPoint, event) {
        this.clear();
        this.#touchStartTime = Date.now();
        for (const b of this.#bubbles) {
            if (Utils.isPointInCircle(hudPoint, b.x, b.y, b.radius)) {
                b.hover = true;
                this.#clickedItem = b;
                break;
            }
        }
    }

    touchMove(hudPoint, event) {
        let found = false;
        for (const b of this.#bubbles) {
            const hit = Utils.isPointInCircle(hudPoint, b.x, b.y, b.radius);
            b.hover = hit;
            if (hit && !found) {
                found = true;
                const tooltip = document.querySelector('tooltip-element');
                if (tooltip) {
                    tooltip.bubble = b;
                    const pos = Utils.hudToScreen(hudPoint, true);
                    tooltip.x = pos.x + 15;
                    tooltip.y = pos.y + 15;
                }
                this.#canvas.canvas.style.cursor = 'pointer';
            }
        }
        if (!found) {
            this.clear();
        }
    }

    touchEnd(hudPoint, event) {
        const duration = Date.now() - this.#touchStartTime;
        if (duration < 300) {
            for (const b of this.#bubbles) {
                if (b.data?.poolId && b === this.#clickedItem && b.hover) {
                    this.showDialog(b, 'Asset Details');
                    break;
                }
            }
        }
        setTimeout(() => {
            this.clear();
        }, 100);
    }

    scroll(hudPoint, event) {
    }

    hitTest(hudPoint, event) {
    }
}

Object.freeze(Scene);
