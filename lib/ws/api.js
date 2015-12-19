var _ = require('underscore');
var Backbone = require('backbone');
var Pomelo = require('./pomelo');

var api = _.extend({}, Backbone.Events);

module.exports = function (options) {
  api.pomelo = Pomelo(options);
  api.options = options;

  // pushed event from server
  api.pomelo.on('all', function (name, data) {
    api.options.debug('ws:' + name, data);
    api.trigger(name, data);
  });

  return api;
};

// connection methods
api.connect = function (host, port) {
  this.pomelo.connect(host, port);
};
api.disconnect = function () {
  this.pomelo.disconnect();
};
api.isConnected = function () {
  return this.pomelo.isConnected();
};

// helpers
api.pomeloRequest = function (route, data, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
    data = {};
  }
  if (!_.isFunction(callback)) {
    callback = _.noop;
  }
  var _route = route.split('.');
  var prefix = _route[1].replace('Handler', '');
  this.options.debug('ws:request:' + prefix, data);
  this.pomelo.request(
    route,
    data,
    _.bind(function (response) {
      if (response.err) {
        this.options.debug('ws:response:' + prefix + ':error', response);
      } else {
        this.options.debug('ws:response:' + prefix, response);
      }
      return callback(response);
    }, this)
  );
};

// GLOBAL
// ======================================================

api.home = function (callback) {
  this.pomeloRequest('chat.homeHandler.call', callback);
};
api.search = function (search, options, callback) {
  var data = {
    search: search, // string to search for
    options: options
  };
  this.pomeloRequest('chat.searchHandler.call', data, callback);
};
api.ping = function (callback) {
  var start = Date.now();
  this.pomeloRequest('chat.pingHandler.call', _.bind(function () {
    var duration = Date.now() - start;
    return callback(duration);
  }, this));
};

// GROUP
// ======================================================

api.groupId = function (identifier, callback) {
  var data = {identifier: identifier};
  this.pomeloRequest('chat.groupIdHandler.call', data, callback);
};
api.groupRead = function (groupId, what, callback) {
  if (!groupId) {
    return;
  }
  var data = {
    group_id: groupId
  };
  if (what) {
    data.what = what;
  }

  this.pomeloRequest('chat.groupReadHandler.call', data, callback);
};
api.groupRequest = function (groupId, message, callback) {
  var data = {group_id: groupId};
  if (message) {
    data.message = message;
  }
  this.pomeloRequest('chat.groupRequestHandler.request', data, callback);
};
api.groupLeave = function (groupId, callback) {
  var data = {group_id: groupId};
  this.pomeloRequest('chat.groupLeaveHandler.call', data, callback);
};
api.groupRequestAccept = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupRequestHandler.accept', data, callback);
};
api.groupRequestRefuse = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupRequestHandler.refuse', data, callback);
};
api.groupAllowedAdd = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupAllowedHandler.add', data, callback);
};
api.groupAllowedRemove = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupAllowedHandler.remove', data, callback);
};
api.groupBan = function (groupId, userId, reason, callback) {
  var data = {group_id: groupId, user_id: userId};
  if (reason) {
    data.reason = reason;
  }
  this.pomeloRequest('chat.groupBanHandler.call', data, callback);
};
api.groupDeban = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupDebanHandler.call', data, callback);
};
api.groupUsers = function (groupId, attributes, callback) {
  var data = {group_id: groupId, attributes: attributes};
  this.pomeloRequest('chat.groupUsersHandler.call', data, callback);
};
api.groupCreate = function (groupName, callback) {
  var data = { group_name: groupName };
  this.pomeloRequest('chat.groupCreateHandler.call', data, callback);
};
api.groupUpdate = function (groupId, fields, callback) {
  var data = {group_id: groupId, data: fields};
  this.pomeloRequest('chat.groupUpdateHandler.call', data, callback);
};
api.groupDelete = function (groupId, callback) {
  var data = {group_id: groupId};
  this.pomeloRequest('chat.groupDeleteHandler.call', data, callback);
};
api.groupJoin = function (groupId, password, callback) {
  var data = {group_id: groupId, password: password};
  this.pomeloRequest('chat.groupJoinHandler.call', data, callback);
};
api.groupOp = function (roomId, userId, callback) {
  var data = {group_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }
  this.pomeloRequest('chat.groupOpHandler.call', data, callback);
};
api.groupDeop = function (roomId, userId, callback) {
  var data = {group_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }
  this.pomeloRequest('chat.groupDeopHandler.call', data, callback);
};
api.groupDomains = function (groupId, domain, method, callback) {
  var data = {group_id: groupId, domain: domain, method: method};
  this.pomeloRequest('chat.groupMailDomainsHandler.call', data, callback);
};

