document.addEventListener('DOMContentLoaded', () => {
    const toggles = {
        sound: document.getElementById('sound'),
        badge: document.getElementById('badge'),
        bubble: document.getElementById('bubble')
    };
    const forceReloadBtn = document.getElementById('forceReload');
    const statusBadge = document.getElementById('connectionStatus');

    // Load saved settings
    chrome.storage.sync.get({ sound: true, badge: true, bubble: true }, (items) => {
        if (toggles.sound) toggles.sound.checked = items.sound;
        if (toggles.badge) toggles.badge.checked = items.badge;
        if (toggles.bubble) toggles.bubble.checked = items.bubble;
    });

    // Handle toggle changes (Instant Save)
    Object.keys(toggles).forEach(key => {
        if (toggles[key]) {
            toggles[key].addEventListener('change', () => {
                const settings = {};
                settings[key] = toggles[key].checked;
                chrome.storage.sync.set(settings);
            });
        }
    });

    // Handle Force Reload
    if (forceReloadBtn) {
        forceReloadBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "FORCE_RELOAD" });

                    // Visual feedback on button
                    const originalText = forceReloadBtn.innerHTML;
                    forceReloadBtn.innerHTML = "✅ Reloading...";
                    forceReloadBtn.disabled = true;
                    setTimeout(() => {
                        forceReloadBtn.innerHTML = originalText;
                        forceReloadBtn.disabled = false;
                    }, 1000);
                }
            });
        });
    }
});