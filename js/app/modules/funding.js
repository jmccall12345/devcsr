define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/Funding/views",
  "modules/Funding/validator"
],
function(app, $, _, Backbone, Views, Validator) {
  var Funding = app.module();

  Funding.Model = Backbone.Model.extend({
    defaults: {
      methodName: "",
      account: null,
      actualFundingAmount: -1,
      fundingAccount: null
    },
    initialize: function() {
      if (this.get("actualFundingAmount") < 0) {
        this.attributes.actualFundingAmount = this.attributes.account.get("fundingAmount");
      }

      if (_.isNull(this.get("fundingAccount"))) {
        this.set("fundingAccount", new Funding.AccountModel());
      }
    },
    serializeForViewTemplate: function() {
      var results = _.clone(this.get("account").serializeForViewTemplate());
      _.extend(results, this.toJSON());
      // we need to manually overwrite the account cid w/ the funding cid, as it isn't written by toJSON()
      results.cid = this.cid;
      results.formattedActualFundingAmount = app.utils.formatCurrency(this.get("actualFundingAmount"));

      var summary = "";
      switch (this.get("methodName")) {
        case "Funds Transfer":
          summary += "ACH Transfer: ";
          var fundingAccount = this.get("fundingAccount");
          if (!_.isNull(fundingAccount)) {
            summary += fundingAccount.getFullName(", via Trial Deposit verification");
          }
          break;
        case "Wire Transfer":
          summary += "Wire Transfer";
          break;
        case "Mail a Check":
          summary += "Check";
          break;
      }

      results.summary = summary;

      return results;
    },
    serializeForService: function() {
      return {
        methodName: this.get("methodName"),
        account: this.get("account").serializeForService(),
        depositAmount: this.get("actualFundingAmount"),
        fundingAccountCode: this.get("fundingAccount").get("externalId")
      };
    }
  });

  Funding.Collection = Backbone.Collection.extend({
    model: Funding.Model,
    serializeForService: function() {
      return this.map(function(rule) { return rule.serializeForService(); });
    }
  });

  // :NOTE: very distinct, obviously, from Account.Model
  Funding.AccountModel = Backbone.Model.extend({
    defaults: {
      nickname: "",
      externalId: "",
      bankIsValid: false,
      isVerified: false,

      // attributes past this point are only set for user created accounts
      bankName: "",
      routingNumber: "",
      accountNumber: "",
      type: "",
      canInstantVerify: false,
      isPending: false
    },
    serializeForViewTemplate: function() {
      var results = this.toJSON();
      results.cid = this.cid;

      return results;
    },
    getFullName: function(pendingText) {
      var nickname = this.get("nickname");
      if (nickname.trim() !== "") { return nickname; }

      var accountNum = this.get("accountNumber");
      var result = this.get("bankName") + " (XXXXX" + accountNum.substring(accountNum.length - 4) + ") ";
      result += this.get("type");
      if (this.get("isPending")) {
        result += pendingText;
      }

      return result;
    },
    // true iff not yet verified & has all info necessary to begin verification.
    needsVerification: function() {
      return !!this.get("bankIsValid") && !this.get("isVerified");
    },
    // we use this rather than 'isValid' as we don't define validate() -- we're perfectly happy to create
    // invalid objects, and only check validity after the fact.
    isReadyToValidate: function() {
      var errors = Validator.AccountSetup.validateAll(this);
      this.validationErrors = errors;
      return errors.length === 0;
    }
  });

  Funding.AccountModelCollection = Backbone.Collection.extend({
    model: Funding.AccountModel
  });

  Funding.Views = Views;

  return Funding;
});