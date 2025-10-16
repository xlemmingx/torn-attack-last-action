// ==UserScript==
// @name         Torn Attack Last Action
// @namespace    http://tampermonkey.net/
// @version      1.2.1
// @description  Show targets last action on attack page
// @author       xlemmingx [2035104]
// @match        https://www.torn.com/loader.php*
// @grant        none
// @run-at       document-end
// @updateURL    https://github.com/xlemmingx/torn-attack-last-action/raw/main/torn-attack-last-action.user.js
// @downloadURL  https://github.com/xlemmingx/torn-attack-last-action/raw/main/torn-attack-last-action.user.js
// ==/UserScript==

(function() {
    'use strict';

    function getTargetUserId() {
        const url = window.location.href;
        const match = url.match(/user2ID=(\d+)/);
        return match ? match[1] : null;
    }

    function isAttackPage() {
        return window.location.href.includes('sid=attack');
    }

    function formatTimeAgo(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const secondsAgo = now - timestamp;

        if (secondsAgo < 60) {
            return `${secondsAgo} seconds`;
        } else if (secondsAgo < 3600) {
            const minutes = Math.floor(secondsAgo / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (secondsAgo < 86400) {
            const hours = Math.floor(secondsAgo / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(secondsAgo / 86400);
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
    }

    async function fetchLastAction(userId, apiKey) {
        try {
            const response = await fetch(`https://api.torn.com/user/${userId}?selections=profile&key=${apiKey}`);
            const data = await response.json();

            console.log('API Response:', data);

            if (data.error) {
                console.log('API Error:', data.error);
                if (displayElement) {
                    displayElement.innerHTML = `Error: ${data.error.error}`;
                }
                return null;
            }

            if (data.last_action && data.last_action.timestamp) {
                return data.last_action.timestamp;
            } else {
                console.log('No last_action found in response');
                if (displayElement) {
                    displayElement.innerHTML = `No last action data available`;
                }
                return null;
            }
        } catch (error) {
            console.log('Fetch error:', error);
            if (displayElement) {
                displayElement.innerHTML = `Network error`;
            }
            return null;
        }
    }

    function createLastActionDisplay(timeAgo) {
        const display = document.createElement('div');
        display.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 10px;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 10000;
            border: 1px solid #444;
        `;
        display.innerHTML = `Last action: ${timeAgo} ago`;
        return display;
    }

    function showApiKeyPrompt() {
        const apiKey = prompt(
            'Please enter your Torn API Key:\n\n' +
            '1. Go to https://www.torn.com/preferences.php#tab=api\n' +
            '2. Create a new API Key with "Public" Access\n' +
            '3. Enter the key here:'
        );

        if (apiKey) {
            localStorage.setItem('torn-api-key', apiKey);
            return apiKey;
        }
        return null;
    }

    function getApiKey() {
        let apiKey = localStorage.getItem('torn-api-key');
        if (!apiKey) {
            apiKey = showApiKeyPrompt();
        }
        return apiKey;
    }

    let displayElement = null;
    let updateInterval = null;

    async function updateLastAction() {
        const targetUserId = getTargetUserId();
        const apiKey = getApiKey();

        console.log('Target User ID:', targetUserId);
        console.log('API Key exists:', !!apiKey);

        if (!targetUserId || !apiKey) {
            if (displayElement) {
                displayElement.innerHTML = `${!targetUserId ? 'No target user ID found' : 'No API key configured'}`;
            }
            return;
        }

        try {
            const lastActionTimestamp = await fetchLastAction(targetUserId, apiKey);
            if (lastActionTimestamp && displayElement) {
                const timeAgo = formatTimeAgo(lastActionTimestamp);
                displayElement.innerHTML = `Last action: ${timeAgo} ago`;
            }
        } catch (error) {
            console.log('Update error:', error);
        }
    }

    async function initDisplay() {
        if (!isAttackPage()) return;

        const targetUserId = getTargetUserId();
        if (!targetUserId) return;

        const apiKey = getApiKey();
        if (!apiKey) return;

        // Create display element first
        displayElement = createLastActionDisplay('...');
        document.body.appendChild(displayElement);

        // Initial update (non-blocking)
        updateLastAction().catch(console.log);

        // Set up interval for updates every 10 seconds
        updateInterval = setInterval(updateLastAction, 10000);
    }

    function cleanup() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        if (displayElement) {
            displayElement.remove();
            displayElement = null;
        }
    }

    // Non-blocking initialization
    setTimeout(() => {
        initDisplay().catch(console.log);
    }, 100);

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);

})();