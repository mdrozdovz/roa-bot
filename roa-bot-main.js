// ==UserScript==
// @name            RoA-Bot
// @namespace       http://tampermonkey.net/
// @version         0.2.0
// @description     try to take over the world!
// @author          mdrozdovz
// @match           https://*.avabur.com/game*
// @match           http://*.avabur.com/game*
// @icon            data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require         https://cdn.jsdelivr.net/gh/lodash/lodash@4.17.4/dist/lodash.min.js
// @require         https://github.com/mdrozdovz/roa-bot/raw/master/character-settings.js?v=7
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
            jumpForwardTimes: 1,
            checkIntervalSeconds: 20,
        },
        housing: {
            enabled: true,
            checkIntervalSeconds: 600,
            item: 'BasicToolkit-Workshop'
        },
        toolUpgrade: {
            enabled: true,
            checkIntervalSeconds: 60,
        },
        resourceWire: {
            enabled: true,
            checkIntervalSeconds: 3600,
            exceedFactor: 1.5,
            altsFactor: 0.5,
        }
    };

    const log = (msg, data) => {
        const now = new Date();
        const prefix = `[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][RoA Bot]:`;
        if (data) console.log(`${prefix} ${msg}`, data);
        else console.log(`${prefix} ${msg}`);
    }

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
            res[type] = parseInt($(`td#${type}`).attributes['data-personal'].value.replaceAll(',', ''));
        }
        return res;
    }

    const closeModalSelector = () => $('#modalWrapper > div > span.closeModal');
    const confirmButtonSelector = () => $('#confirmButtons > a.button.green');
    const cancelButtonSelector = () => $('#confirmButtons > a.button.red');
    const chatInputSelector = () => $('div#chatMessage');
    const sendButtonSelector = () => $('input#chatSendMessage');

    const executeChatCommand = async cmd => {
        log('Executing command:', cmd);
        chatInputSelector().textContent = cmd;
        await safeClick(sendButtonSelector());
    };

    class RoaBot {
        settings;
        timers;
        eventListeners;
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
            this.eventListeners = {};
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
            const winRateSelector = () => $('td#gainsRatio');

            log('Setting up auto quest completion');
            return setInterval(async () => {
                const {elem, type} = getCurrentQuestType();
                if (!infoLinkSelector(elem)) return;

                log(`Found completed quest. Current quest: ${type}`);

                await safeClick(completeButtonSelector(type));
                if (type === 'kill') {
                     if (winRateSelector()?.attributes['data-value']?.value === '100%') {
                         log(`Jumping mobs ${this.settings.jumpForwardTimes} times`);
                         for (let i = 0; i < this.settings.jumpForwardTimes; i++) {
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
            const specificItemSelector = id => $(`a.houseViewRoomItem[data-itemtype="${id}"]`);
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
                    await safeClick(firstActionable(buildItemSelector(), upgradeTierSelector(), upgradeItemSelector()));
                } else if (isVisible(newRoomSelector())) {
                    log('Building new room');
                    await safeClick(newRoomSelector());
                } else {
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
                await safeClick(maxLevelSelector());
                await safeClick(fillQueueSelector());
                await safeClick(addToEndQueueSelector());
                await safeClick(closeModalSelector());
                log('Refilled crafting queue');
            }, this.settings.crafting.checkIntervalSeconds * 1000);
        }

        async wireToMain() {
            const mainChar = _.first(findCharsByRole(Role.Main));
            if (!this.settings.roles.includes(Role.Alt)) return;

            const resData = this.resInfo(false);
            if (resData.factor > this.settings.resourceWire.exceedFactor) {
                const toWire = Math.floor(resData.primaryRss - resData.avg);
                const mats = resData.rss[Resource.CraftingMaterials];
                // TODO make universal, filterable
                const cmd = `/wire ${mainChar} ${toWire} ${resData.type}, ${mats} ${Resource.CraftingMaterials}`;
                await executeChatCommand(cmd);
            }
        }

        async wireToAlts() {
            if (!this.settings.roles.includes(Role.Main)) return;

            const alts = findCharsByRole(Role.Alt);
            const resInfo = this.resInfo().rss;
            const min = _.min(Object.values(_.omit(resInfo, Resource.CraftingMaterials, Resource.GemFragments)));
            const toWire = Math.floor(min * this.settings.resourceWire.altsFactor / alts.length);

            for (const alt of alts) {
                let cmd = `/wire ${alt}`;
                for (const type of [Resource.Food, Resource.Wood, Resource.Iron, Resource.Stone]) {
                    cmd += ` ${toWire} ${type},`;
                }
                if (charSettings[alt].roles.includes(Role.Crafter)) {
                    cmd += ` ${resInfo[Resource.CraftingMaterials]} ${Resource.CraftingMaterials}`;
                }
                cmd = cmd.replace(/,$/g, '');
                await executeChatCommand(cmd);
                await delay(5000);
            }
        }

        setupResourceWire() {
            return setInterval(this.wireToMain.bind(this), this.settings.resourceWire.checkIntervalSeconds * 1000);
        }

        resInfo() {
            const rss = collectResources();
            const type = this.settings.resource;
            if (type) {
                const avg = _.sum(Object.values(_.omit(rss, Resource.CraftingMaterials, Resource.GemFragments))) / 4;
                const primaryRss = rss[type];
                const factor = primaryRss / avg;
                return {type, primaryRss, avg, factor, rss};
            } else {
                return {type, primaryRss: 0, avg: 0, factor: 1, rss};
            }
        }

        attachKeyBinds() {
            log('Setting up custom key binds');
            const keyDown = e => {
                const key = e.key;
                switch (key) {
                    case 'Enter':
                        safeClick(confirmButtonSelector());
                        break;
                    case 'Escape':
                        safeClick(cancelButtonSelector());
                        break;
                }
            };
            window.addEventListener('keydown', keyDown);
            if (!this.eventListeners.window) this.eventListeners.window = {};
            this.eventListeners.window.keydown = keyDown;
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
            if (this.settings.resourceWire?.enabled) this.timers.resourceWire = this.setupResourceWire();
            this.attachKeyBinds();
            this.miscellaneous();

            this.printTimers();
        }

        stop() {
            log('Stopping RoA Bot');
            for (const [key, val] of Object.entries(this.timers)) {
                clearInterval(val);
            }
            this.timers = {};

            for (const [key, val] of Object.entries(this.eventListeners.window)) {
                window.removeEventListener(key, val);
            }
            this.eventListeners.window = {};
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
