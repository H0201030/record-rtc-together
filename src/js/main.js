(function() {

    window.recorder = new RecordRTC({
        enabled: {
            video: true,
            audio: true
        },
        videoElem: document.getElementById("client-video")
    });

    document.getElementById("start-record").addEventListener("click", function() { recorder.start(); });

    document.getElementById("stop-record").addEventListener("click", function() { recorder.stop(); });

})();
