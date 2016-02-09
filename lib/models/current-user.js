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

    this.listenTo(this.app.ones, 'change:unviewed',   this.onUnviewedChange);
    this.listenTo(this.app.rooms, 'change:unviewed', this.onUnviewedChange);

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
    this.trigger('preferences:' + key, data[ key ]);
  },
  setPreferences: function (preferences, options) {
    options = options || {};

    if (!preferences) {
      return;
    }

    var newPreferences = {}; // reset all previous keys
    _.each(preferences, _.bind(function (value, key, list) {
      var preference = {};
      preference[key] = value;
      this.setPreference(preference, options);
    }, this));
  },
  setConfirmed: function (data) {
    // now user is confirmed (at least one confirmation)
    if (this.get('confirmed') !== true) {
      this.set('confirmed', true);
    }

    if (data.now_is_member_of) {
      var group = this.app.groups.get(data.now_is_member_of);
      if (group) {
        group.onRefresh();
      }
    }
  },
  shouldDisplayExitPopin: function () {
    var preferences = this.get('preferences');
    return (preferences['browser:exitpopin'] === true);
  },
  isDiscussionCollapsed: function (discussionId) {
    var preferences = this.get('preferences');
    return (preferences['discussion:collapse:' + discussionId] === true);
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

    if (!preferences) {
      return false;
    }

    // desktop notification totally disabled (default: false)
    return !(preferences['notif:channels:desktop'] !== true);
  },
  shouldDisplayDesktopNotifRoom: function (roomId) {
    if (!this.shouldDisplayDesktopNotif()) {
      return false;
    }

    var preferences = this.get('preferences');
    if (!preferences) {
      return false;
    }

    // room:notif:nothing:__what__ (default: false)
    var nothing = preferences['room:notif:nothing:' + roomId];
    if (preferences['room:notif:nothing:' + roomId] === true) {
      return false;
    }

    // room:notif:roommessage:__what__ (default: false)
    if (preferences['room:notif:roommessage:' + roomId] !== true) {
      return false;
    }

    return true;
  },

  shouldDisplayDesktopNotifOne: function () {
    if (!this.shouldDisplayDesktopNotif()) {
      return false;
    }

    var preferences = this.get('preferences');
    if (!preferences) {
      return true;
    }

    // notif:usermessage (default: true)
    return (preferences['notif:usermessage'] !== false);
  },
  isAdmin: function () {
    return (this.get('admin') === true);
  },
  isConfirmed: function () {
    return (this.get('confirmed') === true);
  },
  updateBadgeState: function (event) {
    this.set('badge', event.badge || 0);
    this.set('unviewedDiscussion', event.unviewed_discussion || 0);
    this.set('unviewedNotification', event.unviewed_notification || 0);
  },
  onUnviewedChange: function (model, nowIsUnviewed) {
    var value = this.get('unviewedDiscussion');
    if (nowIsUnviewed) {
      value = value + 1;
    } else {
      value = (value > 1)
        ? value - 1
        : 0;
    }
    this.set('unviewedDiscussion', value);
    this.set('badge', this.get('unviewedDiscussion') + this.get('unviewedNotification'));
  }
});
