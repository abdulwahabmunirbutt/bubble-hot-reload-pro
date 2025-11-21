document.addEventListener('DOMContentLoaded', () => {
    const themeSelect = document.getElementById('theme');
    const body = document.body;

    function applyTheme(theme) {
        if (theme === 'light') {
            body.classList.add('light-theme');
        } else {
            body.classList.remove('light-theme');
        }
    }

    chrome.storage.sync.get({
        theme: 'dark',
        sound: true,
        badge: true,
        bubble: true
    }, (items) => {
        themeSelect.value = items.theme;
        document.getElementById('sound').checked = items.sound;
        document.getElementById('badge').checked = items.badge;
        document.getElementById('bubble').checked = items.bubble;

        applyTheme(items.theme);
    });

    themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

    document.getElementById('save').addEventListener('click', () => {
        const settings = {
            theme: themeSelect.value,
            sound: document.getElementById('sound').checked,
            badge: document.getElementById('badge').checked,
            bubble: document.getElementById('bubble').checked
        };

        chrome.storage.sync.set(settings, () => {
            const status = document.getElementById('status');
            status.textContent = 'Settings Saved!';
            setTimeout(() => status.textContent = '', 1500);
        });
    });
});