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
  onRefresh: function () {
    if (this.get('focused') !== true) {
      return;
    }

    this.app.client.groupRead(this.get('group_id'), { users: true, rooms: true }, _.bind(function (response) {
      if (!response.err) {
        this.set(response);
        this.set('rooms', response.rooms);
        this.trigger('redraw');
      }
    }, this));
  },
  getUrl: function () {
    return window.location.protocol +
      '//' +
      window.location.host +
      '/!#g/' + this.get('name')
  }
});
