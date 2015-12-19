var _ = require('underscore');
var Backbone = require('backbone');

// @source: https://github.com/gloomyzerg/pomelo-jsclient-socket.io-bower

var Pomelo = function (options) {
  this.options = options;
  this.socket = null; // current socket.io socket

  // pomelo protocol message header size
  // (https://github.com/NetEase/pomelo/wiki/Communication-Protocol)
  this.protocolHeaderLength = 5;

  // requests handling
  this.callbacks = {};
  this.autoIncrement = 1;
};

module.exports = function (options) {
  // convert as event emitter
  return _.extend(new Pomelo(options), Backbone.Events);
};

Pomelo.prototype.connect = function (host, port) {
  if (this.isConnected()) {
    this.disconnect();
  }

  this.trigger('connecting');

  // in console: client.connect('chat.local', 3050)
  var server = {
    host: host || this.options.host,
    port: port || null
  };

  this.options.retrieveToken(_.bind(function (err, token) {
    if (err) {
      return this.trigger('error', err);
    }
    this._sio(server, token);
  }, this));
};

Pomelo.prototype.disconnect = function () {
  if (!this.socket) {
    return;
  }
  this.socket.disconnect();
  this.socket = null;
};

Pomelo.prototype.isConnected = function () {
  return (this.socket && this.socket.connected === true);
};

Pomelo.prototype.request = function (route) {
  if (!route) {
    return;
  }

  var msg = {};
  var cb;

  var arg = _.toArray(arguments);
  if (arg.length === 2) {
    if (typeof arg[ 1 ] === 'function') {
      cb = arg[ 1 ];
    } else if (typeof arg[ 1 ] === 'object') {
      msg = arg[ 1 ];
    }
  } else if (arg.length === 3) {
    msg = arg[ 1 ];
    cb = arg[ 2 ];
  }

  this.autoIncrement++;
  this.callbacks[ this.autoIncrement ] = cb;
  var sg = this._encode(this.autoIncrement, route, msg);

  this.socket.send(sg);
};

Pomelo.prototype.notify = function (route, data) {
  this.request(route, data);
};

Pomelo.prototype._sio = function (server, currentToken) {
  // @doc: https://github.com/Automattic/engine.io-client#methods
  var options = _.defaults(this.options.sio, {
    // multiplex: true,
    reconnection: true,
    // reconnectionDelay: 1000,
    // reconnectionDelayMax: 5000,
    timeout: 8000, // = between 2 heartbeat pings
    // autoConnect: true,
    forceNew: true, // http://stackoverflow.com/questions/24566847/socket-io-client-connect-disconnect
                    // allow me to connect() disconnect() from console
    query: 'device=' + this.options.device
  });

  var currentUrl = server.host;
  if (server.port) {
    currentUrl += ':' + server.port;
  }

  this.socket = require('socket.io-client')(currentUrl, options); // lazy load

  // triggered when server has confirmed user authentication
  this.socket.on('authenticated', _.bind(function () {
    this.options.debug('authentication accepted');
    this.trigger('connect');
    this._requestWelcome();
  }, this));
  this.socket.on('unauthorized', _.bind(function (error) {
    this.options.debug('authentication rejected', error);

    // special case, reconnection with an expired token
    if (error.message === 'jwt expired') {
      this.options.invalidToken(_.bind(function (err, newToken) {
        if (err) {
          return this.trigger('error', err);
        }
        currentToken = newToken;
        this._sio(server, currentToken);
      }, this));
    }

    this.trigger('error', error.message);
  }, this));

  var that = this;

  this.socket.on('disconnect', function (reason) {
    that.trigger('disconnect', reason);
  }); // disconnected
  this.socket.on('error', function (err) {
    that.trigger('error', err);
  }); // connection error

  // reconnect events
  this.socket.on('reconnect', function (num) {
    that.trigger('reconnect', num);
  }); // successful reconnection
  this.socket.on('reconnect_attempt', function () {
    that.trigger('reconnect_attempt');
  }); // will try a new reconnection
  this.socket.on('reconnecting', function (num) {
    that.trigger('reconnecting', num);
  }); // trying new reconnection
  this.socket.on('reconnect_error', function (err) {
    that.trigger('reconnect_error', err);
  }); // reconnection error
  this.socket.on('reconnect_failed', function () {
    that.trigger('reconnect_failed');
  }); // couldn’t reconnect within reconnectionAttempts

  // pomelo server send exclusively 'message' events
  this.socket.on('message', function (data) {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    if (data instanceof Array) {
      that._messages(data);
    } else {
      that._message(data);
    }
  });

  // socket listener are set, go connect, then authenticate
  this.socket.on('connect', _.bind(function () {
    this.options.debug('connected to ' + currentUrl, 'now authenticate with', currentToken);
    this.socket.emit('authenticate', { token: currentToken });
  }, this));
};

