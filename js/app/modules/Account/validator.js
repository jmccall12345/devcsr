define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/error"
],
  function(app, $, _, Backbone, Error) {
    var Validator = _.clone(Error.Validator);

    Validator.validateAll = function(obj) {
      this.errors = new Error.Collection();

      var product = obj.get("product");
      if (_.isNull(product)) {
        this.addError(null, ".accountTypeGroup", ".accountType");
      }
      else {
        var minFundingAmount = obj.getMinimumFundingAmount();
        if (minFundingAmount > 0 && obj.get("fundingAmount") < minFundingAmount) {
          this.addError("$" + minFundingAmount + " minimum deposit is required.", ".fundingAmountGroup", ".fundingAmountError");
        }
      }

      return this.errors;
    };

    return Validator;
  });