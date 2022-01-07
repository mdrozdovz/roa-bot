// ==UserScript==
// @name            RoA-Bot
// @namespace       http://tampermonkey.net/
// @version         0.1
// @description     try to take over the world!
// @author          mdrozdovz
// @match           https://*.avabur.com/game*
// @match           http://*.avabur.com/game*
// @icon            data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @downloadURL     https://github.com/mdrozdovz/roa-bot/raw/master/roa-bot-main.js
// @updateURL       https://github.com/mdrozdovz/roa-bot/raw/master/roa-bot-main.js
// @grant           none
// ==/UserScript==

(async () => {
    'use strict';

    const $ = document.querySelector.bind(document);
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const timers = {};
    const settings = {
        refresh: {
            enabled: true,
            actionsInterval: 50,
        },
        questCompletion: {
            enabled: true,
            jumpForwardTimes: 0,
            checkIntervalSeconds: 20,
        }
    };

    window.roaBot = {
        timers,
        settings,
        restart() {
            this.stop();
            start();
        },
        stop() {
            log('Stopping RoA Bot');
            for (const [key, val] of Object.entries(timers)) {
                clearInterval(val);
                delete timers[key];
            }
        },
    }

    const printTimers = () => {
        for (const [key, val] of Object.entries(timers)) {
            log(`timers.${key}: ${val}`);
        }
    }

    const log = msg => {
        const now = new Date();
        console.log(`[${now.toDateString()} ${now.toTimeString().split(' ')[0]}][RoA Bot]: ${msg}`);
    }

    const safeClick = button => button && button.click && button.click();

    const getCurrentQuestType = () => {
        const battle = $('#battleQuest');
        const tradeskill = $('#tradeskillQuest');
        const profession = $('#professionQuest');

        // TODO re-do this shit
        if (!/display: none/g.test(battle.attributes.style.value)) return 'battle';
        if (!/display: none/g.test(tradeskill.attributes.style.value)) return 'tradeskill';
        if (!/display: none/g.test(profession.attributes.style.value)) return 'profession';
    };

    const setupAutoRefresh = () => {
        const replenishSelector = () => $('#replenishStamina');

        log('Setting up auto refresh interval');
        return setInterval(async () => {
            const item = replenishSelector();
            if (item) item.click();
        }, settings.refresh.actionsInterval * 3 * 1000);
    };

    const setupQuestCompletion = () => {
        const infoLinkSelector = () => $('div#questInfo > div > div.center > a.questCenter');
        const completeButtonSelector = type => $(`input.completeQuest[data-questtype=${type}]`);
        const jumpFwdButtonSelector = () => $('#roaJumpNextMob');
        const beginQuestButtonsSelector = type => $(`input.questRequest[data-questtype=${type}]`);
        const closeModalSelector = () => $('#modalWrapper > div > span.closeModal');

        log('Setting up auto quest completion');
        return setInterval(() => {
            log('Checking quest...');
            if (infoLinkSelector()) {
                log('Found completed quest');

                const questType = getCurrentQuestType();
                log(`Current quest: ${questType}`);

                safeClick(completeButtonSelector(questType));
                if (questType === 'battle') {
                    for (let i = 0; i < settings.questCompletion.jumpForwardTimes; i++) {
                        safeClick(jumpFwdButtonSelector());
                    }
                }
                safeClick(beginQuestButtonsSelector(questType));
                safeClick(closeModalSelector()); // TODO make sure it close at first try
                log('Refreshed quest');
            } else {
                log('No completed quest found');
                safeClick(closeModalSelector());
            }
        }, settings.questCompletion.checkIntervalSeconds * 1000);
    };

    const start = () => {
        log('Starting RoA Bot');
        if (settings.refresh.enabled) timers.autoRefresh = setupAutoRefresh();
        if (settings.questCompletion.enabled) timers.questCompletion = setupQuestCompletion();

        printTimers();
    };

    start();
})();
