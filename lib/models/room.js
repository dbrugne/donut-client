var _ = require('underscore');
var Backbone = require('backbone');
var UsersCollection = require('../collections/room-users');

module.exports = Backbone.Model.extend({
  defaults: function () {
    return {
      op: [],
      devoices: [],
      type: 'room',
      focused: false,
      unviewed: false,
      blocked: false
    };
  },
  initialize: function (data, options) {
    this.app = options.app;

    if (!this.get('blocked')) {
      this.users = new UsersCollection(null, {
        app: this.app,
        parent: this
      });
    }
  },
  unbindUsers: function () {
    if (!this.get('blocked')) {
      this.users.stopListening();
    }
  },
  getIdentifier: function () {
    return this.get('name');
  },
  getUrl: function () {
    return window.location.protocol +
      '//' +
      window.location.host +
      '/r/' + (
        this.get('group_id')
        ? this.get('group_name') + '/' + this.get('name')
        : this.get('name')
      );
  },
  leave: function () {
    this.app.client.roomLeave(this.get('id'));
  },
  leaveBlocked: function () {
    this.app.client.roomLeaveBlock(this.get('id'));
  },
  currentUserIsOwner: function () {
    if (!this.get('owner_id')) {
      return false;
    }
    return (this.get('owner_id') === this.app.user.get('user_id'));
  },
  currentUserIsOp: function () {
    return (this.get('op') && this.get('op').indexOf(this.app.user.get('user_id')) !== -1);
  },
  currentUserIsAdmin: function () {
    return this.app.user.isAdmin();
  },
  onTopic: function (data) {
    this.set('topic', data.topic);
    this.app.trigger('newEvent', 'room:topic', data, this);
    this.trigger('freshEvent', 'room:topic', data);
  },
  onMessage: function (data) {
    this.app.trigger('newEvent', 'room:message', data, this);
    this.trigger('freshEvent', 'room:message', data);
  },
  onUpdated: function (data) {
    _.each(data.data, _.bind(function (value, key, list) {
      this.set(key, value);
    }, this));
  },
  history: function (id, direction, limit, callback) {
    this.app.client.roomHistory(this.get('room_id'), id, direction, limit, callback);
  },
  sendMessage: function (message, files) {
    this.app.client.roomMessage(this.get('id'), message, files);
  },
  markAsViewed: function () {
    this.app.client.roomViewed(this.get('room_id'));
  },
  onViewed: function (data) {
    if (this.get('unviewed') === true) {
      this.set('unviewed', false);
      this.set('first_unviewed', false);
      this.app.trigger('viewedEvent', this);
    }
  },
  isInputActive: function () {
    return !(this.users.isUserDevoiced(this.app.user.get('user_id')) ||
    (!this.app.user.isConfirmed() && this.get('mode') !== 'public'));
  }
});
