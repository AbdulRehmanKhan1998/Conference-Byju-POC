(function(window, document, red5prosdk) {
    'use strict';
    //firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyAS0nYYOAxwvdGtFo3WtwV83IxpCPlMIvI",
        authDomain: "chat-app-poc-test-79147.firebaseapp.com",
        databaseURL: "https://chat-app-poc-test-79147-default-rtdb.firebaseio.com",
        projectId: "chat-app-poc-test-79147",
        storageBucket: "chat-app-poc-test-79147.appspot.com",
        messagingSenderId: "317926791630",
        appId: "1:317926791630:web:d7f820f2df68d899eab39f",
        measurementId: "G-XX549GNJSQ"
    };

    firebase.initializeApp(firebaseConfig);

    //config end here






    var isPublishing = false;
    const configuration = {
        protocol: "ws",
        port: 5080,
        host: "localhost",
        // protocol: "wss",
        // port: 443,
        // host: "red5-test.tllms.com",
        app: "live",
        rtcConfiguration: {
            iceServers: [{ urls: "stun:stun2.l.google.com:19302" }],
            iceCandidatePoolSize: 2,
            bundlePolicy: "max-bundle",
        },
        streamMode: "live",
        mediaElementId: "red5pro-publisher",
        bandwidth: {
            audio: 56,
            video: 512,
        },
        mediaConstraints: {
            audio: true,
            video: {
                width: {
                    exact: 640,
                },
                height: {
                    exact: 480,
                },
                frameRate: {
                    min: 8,
                    max: 24,
                },
            },
        },
    }

    var targetPublisher;
    var hostSocket;
    var roomName = document.getElementById('room-field').value;
    var streamName = ['publisher', Math.floor(Math.random() * 0x10000).toString(16)].join('-');
    var socketEndpoint = 'localhost:8001'

    var roomField = document.getElementById('room-field');
    var publisherContainer = document.getElementById('publisher-container');
    var publisherMuteControls = document.getElementById('publisher-mute-controls');
    var publisherSession = document.getElementById('publisher-session');
    var publisherNameField = document.getElementById('publisher-name-field');
    var streamNameField = document.getElementById('streamname-field');
    var publisherVideo = document.getElementById('red5pro-publisher');
    var audioCheck = document.getElementById('audio-check');
    var videoCheck = document.getElementById('video-check');
    var joinButton = document.getElementById('join-button');
    // var statisticsField = document.getElementById('statistics-field');

    roomField.value = roomName;
    streamNameField.value = streamName;
    audioCheck.checked = true;
    videoCheck.checked = true;

    joinButton.addEventListener('click', function() {
        saveSettings();
        doPublish(streamName);
        setPublishingUI(streamName);
    });

    audioCheck.addEventListener('change', updateMutedAudioOnPublisher);
    videoCheck.addEventListener('change', updateMutedVideoOnPublisher);

    // var protocol = 'ws';
    // var isSecure = protocol == 'https';

    function saveSettings() {
        streamName = streamNameField.value;
        roomName = roomField.value;
    }

    function updateMutedAudioOnPublisher() {
        console.log("under : updateMutedAudioOnPublisher " + targetPublisher);
        if (targetPublisher && isPublishing) {
            var c = targetPublisher.getPeerConnection();
            console.log("after target publisher gets peer connection " + c);
            var senders = c.getSenders();
            console.log("sender information after gettting peer connection " + senders);
            var params = senders[0].getParameters();
            if (audioCheck.checked) {
                if (audioTrackClone) {
                    senders[0].replaceTrack(audioTrackClone);
                    audioTrackClone = undefined;
                } else {
                    try {
                        targetPublisher.unmuteAudio();
                        params.encodings[0].active = true;
                        senders[0].setParameters(params);
                    } catch (e) {
                        // no browser support, let's use mute API.
                        targetPublisher.unmuteAudio();
                    }
                }
            } else {
                try {
                    targetPublisher.muteAudio();
                    params.encodings[0].active = false;
                    senders[0].setParameters(params);
                } catch (e) {
                    // no browser support, let's use mute API.
                    targetPublisher.muteAudio();
                }
            }
        }
    }

    function updateMutedVideoOnPublisher() {
        if (targetPublisher && isPublishing) {
            if (videoCheck.checked) {
                if (videoTrackClone) {
                    var c = targetPublisher.getPeerConnection();
                    var senders = c.getSenders();
                    senders[1].replaceTrack(videoTrackClone);
                    videoTrackClone = undefined;
                } else {
                    targetPublisher.unmuteVideo();
                }
            } else {
                targetPublisher.muteVideo();
            }
        }!videoCheck.checked && showVideoPoster();
        videoCheck.checked && hideVideoPoster();
    }

    var audioTrackClone;
    var videoTrackClone;

    function updateInitialMediaOnPublisher() {
        var t = setTimeout(function() {
            // If we have requested no audio and/or no video in our initial broadcast,
            // wipe the track from the connection.
            var audioTrack = targetPublisher.getMediaStream().getAudioTracks()[0];
            var videoTrack = targetPublisher.getMediaStream().getVideoTracks()[0];
            var connection = targetPublisher.getPeerConnection();
            console.log("inside update initial media publisher");
            console.log("audio track ::" + audioTrack);
            console.log("video track ::" + videoTrack);
            console.log("connection" + connection)
            if (!videoCheck.checked) {
                videoTrackClone = videoTrack.clone();
                connection.getSenders()[1].replaceTrack(null);
            }
            if (!audioCheck.checked) {
                audioTrackClone = audioTrack.clone();
                connection.getSenders()[0].replaceTrack(null);
            }
            clearTimeout(t);
        }, 2000);
        // a bit of a hack. had to put a timeout to ensure the video track bits at least started flowing :/
    }

    function showVideoPoster() {
        publisherVideo.classList.add('hidden');
    }

    function hideVideoPoster() {
        publisherVideo.classList.remove('hidden');
    }

    // function getSocketLocationFromProtocol () {
    //   return {protocol: 'ws', port: 5080};
    // }

    function onPublisherEvent(event) {
        console.log('[Red5ProPublisher] ' + event.type + '.');
        if (event.type === 'WebSocket.Message.Unhandled') {
            console.log(event);
        } else if (event.type === red5prosdk.RTCPublisherEventTypes.MEDIA_STREAM_AVAILABLE) {
            window.allowMediaStreamSwap(targetPublisher, targetPublisher.getOptions().mediaConstraints, document.getElementById('red5pro-publisher'));

        }
        // updateStatusFromEvent(event);
    }

    function onPublishFail(message) {
        isPublishing = false;
        console.error('[Red5ProPublisher] Publish Error :: ' + message);
    }

    function onPublishSuccess(publisher) {
        isPublishing = true;
        window.red5propublisher = publisher;
        console.log('[Red5ProPublisher] Publish Complete.');
        // console.log(publisher.getType());
        // [NOTE] Moving SO setup until Package Sent amount is sufficient.
        //  establishSharedObject(publisher, roomField.value, streamNameField.value);
        if (publisher.getType().toUpperCase() == 'RTC') {
            // It's flash, let it go.
            // console.log("inside socket")
            // establishSocketHost(publisher, roomField.value, streamNameField.value);
            console.log("inside firebase connectivity")
            establishFirebaseConnection(publisher, roomField.value, streamNameField.value)
        }
        try {
            var pc = publisher.getPeerConnection();
            console.log(pc);
        } catch (e) {
            // no tracking for you!
        }
    }

    function onUnpublishFail(message) {
        isPublishing = false;
        console.error('[Red5ProPublisher] Unpublish Error :: ' + message);
    }

    function onUnpublishSuccess() {
        isPublishing = false;
        console.log('[Red5ProPublisher] Unpublish Complete.');
    }


    function getUserMediaConfiguration() {
        return {
            mediaConstraints: {
                audio: configuration.useAudio ? configuration.mediaConstraints.audio : false,
                video: configuration.useVideo ? configuration.mediaConstraints.video : false
            }
        };
    }

    function setPublishingUI(streamName) {
        publisherNameField.innerText = streamName;
        roomField.setAttribute('disabled', true);
        publisherSession.classList.remove('hidden');
        publisherNameField.classList.remove('hidden');
        publisherMuteControls.classList.remove('hidden');
        Array.prototype.forEach.call(document.getElementsByClassName('remove-on-broadcast'), function(el) {
            // console.log(el);
            el.classList.add('hidden');
        });
    }


    function updatePublishingUIOnStreamCount(streamCount) {

        if (streamCount > 0) {
            publisherContainer.classList.remove('margin-center');
        } else {
            publisherContainer.classList.add('margin-center');
        }

    }
    //adding firebase functionality
    // var previousStateStreamsList;
    // var updatedStreamList = new Array();

    let streamKey
    var streamList = new Array();
    var finalStreamList = new Array();
    var tempStreamList = new Array();
    var strfinalStreamList = new Array();
    var strtempStreamList = new Array();

    function establishFirebaseConnection(publisher, roomName, streamName) {
        //first time when user joins
        firebase.database().ref(roomName + "-room_name/streamID").push().set({
            "streamID": streamName,
        });

        firebase.database().ref(roomName + "-room_name/streamID").on("value", function(snapshot) {
            tempStreamList = new Array();
            snapshot.forEach((data) => {
                tempStreamList.push(data.val())
            });

            console.log(finalStreamList); //old updated list of stream
            strfinalStreamList = new Array()
            for (let i = 0; i < finalStreamList.length; i++) {
                strfinalStreamList[i] = finalStreamList[i].streamID;
            }
            console.log(strfinalStreamList) //string version
            if (finalStreamList.length >= tempStreamList.length) {
                const results = finalStreamList.filter(({ streamID: id1 }) => !tempStreamList.some(({ streamID: id2 }) => id2 === id1));
                console.log(results);
                console.log(results[0].streamID + "User-[Left]") //user-left worked
                var element = document.getElementById("red5pro-subscriber-" + results[0].streamID + "-container");
                console.log(element);
                element.parentNode.removeChild(element);
            }

            finalStreamList = tempStreamList;
            strtempStreamList = new Array()
            for (let i = 0; i < finalStreamList.length; i++) {
                strtempStreamList[i] = finalStreamList[i].streamID;
            }
            //console.log(finalStreamList) //new updated list of stream //worked for whenever someone leaves
            console.log(strtempStreamList) //string version //this need to be passed
            processStreams(strtempStreamList, streamName);
        });

        firebase.database().ref(roomName + "-room_name/streamID").on("child_added", function(snapshot) {
            console.log("Addition");
            snapshot.forEach((data) => {
                streamList.push(data.val())
            });

            if (streamList[streamList.length - 1]) {
                console.log(streamList[streamList.length - 1] + "User-[Joined]") //joined-worked
            }
        });

        firebase.database().ref(roomName + "-room_name/streamID").on("child_removed", function(snapshot) {
            console.log("deletion");
            console.log(snapshot.val() + "-removed")
        })


        firebase.database().ref(roomName + "-room_name/streamID").orderByChild("streamID").equalTo(streamName).on("child_added", function(snapshot) {
            streamKey = snapshot.key
            console.log(snapshot.key);
        });
        async function closeIt() {
            var element = document.getElementById(window.getConferenceSubscriberElementId(streamKey.streamID) + "-container");
            element.parentNode.removeChild(element);
            await firebase.database().ref(roomName + "-room_name/streamID").child(streamKey).remove();
        }
        window.onbeforeunload = closeIt;


        // firebase.database().ref(roomName + "-room_name/streamID").on("value", function(snapshot) {
        //     tempStreamList = new Array();
        //     snapshot.forEach((data) => {
        //         tempStreamList.push(data.val())
        //     });

        //     console.log(finalStreamList); //old updated list of stream

        //     if (finalStreamList.length > tempStreamList.length) {
        //         const results = finalStreamList.filter(({ streamID: id1 }) => !tempStreamList.some(({ streamID: id2 }) => id2 === id1));
        //         console.log(results);
        //         console.log(results[0].streamID + "User-[Left]") //user-left worked
        //         var element = document.getElementById(window.getConferenceSubscriberElementId(results[0].streamID) + "-container");
        //         element.parentNode.removeChild(element);
        //     }

        //     finalStreamList = tempStreamList;
        //     console.log(finalStreamList) //new updated list of stream //worked for whenever someone leaves
        //     processStreams(finalStreamList, streamList[streamList.length - 1]);
        // });

    }
    // async function closeIt() {
    //     var element = document.getElementById(window.getConferenceSubscriberElementId(streamKey.streamID) + "-container");
    //     element.parentNode.removeChild(element);
    //     await firebase.database().ref(roomName + "-room_name/streamID").child(streamKey).remove();
    // }
    // window.onbeforeunload = closeIt;


    //ending firebase functionality

    // function establishSocketHost(publisher, roomName, streamName) {
    //     console.log(hostSocket);
    //     if (hostSocket) return
    //     var wsProtocol = 'ws'
    //     var url = wsProtocol + "://" + socketEndpoint + "?room=" + roomName + "&streamName=" + streamName;
    //     var url = "ws://localhost:8001/?room=" + roomName + "&streamName=" + streamName;
    //     console.log(url);
    //     hostSocket = new WebSocket(url);
    //     console.log(hostSocket);

    //     //when any user leaves
    //     hostSocket.onmessage = function(message) {
    //         console.log(message)
    //         var payload = JSON.parse(message.data)
    //         console.log("payload")
    //         console.log(payload);
    //         console.log(streamsList.length, payload.streams.length);
    //         //when any user left the meet, print the user name and remove from html template
    //         if ((roomName === payload.room) && streamsList.length >= payload.streams.length) {
    //             //some elements are removed
    //             var array1 = streamsList;
    //             var array2 = payload.streams;
    //             var array3 = array1.filter(function(obj) { return array2.indexOf(obj) == -1; });
    //             console.log(array3 + ":: student left");
    //             var element = document.getElementById(window.getConferenceSubscriberElementId(array3) + "-container");
    //             element.parentNode.removeChild(element);
    //         }

    //         if (roomName === payload.room) {
    //             streamsList = payload.streams
    //             console.log(streamsList, streamName);
    //             console.log(streamName + ":: student joined[published]");
    //             processStreams(streamsList, streamName);
    //         }
    //     }
    // }
    // console.log("Streamlist");
    // console.log(streamsList);



    function determinePublisher() {

        var config = Object.assign({},
            configuration, {
                streamMode: 'live'
            },
            // getAuthenticationParams(),
            getUserMediaConfiguration());

        var rtcConfig = Object.assign({}, config, {
            // protocol: "wss",
            // port: 443,
            protocol: 'ws',
            port: 5080,
            bandwidth: {
                video: 256
            },
            mediaConstraints: {
                audio: true,
                video: {
                    width: {
                        exact: 320
                    },
                    height: {
                        exact: 240
                    },
                    frameRate: {
                        exact: 15
                    }
                }
            },
            streamName: streamName
        });

        var publisher = new red5prosdk.RTCPublisher();
        return publisher.init(rtcConfig);

    }

    function unpublish() {
        if (hostSocket !== undefined) {
            hostSocket.close()
        }
        return new Promise(function(resolve, reject) {
            var publisher = targetPublisher;
            publisher.unpublish()
                .then(function() {
                    onUnpublishSuccess();
                    resolve();
                })
                .catch(function(error) {
                    var jsonError = typeof error === 'string' ? error : JSON.stringify(error, 2, null);
                    onUnpublishFail('Unmount Error ' + jsonError);
                    reject(error);
                });
        });
    }









    function doPublish(name) {
        console.log("targetPublisher");
        console.log(targetPublisher);
        targetPublisher.publish(name)
            .then(function() {
                onPublishSuccess(targetPublisher);
                updateInitialMediaOnPublisher();
                // establishSharedObject(targetPublisher, roomField.value, streamNameField.value);
            })
            .catch(function(error) {
                var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
                console.error('[Red5ProPublisher] :: Error in publishing - ' + jsonError);
                console.error(error);
                onPublishFail(jsonError);
            });
    }

    // Kick off.
    determinePublisher()
        .then(function(publisherImpl) {
            targetPublisher = publisherImpl;
            targetPublisher.on('*', onPublisherEvent);
            return targetPublisher.preview();
        })
        .catch(function(error) {
            var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
            console.error('[Red5ProPublisher] :: Error in publishing - ' + jsonError);
            console.error(error);
            onPublishFail(jsonError);
        });

    var shuttingDown = false;

    function shutdown() {
        console.log("i am leaving");
        // var element = document.getElementById(window.getConferenceSubscriberElementId(streamKey.streamID) + "-container");
        // element.parentNode.removeChild(element);
        firebase.database().ref(roomName + "-room_name/streamID").child(streamKey).remove();
        if (shuttingDown) return;
        shuttingDown = true;

        function clearRefs() {
            if (targetPublisher) {
                targetPublisher.off('*', onPublisherEvent);
            }
            targetPublisher = undefined;
        }
        unpublish().then(clearRefs).catch(clearRefs);
        // window.untrackBitrate(bitrateTrackingTicket);
    }
    window.addEventListener('beforeunload', shutdown);
    window.addEventListener('pagehide', shutdown);

    var streamsList = [];
    var subscribersEl = document.getElementById('subscribers');

    function processStreams(streamlist, exclusion) {
        var nonPublishers = streamlist.filter(function(name) {
            return name !== exclusion;
        });
        var list = nonPublishers.filter(function(name, index, self) {
            // console.log("working or not");
            // console.log(document.getElementById(window.getConferenceSubscriberElementId(name)));
            return (index == self.indexOf(name)) &&
                !document.getElementById(window.getConferenceSubscriberElementId(name));
        });
        var subscribers = list.map(function(name, index) {
            console.log("subscriber function is called")
            return new window.ConferenceSubscriberItem(name, subscribersEl, index);
        });
        var i, length = subscribers.length - 1;
        var sub;
        for (i = 0; i < length; i++) {
            sub = subscribers[i];
            sub.next = subscribers[sub.index + 1];
        }
        if (subscribers.length > 0) {
            var baseSubscriberConfig = Object.assign({},
                configuration, {
                    // protocol: "wss",
                    // port: 443
                    protocol: 'ws',
                    port: 5080
                },
                // getAuthenticationParams(),
                getUserMediaConfiguration());
            subscribers[0].execute(baseSubscriberConfig);

        }

        updatePublishingUIOnStreamCount(nonPublishers.length);
    }

})(this, document, window.red5prosdk);