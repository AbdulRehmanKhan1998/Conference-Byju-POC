(function(window, document, red5prosdk) {
    'use strict';

    var subscriberMap = {};
    var streamNameField = document.getElementById('streamname-field');
    // var divNameToBeRemoved;
    // var updateSuscriberStatusFromEvent = window.red5proHandleSubscriberEvent;
    var subscriberTemplate = '' +
        '<div class="subscriber-session centered">' +
        '<p class="subscriber-status-field">On hold.</p>' +
        '</div>' +
        '<div class="video-holder centered">' +
        '<video autoplay controls playsinline class="red5pro-subscriber red5pro-media red5pro-background"></video>' +
        '</div>' +
        '<div class="audio-holder centered hidden">' +
        '<audio autoplay playsinline class="red5pro-media"></audio>' +
        '</div>' +
        '<div class="centered">' +
        '<p class="subscriber-name-field"></span></p>' +
        '<p class="subscriber-id-field"></span></p>' +
        '</p>' +
        '</div>';


    function templateContent(templateHTML) {
        console.log("inside function");
        var div = document.createElement('div');
        div.classList.add('subscriber-container');
        div.innerHTML = templateHTML;
        return div;
    }

    function getSubscriberElementId(streamName) {
        return ['red5pro', 'subscriber', streamName].join('-');
    }

    function getSubscriberAudioElementId(streamName) {
        return ['red5pro', 'subscriber', streamName, 'audio'].join('-');
    }

    function generateNewSubscriberDOM(streamName, subId, parent) {
        var card = templateContent(subscriberTemplate);
        parent.appendChild(card);
        var videoId = getSubscriberElementId(streamName);
        var audioId = getSubscriberAudioElementId(streamName);
        var videoElement = card.getElementsByClassName('red5pro-media')[0];
        var audioElement = card.getElementsByClassName('red5pro-media')[1];
        var subscriberNameField = card.getElementsByClassName('subscriber-name-field')[0];
        var subscriberIdField = card.getElementsByClassName('subscriber-id-field')[0];
        subscriberNameField.innerText = streamName;
        subscriberIdField.innerText = '(' + subId + ')';
        videoElement.id = videoId;
        audioElement.id = audioId;
        card.id = [videoId, 'container'].join('-');
        return card;
    }

    function hideVideoPoster(streamName) {
        var videoId = getSubscriberElementId(streamName);
        var publisherVideo = document.getElementById(videoId);
        publisherVideo.classList.remove('hidden');
    }

    function showVideoPoster(streamName) {
        var videoId = getSubscriberElementId(streamName);
        var publisherVideo = document.getElementById(videoId);
        publisherVideo.classList.add('hidden');
    }

    function addAudioSubscriberDecoy(streamName, config, cb) {
        var uid = Math.floor(Math.random() * 0x10000).toString(16);
        var elementId = getSubscriberAudioElementId(streamName);
        var extension = {
            streamName: streamName,
            mediaElementId: elementId,
            protocol: "wss",
            port: 443,
            host: "red5-dev.tllms.com",
            // protocol: 'ws',
            // port: 5080,
            // host: 'localhost',
            app: 'live',
            rtcConfiguration: {
                iceServers: [{ urls: 'stun:stun2.l.google.com:19302' }],
                iceCandidatePoolSize: 2,
                bundlePolicy: 'max-bundle'
            },
            videoEncoding: 'NONE',
            audioEncoding: 'NONE',
            rtcpMuxPolicy: 'negotiate',
            subscriptionId: ['subscriber-audio', uid].join('-')
        };
        console.log('[audio:decoy] Adding audio decoy for ' + streamName);
        new red5prosdk.RTCSubscriber()
            .init(Object.assign(config, extension))
            .then(function(aSubscriber) {
                cb(aSubscriber)
                console.log('[audio:decoy] Initialized ' + streamName);
                /*
                aSubscriber.on('*', function (event) {
                  console.log('[audio:decoy:' + streamName + ':' + elementId + '] ' + event.type);
                });
                */
                /* video turned off feature */
                aSubscriber.on(red5prosdk.SubscriberEventTypes.SUBSCRIBE_METADATA, (event) => {
                    console.log('inside subscribers metadata event')
                    console.log(JSON.stringify(event.data))
                    console.log(event.data.streamingMode)
                    console.log("before name")
                    console.log(name);

                    if (event.data.streamingMode === 'Audio') {
                        showVideoPoster(name);
                    } else {
                        hideVideoPoster(name);
                    }
                });


                return aSubscriber.subscribe();
            })
            .then(function() {
                console.log('[audio:decoy] Subscribing to ' + streamName);
            })
            .catch(function(error) {
                console.log('[audio:decoy] Error in subscribing to ' + streamName);
                console.log(error);
            });
    }



    function removeAudioSubscriberDecoy(streamName, decoy) {
        console.log('[audio:decoy] Removing audio decoy for ' + streamName);
        decoy.unsubscribe();
    }

    var SubscriberItem = function(subStreamName, parent, index) {
        console.log(subStreamName);
        this.subscriptionId = [streamNameField.value, 'sub'].join('-');
        this.streamName = subStreamName;
        this.subscriber = undefined;
        this.baseConfiguration = {
            protocol: "wss",
            port: 443,
            host: "red5-dev.tllms.com",
            // protocol: 'ws',
            // port: 5080,
            // host: 'localhost',
            app: 'live',
            rtcConfiguration: {
                iceServers: [{ urls: 'stun:stun2.l.google.com:19302' }],
                iceCandidatePoolSize: 2,
                bundlePolicy: 'max-bundle'
            },
            videoEncoding: 'NONE',
            audioEncoding: 'NONE',
            rtcpMuxPolicy: 'negotiate',
        };
        this.streamingMode = undefined;
        this.audioDecoy = undefined; // Used when initial mode is `Audio`.
        this.index = index;
        this.next = undefined;
        this.parent = parent;
        this.card = generateNewSubscriberDOM(this.streamName, this.subscriptionId, this.parent);
        this.statusField = this.card.getElementsByClassName('subscriber-status-field')[0];
        this.toggleVideoPoster = this.toggleVideoPoster.bind(this);
        this.handleAudioDecoyVolumeChange = this.handleAudioDecoyVolumeChange.bind(this);
        this.handleStreamingModeMetadata = this.handleStreamingModeMetadata.bind(this);
    }
    SubscriberItem.prototype.handleAudioDecoyVolumeChange = function(event) {
        if (this.audioDecoy) {
            this.audioDecoy.setVolume(event.data.volume);
        }
    }
    SubscriberItem.prototype.handleStreamingModeMetadata = function(streamingMode) {
        // if (isMoz) return; // It works in Firefox!
        var self = this;
        if (this.streamingMode !== streamingMode) {
            var previousStreamingMode = this.streamingMode;
            if (streamingMode === 'Audio' && previousStreamingMode === undefined) {
                // Then, we have started playback of an Audio only stream because
                // the broadcaster has turned off their Camera stream.
                // There is a bug in some browsers that will not allow A/V bundled streams
                // to playback JUST audio on initial subscription in a <video> element; they only allow <audio>.
                addAudioSubscriberDecoy(this.streamName, this.baseConfiguration, function(subscriberInst) {
                    self.audioDecoy = subscriberInst;
                    self.subscriber.on('Subscribe.Volume.Change', self.handleAudioDecoyVolumeChange);
                });
            } else if (this.audioDecoy) {
                removeAudioSubscriberDecoy(this.streamName, this.audioDecoy);
                this.subscriber.off('Subscribe.Volume.Change', this.handleAudioDecoyVolumeChange)
                this.audioDecoy = undefined;
            }
        }
        this.streamingMode = streamingMode;
    }
    SubscriberItem.prototype.toggleVideoPoster = function(showPoster) {
        var video = document.getElementById(getSubscriberElementId(this.streamName));
        if (showPoster) {
            video.classList.add('hidden');
        } else {
            video.classList.remove('hidden');
        }
    }
    SubscriberItem.prototype.resolve = function() {
        if (this.next) {
            this.next.execute(this.baseConfiguration);
        }
    }
    SubscriberItem.prototype.reject = function(event) {
        console.error(event);
        if (this.next) {
            this.next.execute(this.baseConfiguration);
        }
    }
    SubscriberItem.prototype.execute = function(config) {
        this.baseConfiguration = config;
        var self = this;
        var name = this.streamName;
        var uid = Math.floor(Math.random() * 0x10000).toString(16);
        var rtcConfig = Object.assign({}, config, {
            streamName: name,
            subscriptionId: [this.subscriptionId, uid].join('-'),
            protocol: "wss",
            port: 443,
            host: "red5-dev.tllms.com",
            // protocol: 'ws',
            // port: 5080,
            // host: 'localhost',
            app: 'live',
            // streamName: "mystream",
            rtcConfiguration: {
                iceServers: [{ urls: 'stun:stun2.l.google.com:19302' }],
                iceCandidatePoolSize: 2,
                bundlePolicy: 'max-bundle'
            },
            // mediaElementId: 'red5pro-subscriber',
            // subscriptionId: 'mystream' + Math.floor(Math.random() * 0x10000).toString(16),
            videoEncoding: 'NONE',
            audioEncoding: 'NONE',
            rtcpMuxPolicy: 'negotiate',
            mediaElementId: getSubscriberElementId(name)
        });
        this.subscriber = new red5prosdk.RTCSubscriber();
        console.log(this.subscriber);
        // divNameToBeRemoved=getSubscriberElementId(name);
        this.subscriber.on('Connect.Success', this.resolve.bind(this));
        this.subscriber.on('Connect.Failure', this.reject.bind(this));
        var sub = this.subscriber;
        // var handleStreamingModeMetadata = this.handleStreamingModeMetadata;
        // var toggleVideoPoster = this.toggleVideoPoster;
        // var statusField = this.statusField;
        var reject = this.reject.bind(this);
        var closeCalled = false;
        var close = function(event) { // eslint-disable-line no-unused-vars
            if (closeCalled) return;
            closeCalled = true;

            function cleanup() {
                // console.log("under cleanup function");
                // var el = document.getElementById(divNameToBeRemoved + '-container');
                // console.log(el);
                // el.parentNode.removeChild(el);
                // sub.off('*', respond);
                sub.off('Subscribe.Fail', fail);
            }
            sub.off('Subscribe.Connection.Closed', close);
            sub.unsubscribe().then(cleanup).catch(cleanup);
            if (self.audioDecoy) {
                removeAudioSubscriberDecoy(self.streamName, self.audioDecoy);
            }
            delete subscriberMap[name];

        };
        //       toggleVideoPoster(!event.data.streamingMode.match(/Video/));
        //     }
        //   }
        //   if (inFailedState) {
        //     close();
        //   }
        // };
        var fail = function(event) { // eslint-disable-line no-unused-vars
            close();
            var t = setTimeout(function() {
                clearTimeout(t);
                new SubscriberItem(self.streamName, self.parent, self.index).execute();
            }, 2000);
        };
        this.subscriber.on('Subscribe.Connection.Closed', close);
        this.subscriber.on('Subscribe.Fail', fail);
        // this.subscriber.on('*', respond);

        this.subscriber.init(rtcConfig)
            .then(function(subscriber) {
                subscriberMap[name] = subscriber;
                console.log("subscriber-block");
                console.log(name + "student has joined[subscribed]");
                console.log(subscriberMap);
                subscriber.on(red5prosdk.SubscriberEventTypes.SUBSCRIBE_METADATA, (event) => {
                    console.log('inside subscribers metadata event 2')
                    console.log(JSON.stringify(event.data))
                    console.log(event.data.streamingMode)
                    console.log(name);

                    if (event.data.streamingMode === 'Audio') {
                        showVideoPoster(name);
                    } else {
                        hideVideoPoster(name);
                    }
                });

                return subscriber.subscribe();
            })
            .catch(function(error) {
                console.log('[subscriber:' + name + '] Error');
                reject(error);
            });
    }

    /* video turned off feature */
    // if (subscriber) {
    //     subscriber.on(red5prosdk.SubscriberEventTypes.SUBSCRIBE_METADATA, (event) => {
    //         console.log('inside subscribers metadata event 2')
    //         console.log('[Red5ProSubscriber] SharedObject Connect.');
    //         console.log(JSON.stringify(event.data))
    //     });
    // }

    window.getConferenceSubscriberElementId = getSubscriberElementId;
    window.ConferenceSubscriberItem = SubscriberItem;

})(window, document, window.red5prosdk);