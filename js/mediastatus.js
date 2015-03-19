var cast = window.cast || {};

(function () {
  'use strict';
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
    'LOCAL': 0,
    'CHROMECAST': 1,
    'CASTCONTROLLER': 2
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

    /**
     * Whether to update the URL or not when media changes
     *
     * @type {boolean}
     */
    this.setUrl = false;
  }

  MediaStatus.prototype = {
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
    addToQueue: function(media) {
      var mediaInfo = new chrome.cast.media.MediaInfo(media.url);

      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
      mediaInfo.contentType = 'video/mp4';

      mediaInfo.metadata.title = media.title;
      mediaInfo.metadata.images = [{'url': media.thumbnailImageUrl}];

      var queueItem = new chrome.cast.media.QueueItem(mediaInfo);

      var queueEvent = new CustomEvent('core-signal',
          {
            'detail': {
              'name': 'media-action',
              'data': {
                'action': 'queue',
                'queueItem': queueItem
              }
            }
          }
      );

      document.dispatchEvent(queueEvent);
    },
    setCastMedia: function(media) {
      this.castMedia = media;
      //If the media doesn't match and nothing is playing, load casting media into local media
      //TODO(pying): revisit this to see if it's necessary
      if (!this.isMediaMatch() && this.localMedia.state == cast.Media.STATE.STOP
          && media.metadata != null) {
        var metadata = media.metadata;
        var localMedia = new cast.Media({
          'title': metadata.title,
          'url': media.contentId,
          'thumbnailImageUrl': metadata.images[0].url
        });
        localMedia.duration = media.duration;
        this.localMedia = localMedia;
      }
    },
    setLocalMedia: function(media) {
      this.localMedia = media;
      this.localMedia.state = cast.Media.STATE.PAUSE;
      //TODO(pying): set the URL hash so reload functions properly
      //Todo(pying):sync player when local video content matches chromecast
    },
    getVideoNameFromHashUrl: function() {

    },
    hasCastMedia: function() {
      return (Object.keys(this.castMedia).length > 0);
    },
    /**
     * Returns true if the current local media matches cast media or if no Castmedia is loaded
     *
     * @returns {boolean}
     */
    isMediaMatch: function() {
      return (this.castMedia.media == null
      || this.localMedia.url == this.castMedia.media.contentId);
    }
  };
  cast.MediaStatus = MediaStatus;
})();
