(function() {

    var constraints = { video: true, audio: true },
        recorder = new RecordRTC({
            enable: constraints,
            videoElem: document.getElementById("client-video")
        });

    // get user media
    recorder.getMedia(recorder.setMedia, function() {
        console.log("get user media failed!");
    });

    recorder.onVideoReady(function(blob) {
        attachLink(blob, "video");
    });

    recorder.onAudioReady(function(blob) {
        attachLink(blob, "audio");
    });

    document.getElementById("start-record").addEventListener("click", function() {
        recorder.start();
    });

    document.getElementById("stop-record").addEventListener("click", function() {
        recorder.stop();
    });

    function attachLink(blob, str) {
        var a = document.createElement('a');
            a.target = '_blank';
            a.innerHTML = 'Open Recorded ' + str;

        var reader = new FileReader();
        reader.onload = function(e) {
            a.href = e.target.result;
        };
        reader.readAsDataURL(blob);

        result.appendChild(a);
    }

    var result = document.getElementById('result');

})();
