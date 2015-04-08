var cast = window.cast || {};

/**
 * MediaStatus is used as the glue for all of polymer elements.  It stores the current state of the
 * app and has some utility functions.
 *
 * It leverages core signals for to fire pubsub events.  Also many elements observe it's elements.
 */
(function () {
  'use strict';
  //load core signal if it isn't already included for pubsub events
  var loadCoreSignal = function () {
    var coreSignalImport = document.createElement('link');
    coreSignalImport.setAttribute('rel', 'import');
    coreSignalImport.setAttribute('href', 'bower_components/core-signals/core-signals.html');
    document.body.appendChild(coreSignalImport);
  };

  if (document.readyState === "complete") {
    loadCoreSignal();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      loadCoreSignal();
    });
  }

  /**
   * Defines the sender of the request
   *
   * @type {{LOCAL: number, CHROMECAST: number}}
   */
  MediaStatus.SENDER = {
    'LOCAL': 0, //local video
    'CHROMECAST': 1, //chromecast events ie. for multiple senders
    'CASTCONTROLLER': 2 //cast controller bar
  };

  /**
   * Class to glue together video player UI
   *
   * MediaData is expected in the format of
   * @param media
   * @constructor
   */
  function MediaStatus(media) {

    /**
     * Local media object reference
     *
     * @type {cast.Media}
     */
    this.localMedia = media;

    /**
     * Chromecast media object reference
     *
     * @type {chrome.cast.media.Media}
     */
    this.castMedia = {};

    /**
     * Chromecast session object reference
     *
     * @type {chrome.cast.Session}
     */
    this.session = {};

    /**
     * Tracks whether cast is connected
     * @type {boolean}
     */
    this.isCasting = false;

    this.showSpinner = false;
  }

  MediaStatus.prototype = {
    /**
     * Fire a play core signals event
     *
     * @param sender {MediaStatus.SENDER}
     */
    play: function (sender) {
      var playEvent = new CustomEvent('core-signal',
          {
            'detail': {
              'name': 'media-action',
              'data': {
                'action': 'play',
                'sender': sender
              }
            }
          });
      document.dispatchEvent(playEvent);
    },
    /**
     * Fire a pause core signals event
     *
     * @param sender {MediaStatus.SENDER}
     */
    pause: function (sender) {
      var pauseEvent = new CustomEvent('core-signal',
          {
            'detail': {
              'name': 'media-action',
              'data': {
                'action': 'pause',
                'sender': sender
              }
            }
          });
      document.dispatchEvent(pauseEvent);
    },
    /**
     * Fire a seek core signals event
     *
     * @param time {number} time in seconds to seek to
     * @param sender {MediaStatus.SENDER}
     */
    seek: function (time, sender) {
      //Fire a core-signal event
      var seekEvent = new CustomEvent('core-signal',
          {
            'detail': {
              'name': 'media-action',
              'data': {
                'action': 'seek',
                'currentTime': time,
                'sender': sender
              }
            }
          });
      document.dispatchEvent(seekEvent);
    },
    volume: function(sender, volume) {
      var volumeEvent = new CustomEvent('core-signal',
          {
            'detail': {
              'name': 'media-action',
              'data': {
                'action': 'volume',
                'volume': volume,
                'sender': sender
              }
            }
          });
      document.dispatchEvent(volumeEvent);
    },
    fullScreen: function() {
      var fullscreenEvent = new CustomEvent('core-signal',
          {
            'detail': {
              'name': 'media-action',
              'data': {
                'action': 'fullscreen'
              }
            }
          });
      document.dispatchEvent(fullscreenEvent);
    },
    exitFullScreen: function() {
      var fullscreenEvent = new CustomEvent('core-signal',
          {
            'detail': {
              'name': 'media-action',
              'data': {
                'action': 'exitFullscreen'
              }
            }
          });
      document.dispatchEvent(fullscreenEvent);
    },
    /**
     * Stores a reference to the cast media element
     *
     * @param media
     */
    setCastMedia: function(media) {
      this.castMedia = media;
    },
    /**
     * Sets the local media
     *
     * @param media
     */
    setLocalMedia: function(media) {
      this.localMedia = media;
      this.localMedia.state = cast.Media.STATE.PAUSE;
      //if the current local media and cast media match and no other items are queued
      //let the main player bar control everything
      if (this.isMediaMatch()
          && this.hasCastMedia()) {
        //set a time out to let the video load through observers before seeking and playing.
        window.setTimeout(function(){
          if (this.castMedia.currentTime != 0) {
            this.seek(this.castMedia.currentTime, MediaStatus.SENDER.CHROMECAST);
          }
          if (this.castMedia.playerState == chrome.cast.media.PlayerState.PLAYING) {
            this.play(MediaStatus.SENDER.CHROMECAST);
          }
        }.bind(this), 200);
      }
    },
    /**
     * Returns true if cast currently has media loaded
     *
     * @returns {boolean}
     */
    hasCastMedia: function() {
      return (Object.keys(this.castMedia).length > 0
        && this.castMedia.playerState !== chrome.cast.media.PlayerState.IDLE);
    },
    /**
     * Returns true if the current local media matches cast media or if the cast media isn't loaded
     *
     * @returns {boolean}
     */
    isMediaMatch: function() {
      return (this.castMedia.media == null
      || this.localMedia.url == this.castMedia.media.contentId);
    },
    hasCastSession:function() {
      return (Object.keys(this.session).length > 0
      && this.session.state == chrome.cast.SessionStatus.CONNECTED);
    }
  };
  cast.MediaStatus = MediaStatus;
})();
