chrome.action.onClicked.addListener((tab) => {
    console.log("Icon clicked. Sending message to tab:", tab.id);
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: "OPEN_SETTINGS" }).catch((err) => {
            console.warn("Could not send message (User might be on a non-Bubble page):", err);
        });
    }
});