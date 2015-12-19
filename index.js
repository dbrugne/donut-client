var _ = require('underscore');
var Backbone = require('backbone');

var Ws = require('./lib/ws/index');
var CurrentUser = require('./lib/models/current-user');
var Groups = require('./lib/collections/groups');
var Ones = require('./lib/collections/ones');
var Rooms = require('./lib/collections/rooms');

module.exports = function (options) {
  options = options || {};
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

  // new event emitter as facade
  var app = _.extend({}, Backbone.Events);
  options.app = app;

  // ws client
  app.client = Ws(options);

  // current user
  app.user = new CurrentUser(null, options);

  // collections
  app.groups = new Groups(null, options);
  app.ones = new Ones(null, options);
  app.rooms = new Rooms(null, options);

  return app;
};
