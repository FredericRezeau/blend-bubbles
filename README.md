[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](/LICENSE)

# blend-bubbles

![Blend Bubbles UI](./preview.gif)

Inspired by BanterBubbles, **Blend Bubbles** is a visualization tool for [Blend](https://www.blend.capital) lending markets. It offers an interactive UI to explore changes in supply, borrow, and APY metrics across all Blend pool assets.

The project includes a standalone server that periodically snapshots Blend market data from the [Stellar](https://stellar.org/) ledger. It supports both delta and time-series queries, with caching and overlay for always-fresh data. The backend is self-contained, using SQLite for storage—no external setup or dependencies required.

The frontend is lightweight, fast and mobile-friendly (with PWA installation support)—built with [Vite](https://vitejs.dev), [Lit](https://lit.dev) and raw HTML5 canvas rendering. The *Asset Details* view also includes time-series charts.

Running live at [blendbubbles.xyz](https://blendbubbles.xyz).

[Blend](https://www.blend.capital) is a universal liquidity protocol primitive built on [Stellar](https://stellar.org/) that enables permissionless lending pool creation.

---

## 📊 Metrics and Timeframes

📈 **Metrics**
- **FLOW**: Bubble size reflects the magnitude of change in supply or borrow volume.
- **APY**: Bubble size reflects the magnitude of change in estimated supply or borrow APY.

⏱ **Timeframes**
- **LIVE**: Tracks changes from the latest snapshot (default: 1 min) up to 12 hours of intraday data.
- **1D**: Tracks changes over the past 24 hours (if available).
- **1W**: Tracks changes over the past 7 days (if available).

---

**Note** If you spot a bug or something feels off, don't hesitate to report it. I'd genuinely appreciate your feedback!

## Getting Started

```bash
npm install
npm start
```

## Disclaimer

This software is experimental and provided "as is", without warranty of any kind. Use at your own risk. This is not financial advice.

## License

[MIT License](LICENSE)