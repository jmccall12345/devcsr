define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/error"
],
function(app, $, _, Backbone, Error) {
  var Validator = _.clone(Error.Validator);

  Validator.validateAll = function(funding) {
    this.errors = new Error.Collection();

    if (funding.get("methodName") === "Funds Transfer") {
      var fundingAccount = funding.get("fundingAccount");
      if (fundingAccount.get("bankIsValid") !== true) {
        this.addError(null, ".selectAccountGroup", ".selectAccountError");
      }
    }

    var minimumDeposit = funding.get("account").getMinimumFundingAmount();
    if (funding.get("actualFundingAmount") < minimumDeposit) {
      this.addError("$" + minimumDeposit + " minimum deposit is required.", ".depositAmountGroup", ".depositAmountError");
    }

    return this.errors;
  };

  Validator.AccountSetup = _.clone(Error.Validator);

  Validator.AccountSetup.validateAll = function(account) {
    this.errors = new Error.Collection();

    this.textRequired(account, "routingNumber", ".routingNumGroup", ".routingNumError");
    this.textRequired(account, "accountNumber", ".accountNumGroup", ".accountNumError");
    if (account.get("accountNumber") !== account.get("accountNumberAgain")) {
      this.addError(null, ".accountNum2Group", ".accountNum2Error");
    }

    this.textRequired(account, "type", ".accountTypeGroup", ".accountTypeError");

    return this.errors;
  };

  return Validator;
});