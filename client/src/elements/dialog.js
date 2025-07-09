/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

import { LitElement, css, html } from 'lit';
import { Utils } from '../utils';
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

export class DialogElement extends LitElement {
    static get properties() {
        return {
            bubble: { type: Object },
            title: { type: String },
            isVisible: { type: Boolean },
            mode: { type: String },
            metric: { type: String }
        };
    }

    constructor() {
        super();
        this.bubble = '';
        this.title = '';
        this.mode = 'SUPPLY';
        this.metric = 'FLOW';
        this.isVisible = false;
        this._handleKeyDown = this._handleKeyDown.bind(this);
    }

    updated(changedProperties) {
        if (changedProperties.has('isVisible')) {
            this._renderChart();
            if (this.isVisible) {
                window.addEventListener('keydown', this._handleKeyDown);
            } else {
                window.removeEventListener('keydown', this._handleKeyDown);
            }
        }
    }

    async _renderChart() {
        const canvas = this.shadowRoot.getElementById('series');
        if (!canvas || !this.bubble?.series) {
            return;
        }

        const { mode, metric } = this;
        const key = (mode === 'SUPPLY' ? 'supply' : 'borrow') + (metric === 'APY' ? 'Apy' : '');
        const raw = this.bubble.series[key];
        if (!raw || raw.length === 0) {
            return;
        }

        if (this._chart) {
            this._chart.destroy();
        }

        const labels = raw.map(p =>
            new Date(p.timestamp * 1000).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        );
        const values = raw.map(p => metric === 'FLOW' ? (p.value / 1e7) : (p.value * 100));
        const label = `${mode.charAt(0)}${mode.slice(1).toLowerCase()} ${metric === 'APY' ? 'APY (%)' : 'Volume'}`;
        const title = this.shadowRoot.getElementById('chart-title');
        if (title) {
            title.textContent = label;
        }

        const color = mode === 'SUPPLY' ? '#00b7ff' : '#ff7f2a';
        this._chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label,
                    data: values,
                    borderColor: color,
                    backgroundColor: `${color}20`,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.raw;
                                return metric === 'APY'
                                    ? `${val.toFixed(4)}%`
                                    : Utils.formatNumber(val);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#aaa', maxTicksLimit: 6, autoSkip: true },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: {
                            color: '#aaa',
                            callback: val => metric === 'APY' ? `${val.toFixed(2)}%` : val.toLocaleString()
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }

    _close() {
        this.isVisible = false;
        window.removeEventListener('keydown', this._handleKeyDown);
    }

    _handleOverlayClick(e) {
        if (e.target !== this.shadowRoot.querySelector('.blurred-background')) {
            return;
        }
        this._close();
    }

    _handleKeyDown(e) {
        if (e.key === 'Escape') {
            this._close();
        }
    }

