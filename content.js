(function () {
    console.log("[Bubble Hot Reload Pro] Content Script Loaded");

    let settings = { theme: "dark", sound: true, badge: true, bubble: true, badgePos: { top: "10px", left: "auto", right: "10px", bottom: "auto" } };
    const isEditor = window.location.hostname === "bubble.io";

    chrome.storage.sync.get(settings, (items) => {
        settings = items;
        updateBadgeVisuals();
        applyBadgePosition();
    });

    chrome.storage.onChanged.addListener((changes) => {
        for (let [key, { newValue }] of Object.entries(changes)) {
            settings[key] = newValue;
            if (key === 'badgePos') applyBadgePosition();
        }
        updateBadgeVisuals();
    });

    let lastChangeNumbers = "";
    let reloadSound = null;
    try { reloadSound = new Audio(chrome.runtime.getURL("assets/reload-sound.mp3")); } catch { }

    // --- Smart Badge Construction ---
    const badge = document.createElement("div");
    badge.id = "bubbleHotReloadBadge";
    badge.innerHTML = `
        <div class="bhr-status-dot"></div>
        <span class="bhr-text">Connecting…</span>
        <a class="bhr-edit-btn" href="#" target="_blank" title="Edit this page in Bubble">✏️</a>
    `;
    document.body.appendChild(badge);

    const statusDot = badge.querySelector(".bhr-status-dot");
    const statusText = badge.querySelector(".bhr-text");
    const editBtn = badge.querySelector(".bhr-edit-btn");

    // Hide edit button immediately if on editor
    if (isEditor) {
        editBtn.style.display = "none";
    }

    // --- Draggable Logic ---
    let isDragging = false;
    let dragStartTime = 0;
    let startX, startY, initialLeft, initialTop;

    badge.addEventListener("mousedown", (e) => {
        if (e.target.closest(".bhr-edit-btn")) return;
        isDragging = true;
        dragStartTime = Date.now();
        badge.style.transition = "none";

        const rect = badge.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = rect.left;
        initialTop = rect.top;

        badge.style.right = "auto";
        badge.style.bottom = "auto";
        badge.style.left = initialLeft + "px";
        badge.style.top = initialTop + "px";

        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        badge.style.left = (initialLeft + dx) + "px";
        badge.style.top = (initialTop + dy) + "px";
    });

    window.addEventListener("mouseup", (e) => {
        if (!isDragging) return;
        isDragging = false;
        badge.style.transition = "";

        const rect = badge.getBoundingClientRect();
        const newPos = {
            top: rect.top + "px",
            left: rect.left + "px",
            right: "auto",
            bottom: "auto"
        };

        if (Date.now() - dragStartTime > 200) {
            settings.badgePos = newPos;
            chrome.storage.sync.set({ badgePos: newPos });
        }
    });

    function applyBadgePosition() {
        if (settings.badgePos) {
            Object.assign(badge.style, settings.badgePos);
        }
    }

    // --- Editor Link Logic ---
    function getBubbleEditorUrl() {
        if (isEditor) return "#";

        try {
            const hostname = window.location.hostname;
            const pathname = window.location.pathname;
            let appName = "";
            let pageName = "index";

            if (hostname.endsWith("bubbleapps.io")) {
                appName = hostname.split(".")[0];
            } else {
                return "https://bubble.io/home";
            }

            const parts = pathname.split("/").filter(p => p);
            let versionIndex = parts.indexOf("version-test");

            if (versionIndex !== -1 && parts[versionIndex + 1]) {
                pageName = parts[versionIndex + 1];
            } else if (versionIndex === -1 && parts.length > 0) {
                pageName = parts[0];
            }

            return `https://bubble.io/page?name=${pageName}&id=${appName}&tab=tabs-1`;
        } catch (e) {
            return "https://bubble.io/home";
        }
    }

    if (!isEditor) {
        editBtn.href = getBubbleEditorUrl();
    }

    function updateBadgeVisuals() {
        badge.style.display = settings.badge ? "flex" : "none";
    }

    function updateBadgeText(text, color, pulse = false) {
        statusText.innerText = text;
        statusDot.style.backgroundColor = color;
        statusDot.style.boxShadow = `0 0 8px ${color}`;
        badge.classList.toggle("pulse", pulse);
    }

    function showToast(msg) {
        const t = document.createElement("div");
        t.className = "bhr-toast";
        t.innerText = msg;

        const isDark = settings.theme === "dark";
        const bg = isDark ? "#323232" : "#ffffff";
        const txt = isDark ? "#ffffff" : "#111111";
        const shadow = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)";

        Object.assign(t.style, {
            background: bg, color: txt, boxShadow: `0 4px 12px ${shadow}`
        });

        document.body.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateY(0)"; });
        setTimeout(() => { t.style.opacity = "0"; t.remove(); }, 2000);
    }

    // --- Glass HUD Logic ---
    function showGlassHUD(type) {
        if (!settings.bubble) return; // Using 'bubble' setting for HUD compatibility

        // Remove existing HUD
        const existing = document.querySelector(".bhr-glass-hud");
        if (existing) existing.remove();

        const hud = document.createElement("div");
        hud.className = "bhr-glass-hud";

        if (type === "reloading") {
            hud.innerHTML = `
                <div class="spinner"></div>
                <span>Reloading Preview...</span>
            `;
        } else if (type === "success") {
            // User Feedback: The success card was obstructing the view.
            // Solution: Immediately remove the HUD when done so the user can work instantly.
            if (existing) existing.remove();
            return;
        }

        (document.documentElement || document.body).appendChild(hud);

        // Trigger animation
        requestAnimationFrame(() => {
            hud.classList.add("visible");
        });
    }

    function getPreviewIframe() { return document.querySelector('iframe#preview'); }

    let reloadStartTime = 0;

    function reloadPreview(reason) {
        reloadStartTime = Date.now();
        sessionStorage.setItem("bhr_reload_start", reloadStartTime); // Persist start time

        updateBadgeText("Reloading…", "#f5a623", true);
        showGlassHUD("reloading");

        // Notify background script to broadcast to all tabs
        chrome.runtime.sendMessage({ type: "BROADCAST_STATUS", status: "RELOADING" });

        const iframe = getPreviewIframe();
        if (iframe) {
            iframe.src = iframe.src;
        } else {
            window.location.reload();
        }

        // Fallback for iframe reloads or if script persists
        setTimeout(() => {
            checkReloadCompletion();
        }, 2000);
    }

    function checkReloadCompletion() {
        const storedStart = sessionStorage.getItem("bhr_reload_start");
        if (storedStart) {
            const start = parseInt(storedStart);
            const duration = ((Date.now() - start) / 1000).toFixed(1);
            sessionStorage.removeItem("bhr_reload_start");

            updateBadgeText(`Live (${duration}s)`, "#1e8e3e", false);
            showGlassHUD("success");

            if (reloadSound && settings.sound) {
                reloadSound.play().catch(e => console.log("Sound play failed:", e));
            }

            chrome.runtime.sendMessage({
                type: "BROADCAST_STATUS",
                status: "LIVE",
                duration: duration
            });
        }
    }

    // Inject script only on preview pages (not editor)
    if (!isEditor) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected.js');
        script.onload = function () { this.remove(); };
        (document.head || document.documentElement).appendChild(script);

        // Check if we just reloaded
        checkReloadCompletion();
    }

    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        if (event.data && event.data.type === "BUBBLE_LOG_DETECTED") {
            const matches = event.data.text.match(/\d+/g);
            if (matches) {
                const numbers = matches.join("-");
                if (numbers !== lastChangeNumbers) {
                    lastChangeNumbers = numbers;
                    reloadPreview("Detected Change");
                }
            }
        }
    });

    let safetyTimeout = null;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "FORCE_RELOAD") {
            reloadPreview("Manual Reload");
        }

        // Handle broadcasted status updates
        if (request.type === "STATUS_UPDATE") {
            if (request.status === "RELOADING") {
                if (isEditor) {
                    updateBadgeText("Preview Reloading...", "#f5a623", true);
                    showGlassHUD("reloading");

                    // Safety timeout: Reset after 8s if no LIVE signal received
                    if (safetyTimeout) clearTimeout(safetyTimeout);
                    safetyTimeout = setTimeout(() => {
                        updateBadgeText("Editor Active", "#3b82f6", false);
                    }, 8000);
                }
            } else if (request.status === "LIVE") {
                if (isEditor) {
                    if (safetyTimeout) clearTimeout(safetyTimeout);
                    const durationText = request.duration ? ` (${request.duration}s)` : "";
                    updateBadgeText(`Preview Live${durationText}`, "#1e8e3e", false);
                    showGlassHUD("success");
                    setTimeout(() => {
                        updateBadgeText("Editor Active", "#3b82f6", false);
                    }, 3000);
                }
            }
        }
    });

    if (isEditor) {
        updateBadgeText("Editor Active", "#3b82f6", false);
    } else {
        // If we didn't just reload (no stored start time), show generic Live
        if (!sessionStorage.getItem("bhr_reload_start")) {
            updateBadgeText("Live", "#1e8e3e", false);
        }
        // Small delay to ensure connection is ready before broadcasting
        setTimeout(() => {
            chrome.runtime.sendMessage({ type: "BROADCAST_STATUS", status: "LIVE" });
        }, 500);
    }
})();