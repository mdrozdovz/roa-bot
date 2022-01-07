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
        }
    };

    const safeClick = async (button, postDelay) => {
        button && button.click();
        if (postDelay) await delay(postDelay);
    }

    const setupAutoRefresh = () => {
        const replenishSelector = () => $('#replenishStamina');

        console.info('Setting up auto refresh interval');
        return setInterval(async () => {
            const item = replenishSelector();
            if (item) item.click();
        }, settings.refresh.actionsInterval * 3 * 1000);
    };

    const setupQuestCompletion = () => {
        const postClickDelayMillis = 50;
        const infoLinkSelector = () => $('#bq_info > a.questCenter');
        const completeButtonSelector = () => $('#battleQuestComplete > div > input.completeQuest');
        const jumpFwdButtonSelector = () => $('#roaJumpNextMob');
        const beginQuestButtonsSelector = () => $('input.questRequest');
        const questButtons = {
            Battle: 0,
            Harvesting: 1,
            Profession: 2,
        };

        console.info('Setting up auto quest completion');
        return setInterval(async () => {
            await safeClick(infoLinkSelector(), postClickDelayMillis);
            await safeClick(completeButtonSelector(), postClickDelayMillis);
            for (let i = 0; i < settings.questCompletion.jumpForwardTimes; i++) {
                await safeClick(jumpFwdButtonSelector(), postClickDelayMillis);
            }
            await safeClick(beginQuestButtonsSelector()[questButtons.Battle], postClickDelayMillis);
        }, 60 * 1000);
    };

    if (settings.refresh.enabled) timers.autoRefresh = setupAutoRefresh();
    if (settings.questCompletion.enabled) timers.questCompletion = setupQuestCompletion();
})();
