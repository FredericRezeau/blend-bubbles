/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { getDeltas, getSeries, FIELDS } = require('./queries');
const { Snapshot } = require('./snapshots');

const PORT = process.env.PORT || 3001;
const ALLOWED_MINUTES = [720, 1440, 10080];

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
});

const app = express();
app.use(cors());
app.set('trust proxy', 1); // Trusting 1 proxy hop (e.g. ngrok, nginx), adjust as needed!

const validateParams = (req) => {
    const minutes = parseInt(req.query.minutes) || ALLOWED_MINUTES[0];
    const flags = Object.fromEntries(Object.keys(FIELDS).map(f => [f, req.query[f] === '1']));
    const fields = Object.keys(flags).filter(f => flags[f]);
    if (!ALLOWED_MINUTES.includes(minutes) || !fields.length) {
        throw new Error('Invalid parameters');
    }
    return { minutes, fields };
};

app.get('/deltas', limiter, (req, res) => {
    try {
        const { minutes, fields } = validateParams(req);
        res.json({ status: 'ok', data: getDeltas(fields, minutes) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error' });
    }
});

app.get('/series', limiter, (req, res) => {
    try {
        const { minutes, fields } = validateParams(req);
        res.json({ status: 'ok', data: getSeries(fields, minutes) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    Snapshot.run();
});
