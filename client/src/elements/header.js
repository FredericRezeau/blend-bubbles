/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

import { LitElement, css, html } from 'lit';

export class Header extends LitElement {
    static properties = {
        mode: { type: String },
        metric: { type: String },
        time: { type: String }
    };

    constructor() {
        super();
        this.mode = 'SUPPLY';
        this.metric = 'FLOW';
        this.time = '1D';
    }

    handleClick(type, value) {
        this[type] = value;
        this.dispatchEvent(new CustomEvent(`${type}-change`, { detail: { [type]: value } }));
    }

    updateTabs() {
        const update = (group) => {
            const buttons = this.renderRoot?.querySelectorAll(`.${group}-group .tab`);
            const highlight = this.renderRoot?.querySelector(`.${group}-group .highlight`);
            if (buttons?.length && highlight) {
                const selected = [...buttons].find(btn => btn.textContent.trim() === this[group]);
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
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this._resizeHandler);
        super.disconnectedCallback();
    }

    updated() {
        this.updateTabs();
    }

    render() {
        const modes = ['SUPPLY', 'BORROW'];
        const metrics = ['FLOW', 'APY'];
        const times = ['LIVE', '1D', '1W'];
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
              <div class="highlight"></div>
              ${metrics.map(metric => html`
                <button
                  class="tab label-${metric.toLowerCase()} ${this.metric === metric ? 'active' : ''}"
                  @click="${() => this.handleClick('metric', metric)}"
                >${metric}</button>
              `)}
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

        @media (max-width: 600px) {
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
