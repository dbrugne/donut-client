var _ = require('underscore');
var Backbone = require('backbone');

var Ws = function (pomelo, options) {
  this.pomelo = pomelo;
  this.options = options;
};

module.exports = function (pomelo, options) {
  // convert as event emitter
  return _.extend(new Ws(pomelo, options), Backbone.Events);
};

Ws.prototype.pomeloRequest = function (route, data, callback) {
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

Ws.prototype.home = function (callback) {
  this.pomeloRequest('chat.homeHandler.call', callback);
};
Ws.prototype.search = function (search, options, callback) {
  var data = {
    search: search, // string to search for
    options: options
  };
  this.pomeloRequest('chat.searchHandler.call', data, callback);
};
Ws.prototype.ping = function (callback) {
  var start = Date.now();
  this.pomeloRequest('chat.pingHandler.call', _.bind(function () {
    var duration = Date.now() - start;
    return callback(duration);
  }, this));
};

// GROUP
// ======================================================

Ws.prototype.groupId = function (identifier, callback) {
  var data = {identifier: identifier};
  this.pomeloRequest('chat.groupIdHandler.call', data, callback);
};
Ws.prototype.groupRead = function (groupId, what, callback) {
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
Ws.prototype.groupRequest = function (groupId, message, callback) {
  var data = {group_id: groupId};
  if (message) {
    data.message = message;
  }
  this.pomeloRequest('chat.groupRequestHandler.request', data, callback);
};
Ws.prototype.groupLeave = function (groupId, callback) {
  var data = {group_id: groupId};
  this.pomeloRequest('chat.groupLeaveHandler.call', data, callback);
};
Ws.prototype.groupRequestAccept = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupRequestHandler.accept', data, callback);
};
Ws.prototype.groupRequestRefuse = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupRequestHandler.refuse', data, callback);
};
Ws.prototype.groupAllowedAdd = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupAllowedHandler.add', data, callback);
};
Ws.prototype.groupAllowedRemove = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupAllowedHandler.remove', data, callback);
};
Ws.prototype.groupBan = function (groupId, userId, reason, callback) {
  var data = {group_id: groupId, user_id: userId};
  if (reason) {
    data.reason = reason;
  }
  this.pomeloRequest('chat.groupBanHandler.call', data, callback);
};
Ws.prototype.groupDeban = function (groupId, userId, callback) {
  var data = {group_id: groupId, user_id: userId};
  this.pomeloRequest('chat.groupDebanHandler.call', data, callback);
};
Ws.prototype.groupUsers = function (groupId, attributes, callback) {
  var data = {group_id: groupId, attributes: attributes};
  this.pomeloRequest('chat.groupUsersHandler.call', data, callback);
};
Ws.prototype.groupCreate = function (groupName, callback) {
  var data = { group_name: groupName };
  this.pomeloRequest('chat.groupCreateHandler.call', data, callback);
};
Ws.prototype.groupUpdate = function (groupId, fields, callback) {
  var data = {group_id: groupId, data: fields};
  this.pomeloRequest('chat.groupUpdateHandler.call', data, callback);
};
Ws.prototype.groupDelete = function (groupId, callback) {
  var data = {group_id: groupId};
  this.pomeloRequest('chat.groupDeleteHandler.call', data, callback);
};
Ws.prototype.groupJoin = function (groupId, password, callback) {
  var data = {group_id: groupId, password: password};
  this.pomeloRequest('chat.groupJoinHandler.call', data, callback);
};
Ws.prototype.groupOp = function (roomId, userId, callback) {
  var data = {group_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }
  this.pomeloRequest('chat.groupOpHandler.call', data, callback);
};
Ws.prototype.groupDeop = function (roomId, userId, callback) {
  var data = {group_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }
  this.pomeloRequest('chat.groupDeopHandler.call', data, callback);
};
Ws.prototype.groupDomains = function (groupId, domain, method, callback) {
  var data = {group_id: groupId, domain: domain, method: method};
  this.pomeloRequest('chat.groupMailDomainsHandler.call', data, callback);
};

// ROOM
// ======================================================

