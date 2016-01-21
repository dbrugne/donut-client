var _ = require('underscore');
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: function ()  {
    return {
      badge: 0,
      unviewedDiscussion: 0,
      unviewedNotification: 0
    };
  },
  initialize: function (data, options) {
    this.app = options.app;

    this.listenTo(this.app.client, 'user:updated', this.onUpdated);
    this.listenTo(this.app.client, 'preferences:update', this.setPreference);
    this.listenTo(this.app.client, 'user:confirmed', this.setConfirmed);

    this.listenTo(this.app.client, 'notification:new',    this.updateBadgeState);
    this.listenTo(this.app.client, 'notification:done',   this.updateBadgeState);
    this.listenTo(this.app.client, 'notification:viewed', this.updateBadgeState);

    // listen for client statuses (should be done only by client and view??)
    var statuses = {
      connecting: 'connecting',
      connect: 'online',
      disconnect: 'offline',
      reconnect: 'online',
      reconnect_attempt: 'connecting',
      reconnecting: 'connecting',
      reconnect_error: 'connecting',
      reconnect_failed: 'error',
      error: 'error'
    };
    _.each(statuses, _.bind(function (element, key) {
      this.listenTo(this.app.client, key, _.bind(function () {
        this.set('status', element);
      }, this));
    }, this));
  },

  onWelcome: function (data) {
    this.set(data.user);
    this.setPreferences(data.preferences);
    this.updateBadgeState(data.notifications);
    this.app.trigger('currentUserReady');
  },

  onUpdated: function (data) {
    if (data.user_id !== this.get('user_id')) {
      return;
    }
    _.each(data.data, _.bind(function (value, key, list) {
      this.set(key, value);
    }, this));
  },
  setPreference: function (data, options) {
    options = options || {};

    var keys = Object.keys(data);
    if (!keys || !keys.length) {
      return;
    }

    var key = keys[ 0 ];
    if (!key) {
      return;
    }

    var preferences = this.get('preferences') || {};
    preferences[ key ] = data[ key ];
    this.set('preferences', preferences, options);
  },
  setPreferences: function (preferences, options) {
    options = options || {};

    if (!preferences) {
      return;
    }

    var newPreferences = {}; // reset all previous keys
    _.each(preferences, function (value, key, list) {
      newPreferences[ key ] = value;
    });

    this.set('preferences', newPreferences, options);
  },
  setConfirmed: function () {
    this.set('confirmed', true);
  },
  discussionMode: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:sound equal to true, we play
    if (!preferences || typeof preferences[ 'chatmode:compact' ] === 'undefined') {
      return false;
    }

    return (preferences[ 'chatmode:compact' ] === true);
  },
  shouldDisplayExitPopin: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:exitpopin equal to true, we show
    return (!preferences || typeof preferences[ 'browser:exitpopin' ] === 'undefined' || preferences[ 'browser:exitpopin' ] === true);
  },
  shouldDisplayWelcome: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:welcome equal to true, we show
    return (!preferences || typeof preferences[ 'browser:welcome' ] === 'undefined' || preferences[ 'browser:welcome' ] === true);
  },
  shouldPlaySound: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:sound equal to true, we play
    return (!preferences || typeof preferences[ 'browser:sounds' ] === 'undefined' || preferences[ 'browser:sounds' ] === true);
  },
  shouldDisplayDesktopNotif: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:sound equal to true, we play
    if (!preferences || typeof preferences[ 'notif:channels:desktop' ] === 'undefined') {
      return false;
    }

    return (preferences[ 'notif:channels:desktop' ] === true);
  },
  isAdmin: function () {
    return (this.get('admin') === true);
  },
  isConfirmed: function () {
    return (this.get('confirmed') === true);
  },
  updateBadgeState: function(event) {
    this.set('badge', event.badge || 0);
    this.set('unviewedDiscussion', event.unviewed_discussion || 0);
    this.set('unviewedNotification', event.unviewed_notification || 0);
  }
});
