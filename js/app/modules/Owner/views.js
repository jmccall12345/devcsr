define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/Owner/single_views"
],

  function(app, $, _, Backbone, SingleViews) {
    var Views = _.clone(SingleViews);

    Views.Setup = Backbone.View.extend({
      template: "owner/setup",
      manage: true,
      events: {
        "click .navigateAccounts": "navigateBack",
        "click .navigateReview": "nextClicked"
      },
      afterRender: function() {
        this.primaryOwnerView = new Views.Edit({
          el: "#primaryOwnerEdit",
          model: this.options.primaryOwner,
          parentView: this,
          accounts: this.options.accounts,
          selectAccounts: false
        });

        this.primaryOwnerView.render();

        this.jointOwnersView = new Views.List({
          el: ".jointOwnersHolder",
          collection: this.options.jointOwners,
          parentView: this,
          accounts: this.options.accounts
        });

        this.jointOwnersView.render();
      },
      navigateBack: function() {
        this.options.navigateBack();
      },
      nextClicked: function() {
        this.primaryOwnerView.updateModel();
        this.jointOwnersView.updateModels();

        var primaryValid = this.primaryOwnerView.validateAll();
        var jointValid = this.jointOwnersView.validateAll();

        var passedValidation = (app.config.requireUserValidation === false) || (primaryValid && jointValid);
        this.showEl(".ownerErrorsAlert", !passedValidation);

        if (passedValidation) { this.options.navigateNext(); }
        else { app.utils.scrollToErrorHeader(); }
      }
    });

    Views.ReviewList = Backbone.View.extend({
      manage: false,
      render: function() {
        this._refreshVisibility();
        this.allViews = [];
        this.$(".jointOwnerList").empty();
        this.collection.each(_.bind(this.registerAndRenderJointOwner, this));
      },
      registerAndRenderJointOwner: function(owner) {
        var listEl = this.$(".jointOwnerList");
        var containingDiv = listEl.append("<div></div>").find("div").last();
        var newView = new Views.Review({
          el: containingDiv,
          model: owner,
          accounts: this.options.accounts,
          parentView: this.options.parentView,
          navigateToOwners: this.options.navigateToOwners,
          headerText: "Joint Owner #" + (this.allViews.length + 1) + " Information"
        });

        newView.on("removeView", this.removeChildView, this);

        newView.render();
        this.allViews.push(newView);
      },
      removeChildView: function(view) {
        var that = this;
        this.collection.remove(view.model);
        var indexOfViewInList = 0;
        for (var i=0; i<this.allViews.length; i++) {
          if (this.allViews[i] === view) {
            indexOfViewInList = i;
          }
        }

        this.allViews.splice(indexOfViewInList, 1);

        var index = 1;
        _.each(this.allViews, function(refreshView) {
          refreshView.setHeaderText("Joint Owner #" + index + " Information");
          index++;
        });

        view.$el.hide(app.config.transitionLength, function() {
          view.$el.remove();
          that._refreshVisibility();
        });
      },
      _refreshVisibility: function() {
        this.$el.toggle(this.collection.size() > 0);
      }
    });

    Views.List = Backbone.View.extend({
      manage: false,
      events: {
        "click #addOwnerButton": "addNewOwner"
      },
      render: function() {
        this.allViews = [];
        this.$(".jointOwnerList").empty();
        this.collection.each(_.bind(this.registerAndRenderNewOwner, this));
        this.refreshListStateDisplay();
      },
      addNewOwner: function() {
        var newOwner = new this.collection.model();
        this.collection.add(newOwner);
        this.registerAndRenderNewOwner(newOwner);

        this.refreshListStateDisplay();
      },
      registerAndRenderNewOwner: function(owner) {
        var listEl = this.$(".jointOwnerList");
        var containingDiv = listEl.append("<div></div>").find("div").last();
        var newEditView = new Views.Edit({
          el: containingDiv,
          model: owner,
          parentView: this.options.parentView,
          accounts: this.options.accounts,
          selectAccounts: true
        });

        newEditView.render();
        newEditView.on("removeView", this.removeChildView, this);
        this.allViews.push(newEditView);
      },
      refreshListStateDisplay: function() {
        this.showEl(".addOwnerDiv", this.collection.length < app.config.maxJointOwnerNum);

        var index = 1;
        _.each(this.allViews, function(view) {
          view.setHeaderText("Joint Owner #" + index + " Information");
          index++;
          view.showDeleteButton(true);
        });
      },
      updateModels: function() {
        _.each(this.allViews, function(view) { view.updateModel(); });
      },
      removeChildView: function(view) {
        this.collection.remove(view.model);
        var indexOfViewInList = 0;
        for (var i=0; i<this.allViews.length; i++) {
          if (this.allViews[i] === view) {
            indexOfViewInList = i;
          }
        }

        this.allViews.splice(indexOfViewInList, 1);
        this.refreshListStateDisplay();

        view.$el.hide(app.config.transitionLength, function() {
          view.$el.remove();
        });
      },
      validateAll: function() {
        var success = _.reduce(this.allViews, function(acc, view) { return acc && view.validateAll(); }, true);

        return success;
      }
    });

    return Views;
  });