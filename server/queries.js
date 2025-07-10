/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

const Database = require('better-sqlite3');

const FIELDS = {
    supply: '$.reserves.data.bSupply',
    borrow: '$.reserves.data.dSupply',
    supplyApy: '$.reserves.estSupplyApy',
    borrowApy: '$.reserves.estBorrowApy'
};

const db = new Database(process.env.DB_FILE || './snapshots.db');
const queryCache = new Map();

const getCacheKey = (endpoint, fields, minutes) => {
    return `${endpoint}:${minutes}:${fields.sort().join(',')}`;
};

const getDeltas = (fields, minutes) => {
    const key = getCacheKey('deltas', fields, minutes);
    if (queryCache.has(key)) {
        console.log(`[CACHE] Hit: ${key}`);
        return queryCache.get(key);
    }

    console.log(`[QUERY] Executing /deltas for fields=${fields.join(',')} minutes=${minutes}`);
    const buildQuery = (fields, minutes) => {
        const extracts = fields.map(f =>
            `json_extract(a.value, '${FIELDS[f]}') AS ${f}`
        ).join(',\n');
        const cases = fields.flatMap(f => [
            `MAX(CASE WHEN r_start = 1 THEN CAST(${f} AS REAL) END) AS start_${f}`,
            `MAX(CASE WHEN r_end = 1 THEN CAST(${f} AS REAL) END) AS end_${f}`
        ]).join(',\n');
        const selects = fields.flatMap(f => [
            `start_${f}`, `end_${f}`, `(end_${f} - start_${f}) AS delta_${f}`
        ]).join(',\n');

        return `
          WITH all_snapshots AS (
            SELECT timestamp, json FROM snapshots
            WHERE id = -1 OR id != -1
          ),
          snapshot_bounds AS (
            SELECT MAX(timestamp) AS end_ts, MAX(timestamp) - (${minutes} * 60) AS start_ts FROM all_snapshots
          ),
          exploded AS (
            SELECT 
              s.timestamp,
              json_extract(p.value, '$.name') AS pool_name,
              json_extract(p.value, '$.id') AS pool_id,
              json_extract(a.value, '$.meta.symbol') AS symbol,
              json_extract(a.value, '$.meta.name') AS asset_name,
              json_extract(a.value, '$.meta.decimals') AS decimals,
              json_extract(a.value, '$.reserves.assetId') AS asset_id,
              json_extract(a.value, '$.meta.asset.code') AS asset_code,
              json_extract(a.value, '$.meta.asset.issuer') AS asset_issuer,
              ${extracts}
            FROM all_snapshots s
            JOIN json_each(s.json) AS p
            JOIN json_each(json_extract(p.value, '$.assets')) AS a
            WHERE s.timestamp BETWEEN (SELECT start_ts FROM snapshot_bounds) AND (SELECT end_ts FROM snapshot_bounds)
          ),
          ranked AS (
            SELECT *,
              ROW_NUMBER() OVER (PARTITION BY pool_id, asset_code ORDER BY timestamp ASC) AS r_start,
              ROW_NUMBER() OVER (PARTITION BY pool_id, asset_code ORDER BY timestamp DESC) AS r_end
            FROM exploded
          ),
          aggregated AS (
            SELECT
              pool_name,
              pool_id,
              symbol,
              asset_name,
              decimals,
              asset_id,
              asset_code,
              asset_issuer,
              ${cases}
            FROM ranked
            GROUP BY pool_id, asset_code
          )
          SELECT
            pool_name,
            pool_id,
            symbol,
            asset_name,
            decimals,
            asset_id,
            asset_code,
            asset_issuer,
            ${selects},
            (SELECT start_ts FROM snapshot_bounds) AS start_ts,
            (SELECT end_ts FROM snapshot_bounds) AS end_ts
          FROM aggregated
          ORDER BY pool_name;
      `;
    };
    const query = buildQuery(fields, minutes);
    const result = db.prepare(query).all().map(row => {
        const asset = {
            symbol: row.symbol,
            name: row.asset_name,
            decimals: row.decimals,
            code: row.asset_code,
            issuer: row.asset_issuer,
            id: row.asset_id
        };
        const result = {
            poolName: row.pool_name,
            poolId: row.pool_id,
            startTime: row.start_ts,
            endTime: row.end_ts,
            asset,
            start: {},
            end: {},
            delta: {}
        };
        fields.forEach(f => {
            result.start[f] = row[`start_${f}`];
            result.end[f] = row[`end_${f}`];
            result.delta[f] = row[`delta_${f}`];
        });
        return result;
    });
    queryCache.set(key, result);
    return result;
};

