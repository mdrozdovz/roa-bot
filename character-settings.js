'use strict';

const charSettings = {
    Arius: {

    },
    Craftarius: {
        houseQueue: {

        }
    }
};

if (module) {
    module.exports = { charSettings };
}

if (window) {
    (window => window.charSettings = charSettings)(window);
}
