/* Copyright (c) 2025 Frederic Kyung-jin Rezeau (오경진 吳景振)
 * Copyright (c) 2025 LITEMINT LLC
 *
 * This file is part of BLEND-BUBBLES project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau <fred@litemint.com>
 */

const Database = require('better-sqlite3');
const { Backstop, PoolMetadata, TokenMetadata, PoolV2, PoolV1, Version } = require('@blend-capital/blend-sdk');

const db = new Database(process.env.DB_FILE || './snapshots.db');
const queryCache = new Map();

const SCRATCHPAD_DB_INDEX = -1;
const SNAPSHOT_INTERVAL = process.env.SNAPSHOT_INTERVAL || 60;
const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL || 1;
const BACKSTOP_ID = process.env.BACKSTOP_ID || 'CAQQR5SWBXKIGZKPBZDH3KM5GQ5GUTPKB7JAFCINLZBC5WXPJKRG3IM7';

class Snapshot {
    static async run() {
        const fetchSnapshot = async() => {
            try {
                const network = {
                    rpc: process.env.RPC_URL,
                    horizonUrl: process.env.HORIZON_URL,
                    passphrase: process.env.NETWORK_PASSPHRASE,
                    opts: { allowHttp: true }
                };

                const backstop = await Backstop.load(network, BACKSTOP_ID);
                const poolIds = backstop.config.rewardZone;
                const poolMetas = await Promise.all(
                    poolIds.map(async(id) => {
                        try {
                            const meta = await PoolMetadata.load(network, id);
                            let version;
                            if (meta.wasmHash === 'baf978f10efdbcd85747868bef8832845ea6809f7643b67a4ac0cd669327fc2c') {
                                version = Version.V1;
                            } else if (meta.wasmHash === 'a41fc53d6753b6c04eb15b021c55052366a4c8e0e21bc72700f461264ec1350e') {
                                version = Version.V2;
                            } else {
                                console.warn(`Invalid wasm for pool ${id}: ${meta.wasmHash}`);
                                return null;
                            }
                            return { ...meta, version, id };
                        } catch (err) {
                            console.warn(`Could not load metadata for pool ${id}:`, err.message);
                            return null;
                        }
                    })
                );

                const safeStringify = (obj) => {
                    return JSON.stringify(obj, (_, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                    );
                };

                return safeStringify((await Promise.all(
                    poolMetas.filter((meta) => meta !== null).map(async(meta) => {
                        let pool;
                        try {
                            pool = meta.version === Version.V2
                                ? await PoolV2.loadWithMetadata(network, meta.id, meta)
                                : await PoolV1.loadWithMetadata(network, meta.id, meta);
                        } catch { return null; }

                        const assets = await Promise.all(
                            meta.reserveList.map(async(assetId) => {
                                try {
                                    const meta = await TokenMetadata.load(network, assetId);
                                    return { meta, reserves: pool.reserves.get(assetId) };
                                } catch { return null; }
                            })
                        );

                        return {
                            ...((({ reserveList, ...rest }) => rest)(meta)),
                            assets: assets.filter(Boolean)
                        };
                    })
                )).filter(Boolean));
            } catch (err) {
                console.error(err);
                return null;
            }
        };
        db.exec(`
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            json TEXT NOT NULL
        );
        `);
        db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_latest ON snapshots (id) WHERE id = ${SCRATCHPAD_DB_INDEX};
        `);
        while (true) {
            const now = Math.floor(Date.now() / 1000);
            const snapshotTime = (db.prepare(`SELECT timestamp FROM snapshots WHERE id != ${SCRATCHPAD_DB_INDEX} ORDER BY timestamp DESC LIMIT 1`)
                .get()?.timestamp || 0) + (SNAPSHOT_INTERVAL * 60);
            const json = await fetchSnapshot();
            db.prepare(`
                    INSERT INTO snapshots (id, timestamp, json)
                    VALUES (${SCRATCHPAD_DB_INDEX}, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET timestamp = excluded.timestamp, json = excluded.json;
                `).run(now, json);
            console.log(`[SNAPSHOT] Scratchpad refreshed @ ${new Date(now * 1000).toISOString()}`);
            queryCache.clear();
            if (now >= snapshotTime) {
                try {
                    db.prepare('INSERT INTO snapshots (timestamp, json) VALUES (?, ?)').run(now, json);
                    console.log(`[SNAPSHOT] Archived snapshot @ ${new Date(now * 1000).toISOString()}`);
                } catch (err) {
                    console.error(err);
                }
            } else {
                console.log(`[SNAPSHOT] Next archive in ${Math.max(Math.floor((snapshotTime - now) / 60), UPDATE_INTERVAL)} min`);
            }
            await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL * 60 * 1000));
        }
    }
}

module.exports = { Snapshot };
