/*
	var vid = new Whammy.Video();
	vid.add(canvas or data url)
	vid.compile()
*/


window.Whammy = (function(){
	// in this case, frames has a very specific meaning, which will be 
	// detailed once i finish writing the code

	function toWebM(frames, outputAsArray){
		var info = checkFrames(frames);

		//max duration by cluster in milliseconds
		var CLUSTER_MAX_DURATION = 30000;
		
		var EBML = [
			{
				"id": 0x1a45dfa3, // EBML
				"data": [
					{ 
						"data": 1,
						"id": 0x4286 // EBMLVersion
					},
					{ 
						"data": 1,
						"id": 0x42f7 // EBMLReadVersion
					},
					{ 
						"data": 4,
						"id": 0x42f2 // EBMLMaxIDLength
					},
					{ 
						"data": 8,
						"id": 0x42f3 // EBMLMaxSizeLength
					},
					{ 
						"data": "webm",
						"id": 0x4282 // DocType
					},
					{ 
						"data": 2,
						"id": 0x4287 // DocTypeVersion
					},
					{ 
						"data": 2,
						"id": 0x4285 // DocTypeReadVersion
					}
				]
			},
			{
				"id": 0x18538067, // Segment
				"data": [
					{ 
						"id": 0x1549a966, // Info
						"data": [
							{  
								"data": 1e6, //do things in millisecs (num of nanosecs for duration scale)
								"id": 0x2ad7b1 // TimecodeScale
							},
							{ 
								"data": "whammy",
								"id": 0x4d80 // MuxingApp
							},
							{ 
								"data": "whammy",
								"id": 0x5741 // WritingApp
							},
							{ 
								"data": doubleToString(info.duration),
								"id": 0x4489 // Duration
							}
						]
					},
					{
						"id": 0x1654ae6b, // Tracks
						"data": [
							{
								"id": 0xae, // TrackEntry
								"data": [
									{  
										"data": 1,
										"id": 0xd7 // TrackNumber
									},
									{ 
										"data": 1,
										"id": 0x63c5 // TrackUID
									},
									{ 
										"data": 0,
										"id": 0x9c // FlagLacing
									},
									{ 
										"data": "und",
										"id": 0x22b59c // Language
									},
									{ 
										"data": "V_VP8",
										"id": 0x86 // CodecID
									},
									{ 
										"data": "VP8",
										"id": 0x258688 // CodecName
									},
									{ 
										"data": 1,
										"id": 0x83 // TrackType
									},
									{
										"id": 0xe0,  // Video
										"data": [
											{
												"data": info.width,
												"id": 0xb0 // PixelWidth
											},
											{ 
												"data": info.height,
												"id": 0xba // PixelHeight
											}
										]
									}
								]
							}
						]
					},

					//cluster insertion point
				]
			}
		 ];

						
		//Generate clusters (max duration)
		var frameNumber = 0;
		var clusterTimecode = 0;
		while(frameNumber < frames.length){
			
			var clusterFrames = [];
			var clusterDuration = 0;
			do {
				clusterFrames.push(frames[frameNumber]);
				clusterDuration += frames[frameNumber].duration;
				frameNumber++;				
			}while(frameNumber < frames.length && clusterDuration < CLUSTER_MAX_DURATION);
						
			var clusterCounter = 0;			
			var cluster = {
					"id": 0x1f43b675, // Cluster
					"data": [
						{  
							"data": clusterTimecode,
							"id": 0xe7 // Timecode
						}
					].concat(clusterFrames.map(function(webp){
						var block = makeSimpleBlock({
							discardable: 0,
							frame: webp.data.slice(4),
							invisible: 0,
							keyframe: 1,
							lacing: 0,
							trackNum: 1,
							timecode: Math.round(clusterCounter)
						});
						clusterCounter += webp.duration;
						return {
							data: block,
							id: 0xa3
						};
					}))
				}
			
			//Add cluster to segment
			EBML[1].data.push(cluster);			
			clusterTimecode += clusterDuration;
		}
						
		return generateEBML(EBML, outputAsArray)
	}

	// sums the lengths of all the frames and gets the duration, woo

	function checkFrames(frames){
		var width = frames[0].width, 
			height = frames[0].height, 
			duration = frames[0].duration;
		for(var i = 1; i < frames.length; i++){
			if(frames[i].width != width) throw "Frame " + (i + 1) + " has a different width";
			if(frames[i].height != height) throw "Frame " + (i + 1) + " has a different height";
			if(frames[i].duration < 0 || frames[i].duration > 0x7fff) throw "Frame " + (i + 1) + " has a weird duration (must be between 0 and 32767)";
			duration += frames[i].duration;
		}
		return {
			duration: duration,
			width: width,
			height: height
		};
	}


	function numToBuffer(num){
		var parts = [];
		while(num > 0){
			parts.push(num & 0xff)
			num = num >> 8
		}
		return new Uint8Array(parts.reverse());
	}

	function strToBuffer(str){
		// return new Blob([str]);

		var arr = new Uint8Array(str.length);
		for(var i = 0; i < str.length; i++){
			arr[i] = str.charCodeAt(i)
		}
		return arr;
		// this is slower
		// return new Uint8Array(str.split('').map(function(e){
		// 	return e.charCodeAt(0)
		// }))
	}


	//sorry this is ugly, and sort of hard to understand exactly why this was done
	// at all really, but the reason is that there's some code below that i dont really
	// feel like understanding, and this is easier than using my brain.

	function bitsToBuffer(bits){
		var data = [];
		var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
		bits = pad + bits;
		for(var i = 0; i < bits.length; i+= 8){
			data.push(parseInt(bits.substr(i,8),2))
		}
		return new Uint8Array(data);
	}

	function generateEBML(json, outputAsArray){
		var ebml = [];
		for(var i = 0; i < json.length; i++){
			var data = json[i].data;
			if(typeof data == 'object') data = generateEBML(data, outputAsArray);					
			if(typeof data == 'number') data = bitsToBuffer(data.toString(2));
			if(typeof data == 'string') data = strToBuffer(data);

			if(data.length){
				var z = z;
			}
			
			var len = data.size || data.byteLength || data.length;
			var zeroes = Math.ceil(Math.ceil(Math.log(len)/Math.log(2))/8);
			var size_str = len.toString(2);
			var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
			var size = (new Array(zeroes)).join('0') + '1' + padded;
			
			//i actually dont quite understand what went on up there, so I'm not really
			//going to fix this, i'm probably just going to write some hacky thing which
			//converts that string into a buffer-esque thing

			ebml.push(numToBuffer(json[i].id));
			ebml.push(bitsToBuffer(size));
			ebml.push(data)
			

		}
		
		//output as blob or byteArray
		if(outputAsArray){
			//convert ebml to an array
			var buffer = toFlatArray(ebml)
			return new Uint8Array(buffer);
		}else{
			return new Blob(ebml, {type: "video/webm"});
		}
	}
	
	function toFlatArray(arr, outBuffer){
		if(outBuffer == null){
			outBuffer = [];
		}
		for(var i = 0; i < arr.length; i++){
			if(typeof arr[i] == 'object'){
				//an array
				toFlatArray(arr[i], outBuffer)
			}else{
				//a simple element
				outBuffer.push(arr[i]);
			}
		}
		return outBuffer;
	}
	
	//OKAY, so the following two functions are the string-based old stuff, the reason they're
	//still sort of in here, is that they're actually faster than the new blob stuff because
	//getAsFile isn't widely implemented, or at least, it doesn't work in chrome, which is the
	// only browser which supports get as webp

	//Converting between a string of 0010101001's and binary back and forth is probably inefficient
	//TODO: get rid of this function
	function toBinStr_old(bits){
		var data = '';
		var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
		bits = pad + bits;
		for(var i = 0; i < bits.length; i+= 8){
			data += String.fromCharCode(parseInt(bits.substr(i,8),2))
		}
		return data;
	}

	function generateEBML_old(json){
		var ebml = '';
		for(var i = 0; i < json.length; i++){
			var data = json[i].data;
			if(typeof data == 'object') data = generateEBML_old(data);
			if(typeof data == 'number') data = toBinStr_old(data.toString(2));
			
			var len = data.length;
			var zeroes = Math.ceil(Math.ceil(Math.log(len)/Math.log(2))/8);
			var size_str = len.toString(2);
			var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
			var size = (new Array(zeroes)).join('0') + '1' + padded;

			ebml += toBinStr_old(json[i].id.toString(2)) + toBinStr_old(size) + data;

		}
		return ebml;
	}

	//woot, a function that's actually written for this project!
	//this parses some json markup and makes it into that binary magic
	//which can then get shoved into the matroska comtainer (peaceably)

	function makeSimpleBlock(data){
		var flags = 0;
		if (data.keyframe) flags |= 128;
		if (data.invisible) flags |= 8;
		if (data.lacing) flags |= (data.lacing << 1);
		if (data.discardable) flags |= 1;
		if (data.trackNum > 127) {
			throw "TrackNumber > 127 not supported";
		}
		var out = [data.trackNum | 0x80, data.timecode >> 8, data.timecode & 0xff, flags].map(function(e){
			return String.fromCharCode(e)
		}).join('') + data.frame;

		return out;
	}

	// here's something else taken verbatim from weppy, awesome rite?

	function parseWebP(riff){
		var VP8 = riff.RIFF[0].WEBP[0];
		
		var frame_start = VP8.indexOf('\x9d\x01\x2a'); //A VP8 keyframe starts with the 0x9d012a header
		for(var i = 0, c = []; i < 4; i++) c[i] = VP8.charCodeAt(frame_start + 3 + i);
		
		var width, horizontal_scale, height, vertical_scale, tmp;
		
		//the code below is literally copied verbatim from the bitstream spec
		tmp = (c[1] << 8) | c[0];
		width = tmp & 0x3FFF;
		horizontal_scale = tmp >> 14;
		tmp = (c[3] << 8) | c[2];
		height = tmp & 0x3FFF;
		vertical_scale = tmp >> 14;
		return {
			width: width,
			height: height,
			data: VP8,
			riff: riff
		}
	}

	// i think i'm going off on a riff by pretending this is some known
	// idiom which i'm making a casual and brilliant pun about, but since
	// i can't find anything on google which conforms to this idiomatic
	// usage, I'm assuming this is just a consequence of some psychotic
	// break which makes me make up puns. well, enough riff-raff (aha a
	// rescue of sorts), this function was ripped wholesale from weppy

	function parseRIFF(string){
		var offset = 0;
		var chunks = {};
		
		while (offset < string.length) {
			var id = string.substr(offset, 4);
			var len = parseInt(string.substr(offset + 4, 4).split('').map(function(i){
				var unpadded = i.charCodeAt(0).toString(2);
				return (new Array(8 - unpadded.length + 1)).join('0') + unpadded
			}).join(''),2);
			var data = string.substr(offset + 4 + 4, len);
			offset += 4 + 4 + len;
			chunks[id] = chunks[id] || [];
			
			if (id == 'RIFF' || id == 'LIST') {
				chunks[id].push(parseRIFF(data));
			} else {
				chunks[id].push(data);
			}
		}
		return chunks;
	}

	// here's a little utility function that acts as a utility for other functions
	// basically, the only purpose is for encoding "Duration", which is encoded as
	// a double (considerably more difficult to encode than an integer)
	function doubleToString(num){
		return [].slice.call(
			new Uint8Array(
				(
					new Float64Array([num]) //create a float64 array
				).buffer) //extract the array buffer
			, 0) // convert the Uint8Array into a regular array
			.map(function(e){ //since it's a regular array, we can now use map
				return String.fromCharCode(e) // encode all the bytes individually
			})
			.reverse() //correct the byte endianness (assume it's little endian for now)
			.join('') // join the bytes in holy matrimony as a string
	}

	function WhammyVideo(speed, quality){ // a more abstract-ish API
		this.frames = [];
		this.duration = 1000 / speed;
		this.quality = quality || 0.8;
	}

	WhammyVideo.prototype.add = function(frame, duration){
		if(typeof duration != 'undefined' && this.duration) throw "you can't pass a duration if the fps is set";
		if(typeof duration == 'undefined' && !this.duration) throw "if you don't have the fps set, you ned to have durations here."
		if('canvas' in frame){ //CanvasRenderingContext2D
			frame = frame.canvas;	
		}
		if('toDataURL' in frame){
			frame = frame.toDataURL('image/webp', this.quality)
		}else if(typeof frame != "string"){
			throw "frame must be a a HTMLCanvasElement, a CanvasRenderingContext2D or a DataURI formatted string"
		}
		if (!(/^data:image\/webp;base64,/ig).test(frame)) {
			throw "Input must be formatted properly as a base64 encoded DataURI of type image/webp";
		}
		this.frames.push({
			image: frame,
			duration: duration || this.duration
		})
	}
	
	WhammyVideo.prototype.compile = function(outputAsArray){
		return new toWebM(this.frames.map(function(frame){
			var webp = parseWebP(parseRIFF(atob(frame.image.slice(23))));
			webp.duration = frame.duration;
			return webp;
		}), outputAsArray)
	}

	return {
		Video: WhammyVideo,
		fromImageArray: function(images, fps, outputAsArray){
			return toWebM(images.map(function(image){
				var webp = parseWebP(parseRIFF(atob(image.slice(23))))
				webp.duration = 1000 / fps;
				return webp;
			}), outputAsArray)
		},
		toWebM: toWebM
		// expose methods of madness
	}
})();
;// source code from: http://typedarray.org/wp-content/projects/WebAudioRecorder/script.js
function StereoAudioRecorder(mediaStream, root) {
    // variables
    var leftchannel = [];
    var rightchannel = [];
    var recorder;
    var recording = false;
    var recordingLength = 0;
    var volume;
    var audioInput;
    var sampleRate = 44100;
    var audioContext;
    var context;

    this.record = function() {
        recording = true;
        // reset the buffers for the new recording
        leftchannel.length = rightchannel.length = 0;
        recordingLength = 0;
    };

    this.stop = function() {
        // we stop recording
        recording = false;

        // we flat the left and right channels down
        var leftBuffer = mergeBuffers(leftchannel, recordingLength);
        var rightBuffer = mergeBuffers(rightchannel, recordingLength);
        // we interleave both channels together
        var interleaved = interleave(leftBuffer, rightBuffer);

        // we create our wav file
        var buffer = new ArrayBuffer(44 + interleaved.length * 2);
        var view = new DataView(buffer);

        // RIFF chunk descriptor
        writeUTFBytes(view, 0, 'RIFF');
        view.setUint32(4, 44 + interleaved.length * 2, true);
        writeUTFBytes(view, 8, 'WAVE');
        // FMT sub-chunk
        writeUTFBytes(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        // stereo (2 channels)
        view.setUint16(22, 2, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 4, true);
        view.setUint16(32, 4, true);
        view.setUint16(34, 16, true);
        // data sub-chunk
        writeUTFBytes(view, 36, 'data');
        view.setUint32(40, interleaved.length * 2, true);

        // write the PCM samples
        var lng = interleaved.length;
        var index = 44;
        var volume = 1;
        for (var i = 0; i < lng; i++) {
            view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
            index += 2;
        }

        // our final binary blob
        var blob = new Blob([view], { type: 'audio/wav' });

        root.ondataavailable(blob);
    };

    function interleave(leftChannel, rightChannel) {
        var length = leftChannel.length + rightChannel.length;
        var result = new Float32Array(length);

        var inputIndex = 0;

        for (var index = 0; index < length;) {
            result[index++] = leftChannel[inputIndex];
            result[index++] = rightChannel[inputIndex];
            inputIndex++;
        }
        return result;
    }

    function mergeBuffers(channelBuffer, recordingLength) {
        var result = new Float32Array(recordingLength);
        var offset = 0;
        var lng = channelBuffer.length;
        for (var i = 0; i < lng; i++) {
            var buffer = channelBuffer[i];
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    }

    function writeUTFBytes(view, offset, string) {
        var lng = string.length;
        for (var i = 0; i < lng; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // creates the audio context
    audioContext = window.AudioContext || window.webkitAudioContext;
    context = new audioContext();

    // creates a gain node
    volume = context.createGain();

    // creates an audio node from the microphone incoming stream
    audioInput = context.createMediaStreamSource(mediaStream);

    // connect the stream to the gain node
    audioInput.connect(volume);

    /* From the spec: This value controls how frequently the audioprocess event is 
    dispatched and how many sample-frames need to be processed each call. 
    Lower values for buffer size will result in a lower (better) latency. 
    Higher values will be necessary to avoid audio breakup and glitches */
    var bufferSize = 2048;
    recorder = context.createJavaScriptNode(bufferSize, 2, 2);

    recorder.onaudioprocess = function(e) {
        if (!recording) return;
        var left = e.inputBuffer.getChannelData(0);
        var right = e.inputBuffer.getChannelData(1);
        // we clone the samples
        leftchannel.push(new Float32Array(left));
        rightchannel.push(new Float32Array(right));
        recordingLength += bufferSize;
    }; // we connect the recorder
    volume.connect(recorder);
    recorder.connect(context.destination);
}
;// Wang Zhuochun
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
        AudioContext = win.webkitAudioContext || window.mozAudioContext,

    // defaults
        defaults = {
            enable: { video: true, audio: true },
            canvas_width: 320,
            canvas_height: 240,
            video_fps: 10
        };

    function RecordRTC(options) {
        // canvas
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        // store options
        this.options = options;
        // elem
        this.videoElem = options.videoElem;
        // whether media is ready
        this.mediaReady = false;
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

        navigator.getUserMedia(this.options.enable || defaults.enable,
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

            this.whammy = new Whammy.Video(this.options.video_fps || defaults.video_fps, 0.6);

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
            if (!this.mediaReady) { throw "Media is not ready!"; }

            if (this.options.enable) {
                this.options.enable.video && this.startVideo();
            } else if (defaults.enable) {
                defaults.enable.video && this.startVideo();
            }

            if (this.options.enable) {
                this.options.enable.audio && this.startAudio();
            } else if (defaults.enable) {
                defaults.enable.audio && this.startAudio();
            }
        },
        // stop record all
        stop: function() {
            if (this.options.enable) {
                this.options.enable.video && this.stopVideo();
            } else if (defaults.enable) {
                defaults.enable.video && this.stopVideo();
            }

            if (this.options.enable) {
                this.options.enable.audio && this.stopAudio();
            } else if (defaults.enable) {
                defaults.enable.audio && this.stopAudio();
            }
        },
        // on video ready
        onVideoReady: function(callback) {
            console.log('on video ready');

            if (isFunction(callback)) {
                this.onVideoCallback = callback;

                if (this.videoBlob) {
                    callback(this.videoBlob);
                }
            } else {
                this.videoBlob = callback;

                if (this.onVideoCallback) {
                    this.onVideoCallback(callback);
                }
            }
        },
        // on audio ready
        onAudioReady: function(callback) {
            console.log('on audio ready');

            if (isFunction(callback)) {
                this.onAudioCallback = callback;

                if (this.audioBlob) {
                    callback(this.audioBlob);
                }
            } else {
                this.audioBlob = callback;

                if (this.onAudioCallback) {
                    this.onAudioCallback(callback);
                }
            }
        },
        // on error
        onError: function(err) {
            this.mediaReady = false;
            console.log("Failed due to " + err);
        }
    };

    function isFunction(f) {
        return Object.prototype.toString.call(f) === "[object Function]";
    }

    window.RecordRTC = RecordRTC;

})();
