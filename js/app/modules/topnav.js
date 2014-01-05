define([
  "underscore", "app"
],

  function(_, app) {
    var TopNav = app.module();

    TopNav.Model = Backbone.Model.extend({
      defaults: {
        code: "",
        alternateCodes: [],
        description: "",
        isSelected: false,
        isEnabled: false,
        step: 0
      }
    });

    TopNav.Collection = Backbone.Collection.extend({
      model: TopNav.Model,
      setActiveCode: function(code) {
        var codeFound = this.any(function(item) { return itemHasCode(item, code); });
        if (!codeFound) { return; }

        function itemHasCode(item, code) {
          if (item.get("code") === code) { return true; }

          var alternateCodes = item.get("alternateCodes");
          if (_.isArray(alternateCodes)) { return _.contains(alternateCodes, code); }

          return false;
        }

        var passedSelectedItem = false;
        this.each(function(item) {
          item.set("isEnabled", !passedSelectedItem);

          var isSelected = itemHasCode(item, code);
          item.set("isSelected", isSelected);
          if (isSelected) {
            passedSelectedItem = true;
          }
        });
      }
    });

    TopNav.loadFromJSON = function(jsonData) {
      if (_.isArray(jsonData)) {
        var models = _(jsonData).map( function(item) { return TopNav.loadFromJSON(item); } );
        return new TopNav.Collection(models);
      }

      if (_.isUndefined(jsonData.isSelected)) {
        jsonData.isSelected = false;
      }

      if (_.isUndefined(jsonData.isEnabled)) {
        jsonData.isEnabled = false;
      }

      var navItem = new TopNav.Model({
        code: jsonData.code,
        alternateCodes: jsonData.alternateCodes,
        description: jsonData.description,
        isSelected: jsonData.isSelected,
        isEnabled: jsonData.isEnabled,
        step: jsonData.step
      });

      return navItem;
    };

    TopNav.Views.Main = Backbone.View.extend({
      manage: true,
      template: "topnav",
      events: {
        "click .navItem": "navItemClicked"
      },
      initialize: function() {
        this.listenTo(this.collection, 'change', this.render);
      },
      afterRender: function() {
        // :TODO: impl
      },
      navItemClicked: function(eventArgs) {
        if (app.config.hasTopNavigation !== true) {
          return;
        }

        var navItem = $(eventArgs.currentTarget);

        if (!navItem.hasClass("disabled")) {
          // "navAccounts" -> "accounts", "navOwners" -> "owners", etc
          var routeId = navItem.attr("id").substring(3).toLowerCase();

          this.options.navigateToSection(routeId);
        }
      },
      serialize: function() {
        var serializedItems = this.collection.toJSON();
        return { items: serializedItems };
      }
    });

    return TopNav;
  });