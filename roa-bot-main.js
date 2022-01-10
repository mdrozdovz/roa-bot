// ==UserScript==
// @name            RoA-Bot
// @namespace       http://tampermonkey.net/
// @version         0.1.2
// @description     try to take over the world!
// @author          mdrozdovz
// @match           https://*.avabur.com/game*
// @match           http://*.avabur.com/game*
// @icon            data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @downloadURL     https://github.com/mdrozdovz/roa-bot/raw/master/roa-bot-main.js
// @updateURL       https://github.com/mdrozdovz/roa-bot/raw/master/version
// @grant           none
// ==/UserScript==

(async () => {
    'use strict';

    const $ = document.querySelector.bind(document);
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
        }
    };

    const log = msg => {
        const now = new Date();
        console.log(`[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][RoA Bot]: ${msg}`);
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

    class RoaBot {
        settings;
        timers;

        constructor(settings) {
            this.settings = settings;
            this.timers = {};
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
            const closeModalSelector = () => $('#modalWrapper > div > span.closeModal');

            log('Setting up auto quest completion');
            return setInterval(async () => {
                //log('Checking quest...');
                const {elem, type} = getCurrentQuestType();
                if (!infoLinkSelector(elem)) return;

                log('Found completed quest');
                log(`Current quest: ${type}`);

                await safeClick(completeButtonSelector(type));
                if (type === 'kill') {
                    for (let i = 0; i < defaultSettings.questCompletion.jumpForwardTimes; i++) {
                        log('jumping mobs');
                        await safeClick(jumpFwdButtonSelector());
                    }
                }
                await safeClick(beginQuestButtonsSelector(type));
                await safeClick(closeModalSelector());
                log(`Refreshed quest`);
            }, defaultSettings.questCompletion.checkIntervalSeconds * 1000);
        }

        setupHousing() {
            const houseReadyString = 'Your workers are available for a new task.';
            const houseSelector = () => $('#housing > a');
            const newRoomSelector = () => $('input#houseBuildRoom');
            const shortestItemSelector = () => $('#houseQuickBuildList > li > a.houseViewRoom');
            const buildItemSelector = () => $('#houseBuildRoomItem');
            const notificationSelector = () => $('div#house_notification');
            const closeModalSelector = () => $('#modalWrapper > div > span.closeModal');

            return setInterval(async () => {
                await safeClick(houseSelector());
                if (notificationSelector().textContent !== houseReadyString) {
                    await safeClick(closeModalSelector());
                    return;
                }

                log('Housing ready');
                if (newRoomSelector()) {
                    await safeClick(newRoomSelector());
                } else { // build shortest
                    await safeClick(shortestItemSelector());
                    await safeClick(buildItemSelector());
                }

                log('Building new item');
                safeClick(closeModalSelector());
            }, this.settings.housing.checkIntervalSeconds * 1000);
        }

        attachKeyBinds() {
            const KEYS = {
                ENTER: 13,
                ESC: 27,
            };

            window.addEventListener('keydown', e => {
                const key = e.code;
                switch (key) {
                    case KEYS.ENTER:
                        safeClick($('#confirmButtons > a.button.green'));
                        break;
                    case KEYS.ESC:
                        safeClick($('#confirmButtons > a.button.red'));
                        break;
                }
            });
        }

        resizeWindows() {
            $('#areaContent').style.height = '440px';
            $('#chatMessageListWrapper').style.height = '510px';
        }

        printTimers() {
            for (const [key, val] of Object.entries(this.timers)) {
                log(`timers.${key}: ${val}`);
            }
        }

        start() {
            log('Starting RoA Bot');
            if (this.settings.channel.switchToMain) this.timers.switchToMain = this.switchToMainChannel();
            if (this.settings.refresh.enabled) this.timers.autoRefresh = this.setupAutoRefresh();
            if (this.settings.questCompletion.enabled) this.timers.questCompletion = this.setupQuestCompletion();
            if (this.settings.housing.enabled) this.timers.housing = this.setupHousing();
            this.attachKeyBinds();
            this.resizeWindows();

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

    window.roaBot = new RoaBot(defaultSettings);
    window.addEventListener('beforeunload', () => window.roaBot.stop());
    window.roaBot.start();
})();