// ROOM
// ======================================================

api.roomId = function (identifier, callback) {
  var data = {identifier: identifier};
  this.pomeloRequest('chat.roomIdHandler.call', data, callback);
};
api.roomJoin = function (roomId, password, callback) {
  var data = {};
  if (roomId) {
    data.room_id = roomId;
  } else {
    return;
  }

  if (password || password === '') {
    data.password = password;
  }

  this.pomeloRequest('chat.roomJoinHandler.call', data, callback);
};
api.roomLeave = function (roomId) {
  var data = {room_id: roomId};
  this.options.debug('io:out:room:leave', data);
  this.pomelo.notify('chat.roomLeaveHandler.call', data);
};
api.roomLeaveBlock = function (roomId) {
  var data = {room_id: roomId};
  this.options.debug('io:out:room:leave:block', data);
  this.pomelo.notify('chat.roomLeaveBlockHandler.call', data);
};
api.roomMessage = function (roomId, message, files, special, callback) {
  var data = {
    room_id: roomId,
    message: message,
    files: files,
    special: special
  };
  this.pomeloRequest('chat.roomMessageHandler.call', data, callback);
};
api.roomMessageEdit = function (roomId, messageId, message, callback) {
  var data = {room_id: roomId, event: messageId, message: message};
  this.pomeloRequest('chat.roomMessageEditHandler.call', data, callback);
};
api.roomTopic = function (roomId, topic, callback) {
  var data = {room_id: roomId, topic: topic};
  this.pomeloRequest('chat.roomTopicHandler.call', data, callback);
};
api.roomRead = function (roomId, what, callback) {
  if (!roomId) {
    return;
  }

  var data = {
    room_id: roomId
  };
  if (what) {
    data.what = what;
  }

  this.pomeloRequest('chat.roomReadHandler.call', data, callback);
};
api.roomUsers = function (roomId, attributes, callback) {
  var data = {room_id: roomId, attributes: attributes};
  this.pomeloRequest('chat.roomUsersHandler.call', data, callback);
};
api.roomUpdate = function (roomId, fields, callback) {
  var data = {room_id: roomId, data: fields};
  this.pomeloRequest('chat.roomUpdateHandler.call', data, callback);
};
api.roomCreate = function (name, mode, password, groupId, callback) {
  var data = {
    room_name: name,
    mode: mode,
    password: password
  };
  if (groupId) {
    data.group_id = groupId;
  }

  this.pomeloRequest('chat.roomCreateHandler.call', data, callback);
};
api.roomDelete = function (roomId, callback) {
  var data = {room_id: roomId};
  this.pomeloRequest('chat.roomDeleteHandler.call', data, callback);
};
api.roomOp = function (roomId, userId, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.roomOpHandler.call', data, callback);
};
api.roomDeop = function (roomId, userId, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.roomDeopHandler.call', data, callback);
};
api.roomVoice = function (roomId, userId, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.roomVoiceHandler.call', data, callback);
};
api.roomDevoice = function (roomId, userId, reason, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }
  if (reason) {
    data.reason = reason;
  }
  this.pomeloRequest('chat.roomDevoiceHandler.call', data, callback);
};
api.roomKick = function (roomId, userId, reason, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }
  if (reason) {
    data.reason = reason;
  }

  this.pomeloRequest('chat.roomKickHandler.call', data, callback);
};
api.roomBan = function (roomId, userId, reason, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }
  if (reason) {
    data.reason = reason;
  }

  this.pomeloRequest('chat.roomBanHandler.call', data, callback);
};
api.roomDeban = function (roomId, userId, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.roomDebanHandler.call', data, callback);
};
api.roomViewed = function (roomId) {
  var data = {room_id: roomId};
  this.options.debug('io:out:room:viewed', data);
  this.pomelo.notify('chat.roomViewedHandler.call', data);
};
api.roomMessageSpam = function (roomId, messageId, callback) {
  var data = {room_id: roomId, event: messageId};
  this.pomeloRequest('chat.roomMessageSpamHandler.call', data, callback);
};
api.roomMessageUnspam = function (roomId, messageId, callback) {
  var data = {room_id: roomId, event: messageId};
  this.pomeloRequest('chat.roomMessageUnspamHandler.call', data, callback);
};
api.roomTyping = function (roomId) {
  var data = {room_id: roomId};
  this.options.debug('io:out:room:typing', data);
  this.pomelo.notify('chat.roomTypingHandler.call', data);
};
api.roomJoinRequest = function (roomId, message, callback) {
  var data = {room_id: roomId};
  if (message) {
    data.message = message;
  }

  this.pomeloRequest('chat.roomJoinRequestHandler.call', data, callback);
};
api.roomAllow = function (roomId, userId, callback) {
  var data = {room_id: roomId, user_id: userId};
  this.pomeloRequest('chat.roomAllowHandler.call', data, callback);
};
api.roomRefuse = function (roomId, userId, callback) {
  var data = {room_id: roomId, user_id: userId};
  this.pomeloRequest('chat.roomAllowHandler.refuse', data, callback);
};
api.roomDisallow = function (roomId, userId, callback) {
  var data = {room_id: roomId, user_id: userId};
  this.pomeloRequest('chat.roomDisallowHandler.call', data, callback);
};
api.roomSetPrivate = function (roomId, callback) {
  var data = {room_id: roomId};
  this.pomeloRequest('chat.roomSetPrivateHandler.call', data, callback);
};

