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

      this.trigger('focusModelChanged');
    }
  }, Backbone.Events);
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
