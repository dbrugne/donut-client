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
  var app = _.extend({
    reset: function () {
      // empty stores
      this.ones.reset();
      this.rooms.reset();
      this.groups.reset();
      this.user.clear();

      // unmount listeners
      this.client.off(null, null, this);
    },
    getFocusedModel: function () {
      var model = this.rooms.findWhere({focused: true});
      if (!model) {
        model = this.ones.findWhere({focused: true});
        if (!model) {
          model = this.groups.findWhere({focused: true});
        }
      }

      return model; // could be 'undefined'
    },
    setFocusedModel: function (model) {
      var iterator = function (m) {
        // set as focused if current model is strictly equal to given model
        // otherwise set as false
        m.set('focused', (m === model));
      };

      this.rooms.each(iterator);
      this.ones.each(iterator);
      this.groups.each(iterator);

      this.trigger('focusedModelChanged', model);
    },
    getUnviewed: function() {
      var count = 0;
      var iterator = function (m) {
        if (m.get('unviewed')) {
          count++;
        }
      };

      this.rooms.each(iterator);
      this.ones.each(iterator);
      this.groups.each(iterator);

      return count;
    }
  }, Backbone.Events);
  options.app = app;

  // ws client
  app.client = Ws(options);
  app.beforeFirstConnection = true;
  app.client.on('welcome', function (data) {
    if (data.usernameRequired) {
      return this.trigger('usernameRequired');
    }

    this.user.onWelcome(data);
    this.ones.onWelcome(data);
    this.rooms.onWelcome(data);
    this.groups.onWelcome(data);

    this.trigger('redrawNavigationRooms');
    this.trigger('redrawNavigationOnes');
    this.trigger('redrawNavigationGroups');

    this.beforeFirstConnection = false;

    // run routing only when everything in IHM is ready
    this.trigger('ready');
  }, app);

  // collections
  app.groups = new Groups(null, options);
  app.ones = new Ones(null, options);
  app.rooms = new Rooms(null, options);

  // current user
  // @important: after collection mounting to allow listening on them
  app.user = new CurrentUser(null, options);

  return app;
};
