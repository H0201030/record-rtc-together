(function() {

    var recorder = new RecordRTC({
        enable: {
            video: true,
            audio: true
        },
        videoElem: document.getElementById("client-video")
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