const getSeries = (fields, minutes) => {
    const key = getCacheKey('series', fields, minutes);
    if (queryCache.has(key)) {
        console.log(`[CACHE] Hit: ${key}`);
        return queryCache.get(key);
    }

    console.log(`[QUERY] Executing /series for fields=${fields.join(',')} minutes=${minutes}`);
    const extracts = fields.map(f =>
        `json_extract(a.value, '${FIELDS[f]}') AS ${f}`
    ).join(',\n');
    const query = `
      WITH all_snapshots AS (
        SELECT timestamp, json FROM snapshots
        WHERE id = -1 OR id != -1
      ),
      snapshot_bounds AS (
        SELECT MAX(timestamp) AS end_ts, MAX(timestamp) - (${minutes} * 60) AS start_ts FROM all_snapshots
      ),
      exploded AS (
        SELECT 
          s.timestamp,
          json_extract(p.value, '$.name') AS pool_name,
          json_extract(p.value, '$.id') AS pool_id,
          json_extract(a.value, '$.meta.symbol') AS symbol,
          json_extract(a.value, '$.meta.name') AS asset_name,
          json_extract(a.value, '$.meta.decimals') AS decimals,
          json_extract(a.value, '$.meta.asset.code') AS asset_code,
          json_extract(a.value, '$.meta.asset.issuer') AS asset_issuer,
          ${extracts}
        FROM all_snapshots s
        JOIN json_each(s.json) AS p
        JOIN json_each(json_extract(p.value, '$.assets')) AS a
        WHERE s.timestamp BETWEEN (SELECT start_ts FROM snapshot_bounds) AND (SELECT end_ts FROM snapshot_bounds)
      )
      SELECT 
        timestamp,
        pool_name,
        pool_id,
        symbol,
        asset_name,
        decimals,
        asset_code,
        asset_issuer,
        ${fields.join(', ')}
      FROM exploded
      ORDER BY pool_id, asset_code, timestamp;
    `;
    const rows = db.prepare(query).all();
    const grouped = {};
    let startTime;
    let endTime;
    rows.forEach(row => {
        const key = `${row.pool_id}_${row.asset_code}`;
        if (!grouped[key]) {
            grouped[key] = {
                poolName: row.pool_name,
                poolId: row.pool_id,
                asset: {
                    symbol: row.symbol,
                    name: row.asset_name,
                    decimals: row.decimals,
                    code: row.asset_code,
                    issuer: row.asset_issuer
                },
                series: {}
            };
            fields.forEach(f => {
                grouped[key].series[f] = [];
            });
        }
        fields.forEach(f => {
            const value = row[f];
            if (value !== null && value !== undefined) {
                grouped[key].series[f].push({ timestamp: row.timestamp, value: Number(value) });
            }
        });
        if (!startTime || row.timestamp < startTime) {
            startTime = row.timestamp;
        }
        if (!endTime || row.timestamp > endTime) {
            endTime = row.timestamp;
        }
    });

    const result = Object.values(grouped).map(entry => ({
        ...entry,
        startTime,
        endTime
    }));
    queryCache.set(key, result);
    return result;
};

module.exports = { getDeltas, getSeries, FIELDS };
