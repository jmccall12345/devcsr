define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/Funding/validator",
  "modules/account",
  "modal_views"
],
function(app, $, _, Backbone, Validator, Account, ModalViews) {
  var Views = {};

  Views = { };

  Views.Main = Backbone.View.extend({
    template: "funding/main",
    manage: true,
    events: {
      "click .navigateComplete": "navigateNext"
    },
    afterRender: function() {
      var holdingEl = this.$(".fund-accounts");
      this.allViews = [];

      var that = this;
      this.options.fundingRules.each(function(fundingModel) {
        var containingDiv = holdingEl.append("<div class=\"panel panel-default fund-account\"></div>").find("div").last();
        var newFundingView = new Views.Setup({
          el: containingDiv,
          model: fundingModel,
          fundingAccounts: that.options.fundingAccounts,
          fundingAccountPrototype: that.options.fundingAccountPrototype
        });

        newFundingView.render();
        that.allViews.push(newFundingView);
      });
    },
    serialize: function() {
      return this.options.primaryOwner.serializeForViewTemplate();
    },
    navigateNext: function() {
      var fundingValid = true;
      _.each(this.allViews, function(view) {
        if (!view.validateAll()) {
          fundingValid = false;
        }
      });

      var that = this;
      function onComplete(response) {
        that.options.navigateNext();
      }

      this.showEl(".fundingErrorsAlert", !fundingValid);
      if (fundingValid) {
        var fundingArgs = { fundingRules: this.options.fundingRules.serializeForService() };
        app.callService(app.config.serviceKey.REGISTER_FUNDING_RULES, fundingArgs, onComplete);
        return;
      }

      app.utils.scrollToErrorHeader();
    }
  });

  Views.Complete = Backbone.View.extend({
    template: "funding/complete",
    manage: true,
    events: {
      "click .navigateEnroll": "navigateEnroll"
    },
    afterRender: function() {
      var holdingEl = this.$(".accounts");
      this.options.fundingRules.each(function(fundingModel) {
        var containingDiv = holdingEl.append("<div class=\"panel panel-default account account1\">").find("div").last();

        var newFundingView = new Views.Summary({
          el: containingDiv,
          model: fundingModel
        });

        newFundingView.render();
      });
    },
    serialize: function() {
      return this.options.primaryOwner.serializeForViewTemplate();
    },
    navigateEnroll: function() {
      var navigateURL = app.config.enrollUrl + "?name=" + this.options.primaryOwner.getFullName();
      window.location.href = navigateURL;
    }
  });

  Views.Summary = Backbone.View.extend({
    template: "funding/summary",
    manage: true,
    serialize: function() {
      return this.model.serializeForViewTemplate();
    }
  });

  // :TODO: pull new account view out.
  Views.Setup = Backbone.View.extend({
    template: "funding/setup",
    manage: true,
    events: {
      "click .changeDepositAmount": "changeDepositAmountClicked",
      "click .confirmDepositAmount": "confirmDepositAmountClicked",
      "change .fundMethodType": "fundingTypeChanged"
    },
    afterRender: function() {
      this.fromAccountVerifyView = new Views.FundFromVerify({
        el: this.$(".verifyApproachSection"),
        model: this.model.get("fundingAccount")
      });

      this.fromAccountVerifyView.render();

      this.fromAccountView = new Views.FundFromAccount({
        el: this.$(".fromAccountSection"),
        model: this.model.get("fundingAccount"),
        fundingAccounts: this.options.fundingAccounts,
        fundingAccountPrototype: this.options.fundingAccountPrototype,
        verifyView: this.fromAccountVerifyView
      });

      this.fromAccountView.render();

      this.model.on("change:methodName", this.methodChanged, this);
      this.model.on("change:actualFundingAmount", this.fundingAmountChanged, this);
    },
    serialize: function() {
      return this.model.serializeForViewTemplate();
    },
    fundingTypeChanged: function() {
      var tabName = this.$(".fundMethodType:checked").attr("data-tab");

      var fundingMethods = [
        { code: "wireTransfer", name: "Wire Transfer"},
        { code: "mailCheck", name: "Mail a Check"},
        { code: "fundTransfer", name: "Funds Transfer"}
      ];

      var fundingMethod = _(fundingMethods).find(function (x) { return tabName.indexOf(x.code) === 0; });
      this.model.set("methodName", fundingMethod.name);

      this.showEl('.fundingPane', false);
      this.showEl("#" + tabName);
    },
    changeDepositAmountClicked: function() {
      this.$(".fundingAmountInput").prop("disabled", false);
      this.showEl(".changeDepositAmount", false);
      this.showEl(".confirmDepositAmount", true);
    },
    confirmDepositAmountClicked: function() {
      var fundingEl = this.$(".fundingAmountInput");
      var fundingAmountText = fundingEl.val();
      fundingAmountText = fundingAmountText.replace(/[^\d.]/g, '');
      var fundingAmount = Number(fundingAmountText);
      this.model.set("actualFundingAmount", fundingAmount);

      // we remove errors on the deposit amount when we exit edit mode;
      // if it's invalid, the errors will reappear on submit.
      this.$(".fundingAmountInput").prop("disabled", true);
      this.showEl(".changeDepositAmount", true);
      this.showEl(".confirmDepositAmount", false);
      this.$(".depositAmountError").toggleClass("hide", true);
      this.$(".depositAmountGroup").toggleClass("has-error", false);
    },
    fundingAmountChanged: function() {
      var formattedFundingAmount = app.utils.formatCurrency(this.model.get("actualFundingAmount"));
      this.$(".fundingAmountInput").val(formattedFundingAmount);
      this.$(".fundingAmountTopDisplay").text(formattedFundingAmount);
    },
    methodChanged: function() {
      // when we change the method to no longer be funds transfer, our dependent view should be hidden;
      // if we turn this on again, we show it if appropriate
      var isFundsTransfer = this.model.get("methodName") === "Funds Transfer";
      if (isFundsTransfer) { this.fromAccountVerifyView.refresh(); }
      else { this.fromAccountVerifyView.show(false); }
    },
    validateAll: function() {
      var errors = Validator.validateAll(this.model);

      if (!this.$(".confirmTransaction").is(":checked")) {
        Validator.addError("You must authorize the transaction.", ".confirmTransactionGroup", ".confirmTransactionError");
      }

      if (this.$(".fundingAmountInput").is(":enabled")) {
        Validator.addError("Please confirm a deposit amount.", ".depositAmountGroup", ".depositAmountError");
      }

      Validator.showErrors(this.$el);
      return Validator.errors.length === 0;
    }
  });

  Views.FundFromAccount = Backbone.View.extend({
    template: "funding/from_account",
    manage: true,
    events: {
      "change .fundingAccount": "fundingAccountChanged",
      "keyup .routingNumberInput": "routingNumberFormChanged",
      "input .routingNumberInput": "routingNumberFormChanged",
      "keyup .accountNumber,.accountNumberAgain": "accountInfoChanged",
      "change .accountType": "accountInfoChanged",
      "input .accountNumber,.accountNumberAgain,.accountType": "accountInfoChanged"
    },
    afterRender: function() {
      this.refreshFundingAccounts(true);

      this.model.on("change:routingNumber", this.routingNumberChanged, this);
      this.model.on("newlyVerified", this.modelNewlyVerified, this);
      this.model.on("showValidationErrors", this.showValidationErrors, this);
      this.options.fundingAccounts.on("add", this.refreshFundingAccounts, this);
    },
    serialize: function() {
      return this.model.serializeForViewTemplate();
    },
    routingNumberFormChanged: function() {
      var routingNumber = this.$(".routingNumberInput").val();
      var oldRoutingNumber = this.model.get("routingNumber");
      if (oldRoutingNumber === routingNumber) { return; }

      if (routingNumber.length !== 9) {
        this.model.set({
          routingNumber: routingNumber, bankName: "", canInstantVerify: false, bankIsValid: false
        });
        return;
      }

      app.callService(app.config.serviceKey.LOOKUP_ROUTING_NUMBER, {routingNumber: routingNumber}, responseComplete);

      var that = this;
      function responseComplete(data) {
        var bankIsValid = data.isValid;
        var bankName = data.name || "";
        var canInstantVerify = !!data.hasInstantVerification;

        that.model.set({
          routingNumber: routingNumber, bankName: bankName, canInstantVerify: canInstantVerify, bankIsValid: bankIsValid
        });
      }
    },
    routingNumberChanged: function() {
      var bankIsValid = this.model.get("bankIsValid");
      var routingNumber = this.model.get("routingNumber");

      this.showEl(".verifiedBankSection", routingNumber.length === 9);
      this.$(".verifiedBankName").text(this.model.get("bankName"));
      this.showEl(".verifiedBankLabel", bankIsValid);
      this.showEl(".invalidBankLabel", !bankIsValid);

      var accountFields = this.$(".accountNumber,.accountNumberAgain,.accountType");
      if (!bankIsValid) { accountFields.val(""); }
      accountFields.prop("disabled", !bankIsValid);
    },
    accountInfoChanged: function() {
      // the model is updated regardless of whether the form is correct or not.
      // validation occurs against the model and is triggered by a FundFromVerify instance
      var accountNumber = this.$(".accountNumber").val();
      var accountNumberAgain = this.$(".accountNumberAgain").val();
      var accountType = this.$(".accountType").val();

      this.model.set({ accountNumber: accountNumber, accountNumberAgain: accountNumberAgain, type: accountType });
    },
    refreshFundingAccounts: function(isInitialRender) {
      var selectEl = this.$(".fundingAccount");
      var oldOption = selectEl.val();
      selectEl.empty();

      var appendOption = function(val) { selectEl.append(val).find("option").last(); };

      appendOption("<option value=\"\">Please Select an Account for Funding</option>");

      var that = this;
      var selectionSeen = false;
      this.options.fundingAccounts.each(function(acct) {
        var selected = "";
        if (!selectionSeen && _.isEqual(that.model.attributes, acct.attributes)) {
          selected = "selected";
          selectionSeen = true;
        }

        appendOption("<option value=\"" + acct.cid + "\" " + selected + ">" + acct.getFullName(" — PENDING") + "</option>");
      });

      // we start out w/ "new account" selected; when we add new accounts to the list from a DIFFERENT funding view,
      // we need to maintain current selection.
      var addAccountSelected = "";
      if (isInitialRender === true || (!selectionSeen && oldOption == "new")) {
        addAccountSelected = "selected";
      }
      appendOption("<option value=\"new\" " + addAccountSelected + ">Link a New External Account</option>");
      this.fundingAccountChanged();
    },
    fundingAccountChanged: function() {
      var fundingAccountVal = this.$(".fundingAccount").val();
      this.showEl(".newAccount", fundingAccountVal === "new");

      if (fundingAccountVal === "" || fundingAccountVal === "new") {
        this.model.set(this.model.defaults);
        Validator.AccountSetup.clearErrors(this.$el);
        this.$(".launchTrialDepositInfoEl").addClass("hide");
        this.$("input,.accountType").val("");
        return;
      }

      var that = this;
      this.options.fundingAccounts.each(function(acct) {
        // clone account
        if (acct.cid === fundingAccountVal) {
          that.model.set(acct.attributes);
        }
      });

      var accountPending = this.model.get("isPending");
      this.$(".launchTrialDepositInfoEl").toggleClass("hide", !accountPending);
    },
    // when the isVerified property becomes true in the main account, we add a copy to the list of funding accounts
    // and select it.
    modelNewlyVerified: function() {
      if (this.model.get("isVerified") !== true) { return; }

      var newAccount = new this.options.fundingAccountPrototype(this.model.attributes);
      this.options.fundingAccounts.add(newAccount);
      this.refreshFundingAccounts();
    },
    showValidationErrors: function() {
      Validator.AccountSetup.showErrors(this.$el, this.model.validationErrors);
    }
  });

  Views.FundFromVerify = Backbone.View.extend({
    template: "funding/from_account_verify",
    manage: true,
    events: {
      "click .launchIAV": "launchIAVModal",
      "click .verifyViaDeposits": "validateAccountWithDeposits",
      "change .verifyMethodType": "verifyMethodChanged"
    },
    afterRender: function() {
      this.listenTo(this.model, "change:routingNumber change:isVerified", this.refresh);
    },
    refresh: function() {
      this.$("input[name=verifyMethod]").prop("checked", false);
      var canInstantVerify = !!this.model.get("canInstantVerify");
      this.$(".select-verify.tabs").toggleClass("hide", !canInstantVerify);

      this.$(".verifyMethodPane").hide(0);
      if (!canInstantVerify) {
        this.$(".trialDepositPane").show(0);
      }
      this.show(this.model.needsVerification());
    },
    verifyMethodChanged: function() {
      var selectedTabSel = "#" + this.$(".verifyMethodType:checked").attr("data-tab");
      this.showEl('.verifyMethodPane', false);
      this.showEl(selectedTabSel);
    },
    serialize: function() {
      // the only template substitutions are used to make sure elements w/ dom ids are unique
      return { cid: this.cid };
    },
    show: function(flag) {
      if (flag) { this.$el.show(app.config.transitionLength); }
      else { this.$el.hide(app.config.transitionLength); }
    },
    launchIAVModal: function() {
      if (!this.model.isReadyToValidate()) {
        this.model.trigger("showValidationErrors");
        return;
      }

      var that = this;
      function successCallback(response) {
        var updateObj = { isVerified: response.verified };
        if (updateObj.isVerified === true) {
          updateObj.externalId = response.accountCode;
        }

        that.model.set(updateObj);
        if (updateObj.isVerified) {
          that.model.trigger("newlyVerified");
        }
      }

      ModalViews.launchIAVModal(this.model, successCallback);
    },
    validateAccountWithDeposits: function() {
      if (!this.model.isReadyToValidate()) {
        this.model.trigger("showValidationErrors");
        return;
      }

      var that = this;
      function successCallback(response) {
        // :TODO: anything if not verified?
        if (response.verified) {
          that.model.set({ isVerified: true, isPending: true, externalId: response.accountCode });
          that.model.trigger("newlyVerified");
        }
      }

      var registerArgs = {
        routingNumber: this.model.get("routingNumber"),
        accountNumber: this.model.get("accountNumber"),
        accountType: this.model.get("type")
      };

      app.callService(app.config.serviceKey.REGISTER_ACCOUNT_FOR_MICRODEPOSIT, registerArgs, successCallback);
    }
  });

  return Views;
});