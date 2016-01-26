var _ = require('underscore');
var Backbone = require('backbone');
var OneModel = require('../models/one');

module.exports = Backbone.Collection.extend({
  initialize: function (models, options) {
    this.app = options.app;

    this.listenTo(this.app.client, 'user:message', this.onMessage);
    this.listenTo(this.app.client, 'user:updated', this.onUpdated);
    this.listenTo(this.app.client, 'user:online', this.onUserOnline);
    this.listenTo(this.app.client, 'user:offline', this.onUserOffline);
    this.listenTo(this.app.client, 'user:join', this.onJoin);
    this.listenTo(this.app.client, 'user:leave', this.onLeave);
    this.listenTo(this.app.client, 'user:viewed', this.onViewed);
    this.listenTo(this.app.client, 'user:ban', this.onBan);
    this.listenTo(this.app.client, 'user:deban', this.onDeban);
    this.listenTo(this.app.client, 'user:message:edit', this.onMessageEdited);
    this.listenTo(this.app.client, 'user:typing', this.onTyping);

    // @todo : trigger always, and not on last
    this.on('change:last', this.onLastChange);
  },
  onLastChange: function () {
    this.sort();
    this.app.trigger('redrawNavigationOnes');
  },
  comparator: function (a, b) {
    var aName = a.get('username') || '';
    var bName = b.get('username') || '';

    aName = aName.toLocaleLowerCase();
    bName = bName.toLocaleLowerCase();

    if (!a.get('last') && !b.get('last')) {
      return (aName > bName) ? 1 : -1;
    }

    if (a.get('last') > b.get('last')) {
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
  onWelcome: function (data) {
    _.each(data.onetoones, _.bind(function (one) {
      this.addModel(one);
    }, this));

    // destroy model leaved from last disconnection
    var modelsIds = _.map(this.models, 'id');
    var ids = _.map(data.onetoones, 'user_id');
    _.each(modelsIds, _.bind(function (modelId) {
      if (ids.indexOf(modelId) === -1) {
        var model = this.get(modelId);
        if (model) {
          this.remove(model);
          this.app.trigger('discussionRemoved', model);
        }
      }
    }, this));
  },
  onJoin: function (data) {
    // server ask to client to open this one to one in IHM
    this.addModel(data);
    this.app.trigger('redrawNavigationOnes');
  },
  addModel: function (data) {
    data.last = (data.last_event_at)
      ? new Date(data.last_event_at).getTime()
      : '';
    delete data.last_event_at; // only needed on welcome, then will be maintained in realtime

    data.identifier = '@' + data.username;

    data.uri = '#u/' + data.username;

    var isNew = (this.get(data.user_id) === undefined);
    var model;
    if (!isNew) {
      // already exist in IHM (maybe reconnecting)
      model = this.get(data.user_id);
      model.set(data);
    } else {
      // add in IHM (by mainView)
      data.id = data.user_id;
      data.key = this._key(data.user_id, this.app.user.get('user_id'));
      model = new OneModel(data, {app: this.app});
      this.add(model);
    }

    this.app.trigger('discussionAdded', model);
    return model;
  },
  getModelFromEvent: function (event, autoCreate) {
    var key = this._key(event.user_id, event.to_user_id);

    // already opened?
    var model = this.findWhere({key: key});
    if (!model && !autoCreate) {
      return;
    }

    // create a new one
    if (!model) {
      // determine if i'm sender
      var iam = (this.app.user.get('user_id') === event.user_id);
      var withUser = {
        key: key,
        user_id: (iam) ? event.to_user_id : event.user_id,
        username: (iam) ? event.to_username : event.username,
        realname: (iam) ? event.to_realname : event.realname,
        avatar: (iam) ? event.to_avatar : event.avatar
      };

      if (!iam) {
        // if i received a message from this user he is online
        withUser.status = 'online';
      }

      model = this.addModel(withUser);
      this.app.trigger('redrawNavigationOnes');
      this.app.client.userRead(withUser.user_id, {more: true}, function (data) {
        if (!data.err) {
          model.set(data);
        }
      });
    }

    return model;
  },
  _key: function (c1, c2) {
    return (c1 < c2)
      ? c1 + '-' + c2
      : c2 + '-' + c1;
  },

  onLeave: function (data) {
    var model = this.get(data.user_id);
    if (!model) {
      return;
    }

    this.remove(model);
    this.app.trigger('discussionRemoved', model);
    this.app.trigger('redrawNavigationOnes');
  },
  onMessage: function (data) {
    var model = this.getModelFromEvent(data, true);
    _.defer(function () { // cause view will be really added only on next tick
      model.onMessage(data);
    });
  },
  onUpdated: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onUpdated(data);
  },
  onUserOnline: function (data) {
    var model = this.find(function (o) {
      return (o.get('user_id') === data.user_id);
    });
    if (!model) {
      return;
    }

    model.onUserOnline(data);
  },
  onUserOffline: function (data) {
    var model = this.find(function (o) {
      return (o.get('user_id') === data.user_id);
    });
    if (!model) {
      return;
    }

    model.onUserOffline(data);
  },
  onViewed: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onViewed(data);
  },
  onBan: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onBan(data);
  },
  onDeban: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onDeban(data);
  },
  onMessageEdited: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.trigger('messageEdit', data);
  },
  onTyping: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.trigger('typing', data);
  }
});
