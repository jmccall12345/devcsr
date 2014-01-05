define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/address",
  "modules/Owner/validator",
  "modal_views"
],

  function(app, $, _, Backbone, Address, Validator, ModalViews) {
    var SingleViews = {};

    SingleViews.Summary = Backbone.View.extend({
      template: "owner/summary",
      manage: true,
      serialize: function() {
        return this.model.serializeForViewTemplate();
      }
    });

    SingleViews.Review = Backbone.View.extend({
      template: "owner/review",
      manage: true,
      events: {
        "click .editOwners": "navigateToEditOwners",
        "click .removeOwner": "removeClicked"
      },
      afterRender: function() {
        // :TODO: make sure we can't create zombie views
        if (_.isUndefined(this.summaryView)) {
          this.summaryView = new SingleViews.Summary({
            el: this.$(".summarySpan"),
            model: this.model
          });
        }

        this.summaryView.render();

        var isPrimary = !!this.model.get("isPrimary");
        this.$(".removeOwner,.associatedAccountsSection").toggleClass("hide", isPrimary);

        if (!_.isUndefined(this.options.headerText)) {
          this.setHeaderText(this.options.headerText);
        }
      },
      serialize: function() {
        var tplData = this.model.serializeForViewTemplate();
        tplData.associatedAccountsMarkup = this.makeAssociatedAcountsMarkup();
        return tplData;
      },
      makeAssociatedAcountsMarkup: function() {
        var allAccounts = this.options.accounts;
        if (_.isUndefined(allAccounts)) {
          return "";
        }

        var accountMarkup = _.reduce(this.model.get("associatedAccountCIDs"), function(acc, cid) {
          var account = allAccounts.find(function (account) { return account.cid === cid; });
          if (_.isUndefined(account)) { return acc; }

          if (acc !== "") { acc += "<br />"; }
          var serializedAccount = account.serializeForViewTemplate();
          return acc + serializedAccount.productName + ": $" + serializedAccount.formattedFundingAmount;
        }, "");

        return accountMarkup;
      },
      setHeaderText: function(headerText) {
        this.$(".ownerHeaderText").text(headerText);
      },
      navigateToEditOwners: function() {
        this.options.navigateToOwners();
      },
      removeClicked: function() {
        this.trigger("removeView", this);
      }
    });

    SingleViews.Edit = Backbone.View.extend({
      template: "owner/edit",
      events: {
        "click .remove-owner": "removeClicked",
        "change .needsPreviousAddress": "needsPreviousChanged",
        "change .needsMailingAddress": "needsMailingChanged",
        "click .signIn": "launchSignInModal",
        "keyup .passwordInput": "passwordChanged",
        "change .passwordInput": "passwordChanged"
      },
      manage: true,
      afterRender: function() {
        if (!_.isUndefined(this.summaryView)) {
          this.summaryView.destroyCompletely();
        }

        this.summaryView = new SingleViews.Summary({
          el: this.$(".summarySection"),
          model: this.model
        });

        var isEditable = this.model.get("isEditable");
        this.showEl(".summarySection", !isEditable);
        this.summaryView.render();
        this.showEl(".mainEditSection,.fieldsRequiredCopy,.signInSection", isEditable);

        if (isEditable) {
          this.showEl(".credentialsSection", this.model.get("isPrimary") === true);
        }

        if (this.options.selectAccounts === true) {
          this.$(".accountSelectionGroup").removeClass("hide");
        }

        var addressTypes = ["Home", "Previous", "Mailing"];

        var that = this;
        _(addressTypes).each(function(name) {
          var lowerName = name.toLowerCase();
          that[lowerName + "AddressView"] = new Address.Views.Edit({
            el: that.$("." + lowerName + "AddressHolder"),
            model: that.model.get(lowerName + "Address"),
            name: name
          });

          that[lowerName + "AddressView"].render();
        });

        this.renderHeader();
      },
      launchSignInModal: function() {
        var that = this;
        function successCallback(response) {
          if (_.isNull(response)) { return; }

          // we don't want to overwrite the 'isPrimary' val w/ anything from the service;
          // probably shouldn't be set anyway.
          delete(response.isPrimary);
          that.model.updateFromJSON(response);
          that.model.set({ isEditable: false });
          that.render();
        }

        ModalViews.launchSignInModal(!!this.model.get("isPrimary"), successCallback);
      },
      setHeaderText: function(headerText) {
        this.headerText = headerText;
        this.renderHeader();
      },
      showDeleteButton: function(show) {
        this.isRemoveVisible = show;
        this.renderHeader();
      },
      renderHeader: function() {
        if (!_.isUndefined(this.headerText)) {
          this.$(".ownerHeaderText").text(this.headerText);
        }

        var isRemoveVisible = _.isUndefined(this.isRemoveVisible) ? false : this.isRemoveVisible;
        this.$(".remove-owner").toggle(isRemoveVisible);
      },
      serialize: function() {
        var ownerObj = this.model.serializeForViewTemplate();
        ownerObj.potentialAccounts = this.options.accounts.serializeForViewTemplate();
        return ownerObj;
      },
      updateModel: function() {
        // if not editable (ie, a logged in owner) the only values we update are the associatedAccountCIDs
        var mappings = {};
        if (this.model.get("isEditable")) {
          mappings = this._readModelDataFromForm();
        }
        mappings.associatedAccountCIDs = this._getAccountCIDsFromForm();

        // if these bools are set in the mapping obj, they'll be immediately reset in the .set(mappings) call;
        // if they aren't in the mapping obj, we want them to be undefined in the model, as
        // undefined is a possible value distinct from FALSE
       var that = this;
        _.each(["needsMailingAddress", "needsPreviousAddress"], function(key) { that.model.unset(key); });
        this.model.set(mappings);
      },
      _readModelDataFromForm: function() {
        var keys = _.union(this.model.keys(), ["reenterpin", "emailAgain"]);
        var mappings = {};
        var that = this;
        _.each(keys, function(key) {
          var val = that.$("#" + key + "_" + that.model.cid).val();
          // we don't want to try to overwrite a possibly existing value that isn't set in the view w/ undefined
          if (!_.isUndefined(val)) {
            mappings[key] = val;
          }
        });

        function strToBool(str) { return _.contains(["yes", "true"], str.toLowerCase()) ? true : false; }
        mappings.needsPreviousAddress = strToBool(mappings.needsPreviousAddress);
        mappings.needsMailingAddress = strToBool(mappings.needsMailingAddress);

        this.homeAddressView.saveAddress();
        mappings.homeAddress = this.homeAddressView.model;

        if (mappings.needsPreviousAddress) {
          this.previousAddressView.saveAddress();
          mappings.previousAddress = this.previousAddressView.model;
        }

        if (mappings.needsMailingAddress) {
          this.mailingAddressView.saveAddress();
          mappings.mailingAddress = this.mailingAddressView.model;
        }

        return mappings;
      },
      _getAccountCIDsFromForm: function() {
        var that = this;
        var associatedAccountCIDs = [];
        this.options.accounts.each(function (account) {
          if (that.$(".selectAccount_" + account.cid + ":checked").length > 0) {
            associatedAccountCIDs.push(account.cid);
          }
        });

        return associatedAccountCIDs;
      },
      validateAll: function() {
        var errors = Validator.validateAll(this.model);
        Validator.showErrors(this.$el);

        var mainSuccess = (errors.length === 0);
        var homeSuccess = this.homeAddressView.validateAll();

        var previousSuccess = true;
        if (this.model.get("needsPreviousAddress")) {
          previousSuccess = this.previousAddressView.validateAll();
        }

        var mailingSuccess = true;
        if (this.model.get("needsMailingAddress")) {
          mailingSuccess = this.mailingAddressView.validateAll();
        }

        return mainSuccess && homeSuccess && previousSuccess && mailingSuccess;
      },
      removeClicked: function() {
        this.trigger("removeView", this);
      },
      needsMailingChanged: function() {
        this.showEl(".mailingAddressHolder", this.$(".needsMailingAddress").val() === "yes");
      },
      needsPreviousChanged: function() {
        this.showEl(".previousAddressHolder", this.$(".needsPreviousAddress").val() === "yes");
      },
      passwordChanged: function() {
        this.$(".password-strength-result ul").removeClass();
        this.$(".passwordStrengthLabel").html("");

        var password = this.$(".passwordInput").val();
        // no validation on empty
        if (password.length === 0) {
          return;
        }

        var strengthText = "";
        var strengthClass = "";
        // password too short overrides any other strength judgment
        if (password.length < 8) {
          strengthClass = "short";
          strengthText = "Too short";
        }
        else {
          var strength = calculateStrength(password);

          if (strength < 2) { strengthText = "Weak"; }
          else if (strength === 2) { strengthText = "Good"; }
          else { strengthText = "Strong"; }

          strengthClass = strengthText.toLocaleLowerCase();
        }

        this.$(".password-strength-result ul").addClass(strengthClass);
        this.$(".passwordStrengthLabel").html(": <strong>" + strengthText + "</strong>");

        function calculateStrength(password) {
          var patterns = [
            /.{8,}/,                                            // at least 8 characters
            /([a-z].*[A-Z])|([A-Z].*[a-z])/,                    // both lower & uppercase
            /[a-zA-Z].*\d|\d.*[a-zA-Z]/,                        // both numbers & letters
            /[!,%,&,@,#,$,^,*,?,_,~]/,                          // at least one special char
            /[!,%,&,@,#,$,^,*,?,_,~].*[!,%,&,@,#,$,^,*,?,_,~]/  // multiple special chars
          ];

          // one point for each matched pattern
          var strength = _(patterns).reduce(function(acc, pattern) {
            return acc + (pattern.test(password) ? 1 : 0);
          }, 0);

          return strength;
        }
      }
    });

    return SingleViews;
  });