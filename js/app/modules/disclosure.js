define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/account",
  "modules/owner"
],
function(app, $, _, Backbone, Account, Owner) {
  var Disclosure = app.module();

  Disclosure.Model = Backbone.Model.extend({
    defaults: {
      name: "",
      fullText: ""
    }
  });

  Disclosure.Collection = Backbone.Collection.extend({
    model: Disclosure.Model
  });

  Disclosure.Views = { };

  Disclosure.Views.Review = Backbone.View.extend({
    template: "disclosure/review",
    manage: true,
    events: {
      "click .navigateBack": "navigateBack",
      "click .editAccounts": "navigateToAccounts",
      "click .navigateToSign": "navigateToSign"
    },
    afterRender: function() {
      var accountListEl = this.$(".accountList");
      this.accountView = new Account.Views.SummaryList({
        el: accountListEl,
        collection: this.options.accounts
      });

      this.accountView.render();

      var primaryOwnerEl = this.$(".primaryDisplay");
      this.primaryOwnerView = new Owner.Views.Review({
        el: primaryOwnerEl,
        model: this.options.primaryOwner,
        navigateToOwners: this.options.navigateToOwners
      });

      this.primaryOwnerView.render();

      var jointOwnersEl = this.$(".jointOwnerSection");
      this.jointOwnersView = new Owner.Views.ReviewList({
        el: jointOwnersEl,
        collection: this.options.jointOwners,
        accounts: this.options.accounts,
        navigateToOwners: this.options.navigateToOwners
      });

      this.jointOwnersView.render();
    },
    navigateBack: function() {
      this.options.navigateBack();
    },
    // submit owner information to service before continuing on to sign step
    navigateToSign: function() {
      var owners = this.options.jointOwners.serializeForService();
      var primary = this.options.primaryOwner.serializeForService();
      owners.unshift(primary);
      var ownerRequest = { owners: owners };

      app.callService(app.config.serviceKey.REGISTER_OWNERS, ownerRequest, responseComplete);

      var that = this;
      function responseComplete(data) {
        _.each(data, function(owner) {
          var matchedOwner = that.options.primaryOwner;
          if (!owner.isPrimary) {
            matchedOwner = that.options.jointOwners.find(function(o) { return o.cid === owner.cid; });
          }

          matchedOwner.set({sequenceId: owner.sequenceId, customerId: owner.customerId});
        });

        that.options.navigateNext();
      }
    },
    navigateToAccounts: function() {
      this.options.navigateToAccounts();
    },
  });

  Disclosure.Views.Sign = Backbone.View.extend({
    template: "disclosure/sign",
    manage: true,
    events: {
      "click .navigateReview": "navigateBack",
      "click .identityModal": "submitClicked"
    },
    afterRender: function() {
      var accountListEl = this.$(".accountList");
      this.accountView = new Account.Views.SummaryList({
        el: accountListEl,
        collection: this.options.accounts
      });

      this.accountView.render();
      this.$(".primaryOwnerName").text(this.options.primaryOwner.getFullName());
      this.$(".primaryOwnerSSN").text(this.options.primaryOwner.getSSN());
      this.$el.find(".primaryEmailName").text(this.options.primaryOwner.getEmail());
      var getEmail = this.options.primaryOwner.serializeForViewTemplate();
    },
    navigateBack: function() {
      this.options.navigateBack();
    },
    submitClicked: function() {
      var requireAcceptDisclosures = app.config.requireAcceptDisclosures !== false; // undefined defaults to true
      if (_.isUndefined(requireAcceptDisclosures)) { requireAcceptDisclosures = true; }

      var identityAuthModal = this.$("#identityAuth");
      if (requireAcceptDisclosures && this.$("input.mustCheck:checkbox:not(:checked)").length > 0) {
        identityAuthModal.modal("hide");
        this.showEl(".signErrors");
        app.utils.scrollToErrorHeader();
        return;
      }

      // :TODO: set vals from model
      var agreements = {agreePP: true, agreeTAC: true, agreeESign: true, agreeW9: true, agreeEDA: true };

      app.callService(app.config.serviceKey.CONFIRM_DISCLOSURES, agreements, responseComplete);

      var that = this;
      function responseComplete() {
        that.options.navigateNext();
      }
    }
  });

  return Disclosure;
});
