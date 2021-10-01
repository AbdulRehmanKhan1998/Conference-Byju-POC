(function (window, document) {
    'use strict';

    var field = document.getElementById('status-field');
    var inFailedState = false;

    // Displays in status field based on events from subscriber instance.
    function updateStatusFromEvent (event, statusField) {
      // if (inFailedState) {
      //   return true;
      // }
      var wasInFailedState = inFailedState;

      statusField = typeof statusField !== 'undefined' ? statusField : field;
      var subTypes = window.red5prosdk.SubscriberEventTypes;
      var rtcTypes = window.red5prosdk.RTCSubscriberEventTypes;
      var status;
      var answer;
      var candidate;
      if (event.type === subTypes.SUBSCRIBE_METADATA) {
        return false;
      }
      switch (event.type) {
        case 'ERROR':
          inFailedState = true;
          status = ['ERROR', event.data].join(': ');
          break;
        case subTypes.CONNECTION_CLOSED:
          status = 'Connection closed.';
          window.untrackBitrate();
          inFailedState = false;
          break;
        case subTypes.CONNECT_SUCCESS:
          status = 'Connection established...';
          inFailedState = false;
          break;
        case subTypes.CONNECT_FAILURE:
          status = 'Error - Could not establish connection.';
          inFailedState = true;
          break;
        case subTypes.SUBSCRIBE_START:
          status = 'Started subscribing session.';
          inFailedState = false;
          break;
        case subTypes.SUBSCRIBE_FAIL:
          status = 'Error - Could not start a subscribing session.';
          inFailedState = true;
          break;
        case subTypes.SUBSCRIBE_INVALID_NAME:
          status = 'Error - Stream name not in use.';
          inFailedState = true;
          break;
        case rtcTypes.OFFER_START:
          status = 'Begin offer...';
          inFailedState = false;
          break;
        case rtcTypes.OFFER_END:
          status = 'Offer accepted...';
          inFailedState = false;
          break;
        case rtcTypes.ANSWER_START:
          status = 'Sending answer...';
          answer = JSON.stringify(event.data, null, 2);
          console.log('[SubscriberStatus] ' + event.type + ': ' + answer);
          inFailedState = false;
          break;
        case rtcTypes.ANSWER_END:
          status = 'Answer received...';
          inFailedState = false;
          break;
        case rtcTypes.CANDIDATE_START:
          status = 'Sending candidate...';
          candidate = JSON.stringify(event.data, null, 2);
          console.log('[SubscriberStatus] ' + event.type + ': ' + candidate);
          inFailedState = false;
          break;
        case rtcTypes.CANDIDATE_END:
          status = 'Candidate received...';
          inFailedState = false;
          break;
        case rtcTypes.ICE_TRICKLE_COMPLETE:
          status = 'Negotiation complete. Waiting Subscription Start...';
          inFailedState = false;
          break;
        default:
          inFailedState = false;
          break;
    }
    if(wasInFailedState && inFailedState){
      return true;
    }
    if (status && status.length > 0) {
      statusField.innerText = ['STATUS', status].join(': ');
    }
    return inFailedState;
  }

  function clearStatusEvent (statusField) {
    inFailedState = false
    statusField = typeof statusField !== 'undefined' ? statusField : field;
    statusField.innerText = ''
  }

  window.red5proHandleSubscriberEvent = updateStatusFromEvent;
  window.red5proClearSubscriberEvent = clearStatusEvent

})(this, document);