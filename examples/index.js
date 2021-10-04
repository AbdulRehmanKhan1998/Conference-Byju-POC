
(function(window, document, red5prosdk) {
  'use strict';

  console.log(red5prosdk); //debug
  var isPublishing = false;
  const configuration = {
    protocol: "ws",
    port: 5080,
    host: "localhost",
    // protocol: "wss",
    // port: 443,
    // host: "red5stream.searceinc.org",
    app: "live",
    rtcConfiguration: {
        iceServers: [{urls: "stun:stun2.l.google.com:19302"}],
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
  var roomName = document.getElementById('room-field').value ;
  // var roomName = 'red5pro'; // eslint-disable-line no-unused-vars
  // var streamName =document.getElementById('streamname-field').value || 
  var streamName = ['publisher', Math.floor(Math.random() * 0x10000).toString(16)].join('-');
  var socketEndpoint = 'localhost:8001'

  var roomField = document.getElementById('room-field');
  // eslint-disable-next-line no-unused-vars
  // var publisherContainer = document.getElementById('publisher-container');
  var publisherMuteControls = document.getElementById('publisher-mute-controls');
  var publisherSession = document.getElementById('publisher-session');
  var publisherNameField = document.getElementById('publisher-name-field');
  var streamNameField = document.getElementById('streamname-field');
  var publisherVideo = document.getElementById('red5pro-publisher');
  var audioCheck = document.getElementById('audio-check');
  var videoCheck = document.getElementById('video-check');
  var joinButton = document.getElementById('join-button');
  var statisticsField = document.getElementById('statistics-field');
  // var bitrateField = document.getElementById('bitrate-field');
  // var packetsField = document.getElementById('packets-field');
  // var resolutionField = document.getElementById('resolution-field');
  // var bitrateTrackingTicket;
  // var bitrate = 0;
  // var packetsSent = 0;
  // var frameWidth = 0;
  // var frameHeight = 0;

  // function updateStatistics (b, p, w, h) {
  //   statisticsField.classList.remove('hidden');
  //   bitrateField.innerText = b === 0 ? 'N/A' : Math.floor(b);
  //   packetsField.innerText = p;
  //   resolutionField.innerText = (w || 0) + 'x' + (h || 0);
  // }

  // function onBitrateUpdate (b, p) {
  //   bitrate = b;
  //   packetsSent = p;
  //   updateStatistics(bitrate, packetsSent, frameWidth, frameHeight);
  //   if (packetsSent > 100) {
  //     establishSocketHost(targetPublisher, roomField.value, streamNameField.value);
  //   }
  // }

  // function onResolutionUpdate (w, h) {
  //   frameWidth = w;
  //   frameHeight = h;
  //   updateStatistics(bitrate, packetsSent, frameWidth, frameHeight);
  // }

  roomField.value = roomName;
  streamNameField.value = streamName;
  audioCheck.checked = true;
  videoCheck.checked = true;

  joinButton.addEventListener('click', function () {
    saveSettings();
    doPublish(streamName);
    console.log("run")
    setPublishingUI(streamName);
  });

  audioCheck.addEventListener('change', updateMutedAudioOnPublisher);
  videoCheck.addEventListener('change', updateMutedVideoOnPublisher);

  // var protocol = 'ws';
  // var isSecure = protocol == 'https';

  function saveSettings () {
    streamName = streamNameField.value;
    roomName = roomField.value;
  }

  function updateMutedAudioOnPublisher () {
    console.log("under : updateMutedAudioOnPublisher "+targetPublisher);
    if (targetPublisher && isPublishing) {
      var c = targetPublisher.getPeerConnection();
      console.log("after target publisher gets peer connection "+c);
      var senders = c.getSenders();
      console.log("sender information after gettting peer connection "+senders );
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

  function updateMutedVideoOnPublisher () {
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
    }
    !videoCheck.checked && showVideoPoster();
    videoCheck.checked && hideVideoPoster();
  }

  var audioTrackClone;
  var videoTrackClone;
  function updateInitialMediaOnPublisher () {
    var t = setTimeout(function () {
      // If we have requested no audio and/or no video in our initial broadcast,
      // wipe the track from the connection.
      var audioTrack = targetPublisher.getMediaStream().getAudioTracks()[0];
      var videoTrack = targetPublisher.getMediaStream().getVideoTracks()[0];
      var connection = targetPublisher.getPeerConnection();
      console.log("inside update initial media publisher");
      console.log("audio track ::"+audioTrack);
      console.log("video track ::"+videoTrack);
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

  function showVideoPoster () {
    publisherVideo.classList.add('hidden');
  }

  function hideVideoPoster () {
    publisherVideo.classList.remove('hidden');
  }

  // function getSocketLocationFromProtocol () {
  //   return {protocol: 'ws', port: 5080};
  // }

  function onPublisherEvent (event) {
    console.log('[Red5ProPublisher] ' + event.type + '.');
    if (event.type === 'WebSocket.Message.Unhandled') {
      console.log(event);
    } else if (event.type === red5prosdk.RTCPublisherEventTypes.MEDIA_STREAM_AVAILABLE) {
    window.allowMediaStreamSwap(targetPublisher, targetPublisher.getOptions().mediaConstraints, document.getElementById('red5pro-publisher'));
      
    }
    // updateStatusFromEvent(event);
  }
  function onPublishFail (message) {
    isPublishing = false;
    console.error('[Red5ProPublisher] Publish Error :: ' + message);
  }
  function onPublishSuccess (publisher) {
    isPublishing = true;
    window.red5propublisher = publisher;
    console.log('[Red5ProPublisher] Publish Complete.');
    // console.log(publisher.getType());
    // [NOTE] Moving SO setup until Package Sent amount is sufficient.
    //    establishSharedObject(publisher, roomField.value, streamNameField.value);
    if (publisher.getType().toUpperCase() == 'RTC') {
      // It's flash, let it go.
      console.log("inside socket")
      establishSocketHost(publisher, roomField.value, streamNameField.value);
    }
    try {
      var pc = publisher.getPeerConnection();
      console.log(peer);
      var stream = publisher.getMediaStream();
      bitrateTrackingTicket = window.trackBitrate(pc, onBitrateUpdate, null, null, true);
      statisticsField.classList.remove('hidden');
      // stream.getVideoTracks().forEach(function (track) {
      //   // var settings = track.getSettings();
      //   // onResolutionUpdate(settings.width, settings.height);
      // });
    }
    catch (e) {
      // no tracking for you!
    }
  }
  function onUnpublishFail (message) {
    isPublishing = false;
    console.error('[Red5ProPublisher] Unpublish Error :: ' + message);
  }
  function onUnpublishSuccess () {
    isPublishing = false;
    console.log('[Red5ProPublisher] Unpublish Complete.');
  }

  // function getAuthenticationParams () {
  //   var auth = configuration.authentication;
  //   return auth && auth.enabled
  //     ? {
  //       connectionParams: {
  //         username: auth.username,
  //         password: auth.password
  //       }
  //     }
  //     : {};
  // }

  function getUserMediaConfiguration () {
    return {
      mediaConstraints: {
        audio: configuration.useAudio ? configuration.mediaConstraints.audio : false,
        video: configuration.useVideo ? configuration.mediaConstraints.video : false
      }
    };
  }

  function setPublishingUI (streamName) {
    publisherNameField.innerText = streamName;
    roomField.setAttribute('disabled', true);
    publisherSession.classList.remove('hidden');
    publisherNameField.classList.remove('hidden');
    publisherMuteControls.classList.remove('hidden');
    Array.prototype.forEach.call(document.getElementsByClassName('remove-on-broadcast'), function (el) {
      el.classList.add('hidden');
    });
  }

  // eslint-disable-next-line no-unused-vars
  // function updatePublishingUIOnStreamCount (streamCount) {
  //   /*
  //   if (streamCount > 0) {
  //     publisherContainer.classList.remove('margin-center');
  //   } else {
  //     publisherContainer.classList.add('margin-center');
  //   }
  //   */
  // }

  function establishSocketHost (publisher, roomName, streamName) {
    // console.log(hostSocket);
    if (hostSocket) return
    var wsProtocol = 'ws'
    var url=wsProtocol+"://"+socketEndpoint+"?room="+roomName+"&streamName="+streamName;
    console.log(url);
    hostSocket = new WebSocket(url);
    console.log(hostSocket);
    //when any user leaves
    hostSocket.onmessage = function (message) {
      var payload = JSON.parse(message.data)
      console.log("payload")
      console.log(payload);
      if (roomName === payload.room) {
        streamsList = payload.streams
        console.log(streamsList,streamName);
        processStreams(streamsList, streamName);
      }
    }
  }
  console.log("Streamlist");
  console.log(streamsList);
  function determinePublisher () {

    var config = Object.assign({},
                      configuration,
                      {
                        streamMode: 'live'
                      },
                      // getAuthenticationParams(),
                      getUserMediaConfiguration());

    var rtcConfig = Object.assign({}, config, {
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

  function doPublish (name) {
    console.log(targetPublisher);
    targetPublisher.publish(name)
      .then(function () {
        onPublishSuccess(targetPublisher);
        updateInitialMediaOnPublisher();
      })
      .catch(function (error) {
        var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
        console.error('[Red5ProPublisher] :: Error in publishing - ' + jsonError);
        console.error(error);
        onPublishFail(jsonError);
       });
  }

  function unpublish () {
    if (hostSocket !== undefined)  {
      hostSocket.close()
    }
    return new Promise(function (resolve, reject) {
      var publisher = targetPublisher;
      publisher.unpublish()
        .then(function () {
          onUnpublishSuccess();
          resolve();
        })
        .catch(function (error) {
          var jsonError = typeof error === 'string' ? error : JSON.stringify(error, 2, null);
          onUnpublishFail('Unmount Error ' + jsonError);
          reject(error);
        });
    });
  }

  // Kick off.
  determinePublisher()
    .then(function (publisherImpl) {
      targetPublisher = publisherImpl;
      targetPublisher.on('*', onPublisherEvent);
      return targetPublisher.preview();
    })
    .catch(function (error) {
      var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
      console.error('[Red5ProPublisher] :: Error in publishing - ' + jsonError);
      console.error(error);
      onPublishFail(jsonError);
     });

  var shuttingDown = false;
  function shutdown () {
    if (shuttingDown) return;
    shuttingDown = true;
    function clearRefs () {
      if (targetPublisher) {
        targetPublisher.off('*', onPublisherEvent);
      }
      targetPublisher = undefined;
    }
    unpublish().then(clearRefs).catch(clearRefs);
    window.untrackBitrate(bitrateTrackingTicket);
  }
  window.addEventListener('beforeunload', shutdown);
  window.addEventListener('pagehide', shutdown);

  var streamsList = [];
  var subscribersEl = document.getElementById('subscribers');
  function processStreams (streamlist, exclusion) {
    var nonPublishers = streamlist.filter(function (name) {
      return name !== exclusion;
    });
    var list = nonPublishers.filter(function (name, index, self) {
      return (index == self.indexOf(name)) &&
        !document.getElementById(window.getConferenceSubscriberElementId(name));
    });
    var subscribers = list.map(function (name, index) {
      console.log("subscriber function is called")
      return new window.ConferenceSubscriberItem(name, subscribersEl, index);
    });
    var i, length = subscribers.length - 1;
    var sub;
    for(i = 0; i < length; i++) {
      sub = subscribers[i];
      sub.next = subscribers[sub.index+1];
    }
    if (subscribers.length > 0) {
      var baseSubscriberConfig = Object.assign({},
                                  configuration,
                                  {
                                    protocol: 'ws',
                                    port: 5080
                                  },
                                  // getAuthenticationParams(),
                                  getUserMediaConfiguration());
      subscribers[0].execute(baseSubscriberConfig);
    }

    // updatePublishingUIOnStreamCount(nonPublishers.length);
  }

})(this, document, window.red5prosdk);
