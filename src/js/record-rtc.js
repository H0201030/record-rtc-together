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
        // recording flags
        this.videoStarted = false;
        this.audioStarted = false;
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
            // init recording
            this.init();
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
        // init video record
        initVideo: function() {
            console.log('init recording video frames');
        },
        // start video record
        startVideo: function() {
            console.log('start recording video frames');

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

            // whammy library to record canvas
            this.whammy = new Whammy.Video(this.options.video_fps || defaults.video_fps,
                                           this.options.video_quality || defaults.video_quality);

            this.videoStarted = true;

            this.lastVideoFrame = requestAnimationFrame(this.drawVideoFrame.bind(this));
        },
        // stop video record
        stopVideo: function(callback) {
            if (!this.videoStarted) { return ; }

            console.log('stopped recording video frames');

            this.videoStarted = false;

            if (this.lastVideoFrame) {
                cancelAnimationFrame(this.lastVideoFrame);
            }

            // call whammy compile
            if (this.whammy) {
                this.onVideoReady(this.whammy.compile());
            }
        },
        // init audio record
        initAudio: function() {
            console.log('init recording audio frames');

            var self = this,
                onDataReady = {
                    ondataavailable: self.onAudioReady.bind(self)
                };

            this.audioRecorder = new StereoAudioRecorder(self.stream, onDataReady);
        },
        // start audio record
        startAudio: function() {
            console.log('start recording audio frames');

            // reset audio blob
            this.audioBlob = null;

            this.initAudio(); // do it again

            this.audioStarted = true;

            this.audioRecorder.record();
        },
        // stop audio record
        stopAudio: function(callback) {
            if (!this.audioStarted) { return ; }

            console.info('stopped recording audio frames');

            this.audioStarted = false;

            this.audioRecorder.stop();
        },
        // init recorder
        init: function() {
            if (!this.videoElem) { throw "No Video Element Found!"; }
            if (!this.stream) { throw "Media is not ready!"; }

            batchActions(this.options, this, "init");
        },
        // start record all
        start: function() {
            batchActions(this.options, this, "start");
        },
        // stop record all
        stop: function() {
            batchActions(this.options, this, "stop");
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

    function batchActions(options, self, action) {
        if (options.enable) {
            if (options.enable.audio) self[action + "Audio"]();
            if (options.enable.video) self[action + "Video"]();
        } else if (defaults.enable) {
            if (defaults.enable.audio) self[action + "Audio"]();
            if (defaults.enable.video) self[action + "Video"]();
        }
    }

    function isFunction(f) {
        return Object.prototype.toString.call(f) === "[object Function]";
    }

    window.RecordRTC = RecordRTC;

})();
