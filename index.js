var _ = require('underscore');
var Pomelo = require('./libs/pomelo');
var Api = require('./libs/api');


module.exports = function (options) {
  // options
  options = _.defaults(options, {
    device: '',
    host: '',
    debug: function () {
      console.log.apply(console, arguments);
    },
    retrieveToken: _.noop,
    invalidToken: _.noop,
    sio: {}
  });

  // pomelo
  var pomelo = Pomelo(options);

  // API
  var api = Api(pomelo, options);

  // connection methods
  api.connect = function (host, port) {
    pomelo.connect(host, port);
  };
  api.disconnect = function () {
    pomelo.disconnect();
  };
  api.isConnected = function () {
    return pomelo.isConnected();
  };

  // pushed event from server
  var that = this;
  pomelo.on('all', function (name, data) {
    options.debug('ws:' + name, data);
    api.trigger(name, data);
  });

  return api;
};