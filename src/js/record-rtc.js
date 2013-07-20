// Wang Zhuochun
// 20/Jul/2013 10:04 PM

(function() {

    navigator.getUserMedia = navigator.getUserMedia ||
                             navigator.webkitGetUserMedia ||
                             navigator.mozGetUserMedia ||
                             navigator.msGetUserMedia;

    var win = window,
        requestAnimationFrame = win.webkitRequestAnimationFrame || win.mozRequestAnimationFrame,
        cancelAnimationFrame = win.webkitCancelAnimationFrame || win.mozCancelAnimationFrame,
        URL = win.URL || win.webkitURL,
        AudioContext = win.webkitAudioContext,
    // defaults
        defaults = {
            enable: { video: true, audio: true },
            canvas_width: 320,
            canvas_height: 240
        };

    function Recorder(options) {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.videoElem = options.videoElem;
        this.frames = [];
        this.mediaReady = false;
        this.blob = null;
        this.filetype = null;
        this.dataURL = null;
        this.stream = null;
        this.audioContext = null;
        this.mediaStream = null;

        navigator.getUserMedia(options.enable || defaults.enable,
                               this.setMedia.bind(this),
                               this.onError.bind(this));
    }

    Recorder.prototype = {
        constructor: Recorder,
        // set user media
        setMedia: function(mediaStream) {
            this.mediaReady = true;
            // output to video elem
            this.stream = mediaStream;
            this.videoElem.src = URL.createObjectURL(mediaStream);
        },
        // draw video frame
        _drawVideoFrame: function() {
            requestedAnimationFrame = requestAnimationFrame(this._drawVideoFrame.bind(this));

            this.context.drawImage(this.videoElem,
                               0, 0, this.videoElem.width, this.videoElem.height,
                               0, 0, this.canvas.width, this.canvas.height);

            this.frames.push(this.canvas.toDataURL('image/webp', 1));
        },
        // start video record
        startVideo: function() {
            this.canvas.width = options.canvas_width || defaults.canvas_width;
            this.cnavas.height = options.canvas_height || defaults.canvas_height;

            this.frames = [];

            requestedAnimationFrame = requestAnimationFrame(this.drawVideoFrame.bind(this));
        },
        // stop video record
        stopVideo: function() {
            cancelAnimationFrame(requestedAnimationFrame);

            this.blob = Whammy.fromImageArray(frames, 1000 / 60);
            this.fileType = 'webm';

            this.setBlob(blob, callback);
            // clear frames
            this.frames = [];
        },
        // start audio record
        startAudio: function() {
            this.audioContext = new AudioContext();

            this.mediaStream = this.audioContext.createMediaStreamSource(this.stream);
            this.mediaStream.connect(audioContext.destination);
        },
        // stop audio record
        stopAudio: function() {
        },
        // start record all
        start: function() {
            this.startVideo();
            this.startAudio();
        },
        // stop record all
        stop: function(callback) {
            this.stopVideo();
            this.stopAudio();
        },
        // on error
        onError: function(err) {
            this.mediaReady = false;
            console.log("Failed due to " + err);
        }
    };

    window.Recorder = Recorder;

})();
