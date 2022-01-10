// ==UserScript==
// @name            RoA-Bot
// @namespace       http://tampermonkey.net/
// @version         0.1.1
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
        channel: {
            switchToMain: true,
        },
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
        if (!battle.attributes.style || !/display: none/g.test(battle.attributes.style.value)) return {elem: battle, type: 'kill'}; // because fuck you
        if (!tradeskill.attributes.style || !/display: none/g.test(tradeskill.attributes.style.value)) return {elem: tradeskill, type: 'tradeskill'};
        if (!profession.attributes.style || !/display: none/g.test(profession.attributes.style.value)) return {elem: profession, type: 'profession'};
    };

    const switchToMainChannel = () => setTimeout(() => document.querySelector('a.channelTab[data-channelid="2"]').click(), 5000);

    const setupAutoRefresh = () => {
        const replenishSelector = () => $('#replenishStamina');

        log('Setting up auto refresh interval');
        return setInterval(async () => {
            const item = replenishSelector();
            if (item) item.click();
        }, settings.refresh.actionsInterval * 3 * 1000);
    };

    const setupQuestCompletion = () => {
        const infoLinkSelector = elem => elem.querySelector('div.center > a.questCenter');
        const completeButtonSelector = type => $(`input.completeQuest[data-questtype=${type}]`);
        const jumpFwdButtonSelector = () => $('#roaJumpNextMob');
        const beginQuestButtonsSelector = type => $(`input.questRequest[data-questtype=${type}]`);
        const closeModalSelector = () => $('#modalWrapper > div > span.closeModal');

        log('Setting up auto quest completion');
        return setInterval(() => {
            //log('Checking quest...');
            const { elem, type } = getCurrentQuestType();
            if (infoLinkSelector(elem)) {
                log('Found completed quest');

                //const questType = getCurrentQuestType();
                log(`Current quest: ${type}`);

                safeClick(completeButtonSelector(type));
                if (type === 'battle') {
                    for (let i = 0; i < settings.questCompletion.jumpForwardTimes; i++) {
                        safeClick(jumpFwdButtonSelector());
                    }
                }
                safeClick(beginQuestButtonsSelector(type));
                setTimeout(() => safeClick(closeModalSelector()), 500); // TODO make sure it close at first try
                log(`Refreshed quest`);
            } else {
                //log('No completed quest found');
                //safeClick(closeModalSelector());
            }
        }, settings.questCompletion.checkIntervalSeconds * 1000);
    };

    const attachKeyBinds = () => {
        const KEYS = {
            ENTER: 13,
            ESC: 27,
        };

        window.addEventListener('keydown', e => {
            const key = e.keyCode;
            switch (key) {
                case KEYS.ENTER: safeClick($('#confirmButtons > a.button.green')); break;
                case KEYS.ESC: safeClick($('#confirmButtons > a.button.red')); break;
            }
        });
    };

    const start = () => {
        log('Starting RoA Bot');
        if (settings.channel.switchToMain) timers.switchToMain = switchToMainChannel();
        if (settings.refresh.enabled) timers.autoRefresh = setupAutoRefresh();
        if (settings.questCompletion.enabled) timers.questCompletion = setupQuestCompletion();
        attachKeyBinds();

        printTimers();
    };

    start();
})();
