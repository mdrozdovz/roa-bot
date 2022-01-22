// ==UserScript==
// @name            RoA-Bot
// @namespace       http://tampermonkey.net/
// @version         0.1.4
// @description     try to take over the world!
// @author          mdrozdovz
// @match           https://*.avabur.com/game*
// @match           http://*.avabur.com/game*
// @icon            data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require         https://cdn.jsdelivr.net/gh/lodash/lodash@4.17.4/dist/lodash.min.js
// @require         https://github.com/mdrozdovz/roa-bot/raw/master/character-settings.js?v=3
// @resource        buildingsData https://github.com/mdrozdovz/roa-bot/raw/master/house-buildings.json
// @downloadURL     https://github.com/mdrozdovz/roa-bot/raw/master/roa-bot-main.js
// @updateURL       https://github.com/mdrozdovz/roa-bot/raw/master/version
// @grant           GM_info
// @grant           GM_getResourceText
// ==/UserScript==

(async () => {
    'use strict';

    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    const delay = ms => new Promise(r => setTimeout(r, ms));

    const defaultSettings = {
        channel: {
            switchToMain: true,
        },
        refresh: {
            enabled: true,
            actionsInterval: 50,
        },
        questCompletion: {
            enabled: true,
            jumpForwardTimes: 0.2,
            checkIntervalSeconds: 20,
        },
        housing: {
            enabled: true,
            checkIntervalSeconds: 600,
        },
        toolUpgrade: {
            enabled: true,
            checkIntervalSeconds: 60,
        }
    };

    const log = (msg, data) => {
        const now = new Date();
        const prefix = `[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][RoA Bot]:`;
        if (data) console.log(`${prefix} ${msg}`, data);
        else console.log(`${prefix} ${msg}`);
    }

    log('char settings', charSettings);

    const safeClick = async button => {
        button && button.click && button.click();
        await delay(2000);
    }

    const getCurrentQuestType = () => {
        const battle = $('#battleQuest');
        const tradeskill = $('#tradeskillQuest');
        const profession = $('#professionQuest');

        // TODO re-do this shit
        if (!battle.attributes.style || !/display: none/g.test(battle.attributes.style.value)) return {
            elem: battle,
            type: 'kill'
        }; // because fuck you
        if (!tradeskill.attributes.style || !/display: none/g.test(tradeskill.attributes.style.value)) return {
            elem: tradeskill,
            type: 'tradeskill'
        };
        if (!profession.attributes.style || !/display: none/g.test(profession.attributes.style.value)) return {
            elem: profession,
            type: 'profession'
        };
    };

    const isVisible = element => element && element.offsetParent !== null;
    const isEnabled = element => element && !element.attributes.disabled && !element.classList.contains('disabled');

    const firstActionable = (...elements) => {
        for (const el of elements) {
            if (isVisible(el) && isEnabled(el)) return el;
        }

        return null;
    };

    const getCharName = () => {
        const nameSelector = () => $('td#my_title > a.profileLink');
        if (nameSelector()) return nameSelector().text;
        return null;
    }

    const resourceTypes = [Resource.CraftingMaterials, Resource.GemFragments, Resource.Food, Resource.Wood, Resource.Iron, Resource.Stone];
    const collectResources = () => {
        const res = {};
        for (const type of resourceTypes) {
            res[type] = $(`td#${type}`).text;
        }
        return res;
    }

    const closeModalSelector = () => $('#modalWrapper > div > span.closeModal');
    const confirmButtonSelector = () => $('#confirmButtons > a.button.green');
    const cancelButtonSelector = () => $('#confirmButtons > a.button.red');

    class RoaBot {
        settings;
        timers;
        buildings;
        jumpCounter;

        constructor(defaultSettings, charSettings) {
            const settings = {};
            const housingSettings = {};
            _.extend(housingSettings, defaultSettings.housing, charSettings.housing);
            _.extend(settings, defaultSettings, charSettings);
            settings.housing = housingSettings;
            this.settings = settings;
            this.timers = {};
            this.jumpCounter = 0;
        }

        switchToMainChannel() {
            return setTimeout(() => document.querySelector('a.channelTab[data-channelid="2"]').click(), 10000);
        }

        setupAutoRefresh() {
            const replenishSelector = () => $('#replenishStamina');

            log('Setting up auto refresh interval');
            return setInterval(
                () => safeClick(replenishSelector()),
                defaultSettings.refresh.actionsInterval * 3 * 1000
            );
        }

        setupQuestCompletion() {
            const infoLinkSelector = elem => elem.querySelector('div.center > a.questCenter');
            const completeButtonSelector = type => $(`input.completeQuest[data-questtype=${type}]`);
            const jumpFwdButtonSelector = () => $('#roaJumpNextMob');
            const beginQuestButtonsSelector = type => $(`input.questRequest[data-questtype=${type}]`);
            const resetStatsSelector = () => $('#clearBattleStats');

            log('Setting up auto quest completion');
            return setInterval(async () => {
                const {elem, type} = getCurrentQuestType();
                if (!infoLinkSelector(elem)) return;

                log('Found completed quest');
                log(`Current quest: ${type}`);

                await safeClick(completeButtonSelector(type));
                if (type === 'kill') {
                    const jumpForwardTimes = this.settings.questCompletion.jumpForwardTimes;
                    if (jumpForwardTimes < 1) {
                        const revCounter = Math.round(1 / jumpForwardTimes);
                        if (++this.jumpCounter % revCounter === 0) {
                            log('jumping mobs');
                            await safeClick(jumpFwdButtonSelector());
                        }
                    } else {
                        for (let i = 0; i < jumpForwardTimes; i++) {
                            log('jumping mobs');
                            await safeClick(jumpFwdButtonSelector());
                        }
                    }
                }
                await safeClick(beginQuestButtonsSelector(type));
                await safeClick(closeModalSelector());
                await safeClick(resetStatsSelector());
                log(`Refreshed quest`);
            }, this.settings.questCompletion.checkIntervalSeconds * 1000);
        }

        setupHousing() {
            const houseReadyString = 'Your workers are available for a new task.';
            const houseSelector = () => $('#housing > a');
            const newRoomSelector = () => $('input#houseBuildRoom');
            const shortestNewItemSelector = () => $('#houseQuickBuildList > li > a.houseViewRoom');
            const shortestExistingItemSelector = () => $('#houseQuickBuildList > li > a.houseViewRoomItem');
            const completeListSelector = () => $('#allHouseUpgrades');
            const specificItemSelector = id => $(`a.houseViewRoomItem[data-itemtype=${id}]`);
            const buildItemSelector = () => $('#houseBuildRoomItem');
            const upgradeTierSelector = () => $('#houseRoomItemUpgradeTier');
            const upgradeItemSelector = () => $('#houseRoomItemUpgradeLevel');
            const notificationSelector = () => $('div#house_notification');

            log('Setting up auto housing');
            return setInterval(async () => {
                await safeClick(houseSelector());
                if (notificationSelector().textContent !== houseReadyString) {
                    await safeClick(closeModalSelector());
                    return;
                }

                log('Housing ready');

                const itemName = this.settings.housing.item;
                const item = this.buildings[itemName];
                if (item) {
                    log(`Building predefined item: ${item.name} (${item.roomName})`);
                    await safeClick(completeListSelector());
                    await safeClick(specificItemSelector(item.id));
                } else if (isVisible(newRoomSelector())) {
                    log('Building new room');
                    await safeClick(newRoomSelector());
                } else { // build shortest
                    log('Building shortest item');
                    await safeClick(shortestNewItemSelector() || shortestExistingItemSelector());
                    await safeClick(firstActionable(buildItemSelector(), upgradeTierSelector(), upgradeItemSelector()));
                }

                safeClick(closeModalSelector());
            }, this.settings.housing.checkIntervalSeconds * 1000);
        }

        setupToolUpgrade() {
            const toolUpgradeSelector = () => $('#harvestLevelResult > a.openToolUpgrade');
            const maxSelector = () => $$('a.toolUpgradeMax');

            log('Setting up auto tool upgrade');
            return setInterval(async () => {
                if (isVisible(toolUpgradeSelector())) {
                    await safeClick(toolUpgradeSelector());
                    const type = firstActionable(...maxSelector());
                    await safeClick(type);
                    await safeClick(confirmButtonSelector());
                    await safeClick(closeModalSelector());
                    log(`Upgraded tool: ${type && type.attributes['data-type'].value}`);
                }
            }, this.settings.toolUpgrade.checkIntervalSeconds * 1000);
        }

        setupCrafting() {
            const tableSelector = () => $('a.craftingTableLink');
            const cancelAllUnstartedSelector = () => $('#craft_cancel_unstarted');
            const maxLevelSelector = () => $('#craftingItemLevelMax');
            const fillQueueSelector = () => $('#craftingJobFillQueue');
            const addToEndQueueSelector = () => $('div.craftingJobStartQueue');
            const startJobSelector = () => $('div#craftingJobStart');

            return setInterval(async () => {
                await safeClick(tableSelector());
                await safeClick(cancelAllUnstartedSelector());
                await safeClick(maxLevelSelector());
                await safeClick(fillQueueSelector());
                await safeClick(addToEndQueueSelector());
                // await safeClick(startJobSelector());
                await safeClick(closeModalSelector());
                log('Refilled crafting queue');
            }, this.settings.crafting.checkIntervalSeconds * 1000);
        }

        wireToMain() {
            const mainChar = _.first(findCharsByRole(Role.Main));
            if (!_.contains(this.settings.roles, Role.Alt)) return;

            if (_.contains(this.settings.roles, Role.Fisherman)) {

            }
        }

        resInfo() {
            log('Resources:', collectResources());
        }

        attachKeyBinds() {
            log('Setting up custom key binds');
            window.addEventListener('keydown', e => {
                const key = e.key;
                switch (key) {
                    case 'Enter':
                        safeClick(confirmButtonSelector());
                        break;
                    case 'Escape':
                        safeClick(cancelButtonSelector());
                        break;
                }
            });
        }

        miscellaneous() {
            $('#areaContent').style.height = '440px';
            $('#chatMessageListWrapper').style.height = '510px';
            setTimeout(() => $('#close_general_notification').click(), 5000);
        }

        printTimers() {
            for (const [key, val] of Object.entries(this.timers)) {
                log(`timers.${key}: ${val}`);
            }
        }

        start() {
            log('Starting RoA Bot with settings:', this.settings);
            try {
                this.buildings = JSON.parse(GM_getResourceText('buildingsData'));
                log(`Loaded buildings data, entries: ${Object.entries(this.buildings).length}`);
            } catch (e) {
                log('Unable to load buildings data');
                console.error(e);
            }

            if (this.settings.channel?.switchToMain) this.timers.switchToMain = this.switchToMainChannel();
            if (this.settings.refresh?.enabled) this.timers.autoRefresh = this.setupAutoRefresh();
            if (this.settings.questCompletion?.enabled) this.timers.questCompletion = this.setupQuestCompletion();
            if (this.settings.housing?.enabled) this.timers.housing = this.setupHousing();
            if (this.settings.toolUpgrade?.enabled) this.timers.toolUpgrade = this.setupToolUpgrade();
            if (this.settings.crafting?.enabled) this.timers.crafting = this.setupCrafting();
            this.attachKeyBinds();
            this.miscellaneous();

            this.printTimers();
        }

        stop() {
            log('Stopping RoA Bot');
            for (const [key, val] of Object.entries(this.timers)) {
                clearInterval(val);
                delete this.timers[key];
            }
        }

        restart() {
            this.stop();
            this.start();
        }
    }

    unsafeWindow.roaBot = new RoaBot(defaultSettings, charSettings[getCharName()]);
    unsafeWindow.addEventListener('beforeunload', () => unsafeWindow.roaBot.stop());
    unsafeWindow.roaBot.start();
})();
