define([
  "underscore", "backbone", "app"
],

function(_, Backbone, app) {
  var Product = app.module();

  Product.Model = Backbone.Model.extend({
    defaults: {
      name: "",
      accountName: "",
      accountType: "",
      code: "",
      defaultAPR: -1,
      defaultAPY: -1,
      minimumFundingAmount: 0,
      marketingFeatures: [],
      terms: []
    },
    hasTerms: function() {
      var terms = this.get("terms");
      if (!_.isArray(terms)) {
        return false;
      }

      return (terms.length > 0);
    }
  });

  Product.Collection = Backbone.Collection.extend({
    model: Product.Model
  });

  Product.Views.SelectionList = Backbone.View.extend({
    manage: false,
    render: function() {
      this.$el.removeAttr("disabled");
      var that = this;
      this.collection.each( function(product) {
        that.$el.append("<option value='" + product.get("code") + "'>" + product.get("name") + "</option>");
      });
    }
  });

  Product.loadFromJSON = function(jsonData) {
    if (_.isArray(jsonData)) {
      var models = _(jsonData).map(function(productData) { return Product.loadFromJSON(productData); });
      return new Product.Collection(models);
    }

    var filteredData = _(jsonData).pick([
      "name", "accountName", "accountType", "code", "defaultAPR", "defaultAPY", "minimumFundingAmount",
      "marketingFeatures", "terms"
    ]);

    var product = new Product.Model(filteredData);
    return product;
  };

  return Product;
});
