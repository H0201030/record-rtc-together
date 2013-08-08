# RecordRTC-together

Record video and audio together or individually on the web using `getUserMedia`.

It creates two files individually for video (`webm`) and audio (`wav`).

This is used in [MIST project](https://github.com/H0201030) to allow users record video and audio together using their webcams on Web.

# Quick Start

Include `dist\RecordRTC-together.min.js` in your web page.

```javascript
    var constraints = { video: true, audio: true },
        recorder = new RecordRTC({
            enable: constraints,
            videoElem: document.getElementById("client-video")
        });

    // get and set user media
    recorder.getMedia(recorder.setMedia, function() {
        console.log("get user media failed!");
    });

    recorder.onVideoReady(function(blob) {
        // video blob in `webm`
    });

    recorder.onAudioReady(function(blob) {
        // audio blob in `wav`
    });

    recorder.start();

    recorder.stop();
```

Demo please refer to `src\index.html` and `src\js\main.js`.

# Issues

RecordRTC-together is only tested in Google Chrome.

Use [Issue page](https://github.com/H0201030/record-rtc-together/issues).

# Credits

By [Wang Zhuochun](https://github.com/zhuochun).

This is based on works from:

- RecordRTC: https://github.com/muaz-khan/WebRTC-Experiment/tree/master/RecordRTC
- MediaStreamRecorder: https://github.com/streamproc/MediaStreamRecorder
- Audio Recording: https://github.com/mattdiamond/Recorderjs
- Video Recording: https://github.com/antimatter15/whammy

# License

[RecordRTC-together](https://github.com/H0201030/record-rtc-together) is released under MIT Licence.