// ONETOONE
// ======================================================

api.userId = function (username, callback) {
  var data = {username: username};
  this.pomeloRequest('chat.userIdHandler.call', data, callback);
};
api.userJoin = function (userId, callback) {
  var data = {user_id: userId};
  this.pomeloRequest('chat.userJoinHandler.call', data, callback);
};
api.userLeave = function (userId) {
  var data = {user_id: userId};
  this.options.debug('io:out:user:leave', data);
  this.pomelo.notify('chat.userLeaveHandler.call', data);
};
api.userBan = function (userId, callback) {
  var data;
  if (userId) {
    data = {user_id: userId};
  } else {
    return;
  }

  this.pomeloRequest('chat.userBanHandler.call', data, callback);
};
api.userDeban = function (userId, callback) {
  var data;
  if (userId) {
    data = {user_id: userId};
  } else {
    return;
  }

  this.pomeloRequest('chat.userDebanHandler.call', data, callback);
};
api.userMessage = function (userId, message, files, special, callback) {
  var data = {
    message: message,
    files: files
  };
  if (special) {
    data.special = special;
  }
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.userMessageHandler.call', data, callback);
};
api.userMessageEdit = function (userId, messageId, message, callback) {
  var data = {user_id: userId, event: messageId, message: message};
  this.pomeloRequest('chat.userMessageEditHandler.call', data, callback);
};
api.userRead = function (userId, what, callback) {
  if (!userId) {
    return;
  }

  var data = { user_id: userId };
  if (what) {
    data.what = what;
  }

  this.pomeloRequest('chat.userReadHandler.call', data, callback);
};
api.userUpdate = function (fields, callback) {
  var data = {data: fields};
  this.pomeloRequest('chat.userUpdateHandler.call', data, callback);
};
api.userViewed = function (userId) {
  var data = {user_id: userId};
  this.options.debug('io:out:user:viewed', data);
  this.pomelo.notify('chat.userViewedHandler.call', data);
};
api.userTyping = function (userId) {
  var data = {user_id: userId};
  this.options.debug('io:out:user:typing', data);
  this.pomelo.notify('chat.userTypingHandler.call', data);
};

// HISTORY
// ======================================================

api.roomHistory = function (roomId, start, end, limit, callback) {
  this._history({
    room_id: roomId,
    start: start,
    end: end,
    limit: limit
  }, callback);
};
api.userHistory = function (userId, start, end, limit, callback) {
  this._history({
    user_id: userId,
    start: start,
    end: end,
    limit: limit
  }, callback);
};
api._history = function (data, callback) {
  this.pomeloRequest('history.historyHandler.call', data, callback);
};

// PREFERENCES
// ======================================================

api.userPreferencesRead = function (roomId, callback) {
  var data = (roomId)
    ? {room_id: roomId}
    : {};
  this.pomeloRequest('chat.preferencesReadHandler.call', data, callback);
};
api.userPreferencesUpdate = function (fields, callback) {
  var data = {data: fields};
  this.pomeloRequest('chat.preferencesUpdateHandler.call', data, callback);
};
api.accountEmail = function (email, method, callback) {
  var data = {email: email, method: method};
  this.pomeloRequest('chat.accountEmailHandler.call', data, callback);
};
api.accountPassword = function (newPassword, currentPassword, callback) {
  var data = {password: newPassword, current_password: currentPassword};
  this.pomeloRequest('chat.accountPasswordHandler.call', data, callback);
};

// NOTIFICATION
// ======================================================

api.notificationRead = function (viewed, time, number, callback) {
  var data = {viewed: viewed, time: time, number: number};
  this.pomeloRequest('chat.notificationReadHandler.call', data, callback);
};
api.notificationViewed = function (ids, all, callback) {
  var data = {ids: ids, all: all};
  this.pomeloRequest('chat.notificationViewedHandler.call', data, callback);
};
api.notificationDone = function (id) {
  var data = {id: id};
  this.options.debug('io:out:notification:done', data);
  this.pomelo.notify('chat.notificationDoneHandler.call', data);
};
