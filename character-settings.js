'use strict';

const charSettings = {
    Arius: {

    },
    Craftarius: {
        houseQueue: {

        }
    }
};

module.exports = { charSettings };

if (window) {
    (window => window.charSettings = charSettings)(window);
}
