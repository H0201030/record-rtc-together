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
        MediaStream = win.webkitMediaStream,
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
        this.audioStream = null;
        this.audioRecorder = null;
        this.requestedAnimationFrame = null;

        navigator.getUserMedia(options.enable || defaults.enable,
                               this.setMedia.bind(this),
                               this.onError.bind(this));
    }

    RecordRTC.prototype = {
        constructor: RecordRTC,
        // set user media
        setMedia: function(mediaStream) {
            // flag
            this.mediaReady = true;
            // set media stream and audio stream
            this.stream = mediaStream;
            this.audioStream = new MediaStream(mediaStream.getAudioTracks());
            // output to video elem
            this.videoElem.src = URL.createObjectURL(mediaStream);
        },
        // draw video frame
        drawVideoFrame: function() {
            this.requestedAnimationFrame = requestAnimationFrame(this.drawVideoFrame.bind(this));

            this.context.drawImage(this.videoElem,
                               0, 0, this.v_width, this.v_height,
                               0, 0, this.c_width, this.c_height);

            this.frames.push(this.canvas.toDataURL('image/webp', 1));
        },
        // start video record
        startVideo: function() {
            console.log('started recording video frames');

            // set canvas width, height
            this.c_width = this.options.canvas_width || defaults.canvas_width;
            this.c_height = this.options.canvas_height || defaults.canvas_height;
            // set video width, height
            this.v_width = this.options.video_width || this.videoElem.offsetWidth;
            this.v_height = this.options.video_height || this.videoElem.offsetHeight;

            // TODO select the min width/height btw canvas and videoElem

            this.canvas.width = this.c_width;
            this.canvas.height = this.c_height;
            this.videoElem.width = this.v_width;
            this.videoElem.height = this.v_height;

            this.frames = [];

            this.requestedAnimationFrame = requestAnimationFrame(this.drawVideoFrame.bind(this));
        },
        // stop video record
        stopVideo: function(callback) {
            console.log('stopped recording video frames');
            cancelAnimationFrame(this.requestedAnimationFrame);
            // call whammy
            this.videoBlob = Whammy.fromImageArray(this.frames, 1000 / 60);
            // set blob
            //this.setBlob(this.videoblob, callback, "video/webm");
            // clear frames
            this.frames = [];
        },
        // start audio record
        startAudio: function() {
            var audioContext = new AudioContext(),
                mediaStreamSource = audioContext.createMediaStreamSource(this.audioStream);

            mediaStreamSource.connect(audioContext.destination);

            this.audioRecorder = new Recorder(mediaStreamSource, {
                workerPath: this.options.audioWorkerPath || defaults.audioWorkerPath
            });

            this.audioRecorder.record();
        },
        // stop audio record
        stopAudio: function(callback) {
            if (!this.audioRecorder) { return ; }

            console.info('stopped recording audio frames');

            this.audioRecorder.stop();
            this.audioRecorder.exportWAV(function(blob) {
                this.audioBlob = blob;
            }.bind(this));
            // clear record
            this.audioRecorder.clear();
        },
        // start record all
        start: function() {
            if (!this.videoElem) { throw "No Video Element Found!"; }
            if (!this.mediaReady) { throw "Media is not ready!"; }

            this.startVideo();
            this.startAudio();
        },
        // stop record all
        stop: function(videoCallback, audioCallback) {
            this.stopVideo(videoCallback);
            this.stopAudio(audioCallback);
        },
        // on error
        onError: function(err) {
            this.mediaReady = false;
            console.log("Failed due to " + err);
        }
    };

    window.RecordRTC = RecordRTC;

})();
