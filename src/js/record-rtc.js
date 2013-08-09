// Wang Zhuochun
// https://github.com/H0201030/record-rtc-together
// 08/Aug/2013 06:08 PM

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
        AudioContext = win.webkitAudioContext || window.mozAudioContext,

    // defaults
        defaults = {
            enable: { video: true, audio: true },
            canvas_width: 320,
            canvas_height: 240,
            video_fps: 10,
            video_quality: 0.8
        };

    function RecordRTC(options) {
        // canvas
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        // store options
        this.options = options;
        // elem
        this.videoElem = options.videoElem;
        // blob results
        this.videoBlob = null;
        this.audioBlob = null;
        // stream
        this.stream = null;
        // video
        this.whammy = null;
        this.lastFrameTime = null;
        this.lastVideoFrame = null;
        // audio
        this.audioRecorder = null;
    }

    RecordRTC.prototype = {
        constructor: RecordRTC,
        // get user media
        getMedia: function(onSucceed, onError) {
            navigator.getUserMedia(this.options.enable || defaults.enable,
                                   onSucceed.bind(this), onError.bind(this));
        },
        // set user media
        setMedia: function(mediaStream) {
            // set media stream and audio stream
            this.stream = mediaStream;
            // output to video elem
            this.videoElem.src = URL.createObjectURL(mediaStream);
        },
        // draw video frame
        drawVideoFrame: function(time) {
            this.lastVideoFrame = requestAnimationFrame(this.drawVideoFrame.bind(this));

            if (!this.lastFrameTime) {
                this.lastFrameTime = time;
            }

            // ~10 fps
            if (time - this.lastFrameTime < 90) return ;

            this.context.drawImage(this.videoElem,
                               0, 0, this.v_width, this.v_height,
                               0, 0, this.c_width, this.c_height);

            this.whammy.add(this.canvas);

            this.lastFrameTime = time;
        },
        // start video record
        startVideo: function() {
            console.log('started recording video frames');

            // reset video blob
            this.videoBlob = null;

            // set canvas width, height
            this.c_width = this.options.canvas_width || defaults.canvas_width;
            this.c_height = this.options.canvas_height || defaults.canvas_height;
            // set video width, height
            this.v_width = this.options.video_width || this.videoElem.offsetWidth;
            this.v_height = this.options.video_height || this.videoElem.offsetHeight;

            if (this.v_width < this.c_width) {
                this.v_width = this.c_width;
            }

            if (this.v_height < this.c_height) {
                this.v_height = this.c_height;
            }

            this.canvas.width = this.c_width;
            this.canvas.height = this.c_height;
            this.videoElem.width = this.v_width;
            this.videoElem.height = this.v_height;

            this.whammy = new Whammy.Video(this.options.video_fps || defaults.video_fps, 
                                           this.options.video_quality || defaults.video_quality);

            this.lastVideoFrame = requestAnimationFrame(this.drawVideoFrame.bind(this));
        },
        // stop video record
        stopVideo: function(callback) {
            console.log('stopped recording video frames');

            if (this.lastVideoFrame) {
                cancelAnimationFrame(this.lastVideoFrame);
            }

            // call whammy compile
            if (this.whammy) {
                this.onVideoReady(this.whammy.compile());
            }
        },
        // start audio record
        startAudio: function() {
            console.log('started recording audio frames');

            // reset audio blob
            this.audioBlob = null;

            var self = this,
                onDataReady = {
                    ondataavailable: self.onAudioReady.bind(self)
                };

            this.audioRecorder = new StereoAudioRecorder(this.stream, onDataReady);

            this.audioRecorder.record();
        },
        // stop audio record
        stopAudio: function(callback) {
            if (!this.audioRecorder) { return ; }

            console.info('stopped recording audio frames');

            this.audioRecorder.stop();
        },
        // start record all
        start: function() {
            if (!this.videoElem) { throw "No Video Element Found!"; }
            if (!this.stream) { throw "Media is not ready!"; }

            if (this.options.enable) {
                if (this.options.enable.audio) this.startAudio();
                if (this.options.enable.video) this.startVideo();
            } else if (defaults.enable) {
                if (defaults.enable.audio) this.startAudio();
                if (defaults.enable.video) this.startVideo();
            }
        },
        // stop record all
        stop: function() {
            if (this.options.enable) {
                if (this.options.enable.video) this.stopVideo();
                if (this.options.enable.audio) this.stopAudio();
            } else if (defaults.enable) {
                if (defaults.enable.video) this.stopVideo();
                if (defaults.enable.audio) this.stopAudio();
            }
        },
        // on video ready
        onVideoReady: function(callback) {
            if (isFunction(callback)) {
                this.onVideoCallback = callback;

                if (this.videoBlob) {
                    callback(this.videoBlob);
                }
            } else {
                console.log('on video ready');

                this.videoBlob = callback;

                if (this.onVideoCallback) {
                    this.onVideoCallback(callback);
                }
            }
        },
        // on audio ready
        onAudioReady: function(callback) {
            if (isFunction(callback)) {
                this.onAudioCallback = callback;

                if (this.audioBlob) {
                    callback(this.audioBlob);
                }
            } else {
                console.log('on audio ready');

                this.audioBlob = callback;

                if (this.onAudioCallback) {
                    this.onAudioCallback(callback);
                }
            }
        }
    };

    function isFunction(f) {
        return Object.prototype.toString.call(f) === "[object Function]";
    }

    window.RecordRTC = RecordRTC;

})();
