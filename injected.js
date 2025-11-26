(function () {
    const originalLog = console.log;

    console.log = function (...args) {
        originalLog.apply(console, args);

        const logString = args.join(" ");
        if (logString.includes("PLEASE REFRESH: last change")) {
            window.postMessage({ type: "BUBBLE_LOG_DETECTED", text: logString }, "*");
        }
    };
})();