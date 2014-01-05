define(["jquery", "underscore", "backbone", "modules/product", "modules/account", "helper/sample_data"],
  function($, _, Backbone, Product, Account, SampleData) {
    var sampleProducts = Product.loadFromJSON(SampleData.products);

    describe("Account Model Tests", function() {
      it("Can begin account creation without product", function() {
        var account = new Account.Model({});
        expect(account.get("product")).toBeNull();
      });

      it("APY comes from default if no terms exist", function() {
        var account = new Account.Model( {
          product: sampleProducts.at(0)
        });

        expect(account.getAPY()).toEqual(1.08);
      });

      it("APY comes from first term, if terms exist and none are selected", function() {
        var account = new Account.Model( {
          product: sampleProducts.at(1)
        });

        expect(account.getAPY()).toEqual(1.25);
      });
    });

    describe("Account View Tests", function() {
      var accountView;

      function setupDescribeView(accountModel) {
        var accountView = new Account.Views.Describe({
          el: $("#test-fixture"),
          model: accountModel,
          products: sampleProducts,
          productSelectionView: Product.Views.SelectionList
        });

        // don't leave the beforeEach call until the view has been rendered
        var renderDone = false;
        runs(function() {
          accountView.on("afterRender", function() {
            renderDone = true;
          });

          accountView.render();
        });

        waitsFor(function() {
          return renderDone;
        }, 1000);

        return accountView;
      }

      beforeEach(function() {
        var account = new Account.Model({});
        accountView = setupDescribeView(account);
      });

      afterEach(function() {
        $("#test-fixture").empty();
        accountView = undefined;
      });

      function selectProduct(productName) {
        var productSelector = accountView.$(".accountTypeSelect");
        productSelector.val(productName);
        // somehow the event is triggered when we change in the browser, but not from a jquery .val() set
        productSelector.trigger("change");
      }

      it("Changing product selection element in view updates product in account model.", function() {
        expect(accountView.model.get("product")).toBeNull();
        selectProduct('CD_CODE');
        expect(accountView.model.get("product").get("name")).toEqual("CD");
      });

      describe("set account fundingAmount via view", function () {
        beforeEach(function() { selectProduct("ONLINE_SAVINGS"); });

        it("Changing Amount to Fund element in view updates product fundingAmount in account model", function() {
          expect(accountView.model.get("fundingAmount")).toEqual(0);
          accountView.$(".fundingAmount").val("1200");
          accountView.validateAll();
          expect(accountView.model.get("fundingAmount")).toEqual(1200);
        });

        it("Enter sufficient funding amount, no error shows", function() {
          accountView.$(".fundingAmount").val("505");
          accountView.validateAll();
          expect(accountView.$(".fundingAmountError").is(":visible")).toBe(false);
        });

        it("Enter sufficient funding amount, error is visible", function() {
          accountView.$(".fundingAmount").val("495");
          accountView.validateAll();
          expect(accountView.$(".fundingAmountError").is(":visible")).toBe(true);
        });
      });

      it("Selecting Product in View makes rest of view visible", function() {
        expect(accountView.$(".rateSection").is(":visible")).toBeFalsy();

        runs(function() {
          accountView.model.set("product", accountView.options.products.at(1));
        });

        waitsFor(function() {
          return (accountView.$(".rateSection").is(":visible") === true);
        }, 1000);

        runs(function() {
          expect(accountView.$(".rateSection").is(":visible")).toBe(true);
        });
      });

      it("Selecting Product in View sets correct header names", function() {
        expect(accountView.$(".rateHeader").text()).toEqual("");
        accountView.model.set("product", sampleProducts.at(1));
        expect(accountView.$(".rateHeader").text()).toEqual("CD Account");
      });

      it("Selecting Product in View updates the feature list", function() {
        expect(accountView.$(".featuresList li").length).toEqual(0);
        accountView.model.set("product", accountView.options.products.at(1));
        expect(accountView.$(".featuresList li").length).toEqual(4);
        expect(accountView.$(".featuresList li").first().text()).toEqual("Great Rates, Guaranteed Returns");
      });

      it("Selecting Product with terms updates select box contents", function() {
        expect(accountView.$(".accountTermSelect option").length).toEqual(0);
        accountView.model.set("product", accountView.options.products.at(1));
        expect(accountView.$(".accountTermSelect option").length).toEqual(2);
      });

      // :TODO: move to model tests section
      it("With a termed product, sufficient funding is determined at term, not product, level", function() {
        selectProduct("CD_CODE");
        accountView.termSelectionChanged();
        expect(accountView.model.getMinimumFundingAmount()).toEqual(100);
        accountView.$(".accountTermSelect").val("12");
        accountView.termSelectionChanged();
        expect(accountView.model.getMinimumFundingAmount()).toEqual(200);
      });

      it("With a non-termed product, sufficient funding is determined at product, not term, level", function() {
        selectProduct("ONLINE_SAVINGS");
        expect(accountView.model.getMinimumFundingAmount()).toEqual(500);
      });

      describe("Account View Population Tests", function() {
        function makeAccountModel(productIndex, fundingAmount, termIndex) {
          var product = sampleProducts.at(productIndex);
          var term = null;

          if (!_.isUndefined(termIndex)) {
            term = product.get("terms")[termIndex];
          }

          return new Account.Model({
            product: product,
            fundingAmount: fundingAmount,
            term: term
          });
        }

        it("Account.Views.Describe prepopulation", function() {
          var account = makeAccountModel(1, 2000, 1);

          var populatedAccountView = setupDescribeView(account);

          runs(function() {
            // :TODO: impl here
            accountTypeEl = populatedAccountView.$(".accountTypeSelect");
            termEl = populatedAccountView.$(".accountTermSelect");
            fundingAmountEl = populatedAccountView.$(".fundingAmount");

            expect(accountTypeEl.val()).toEqual("CD_CODE");
            expect(termEl.val()).toEqual("12");
            expect(fundingAmountEl.val()).toEqual("2,000.00");

            $("#test-fixture").empty();
          });
        });

        it("Account.Views.List prepopulation", function() {
          var accounts = new Account.Collection();
          accounts.add(makeAccountModel(1, 2000, 1)); // 12 months
          accounts.add(makeAccountModel(0, 1500, undefined)); // no term
          accounts.add(makeAccountModel(1, 1700, 0)); // 3 month

          var listView = new Account.Views.List({
            collection: accounts,
            el: $("#test-fixture"),
            products: sampleProducts,
            productSelectionView: Product.Views.SelectionList
          });

          listView.render();
          var describeViews = listView.allViews;

          expect(describeViews.length).toEqual(3);
        });
      });
    });
  });