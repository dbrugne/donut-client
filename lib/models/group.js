var Backbone = require('backbone');
var _ = require('underscore');

module.exports = Backbone.Model.extend({
  defaults: function () {
    return {
      type: 'group',
      focused: false
    };
  },
  initialize: function (data, options) {
    this.app = options.app;
  },
  onUpdated: function (data) {
    var that = this;
    _.each(data.data, function (value, key, list) {
      that.set(key, value);
    });
  },
  currentUserIsOwner: function () {
    if (!this.get('owner_id')) {
      return false;
    }
    return (this.get('owner_id') === this.app.user.get('user_id'));
  },
  currentUserIsOp: function () {
    return !!_.find(this.get('members'), _.bind(function (item) {
      return (item.user_id === this.app.user.get('user_id') && item.is_op === true);
    }, this));
  },
  currentUserIsAdmin: function () {
    return this.app.user.isAdmin();
  },
  currentUserIsMember: function () {
    return !!_.find(this.get('members'), _.bind(function (member) {
      if (this.app.user.get('user_id') === member.user_id) {
        return true; // found
      }
    }, this));
  },
  onOp: function (data) {
    _.find(this.get('members'), function (item) {
      if (item.user_id === data.user_id) {
        item.is_op = true;
        return true;
      }
    });

    this.onRefresh();
  },
  onDeop: function (data) {
    // user.get('is_op')
    _.find(this.get('members'), function (item) {
      if (item.user_id === data.user_id) {
        item.is_op = false;
        return true;
      }
    });

    this.onRefresh();
  },
  onDeleteRoom: function (roomId) {
    var rooms = _.reject(this.get('rooms'), function (r) {
      return (r.id === roomId);
    });
    this.set('rooms', rooms);

    this.onRefresh();
  },
  onRefresh: function () {
    this.app.client.groupRead(this.get('group_id'), { users: true, rooms: true }, _.bind(function (response) {
      if (!response.err) {
        this.set(response);
        this.set('rooms', response.rooms);
        this.trigger('redraw');
      }
    }, this));
  }
});
