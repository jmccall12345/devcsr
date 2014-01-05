define([
  "app",
  "backbone",
  "modules/error"
],

function(app, Backbone, Error) {
  var Address = app.module();

  Address.Model = Backbone.Model.extend({
    defaults: {
      "line1": "",
      "line2": "",
      "city": "",
      "state": "",
      "zip": "",
      "typeLabel": "home"
    },
    getLongHtmlDescription: function() {
      var results = this.get("line1") + "<br />";
      var line2 = this.get("line2");
      results += (line2 === "" ? "" : line2 + "<br />");
      results += this.get("city") + ", " + this.get("state") + ", " + this.get("zip");

      return results;
    }
  });

  Address.Validator = _.clone(Error.Validator);

  Address.Validator.validateAll = function(obj) {
    this.errors = new Error.Collection();

    // :TODO: refactor out this key-retrieval also found in Views.Edit
    var keys = _.keys(obj.omit("line2", "typeLabel"));

    var that = this;
    _.each(keys, function(key) {
      that.textRequired(obj, key, "." + key + "Group", "." + key + "Error");
    });

    return this.errors;
  };

  Address.Views = {};

  Address.Views.Edit = Backbone.View.extend({
    template: "address_edit",
    manage: true,
    serialize: function() {
      var result = this.model.toJSON();
      result.cid = this.model.cid;
      result.type = this.options.name;
      result.writeOptions = app.utils.writeOptions;

      return result;
    },
    saveAddress: function() {
      var keys = this.model.keys();
      var mappings = {};
      var that = this;
      _.each(keys, function(key) {
        mappings[key] = that.$("#" + key + "_" + that.options.name + "_" + that.model.cid).val();
      });

      this.model.set(mappings);
    },
    validateAll: function() {
      var errors = Address.Validator.validateAll(this.model);
      Address.Validator.showErrors(this.$el);
      return errors.length === 0;
    }
  });

  Address.loadFromJSON = function(json) {
    return new Address.Model(json);
  };

  return Address;
});
