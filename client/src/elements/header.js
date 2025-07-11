/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

import { LitElement, css, html } from 'lit';
import { MetricsType } from '../utils';

export class Header extends LitElement {
    static properties = {
        mode: { type: String },
        metric: { type: String },
        time: { type: String },
        selecting: { type: Boolean }
    };

    constructor() {
        super();
        this.mode = 'SUPPLY';
        this.metric = MetricsType.DELTA_TOTAL;
        this.time = '1D';
        this.selecting = false;
        this.metrics = Object.entries(MetricsType).map(([_, value]) => ({ value }));
    }

    handleClick(type, value) {
        this[type] = value;
        this.selecting = false;
        this.dispatchEvent(new CustomEvent(`${type}-change`, { detail: { [type]: value } }));
    }

    toggleSelect(e) {
        e.stopPropagation();
        this.selecting = !this.selecting;
    }

    updateTabs() {
        const update = (group) => {
            const buttons = this.renderRoot?.querySelectorAll(`.${group}-group .tab`);
            const highlight = this.renderRoot?.querySelector(`.${group}-group .highlight`);
            if (buttons?.length && highlight) {
                const selected = [...buttons].find(btn => btn.textContent.replace(/[\sΔ]/g, '') === this[group]);
                if (selected) {
                    const { offsetLeft, offsetWidth } = selected;
                    highlight.style.transform = `translateX(${offsetLeft}px)`;
                    highlight.style.width = `${offsetWidth - 2}px`;
                }
            }
        };

        update('metric');
        update('mode');
        update('time');
    }

    connectedCallback() {
        super.connectedCallback();
        this._resizeHandler = () => this.updateTabs();
        window.addEventListener('resize', this._resizeHandler);
        this._clickHandler = (e) => {
            if (!this.renderRoot?.querySelector('.select-wrapper')?.contains(e.target)) {
                this.selecting = false;
            }
        };
        window.addEventListener('click', this._clickHandler);
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this._resizeHandler);
        window.removeEventListener('click', this._clickHandler);
        super.disconnectedCallback();
    }

    updated() {
        this.updateTabs();
    }

    render() {
        const modes = ['SUPPLY', 'BORROW'];
        const times = ['LIVE', '1D', '1W'];
        const getMetricLabel = (value) => {
            const isSupply = this.mode === 'SUPPLY';
            switch (value) {
                case MetricsType.DELTA_TOTAL: return isSupply ? 'TOTAL SUPPLIED Δ (%)' : 'TOTAL BORROWED Δ (%)';
                case MetricsType.DELTA_APY: return isSupply ? 'SUPPLY APY Δ (%)' : 'BORROW APY Δ (%)';
                case MetricsType.APY: return isSupply ? 'SUPPLY APY' : 'BORROW APY';
                default: return value;
            }
        };
        return html`
          <div class="bar">
            <div class="group mode-group">
              <div class="highlight"></div>
              ${modes.map(mode => html`
                <button
                  class="tab label-${mode.toLowerCase()} ${this.mode === mode ? 'active' : ''}"
                  @click="${() => this.handleClick('mode', mode)}"
                >${mode}</button>
              `)}
            </div>
            <div class="group metric-group">
              <div class="select-wrapper ${this.selecting ? 'open' : ''}">
                <div class="select-trigger label-${this.mode.toLowerCase()}" @click="${this.toggleSelect}">
                  <span class="label">${getMetricLabel(this.metric)}</span>
                  <span class="arrow">&#9662;</span>
                </div>
              ${this.selecting ? html`<div class="select-menu">${this.metrics.map(opt => html`<div class="select-item ${this.metric === opt.value ? 'selected' : ''} label-${this.mode.toLowerCase()}" @click="${() => this.handleClick('metric', opt.value)}">${getMetricLabel(opt.value)}</div>`)}</div>` : ''}
              </div>
            </div>
            <div class="group time-group">
              <div class="highlight"></div>
              ${times.map(time => html`
                <button
                  class="tab label-${time.toLowerCase()} ${this.time === time ? 'active' : ''}"
                  @click="${() => this.handleClick('time', time)}"
                >${time}</button>
              `)}
            </div>
          </div>
        `;
    }

    static styles = css`
        :host {
          display: block;
          position: fixed;
          top: 0;
          width: 100%;
          z-index: 1000;
          background: rgba(0, 0, 0, 0);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 0.5rem 1rem;
          box-sizing: border-box;
        }

        .bar {
          font-family: var(--font), sans-serif;
          display: flex;
          justify-content: flex-start;
          flex-wrap: wrap;
          max-width: 1024px;
          margin: 0;
          gap: 0.5rem;
        }

        .group {
          display: flex;
          position: relative;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          overflow: hidden;
          padding: 2px;
        }

        .group.metric-group {
          overflow: visible;
        }

        .highlight {
          position: absolute;
          top: 2px;
          bottom: 2px;
          left: 0;
          height: auto;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 999px;
          z-index: 0;
          transition: transform 0.3s ease, width 0.3s ease, left 0.3s ease;
          pointer-events: none;
        }

        .tab {
          position: relative;
          z-index: 1;
          background: transparent;
          border: none;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.5rem 1.25rem;
          border-radius: 999px;
          cursor: pointer;
          text-align: center;
          flex: 1 1 auto;
          text-align: center;
        }

        .tab.active {
          color: #fff;
        }

        .label-1d, .label-1w, .label-1m, .label-live { color: #aaaaaa; }
        .label-flow { color: #c624cc; }
        .label-apy { color: #c624cc; }
        .label-supply { color: #3ac7ff; }
        .label-borrow { color: #ff7f2a; }
        .tab.active.label-supply { color: #00b7ff; }
        .tab.active.label-borrow { color: #ff8d41; }
        .tab.active.label-flow,
        .tab.active.label-apy { color: #f869fd; }
        .tab.active.label-live { color: #47ff5f; }

        .select-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          flex: 1 1 auto;
          cursor: pointer;
        }

        .select-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
          padding: 0.5rem 2rem 0.5rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: inherit;
          font-family: var(--font), sans-serif;
          border-radius: 999px;
          background: transparent;
          box-sizing: border-box;
        }

        .select-trigger .label {
          flex: 1;
          text-align: center;
          white-space: nowrap;
          padding-right: 1.5rem;
        }

        .select-trigger.label-supply {
          color: #00b7ff;
        }

        .select-trigger.label-borrow {
          color: #ff8d41;
        }

        .arrow {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%) rotate(0deg);
          font-size: 2rem;
          color: white;
          transition: transform 0.3s ease;
          pointer-events: none;
        }

        .select-wrapper.open .arrow {
          transform: translateY(-50%) rotate(180deg);
        }

        .select-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 0.25rem;
          background: rgba(0, 0, 0, 0.85);
          border-radius: 17px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 2;
          min-width: 100%;
          overflow: hidden;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .select-item {
          padding: 0.75rem 1.25rem;
          color: white;
          text-align: center;
          white-space: nowrap;
          transition: background 0.2s ease;
        }

        .select-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .select-item.selected {
          background: rgba(255, 255, 255, 0.1);
          font-weight: 600;
        }

        .select-item.label-supply.selected {
          color: #00b7ff;
          background: rgba(0, 183, 255, 0.1);
        }

        .select-item.label-borrow.selected {
          color: #ff8d41;
          background: rgba(255, 141, 65, 0.1);
        }

        @media (max-width: 650px) {
          .bar {
            flex-direction: column;
            align-items: center;
          }

          .group {
            width: 100%;
            justify-content: space-evenly;
          }
        }
    `;
}

customElements.define('header-element', Header);
