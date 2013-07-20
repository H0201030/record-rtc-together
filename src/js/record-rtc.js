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
            canvas_height: 240,
            audioWorkerPath: "/vendor/recorderWorker.js"
        };

    function RecordRTC(options) {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.options = options;
        this.videoElem = options.videoElem;
        this.frames = [];
        this.mediaReady = false;
        this.videoBlob = null;
        this.audioBlob = null;
        this.videoDataURL = null;
        this.audioDataURL = null;
        this.stream = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.audioRecorder = null;

        navigator.getUserMedia(options.enable || defaults.enable,
                               this.setMedia.bind(this),
                               this.onError.bind(this));
    }

    RecordRTC.prototype = {
        constructor: RecordRTC,
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
                               0, 0, this.videoElem.offsetWidth, this.videoElem.offsetHeight,
                               0, 0, this.canvas.width, this.canvas.height);

            this.frames.push(this.canvas.toDataURL('image/webp', 1));
        },
        // start video record
        startVideo: function() {
            this.canvas.width = this.options.canvas_width || defaults.canvas_width;
            this.canvas.height = this.options.canvas_height || defaults.canvas_height;

            // TODO select the min width/height btw canvas and videoElem

            this.frames = [];

            requestedAnimationFrame = requestAnimationFrame(this._drawVideoFrame.bind(this));
        },
        // stop video record
        stopVideo: function(callback) {
            cancelAnimationFrame(requestedAnimationFrame);
            // call whammy
            this.videoBlob = Whammy.fromImageArray(this.frames, 1000 / 60);
            // set blob
            //this.setBlob(this.videoblob, callback, "video/webm");
            // clear frames
            this.frames = [];
        },
        // start audio record
        startAudio: function() {
            this.audioContext = new AudioContext();

            this.mediaStream = this.audioContext.createMediaStreamSource(this.stream);
            this.mediaStream.connect(this.audioContext.destination);

            this.audioRecorder = new Recorder(this.mediaStream, {
                workerPath: this.options.audioWorkerPath || defaults.audioWorkerPath
            });

            this.audioRecorder.record();
        },
        // stop audio record
        stopAudio: function(callback) {
            if (!this.audioRecorder) { return ; }

            this.audioRecorder.stop();
            this.audioRecorder.exportWAV(function(blob) {
                this.audioBlob = blob;
            }.bind(this));
        },
        // start record all
        start: function() {
            if (!this.videoElem) { throw "No Video Element Found!"; }

            this.startVideo();
            this.startAudio();
        },
        // stop record all
        stop: function(videoCallback, audioCallback) {
            this.stopVideo(videoCallback);
            this.stopAudio();
        },
        // on error
        onError: function(err) {
            this.mediaReady = false;
            console.log("Failed due to " + err);
        }
    };

    window.RecordRTC = RecordRTC;

})();
