var Backbone = require('backbone');
var _ = require('underscore');

module.exports = Backbone.Model.extend({
  defaults: function () {
    return {
      type: 'onetoone',
      focused: false,
      banned: false,
      i_am_banned: false,
      unviewed: false
    };
  },
  initialize: function (data, options) {
    this.app = options.app;
  },
  getIdentifier: function () {
    return this.get('username');
  },
  getUrl: function () {
    return window.location.protocol +
      '//' +
      window.location.host +
      '/u/' + this.get('username');
  },
  leave: function () {
    this.app.client.userLeave(this.get('user_id'));
  },
  handleNewIncomingEvent: function (data) {
    // maintain dynamically unviewed state of discussion
    // badge, only if sender !== current user
    if (this.get('unviewed') !== true && this.app.user.get('user_id') !== data.user_id) {
      this.set('unviewed', true);
      this.set('first_unviewed', data.id);
    }

    this.set('last', Date.now()); // @important: after unviewed set
  },
  onMessage: function (data) {
    this.handleNewIncomingEvent(data);
    this.app.trigger('newEvent', 'user:message', data, this);
    this.trigger('freshEvent', 'user:message', data);
  },
  onUserOnline: function (data) {
    this._onStatus('online', data);
  },
  onUserOffline: function (data) {
    this._onStatus('offline', data);
  },
  _onStatus: function (expect, data) {
    if (this.get('status') === expect) {
      return;
    }

    this.set({
      status: expect,
      onlined: new Date().toISOString()
    });
  },
  onUpdated: function (data) {
    this.set(data.data);
    if (_.has(data.data, 'avatar')) {
      this.app.trigger('redrawNavigationOnes');
    }
  },
  onBan: function (data) {
    if (data.user_id === this.app.user.get('user_id')) {
      // i banned the other user
      this.set('banned', true);
    } else {
      // i'm the banned user
      this.set('i_am_banned', true);
      this.trigger('inputActive');
    }

    // add event to discussion
    this.trigger('freshEvent', 'user:ban', data);
  },
  onDeban: function (data) {
    if (data.user_id === this.app.user.get('user_id')) {
      // i banned the other user
      this.set('banned', false);
    } else {
      // i'm the debanned user
      this.set('i_am_banned', false);
      this.trigger('inputActive');
    }

    // add event to discussion
    this.trigger('freshEvent', 'user:deban', data);
  },
  history: function (id, direction, limit, callback) {
    this.app.client.userHistory(this.get('user_id'), id, direction, limit, callback);
  },
  markAsViewed: function () {
    this.app.client.userViewed(this.get('user_id'));
  },
  sendMessage: function (message, files, callback) {
    this.app.client.userMessage(this.get('user_id'), message, files, null, callback);
  },
  onViewed: function (data) {
    if (this.get('unviewed') === true) {
      this.set('unviewed', false);
      this.set('first_unviewed', false);
    }
  },
  isInputActive: function () {
    return !(this.get('i_am_banned') === true || !this.app.user.isConfirmed());
  }
});
