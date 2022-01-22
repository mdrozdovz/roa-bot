'use strict';

class Role {
    static Battler = 'battler';
    static Fisherman = 'fisherman';
    static Woodcutter = 'woodcutter';
    static Miner = 'miner';
    static Stonecutter = 'stonecutter';
    static Crafter = 'crafter';
    static Main = 'main';
    static Alt = 'alt';
}

class Resource {
    static CraftingMaterials = 'crafting_materials';
    static GemFragments = 'gem_fragments';
    static Food = 'food';
    static Wood = 'wood';
    static Iron = 'iron';
    static Stone = 'stone';
}

const charSettings = {
    Arius: {
        roles: [Role.Battler, Role.Main],
    },
    Battlarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Killarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Huntarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Abominarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Animarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Beastarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Dragonarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Elementarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Serpentarius: {
        roles: [Role.Battler, Role.Alt],
    },
    Fisharius: {
        roles: [Role.Fisherman, Role.Alt],
    },
    Foodarius: {
        roles: [Role.Fisherman, Role.Alt],
    },
    Fruitarius: {
        roles: [Role.Fisherman, Role.Alt],
    },
    Wheatarius: {
        roles: [Role.Fisherman, Role.Alt],
    },
    Wooarius: {
        roles: [Role.Woodcutter, Role.Alt],
    },
    Woodarius: {
        roles: [Role.Woodcutter, Role.Alt],
    },
    Choparius: {
        roles: [Role.Woodcutter, Role.Alt],
    },
    Lumberarius: {
        roles: [Role.Woodcutter, Role.Alt],
    },
    Minarius: {
        roles: [Role.Miner, Role.Alt],
    },
    Metalarius: {
        roles: [Role.Miner, Role.Alt],
    },
    Gemarius: {
        roles: [Role.Miner, Role.Alt],
    },
    Minerarius: {
        roles: [Role.Miner, Role.Alt],
    },
    Stonarius: {
        roles: [Role.Stonecutter, Role.Alt],
    },
    Quararius: {
        roles: [Role.Stonecutter, Role.Alt],
    },
    Rockarius: {
        roles: [Role.Stonecutter, Role.Alt],
    },
    Bouldarius: {
        roles: [Role.Stonecutter, Role.Alt],
    },
    Craftarius: {
        roles: [Role.Crafter, Role.Alt],
        housing: {
            item: 'CraftingTable-Workshop',
        },
        crafting: {
            enabled: false,
            checkIntervalSeconds: 600
        }
    }
};

const findCharsByRole = role => {
    const res = [];
    for (const [key, val] of Object.entries(charSettings)) {
        if (val.roles.includes(role)) res.push(key);
    }

    return res;
};

if (module) {
    module.exports = { charSettings };
}
