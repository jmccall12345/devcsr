define([
  "app",
  "backbone",
  "modules/Account/views"
],

function(app, Backbone, Views) {
  var Account = app.module();

  Account.Model = Backbone.Model.extend({
    defaults: {
      product: null,
      fundingAmount: 0,
      term: null
    },
    initialize: function() {
    },
    // :TODO: refactor to share code between getAPY, getAPR, getAPYDescription, & getFundingMinimum??
    getAPY: function() {
      var selectedTerm = this.get("term");
      if (!_.isNull(selectedTerm)) {
        return selectedTerm.apy;
      }

      var product = this.get("product");
      if (_.isNull(product)) {
        return -1;
      }

      var terms = product.get("terms");
      if (terms.length > 0) {
        return terms[0].apy;
      }
      else {
        return product.get("defaultAPY");
      }
    },
    getAPR: function() {
      var selectedTerm = this.get("term");
      if (!_.isNull(selectedTerm)) {
        return selectedTerm.apr;
      }

      var product = this.get("product");
      if (_.isNull(product)) {
        return -1;
      }

      var terms = product.get("terms");
      if (terms.length > 0) {
        return terms[0].apr;
      }
      else {
        return product.get("defaultAPR");
      }
    },
    getAPYDescription: function() {
      var selectedTerm = this.get("term");
      if (!_.isNull(selectedTerm)) {
        return selectedTerm.apyDescription;
      }

      var product = this.get("product");
      if (_.isNull(product)) {
        return "";
      }

      var terms = product.get("terms");
      if (terms.length > 0) {
        return terms[0].apyDescription;
      }
      else {
        return "for all balances";
      }
    },
    getMinimumFundingAmount: function() {
      var selectedTerm = this.get("term");
      if (!_.isNull(selectedTerm)) {
        return selectedTerm.minimumFundingAmount;
      }

      var product = this.get("product");
      if (_.isNull(product)) {
        return -1;
      }

      var terms = product.get("terms");
      if (terms.length > 0) {
        return terms[0].minimumFundingAmount;
      }
      else {
        return product.get("minimumFundingAmount");
      }
    },
    getProductName: function() {
      var product = this.get("product");
      if (_.isNull(product)) {
        return undefined;
      }

      var name = product.get("name");

      var selectedTerm = this.get("term");
      if (!_.isNull(selectedTerm)) {
        name += " — " + selectedTerm.description;
      }

      return name;
    },
    serializeForViewTemplate: function() {
      var results = this.toJSON();
      results.cid = this.cid;
      results.formattedFundingAmount = app.utils.formatCurrency(this.get("fundingAmount"));

      results.accountAPR = this.getAPR();
      results.accountAPY = this.getAPY();
      results.productName = this.getProductName();

      return results;
    },
    serializeForService: function() {
      var result = {
        productCode: this.get("product").get("code"),
        accountType: this.get("product").get("accountType"),
        openingDepositAmount: this.get("fundingAmount"),
        termLength: _.isNull(this.get("term")) ? 0 : this.get("term").length
      };

      return result;
    }
  });

  Account.Collection = Backbone.Collection.extend({
    model: Account.Model,
    serializeForViewTemplate: function() {
      return this.map(function (account) { return account.serializeForViewTemplate(); });
    }
  });

  Account.Views = Views;
  
  return Account;
});
