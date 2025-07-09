/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

import { LitElement, css, html } from 'lit';
import { Utils } from '../utils';

export class Tooltip extends LitElement {
    static properties = {
        bubble: { type: Object },
        x: { type: Number },
        y: { type: Number }
    };

    constructor() {
        super();
        this.bubble = null;
        this.x = 0;
        this.y = 0;
    }

    updated() {
        const tooltip = this.shadowRoot?.querySelector('.tooltip');
        if (tooltip) {
            const { offsetWidth, offsetHeight } = tooltip;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            let tx = this.x;
            let ty = this.y;
            if (tx + offsetWidth > vw) {
                tx = vw - offsetWidth - 10;
            }
            if (ty + offsetHeight > vh) {
                ty = vh - offsetHeight - 10;
            }
            tooltip.style.left = `${tx}px`;
            tooltip.style.top = `${ty}px`;
        }
    }

    render() {
        const b = this.bubble;
        if (!b?.data) {
            return null;
        }

        const percent = (val, noSign) => {
            if (val === 0) return '0.00%';
            const pct = val * 100;
            if (Math.abs(pct) < 0.01) return val > 0 ? '<0.01%' : '<-0.01%';
            return noSign ? `${pct.toFixed(2)}%` : `${val > 0 ? '+' : ''}${pct.toFixed(2)}%`;
        };
        const supply = (b.data.end?.supply || 0) / 1e7;
        const borrow = (b.data.end?.borrow || 0) / 1e7;
        const startSupply = (b.data.start?.supply || 0) / 1e7;
        const startBorrow = (b.data.start?.borrow || 0) / 1e7;
        const deltaSupply = startSupply ? (b.data.delta?.supply / 1e7 / startSupply) : 0;
        const deltaBorrow = startBorrow ? (b.data.delta?.borrow / 1e7 / startBorrow) : 0;
        const supplyApy = b.data.end?.supplyApy || 0;
        const borrowApy = b.data.end?.borrowApy || 0;
        const deltaSupplyApy = b.data.delta?.supplyApy || 0;
        const deltaBorrowApy = b.data.delta?.borrowApy || 0;
        return html`
          <div class="tooltip">
            <div class="label">${b.data.asset.symbol}</div>
            <div class="sub" style="color: ${b.poolColor}">${b.data.poolName}</div>
            <div class="data">
               <span class="caption">Supply:</span>
               <span class="val">${Utils.formatNumber(supply)}</span>
              <span class="delta ${deltaSupply >= 0 ? 'pos' : 'neg'}">
                ${percent(deltaSupply)}
              </span>
            </div>
            <div class="data">
              <span class="caption">Borrow:</span>
              <span class="val">${Utils.formatNumber(borrow)}</span>
              <span class="delta ${deltaBorrow >= 0 ? 'pos' : 'neg'}">
                ${percent(deltaBorrow)}
              </span>
            </div>
            <div class="data">
               <span class="caption">Supply APY:</span>
               <span class="val supply">${percent(supplyApy, true)}</span>
              <span class="delta ${deltaSupplyApy >= 0 ? 'pos' : 'neg'}">
                ${percent(deltaSupplyApy)}
              </span>
            </div>
            <div class="data">
               <span class="caption">Borrow APY:</span>
               <span class="val borrow">${percent(borrowApy, true)}</span>
              <span class="delta ${deltaBorrowApy >= 0 ? 'pos' : 'neg'}">
                ${percent(deltaBorrowApy)}
              </span>
            </div>
            <div class="hint">Click the bubble for more data</div>
          </div>
        `;
    }

    static styles = css`
        :host {
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 2000;
        }

        .tooltip {
          font-family: var(--font), sans-serif;
          font-size: var(--font-size);
          position: absolute;
          min-width: 140px;
          max-width: 300px;
          padding: 0.6rem 1rem;
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(8px);
        }

        .label {
          font-weight: 600;
          font-size: var(--title-font-size);
          margin-bottom: 0.1rem;
        }

        .sub {
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
        }

        .data {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 6px;
          align-items: center;
          margin-bottom: 2px;
        }

        .caption {
          font-weight: 500;
          text-align: left;
          white-space: nowrap;
        }

        .hint {
          font-size: 0.9rem;
          margin-top: 20px;
          font-weight: 400;
          text-align: center;
          white-space: nowrap;
        }

        .val {
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          text-align: left;
        }

        .val.supply {
          color: #00b7ff;
          font-weight: 600;
        }

        .val.borrow {
          color: #ff7f2a;
          font-weight: 600;
        }

        .delta {
          font-weight: 500;
          font-size: var(--font-size);
          text-align: right;
          white-space: nowrap;
          min-width: 60px;
        }

        .divider {
          margin: 0 4px;
          opacity: 0.6;
        }

        .pos {
          color: #3af26f;
        }

        .neg {
          color: #ff3763;
        }
    `;
}

customElements.define('tooltip-element', Tooltip);
