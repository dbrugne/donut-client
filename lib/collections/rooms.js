var _ = require('underscore');
var Backbone = require('backbone');
var RoomModel = require('../models/room');

module.exports = Backbone.Collection.extend({
  initialize: function (models, options) {
    this.app = options.app;

    this.listenTo(this.app.client, 'room:in', this.onIn);
    this.listenTo(this.app.client, 'room:out', this.onOut);
    this.listenTo(this.app.client, 'room:topic', this.onTopic);
    this.listenTo(this.app.client, 'room:message', this.onMessage);
    this.listenTo(this.app.client, 'room:op', this.onOp);
    this.listenTo(this.app.client, 'room:deop', this.onDeop);
    this.listenTo(this.app.client, 'room:updated', this.onUpdated);
    this.listenTo(this.app.client, 'user:online', this.onUserOnline);
    this.listenTo(this.app.client, 'user:offline', this.onUserOffline);
    this.listenTo(this.app.client, 'room:deban', this.onDeban);
    this.listenTo(this.app.client, 'room:voice', this.onVoice);
    this.listenTo(this.app.client, 'room:devoice', this.onDevoice);
    this.listenTo(this.app.client, 'room:join', this.onJoin);
    this.listenTo(this.app.client, 'room:leave', this.onLeave);
    this.listenTo(this.app.client, 'room:leave:block', this.onLeaveBlock);
    this.listenTo(this.app.client, 'room:viewed', this.onViewed);
    this.listenTo(this.app.client, 'room:set:private', this.onSetPrivate);
    this.listenTo(this.app.client, 'room:message:spam', this.onMessageSpam);
    this.listenTo(this.app.client, 'room:message:unspam', this.onMessageUnspam);
    this.listenTo(this.app.client, 'room:message:edit', this.onMessageEdited);
    this.listenTo(this.app.client, 'room:typing', this.onTyping);
    this.listenTo(this.app.client, 'room:set:private', this.onChangeMode);

    this.listenTo(this.app.client, 'room:kick', this.onKick);
    this.listenTo(this.app.client, 'room:ban', this.onBan);
    this.listenTo(this.app.client, 'room:disallow', this.onDisallow);
    this.listenTo(this.app.client, 'room:groupban', this.onGroupBan);
    this.listenTo(this.app.client, 'room:blocked', this.onBlocked);
    this.listenTo(this.app.client, 'room:unblocked', this.onUnblocked);
  },
  comparator: function (a, b) {
    var aGroup = a.get('group_name') || '';
    var bGroup = b.get('group_name') || '';

    var aName = a.get('name') || '';
    var bName = b.get('name') || '';

    aName = aName.toLocaleLowerCase();
    bName = bName.toLocaleLowerCase();

    if (!aGroup && bGroup) {
      return 1;
    } else if (aGroup && !bGroup) {
      return -1;
    } else if (!aGroup && !bGroup) {
      if (!a.get('last') && !b.get('last')) {
        return (aName > bName) ? 1 : -1;
      }

      if (a.get('last') > b.get('last')) {
        return -1;
      } else {
        return 1;
      }
    }

    aGroup = aGroup.toLocaleLowerCase();
    bGroup = bGroup.toLocaleLowerCase();
    if (aGroup === bGroup) {
      if (!a.get('last') && !b.get('last')) {
        return (aName > bName) ? 1 : -1;
      }

      if (a.get('last') > b.get('last')) {
        return -1;
      } else {
        return 1;
      }
    }
    if (aGroup < bGroup) {
      return -1;
    } else {
      return 1;
    }
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
  getByGroup: function (group_id) {
    return this.findWhere({group_id: group_id});
  },
  getByNameAndGroup: function (name, group) {
    if (!group) {
      var models = this.where({name: name});
      return _.find(models, function (m) {
        return (typeof m.get('group_name') === 'undefined');
      });
    } else {
      return this.findWhere({name: name, group_name: group});
    }
  },
  onWelcome: function (data) {
    _.each(data.rooms, _.bind(function (room) {
      this.addModel(room);
    }, this));

    // destroy model leaved from last disconnection
    var modelsIds = _.map(this.models, 'id');
    var ids = _.map(data.rooms, 'id');
    _.each(modelsIds, _.bind(function (modelId) {
      if (ids.indexOf(modelId) === -1) {
        var model = this.get(modelId);
        if (model) {
          model.unbindUsers();
          this.remove(model);
          this.app.trigger('discussionRemoved', model);
        }
      }
    }, this));

    this.app.trigger('redrawNavigationGroups');
    this.app.trigger('redrawNavigationRooms');
  },
  onJoin: function (data) {
    // server ask to client to open this room in IHM
    this.addModel(data);
    this._redrawNavigation(this.get(data.room_id));
  },
  addModel: function (data) {
    data.id = data.room_id;
    data.last = (data.last_event_at)
      ? new Date(data.last_event_at).getTime()
      : '';
    delete data.last_event_at; // only needed on welcome, then will be maintained in realtime

    data.identifier = (data.group_id)
      ? '#' + data.group_name + '/' + data.name
      : '#' + data.name;

    data.uri = data.identifier;

    // update model
    var isNew = (!this.get(data.room_id));
    var model;
    if (!isNew) {
      // already exist in IHM (maybe reconnecting)
      model = this.get(data.room_id);
      model.set(data);
    } else {
      // add in IHM (by mainView)
      model = new RoomModel(data, {app: this.app});
      this.add(model);
    }

    // if room is part of a group that is not already added to group collection, add it !
    if (data.group_id && (!this.app.groups || !_.find(this.app.groups.models, function(group){ return group.group_id === data.group_id }))) {
      this.app.groups.addModel({
        group_id: data.group_id,
        name: data.group_name,
      });
    }

    this.app.trigger('discussionAdded', model);
    return model;
  },
  onIn: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onIn(data);
  },
  onOut: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onOut(data);
  },
  onTopic: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onTopic(data);
  },
  onMessage: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onMessage(data);
  },
  onOp: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onOp(data);
  },
  onDeop: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onDeop(data);
  },
  onUpdated: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onUpdated(data);
  },
  onUserOnline: function (data) {
    var model;
    _.each(data.rooms_id, _.bind(function (roomId) {
      if ((model = this.get(roomId))) {
        if (model.users) {
          model.users.onUserOnline(data);
        }
      }
    }, this));
  },
  onUserOffline: function (data) {
    var model;
    _.each(data.rooms_id, _.bind(function (roomId) {
      if ((model = this.get(roomId))) {
        if (model.users) {
          model.users.onUserOffline(data);
        }
      }
    }, this));
  },
  onBlocked: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.set({
      blocked: true,
      blocked_why: data.why,
      blocked_reason: data.reason
    });
    this.app.trigger('redrawNavigationRooms');
  },
  onUnblocked: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.set({
      blocked: false,
      blocked_why: null,
      blocked_reason: null
    });
    this.app.trigger('redrawNavigationRooms');
  },
  onKick: function (data) {
    this._onExpulsion('kick', data);
  },
  onBan: function (data) {
    this._onExpulsion('ban', data);
  },
  onDisallow: function (data) {
    this._onExpulsion('disallow', data);
  },
  onGroupBan: function (data) {
    this._onExpulsion('groupban', data);
  },
  _onExpulsion: function (what, data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }
    if (this.app.user.get('user_id') === data.user_id) {
      return;
    }
    if (!model.users) {
      return;
    }

    model.users.onExpulsion(what, data);
  },
  onDeban: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    if (model.users) {
      model.users.onDeban(data);
    }
  },
  onVoice: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onVoice(data);
  },
  onDevoice: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onDevoice(data);
  },
  onLeave: function (data) {
    // server asks to this client to leave this room
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    var roomWasFocused = model.get('focused');
    var groupId = model.get('group_id');
    var roomId = model.get('id');
    var roomName = model.get('name');

    this.remove(model);
    this.app.trigger('discussionRemoved', model);
    this._redrawNavigation(model);

    if (data.reason && data.reason === 'deleted') {
      this.trigger('deleted', {
        name: roomName,
        was_focused: roomWasFocused,
        group_id: groupId,
        room_id: roomId
      });
    }
  },
  onLeaveBlock: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    this.remove(model);
    this.app.trigger('discussionRemoved', model);
    this._redrawNavigation(model);
  },
  onViewed: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onViewed(data);
  },
  onSetPrivate: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('setPrivate', data);
  },
  onMessageSpam: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('messageSpam', data);
  },
  onMessageUnspam: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('messageUnspam', data);
  },
  onMessageEdited: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('messageEdit', data);
  },
  onTyping: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('typing', data);
  },
  /**
   * Redraw navigation-rooms or groups depending of model attributes
   *
   * @param model
   * @returns {*}
   * @private
   */
  _redrawNavigation: function (model) {
    if (model.get('group_id')) {
      return this.app.trigger('redrawNavigationGroups');
    }

    this.app.trigger('redrawNavigationRooms');
  },
  onChangeMode: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onChangeMode(data);
  }
});