Pomelo.prototype._requestWelcome = function () {
  this.request('connector.welcomeHandler.call', {}, _.bind(function (data) {
    if (data.error) {
      return this.options.debug('connector.welcomeHandler.call returns error', data);
    }
    this.trigger('welcome', data);
  }, this));
};

Pomelo.prototype._message = function (data) {
  // .request(), client call server and get a response
  if (data.id) {
    var callback = this.callbacks[ data.id ];

    delete this.callbacks[ data.id ];

    // .notify(), client call server and don't wait for a response
    if (typeof callback !== 'function') {
      return;
    }

    return callback(data.body);
  }

  // .push(), server call client
  var route = data.route;
  if (route) {
    if (data.body) {
      var body = data.body.body;
      if (!body) {
        body = data.body;
      }
      this.trigger(route, body);
    } else {
      this.trigger(route, data);
    }
  } else {
    this.trigger(data.body.route, data.body);
  }
};

Pomelo.prototype._messages = function (msgs) {
  _.each(msgs, function (msg) {
    this._message(msg);
  }, this);
};

/**
 * Encode a message for pomelo
 *
 * JSON object (donut) => byteArray (Pomelo) => String (socket.io)
 *
 * @param id
 * @param route
 * @param data
 * @returns String
 */
Pomelo.prototype._encode = function (id, route, data) {
  var msgStr = JSON.stringify(data);

  if (route.length > 255) {
    throw new Error('route maxlength is overflow');
  }

  var byteArray = new Uint16Array(this.protocolHeaderLength + route.length + msgStr.length); // need polyfill in lte IE9
  var index = 0;
  byteArray[ index++ ] = (id >> 24) & 0xFF;
  byteArray[ index++ ] = (id >> 16) & 0xFF;
  byteArray[ index++ ] = (id >> 8) & 0xFF;
  byteArray[ index++ ] = id & 0xFF;
  byteArray[ index++ ] = route.length & 0xFF;
  for (var i = 0; i < route.length; i++) {
    byteArray[ index++ ] = route.charCodeAt(i);
  }
  for (var i2 = 0; i2 < msgStr.length; i2++) {
    byteArray[ index++ ] = msgStr.charCodeAt(i2);
  }
  return this._byteArrayToString(byteArray, 0, byteArray.length);
};

/**
 * Decode a message from pomelo
 *
 * String (socket.io) => byteArray (Pomelo) => JSON object (donut)
 *
 * @param data
 * @returns {{id: number, route: *, body: *}}
 */
Pomelo.prototype._decode = function (data) {
  var idx;
  var len = data.length;
  var arr = new Array(len);
  for (idx = 0; idx < len; ++idx) {
    arr[ idx ] = data.charCodeAt(idx);
  }
  var index = 0;
  var buf = new Uint16Array(arr);
  var id = ((buf[ index++ ] << 24) | (buf[ index++ ]) << 16 | (buf[ index++ ]) << 8 | buf[ index++ ]) >>> 0;
  var routeLen = buf[ this.protocolHeaderLength - 1 ];
  var route = this._byteArrayToString(buf, this.protocolHeaderLength, routeLen + this.protocolHeaderLength);
  var body = this._byteArrayToString(buf, routeLen + this.protocolHeaderLength, buf.length);
  return { id: id, route: route, body: body };
};

Pomelo.prototype._byteArrayToString = function (byteArray, start, end) {
  var result = '';
  for (var i = start; i < byteArray.length && i < end; i++) {
    result = result + String.fromCharCode(byteArray[ i ]);
  }
  return result;
};