    render() {
        const bubble = this.bubble;
        const data = bubble?.data;
        const meta = bubble?.assetMeta;
        if (!data) {
            return null;
        }
        const asset = data.asset;
        const poolId = data.poolId;
        const symbol = asset?.symbol || asset?.code || 'Asset';
        const supply = (data.end?.supply || 0) / 1e7;
        const borrow = (data.end?.borrow || 0) / 1e7;
        const startSupply = (data.start?.supply || 0) / 1e7;
        const startBorrow = (data.start?.borrow || 0) / 1e7;
        const deltaSupply = startSupply ? data.delta.supply / 1e7 / startSupply : 0;
        const deltaBorrow = startBorrow ? data.delta.borrow / 1e7 / startBorrow : 0;

        const supplyApy = data.end?.supplyApy || 0;
        const borrowApy = data.end?.borrowApy || 0;
        const deltaSupplyApy = data.delta?.supplyApy || 0;
        const deltaBorrowApy = data.delta?.borrowApy || 0;

        const percent = (val, noSign) => {
            if (val === 0) return '0.00%';
            const pct = val * 100;
            if (Math.abs(pct) < 0.01) return val > 0 ? '<0.01%' : '<-0.01%';
            return noSign ? `${pct.toFixed(2)}%` : `${val > 0 ? '+' : ''}${pct.toFixed(2)}%`;
        };

        return html`
            <div class="overlay ${this.isVisible ? 'visible' : ''}" @click=${this._handleOverlayClick}>
                <div class="blurred-background"></div>
                    <div class="dialog">
                        <div class="title-bar">
                            <span class="title-text">${this.title}</span>
                            <button class="close-btn" @click=${this._close}>×</button>
                        </div>
                        <div class="content">
                            <div class="header">
                                ${meta?.image ? html`<img class="asset-logo" src="${meta.url}" alt="${symbol}" />` : ''}
                                <div class="ids">
                                    <div class="symbol">${symbol}</div>
                                    <div class="sub">${data.poolName || poolId}</div>
                                </div>
                            </div>
                            <div class="grid">
                                <div class="label">Supply</div>
                                <div class="value">${Utils.formatNumber(supply)} <span class="delta ${deltaSupply >= 0 ? 'pos' : 'neg'}">${percent(deltaSupply)}</span></div>
                                <div class="label">Borrow</div>
                                <div class="value">${Utils.formatNumber(borrow)} <span class="delta ${deltaBorrow >= 0 ? 'pos' : 'neg'}">${percent(deltaBorrow)}</span></div>
                                <div class="label">Supply APY</div>
                                <div class="value"><span class="supply">${percent(supplyApy, true)}</span> <span class="delta ${deltaSupplyApy >= 0 ? 'pos' : 'neg'}">${percent(deltaSupplyApy)}</span></div>
                                <div class="label">Borrow APY</div>
                                <div class="value"><span class="borrow">${percent(borrowApy, true)}</span> <span class="delta ${deltaBorrowApy >= 0 ? 'pos' : 'neg'}">${percent(deltaBorrowApy)}</span></div>
                            </div>
                            <div class="links">
                                ${poolId ? html`<a href="https://mainnet.blend.capital/dashboard/?poolId=${poolId}" target="_blank" rel="noopener">View Pool</a>` : ''}
                                ${poolId && asset?.id ? html`<a class="supply" href="https://mainnet.blend.capital/supply/?poolId=${poolId}&assetId=${asset.id}" target="_blank" rel="noopener">Lend Asset</a>` : ''}
                                ${poolId && asset?.id ? html`<a class="borrow" href="https://mainnet.blend.capital/borrow/?poolId=${poolId}&assetId=${asset.id}" target="_blank" rel="noopener">Borrow Asset</a>` : ''}
                            </div>
                            <div class="chart-title" id="chart-title"></div>
                            <div class="chart-container">
                                <canvas id="series"></canvas>
                            </div>
                            <div class="technical">
                                <div><span>Pool ID:</span> ${poolId}</div>
                                ${asset?.issuer ? html`<div><span>Contract:</span> ${asset.issuer}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static get styles() {
        return css`
            :host {
                display: block;
                font-family: inherit;
                font-size: inherit;
            }

            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s, visibility 0.2s;
                z-index: 1000;
            }

            .overlay.visible {
                opacity: 1;
                visibility: visible;
            }

            .blurred-background {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                backdrop-filter: blur(3px);
                z-index: -1;
            }

            .dialog {
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                flex-direction: column;
                height: calc(100dvh - 100px);
                width: calc(100% - 50px);
                max-width: 650px;
                margin: 10px 0;
                border-radius: 8px;
                transform: translateY(100%);
                transition: transform 0.2s ease-in-out;
                position: relative;
                color: inherit;
            }

            @media (max-width: 750px) {
                .dialog {
                    border-radius: 0px;
                    height: 100dvh;
                    width: 100%;
                    margin: 0;
                }
            }

            .overlay.visible .dialog {
                transform: translateY(0);
            }

            .title-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 7px 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .title-text {
                font-size: 1.1rem;
                color: #fff;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #fff;
                z-index: 10;
                transition: transform 0.3s ease, color 0.3s ease;
            }

            .close-btn:hover {
                transform: scale(1.2);
                color: var(--link-color);
            }

            .content {
                padding: 20px;
                overflow-y: auto;
                flex-grow: 1;
                text-align: left;
                line-height: 1.5;
            }

            .header {
                display: flex;
                align-items: center;
                margin-bottom: 18px;
            }

            .asset-logo {
                height: 48px;
                width: 48px;
                border-radius: 50%;
                background: transparent;
                padding: 4px;
                margin-right: 14px;
            }

            .ids .symbol {
                font-size: 1.4rem;
                font-weight: 700;
                color: #fff;
                line-height: 1.2;
            }

            .ids .sub {
                font-size: 1rem;
                color: #aaa;
                word-break: break-word;
            }

            .grid {
                display: grid;
                grid-template-columns: 90px auto;
                row-gap: 10px;
                column-gap: 10px;
                align-items: center;
                margin-bottom: 20px;
            }

            .label {
                font-weight: 500;
                font-size: 0.95rem;
                white-space: nowrap;
                color: #ccc;
            }

            .value {
                font-weight: 500;
                font-variant-numeric: tabular-nums;
                color: #fff;
            }

            .supply {
                color: #00b7ff;
                font-weight: 600;
            }

            .borrow {
                color: #ff7f2a;
                font-weight: 600;
            }

            .delta {
                font-weight: 500;
                min-width: 64px;
                text-align: left;
                font-size: 0.95rem;
            }

            .pos {
                color: #3af26f;
            }

            .neg {
                color: #ff3763;
            }

            .links {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 20px;
            }

            .links a {
                text-decoration: none;
                font-weight: 600;
                color: var(--link-color, #24a338);
                border: 1px solid var(--link-color, #24a338);
                padding: 6px 12px;
                border-radius: 9px;
                transition: background 0.2s ease;
            }

            .links a:hover {
                background: var(--link-color, #24a338);
                color: black;
            }

            .links a.borrow {
                color: #ff7f2a;
                border: 1px solid #ff7f2a;
            }

            .links a:hover.borrow {
                color: #000;
                background: #ff7f2a;
            }

            .links a.supply {
                color: #00b7ff;
                border: 1px solid #00b7ff;
            }

            .links a:hover.supply {
                color: #000;
                background: #00b7ff;
            }

            .technical {
                font-size: 0.85rem;
                color: #aaa;
                line-height: 1.4;
                word-break: break-word;
            }

            .technical span {
                color: #fff;
                font-weight: 500;
                margin-right: 5px;
            }

            .chart-title {
                font-weight: 600;
                font-size: 0.95rem;
                color: #ccc;
                margin-bottom: 6px;
            }

            .chart-container {
                position: relative;
                height: 150px;
                width: 100%;
                margin: 20px 0;
            }
        `;
    }
}

window.customElements.define('dialog-element', DialogElement);
