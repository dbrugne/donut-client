var _ = require('underscore');
var Backbone = require('backbone');
var GroupModel = require('../models/group');

module.exports = Backbone.Collection.extend({
  initialize: function (models, options) {
    this.app = options.app;

    this.listenTo(this.app.client, 'group:updated', this.onUpdated);
    this.listenTo(this.app.client, 'group:ban', this.onGroupBan);
    this.listenTo(this.app.client, 'group:deban', this.onGroupDeban);
    this.listenTo(this.app.client, 'group:op', this.onOp);
    this.listenTo(this.app.client, 'group:deop', this.onDeop);
    this.listenTo(this.app.client, 'group:quit:membership', this.onGroupLeave);
    this.listenTo(this.app.client, 'group:leave', this.onGroupLeave);
    this.listenTo(this.app.client, 'group:refresh', this.onGroupResfresh);
  },
  iwhere: function (key, val) {
    var matches = this.filter(function (item) {
      val = val || '';
      var _val = item.get(key) || '';
      return _val.toLocaleLowerCase() === val.toLocaleLowerCase();
    });

    if (matches.length < 1) {
      return;
    }

    return matches[0];
  },
  getByName: function (name) {
    return this.findWhere({name: name});
  },
  onWelcome: function (data) {
    var redrawNavigation = !!(this.models.length);

    // remove all models
    this.each(_.bind(function (model) {
      this.app.trigger('discussionRemoved', model);
    }, this));
    this.reset();

    // add groups model
    _.each(data.groups, _.bind(function (group) {
      this.addModel(group);
    }, this));

    if (redrawNavigation) {
      this.app.trigger('redrawNavigationRooms');
    }
  },
  addModel: function (data) {
    data.id = data.group_id;
    data.identifier = '#' + data.name;

    // update model
    var isNew = (typeof this.get(data.group_id) === 'undefined');
    var model;
    if (!isNew) {
      // already exist in IHM (maybe reconnecting)
      model = this.get(data.group_id);
      model.set(data);
    } else {
      // add in IHM (by mainView)
      model = new GroupModel(data, {app: this.app});
      this.add(model);
    }

    return model;
  },
  onUpdated: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    model.onUpdated(data);
  },
  onGroupBan: function (data) {
    data.id = data.group_id;
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    if (this.app.user.get('user_id') !== data.user_id) {
      return;
    }

    model.onRefresh();
  },
  onGroupDeban: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }
    model.onRefresh();
  },
  onOp: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }
    model.onOp(data); // need to refresh group users list
  },
  onDeop: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    model.onDeop(data); // need to refresh group users list
  },
  onGroupLeave: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    if (data.reason === 'deleted' || data.reason === 'quit') {
      this.remove(model);
      this.app.trigger('discussionRemoved', model);
    } else {
      _.each(data.rooms_ids, function (room_id) {
        data.room_id = room_id;
        this.app.rooms.onLeave(data);
      })
      model.onRefresh();
    }

    this.app.trigger('redrawNavigationRooms');
  },
  onGroupResfresh: function (data) {
    var model;

    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }
    model.onRefresh();
  },
  isMember: function (groupId) {
    var model;
    if (!groupId || !(model = this.get(groupId))) {
      return false;
    }

    return (model.currentUserIsMember());
  }
});
