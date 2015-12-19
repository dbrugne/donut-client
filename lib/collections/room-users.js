var _ = require('underscore');
var Backbone = require('backbone');

module.exports = Backbone.Collection.extend({
  model: Backbone.Model.extend({
    onUpdated: function (data) {
      _.each(data.data, _.bind(function (value, key) {
        this.set(key, value);
      }, this));
    }
  }),
  initialize: function (models, options) {
    this.app = options.app;
    this.parent = options.parent;

    this.listenTo(this.app.client, 'user:updated', this.onChange);
  },
  comparator: function (model1, model2) {
    // create strings (sortable as string: aabfoobar)
    var string1 = '';
    string1 += (model1.get('status') === 'online')
      ? 'a'
      : 'b';
    string1 += (model1.get('is_owner'))
      ? 'a'
      : 'b';
    string1 += (model1.get('is_op'))
      ? 'a'
      : 'b';
    string1 += (model1.get('is_op') && model1.get('is_devoice'))
      ? 'a'
      : 'b';
    string1 += (model1.get('is_devoice'))
      ? 'a'
      : 'b';
    string1 += model1.get('username').toLowerCase();
    var string2 = '';
    string2 += (model2.get('status') === 'online')
      ? 'a'
      : 'b';
    string2 += (model2.get('is_owner'))
      ? 'a'
      : 'b';
    string2 += (model2.get('is_op'))
      ? 'a'
      : 'b';
    string2 += (model2.get('is_op') && model2.get('is_devoice'))
      ? 'a'
      : 'b';
    string2 += (model2.get('is_devoice'))
      ? 'a'
      : 'b';
    string2 += model2.get('username').toLowerCase();

    return string1.toLowerCase().localeCompare(string2.toLowerCase());
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

  /**
   * With the following method the UserCollection trigger a 'users-redraw'
   * event
   * any time a model has changed an attribute.
   * Usefull for 'redraw-pattern' views.
   *
   * @source: http://www.garethelms.org/2012/02/backbone-js-collections-can-listen-to-its-models-changes/
   */
  onChange: function (data) {
    var model = this.get(data.user_id);
    if (!model) {
      return;
    }

    model.onUpdated(data);
    this.sort(); // for 'status' attribute
    this.trigger('users-redraw');
  },

  addUser: function (data, sort) {
    sort = !!sort;

    // already in?
    var model = this.get(data.user_id);
    if (model) {
      // not sure this update is used in any case, but it's not expensive
      model.set('avatar', data.avatar);
      model.set('color', data.color);
      return model;
    }

    var is_owner = (this.parent.get('owner_id') && this.parent.get('owner_id') === data.user_id);
    var is_op = (this.parent.get('op') && this.parent.get('op').indexOf(data.user_id) !== -1);

    model = new this.model({
      id: data.user_id,
      user_id: data.user_id,
      username: data.username,
      avatar: data.avatar,
      color: data.color,
      is_owner: is_owner,
      is_op: is_op,
      is_devoice: this.isUserDevoiced(data.user_id) || data.isDevoiced,
      status: data.status
    });
    this.add(model, {sort: sort});
    return model;
  },
  fetchUsers: function (callback) {
    this.app.client.roomUsers(this.parent.get('room_id'), {
      type: 'users'
    }, _.bind(function (data) {
      this.reset();

      _.find(data.users, _.bind(function (user) {
        // false: avoid automatic sorting on each model .add()
        this.addUser(user, false);
      }, this));

      // sort after batch addition to collection to avoid performance issue
      this.sort();

      this.trigger('users-redraw');

      if (callback) {
        return callback();
      }
    }, this));
  },
  isUserDevoiced: function (userId) {
    return (this.parent.get('devoices') && this.parent.get('devoices').indexOf(userId) !== -1);
  },

  onIn: function (data) {
    data.status = 'online'; // only an online user can join a room

    this.addUser(data, true);
    this.parent.set('users_number', this.parent.get('users_number') + 1);
    this.trigger('users-redraw');

    this.app.trigger('newEvent', 'room:in', data, this.parent);
    this.parent.trigger('freshEvent', 'room:in', data);
  },
  onOut: function (data) {
    var user = this.get(data.user_id);
    if (!user) {
      // if user has more that one socket we receive n room:out
      return;
    }

    this.remove(user);
    this.parent.set('users_number', this.parent.get('users_number') - 1);
    this.trigger('users-redraw');

    this.parent.trigger('freshEvent', 'room:out', data);
  },
  onUserOnline: function (data) {
    this._onStatus('online', data);

    data.status = 'online';
    this.addUser(data, true);
    this.trigger('users-redraw');
  },
  onUserOffline: function (data) {
    this._onStatus('offline', data);
  },
  _onStatus: function (expect, data) {
    var model = this.get(data.user_id);
    if (!model) {
      return;
    }

    if (model.get('status') === expect) {
      return;
    }

    model.set({status: expect});

    this.parent.trigger('freshEvent', 'user:' + expect, data);
  },

  onOp: function (data) {
    // room.get('op')
    var ops = this.parent.get('op');
    ops.push(data.user_id);
    this.parent.set('op', ops);

    // user.get('is_op')
    var user = this.get(data.user_id);
    if (user) {
      user.set({is_op: true});
    }

    this.sort();
    this.trigger('users-redraw');
    this.parent.trigger('freshEvent', 'room:op', data);
  },
  onDeop: function (data) {
    // room.get('op')
    var ops = _.reject(this.parent.get('op'), function (opUserId) {
      return (opUserId === data.user_id);
    });
    this.parent.set('op', ops);

    // user.get('is_op')
    var user = this.get(data.user_id);
    if (user) {
      user.set({is_op: false});
    }

    this.sort();
    this.trigger('users-redraw');
    this.parent.trigger('freshEvent', 'room:deop', data);
  },
  onDeban: function (data) {
    this.parent.trigger('freshEvent', 'room:deban', data);
  },
  onVoice: function (data) {
    var user = this.get(data.user_id);
    if (user) {
      user.set({is_devoice: false});
    }

    var devoices = this.parent.get('devoices');
    if (devoices.length) {
      this.parent.set('devoices', _.reject(devoices, function (element) {
        return (element === data.user_id);
      }));
    }

    this.sort();
    this.trigger('users-redraw');
    this.parent.trigger('freshEvent', 'room:voice', data);

    if (this.app.user.get('user_id') === data.user_id) {
      this.parent.trigger('inputActive');
    }
  },
  onDevoice: function (data) {
    var user = this.get(data.user_id);
    if (user) {
      user.set({is_devoice: true});
    }

    var devoices = this.parent.get('devoices') || [];
    devoices.push(data.user_id);
    this.parent.set('devoices', devoices);

    this.sort();
    this.trigger('users-redraw');
    this.parent.trigger('freshEvent', 'room:devoice', data);

    if (this.app.user.get('user_id') === data.user_id) {
      this.parent.trigger('inputActive');
    }
  },

  onExpulsion: function (what, data) {
    // check that target is in model.users
    var user = this.get(data.user_id);
    if (!user) {
      return;
    }

    this.remove(user);
    this.parent.set('users_number', this.parent.get('users_number') - 1);

    // remove from this.op and this.devoices (all events except kick)
    if (what !== 'kick') {
      this.parent.set('op', _.reject(this.parent.get('op'), function (e) {
        return (e === data.user_id);
      }));
      this.parent.set('devoices', _.reject(this.parent.get('devoices'), function (e) {
        return (e === data.user_id);
      }));
    }

    this.sort();
    this.trigger('users-redraw');

    // trigger event
    this.parent.trigger('freshEvent', 'room:' + what, data);
  }
});
