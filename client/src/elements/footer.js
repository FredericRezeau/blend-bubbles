/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

import { LitElement, html, css } from 'lit';

export class Footer extends LitElement {
    render() {
        return html`
          <div class="bar">
            <div class="left">
              <img class="logo" src="/logo.svg" alt="Logo" />
              <span class="brand">blendbubbles.xyz</span>
            </div>
            <div class="right">
              <a class="link" href="https://github.com/fredericrezeau/blend-bubbles" target="_blank" rel="noopener">
                Grab the code on GitHub
              </a>
            </div>
          </div>
        `;
    }

    static styles = css`
        :host {
          display: block;
          position: fixed;
          bottom: 0;
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 1000;
          padding: 0.2rem 0.5rem;
          box-sizing: border-box;
          font-family: var(--font), sans-serif;
        }

        .bar {
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.3rem;
          font-family: var(--font), sans-serif;
          font-size: var(--font-size);
          color: white;
        }

        .left {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .logo {
          width: 26px;
          height: 26px;
        }

        .right {
          text-align: right;
          flex-grow: 1;
        }

        .link {
          color: #66ccff;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s ease;
        }

        .link:hover {
          opacity: 0.8;
        }

        @media (max-width: 600px) {
          .bar {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .right {
            width: 100%;
            text-align: center;
          }
        }
    `;
}

customElements.define('footer-element', Footer);
