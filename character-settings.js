'use strict';

class Roles {
    static Battler = 'battler';
    static Fisherman = 'fisherman';
    static Woodcutter = 'woodcutter';
    static Miner = 'miner';
    static Stonecutter = 'stonecutter';
    static Crafter = 'crafter';
}

const charSettings = {
    Arius: {

    },
    Craftarius: {
        role: Roles.Crafter,
        housing: {
            item: 'CraftingTable-Workshop',
        },
        crafting: {
            enabled: true,
            checkIntervalSeconds: 20
        }
    }
};

if (module) {
    module.exports = { charSettings };
}