Ws.prototype.roomId = function (identifier, callback) {
  var data = {identifier: identifier};
  this.pomeloRequest('chat.roomIdHandler.call', data, callback);
};
Ws.prototype.roomJoin = function (roomId, password, callback) {
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
Ws.prototype.roomLeave = function (roomId) {
  var data = {room_id: roomId};
  this.options.debug('io:out:room:leave', data);
  this.pomelo.notify('chat.roomLeaveHandler.call', data);
};
Ws.prototype.roomLeaveBlock = function (roomId) {
  var data = {room_id: roomId};
  this.options.debug('io:out:room:leave:block', data);
  this.pomelo.notify('chat.roomLeaveBlockHandler.call', data);
};
Ws.prototype.roomMessage = function (roomId, message, files, special, callback) {
  var data = {
    room_id: roomId,
    message: message,
    files: files,
    special: special
  };
  this.pomeloRequest('chat.roomMessageHandler.call', data, callback);
};
Ws.prototype.roomMessageEdit = function (roomId, messageId, message, callback) {
  var data = {room_id: roomId, event: messageId, message: message};
  this.pomeloRequest('chat.roomMessageEditHandler.call', data, callback);
};
Ws.prototype.roomTopic = function (roomId, topic, callback) {
  var data = {room_id: roomId, topic: topic};
  this.pomeloRequest('chat.roomTopicHandler.call', data, callback);
};
Ws.prototype.roomRead = function (roomId, what, callback) {
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
Ws.prototype.roomUsers = function (roomId, attributes, callback) {
  var data = {room_id: roomId, attributes: attributes};
  this.pomeloRequest('chat.roomUsersHandler.call', data, callback);
};
Ws.prototype.roomUpdate = function (roomId, fields, callback) {
  var data = {room_id: roomId, data: fields};
  this.pomeloRequest('chat.roomUpdateHandler.call', data, callback);
};
Ws.prototype.roomCreate = function (name, mode, password, groupId, callback) {
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
Ws.prototype.roomDelete = function (roomId, callback) {
  var data = {room_id: roomId};
  this.pomeloRequest('chat.roomDeleteHandler.call', data, callback);
};
Ws.prototype.roomOp = function (roomId, userId, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.roomOpHandler.call', data, callback);
};
Ws.prototype.roomDeop = function (roomId, userId, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.roomDeopHandler.call', data, callback);
};
Ws.prototype.roomVoice = function (roomId, userId, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.roomVoiceHandler.call', data, callback);
};
Ws.prototype.roomDevoice = function (roomId, userId, reason, callback) {
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
Ws.prototype.roomKick = function (roomId, userId, reason, callback) {
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
Ws.prototype.roomBan = function (roomId, userId, reason, callback) {
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
Ws.prototype.roomDeban = function (roomId, userId, callback) {
  var data = {room_id: roomId};
  if (userId) {
    data.user_id = userId;
  } else {
    return;
  }

  this.pomeloRequest('chat.roomDebanHandler.call', data, callback);
};
Ws.prototype.roomViewed = function (roomId) {
  var data = {room_id: roomId};
  this.options.debug('io:out:room:viewed', data);
  this.pomelo.notify('chat.roomViewedHandler.call', data);
};
Ws.prototype.roomMessageSpam = function (roomId, messageId, callback) {
  var data = {room_id: roomId, event: messageId};
  this.pomeloRequest('chat.roomMessageSpamHandler.call', data, callback);
};
Ws.prototype.roomMessageUnspam = function (roomId, messageId, callback) {
  var data = {room_id: roomId, event: messageId};
  this.pomeloRequest('chat.roomMessageUnspamHandler.call', data, callback);
};
Ws.prototype.roomTyping = function (roomId) {
  var data = {room_id: roomId};
  this.options.debug('io:out:room:typing', data);
  this.pomelo.notify('chat.roomTypingHandler.call', data);
};
Ws.prototype.roomJoinRequest = function (roomId, message, callback) {
  var data = {room_id: roomId};
  if (message) {
    data.message = message;
  }

  this.pomeloRequest('chat.roomJoinRequestHandler.call', data, callback);
};
Ws.prototype.roomAllow = function (roomId, userId, callback) {
  var data = {room_id: roomId, user_id: userId};
  this.pomeloRequest('chat.roomAllowHandler.call', data, callback);
};
Ws.prototype.roomRefuse = function (roomId, userId, callback) {
  var data = {room_id: roomId, user_id: userId};
  this.pomeloRequest('chat.roomAllowHandler.refuse', data, callback);
};
Ws.prototype.roomDisallow = function (roomId, userId, callback) {
  var data = {room_id: roomId, user_id: userId};
  this.pomeloRequest('chat.roomDisallowHandler.call', data, callback);
};
Ws.prototype.roomSetPrivate = function (roomId, callback) {
  var data = {room_id: roomId};
  this.pomeloRequest('chat.roomSetPrivateHandler.call', data, callback);
};

// ONETOONE
// ======================================================

Ws.prototype.userId = function (username, callback) {
  var data = {username: username};
  this.pomeloRequest('chat.userIdHandler.call', data, callback);
};
Ws.prototype.userJoin = function (userId, callback) {
  var data = {user_id: userId};
  this.pomeloRequest('chat.userJoinHandler.call', data, callback);
};
Ws.prototype.userLeave = function (userId) {
  var data = {user_id: userId};
  this.options.debug('io:out:user:leave', data);
  this.pomelo.notify('chat.userLeaveHandler.call', data);
};
Ws.prototype.userBan = function (userId, callback) {
  var data;
  if (userId) {
    data = {user_id: userId};
  } else {
    return;
  }

  this.pomeloRequest('chat.userBanHandler.call', data, callback);
};
Ws.prototype.userDeban = function (userId, callback) {
  var data;
  if (userId) {
    data = {user_id: userId};
  } else {
    return;
  }

  this.pomeloRequest('chat.userDebanHandler.call', data, callback);
};
Ws.prototype.userMessage = function (userId, message, files, special, callback) {
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
Ws.prototype.userMessageEdit = function (userId, messageId, message, callback) {
  var data = {user_id: userId, event: messageId, message: message};
  this.pomeloRequest('chat.userMessageEditHandler.call', data, callback);
};
Ws.prototype.userRead = function (userId, what, callback) {
  if (!userId) {
    return;
  }

  var data = { user_id: userId };
  if (what) {
    data.what = what;
  }

  this.pomeloRequest('chat.userReadHandler.call', data, callback);
};
Ws.prototype.userUpdate = function (fields, callback) {
  var data = {data: fields};
  this.pomeloRequest('chat.userUpdateHandler.call', data, callback);
};
Ws.prototype.userViewed = function (userId) {
  var data = {user_id: userId};
  this.options.debug('io:out:user:viewed', data);
  this.pomelo.notify('chat.userViewedHandler.call', data);
};
Ws.prototype.userTyping = function (userId) {
  var data = {user_id: userId};
  this.options.debug('io:out:user:typing', data);
  this.pomelo.notify('chat.userTypingHandler.call', data);
};

// HISTORY
// ======================================================

Ws.prototype.roomHistory = function (roomId, start, end, limit, callback) {
  this._history({
    room_id: roomId,
    start: start,
    end: end,
    limit: limit
  }, callback);
};
Ws.prototype.userHistory = function (userId, start, end, limit, callback) {
  this._history({
    user_id: userId,
    start: start,
    end: end,
    limit: limit
  }, callback);
};
Ws.prototype._history = function (data, callback) {
  this.pomeloRequest('history.historyHandler.call', data, callback);
};

// PREFERENCES
// ======================================================

Ws.prototype.userPreferencesRead = function (roomId, callback) {
  var data = (roomId)
    ? {room_id: roomId}
    : {};
  this.pomeloRequest('chat.preferencesReadHandler.call', data, callback);
};
Ws.prototype.userPreferencesUpdate = function (fields, callback) {
  var data = {data: fields};
  this.pomeloRequest('chat.preferencesUpdateHandler.call', data, callback);
};
Ws.prototype.accountEmail = function (email, method, callback) {
  var data = {email: email, method: method};
  this.pomeloRequest('chat.accountEmailHandler.call', data, callback);
};
Ws.prototype.accountPassword = function (newPassword, currentPassword, callback) {
  var data = {password: newPassword, current_password: currentPassword};
  this.pomeloRequest('chat.accountPasswordHandler.call', data, callback);
};

// NOTIFICATION
// ======================================================

Ws.prototype.notificationRead = function (viewed, time, number, callback) {
  var data = {viewed: viewed, time: time, number: number};
  this.pomeloRequest('chat.notificationReadHandler.call', data, callback);
};
Ws.prototype.notificationViewed = function (ids, all, callback) {
  var data = {ids: ids, all: all};
  this.pomeloRequest('chat.notificationViewedHandler.call', data, callback);
};
Ws.prototype.notificationDone = function (id) {
  var data = {id: id};
  this.options.debug('io:out:notification:done', data);
  this.pomelo.notify('chat.notificationDoneHandler.call', data);
};
