(function () {
    console.log("[Bubble Hot Reload Pro] Content Script Loaded");

    let settings = { theme: "dark", sound: true, badge: true, bubble: true };

    chrome.storage.sync.get(settings, (items) => {
        settings = items;
        updateBadgeVisuals();
    });

    chrome.storage.onChanged.addListener((changes) => {
        for (let [key, { newValue }] of Object.entries(changes)) {
            settings[key] = newValue;
        }
        updateBadgeVisuals();
    });

    let lastChangeNumbers = "";

    let reloadSound = null;
    try { reloadSound = new Audio(chrome.runtime.getURL("assets/reload-sound.mp3")); } catch { }

    const badge = document.createElement("div");
    badge.id = "bubbleHotReloadBadge";
    badge.innerText = "Connecting…";
    document.body.appendChild(badge);

    function updateBadgeVisuals() {
        badge.style.display = settings.badge ? "block" : "none";
    }

    function updateBadgeText(text, color, pulse = false) {
        badge.innerText = text;
        badge.style.background = color;
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
            position: "fixed", bottom: "60px", right: "20px",
            background: bg, color: txt, boxShadow: `0 4px 12px ${shadow}`,
            zIndex: "999999", padding: "10px 14px", borderRadius: "8px",
            fontFamily: "sans-serif", fontSize: "14px",
            opacity: 0, transform: "translateY(4px)", transition: "all 0.3s ease"
        });

        document.body.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateY(0)"; });
        setTimeout(() => { t.style.opacity = "0"; t.remove(); }, 2000);
    }

    function showBubbleAnim() {
        if (!settings.bubble) return;
        const count = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < count; i++) {
            const b = document.createElement("div");
            b.className = "bhr-bubble animate";
            const size = Math.random() * 10 + 8;
            Object.assign(b.style, {
                width: size + "px", height: size + "px",
                backgroundColor: `hsl(${Math.random() * 120}, 70%, 50%)`,
                right: (60 + Math.random() * 40) + "px", bottom: "20px",
                animation: `bhr-bubbleIsland ${800 + Math.random() * 400}ms forwards`
            });
            document.body.appendChild(b);
            setTimeout(() => b.remove(), 1200);
        }
    }

    function getPreviewIframe() { return document.querySelector('iframe#preview'); }

    function reloadPreview(reason) {
        updateBadgeText("Reloading…", "#f5a623", true);
        showToast(`🔄 ${reason}`);
        showBubbleAnim();
        if (reloadSound && settings.sound) reloadSound.play().catch(() => { });

        const iframe = getPreviewIframe();
        if (iframe) iframe.src = iframe.src;
        else window.location.reload();
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function () { this.remove(); };
    (document.head || document.documentElement).appendChild(script);

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

    updateBadgeText("Live", "#1e8e3e", true);
})();