define(["jquery", "underscore", "modules/product", "helper/sample_data"],
  function($, _, Product, SampleData) {

    describe("Product model tests", function() {
      it("Successfully load product model from (already eval'd) JSON", function() {
        var theProduct = Product.loadFromJSON(SampleData.products[1]);
        expect(theProduct.get("name")).toEqual("CD");
        expect(theProduct.get("accountName")).toEqual("CD Account");
        expect(theProduct.get("code")).toEqual("CD_CODE");
        expect(theProduct.get("terms").length).toEqual(2);
        expect(theProduct.get("terms")[0].length).toEqual(3);
        expect(theProduct.get("terms")[1].length).toEqual(12);
        expect(theProduct.get("marketingFeatures")[2]).toEqual("Interest when you Need it");
      });

      it("Successfully load LISTS of product models from (already eval'd) JSON", function() {
        var products = Product.loadFromJSON(SampleData.products);

        expect(products.length).toEqual(2);
        expect(products.at(0).get("name")).toEqual("Online Savings");
        expect(products.at(1).get("name")).toEqual("CD");
      });

      it("product.hasTerms() is true if the term list has values", function() {
        var products = Product.loadFromJSON(SampleData.products);
        expect(products.at(1).hasTerms()).toBeTruthy();
      });

      it("product.hasTerms() is false if the term list is false", function() {
        var products = Product.loadFromJSON(SampleData.products);
        expect(products.at(0).hasTerms()).toBeFalsy();
      });
    });

    describe("Product Selection View Tests", function() {
      beforeEach(function() {
        $("#test-fixture").append(
          '<select class="accountTypeSelect"><option value="Account Type">Account Type</option></select>'
        );
      });

      afterEach(function() {
        $("#test-fixture").empty();
      });

      it("Creating Product Selection view using sample data adds two elements to select element.", function() {
        var selectEl = $(".accountTypeSelect");
        expect(selectEl.find("option").length).toEqual(1);

        var products = Product.loadFromJSON(SampleData.products);
        var selectionView = new Product.Views.SelectionList({
          el: selectEl,
          collection: products
        });
        selectionView.render();

        expect(selectEl.find("option").length).toEqual(3);
      });
    });
  });