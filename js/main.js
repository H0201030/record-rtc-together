(function() {

    var constraints = { video: true, audio: true },
        recorder = new RecordRTC({
            enable: constraints,
            videoElem: document.getElementById("client-video"),
            video_width: 320,
            video_height: 240,
            canvas_width: 320,
            canvas_height: 240
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

    var startBtn = document.getElementById("start-record"),
        stopBtn = document.getElementById("stop-record"),
        result = document.getElementById('result'),
        download = document.getElementById('download');

    startBtn.addEventListener("click", function() {
        startBtn.disabled = true;
        stopBtn.disabled = false;

        recorder.start();
    });

    stopBtn.addEventListener("click", function() {
        startBtn.disabled = false;
        stopBtn.disabled = true;

        recorder.stop();
    });

    function attachLink(blob, str, dl) {
        var a = document.createElement('a');
            a.target = '_blank';
            a.innerHTML = (dl ? 'Download ' : 'Open ') + str;

        var reader = new FileReader();
        reader.onload = function(e) {
            a.href = e.target.result;
        };
        reader.readAsDataURL(blob);

        if (dl) {
            a.download = str + (str === 'video' ? '.webm' : ".wav");
            download.appendChild(a);
        } else {
            result.appendChild(a);
        }
    }

})();
