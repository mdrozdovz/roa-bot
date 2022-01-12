'use strict';

const fs = require('fs/promises');

const data = require('./house-buildings-raw.json');

const run = async () => {
    const buildings = data.reduce((memo, b) => {
        const name = b.n.replaceAll(' ', '');
        const roomName = b.rn.replaceAll(' ', '');
        memo[`${name}-${roomName}`] = {
            id: b.i,
            roomId: b.r,
            name: b.n,
            roomName: b.rn,
            buildTimeMinutes: b.t,
            buildTimeHuman: b.tn
        };
        return memo;
    }, {});

    let fh;
    try {
        fh = await fs.open('./house-buildings.json', 'w');
        const {bytesWritten} = await fh.write(JSON.stringify(buildings, null, 4));
        console.log({bytesWritten});
    } finally {
        await fh?.close();
    }
};

run();
