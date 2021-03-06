define([
  // Application.
  "app",
  "modules/topnav",
  "modules/account",
  "modules/product",
  "modules/owner",
  "modules/disclosure",
  "modules/id_verification",
  "modules/funding"
],
function(app, TopNav, Account, Product, Owner, Disclosure, IdVerification, Funding) {

  // apart from the accounts view, all central views share the same core app.stateData
  function makeUniversalViewData(additionalOptions) {
    if (_.isUndefined(additionalOptions)) additionalOptions = {};

    return _.extend({
      el: ".appBody",
      accounts: app.stateData.accounts,
      primaryOwner: app.stateData.primaryOwner,
      jointOwners: app.stateData.jointOwners,
      fundingRules: app.stateData.fundingRules
    }, additionalOptions);
  }

  function prepopulateModels() {
    var primaryOwnerKey = $("#initialPOKey").text();

    app.callService(app.config.serviceKey.PREPOPULATE_PRIMARY_OWNER, {code: primaryOwnerKey}, processPrepopulatedOwner);
    app.stateData.primaryOwner = new Owner.Model({ isPrimary: true });

    function processPrepopulatedOwner(data) {
      if (!_.isNull(data)) {
        var owner = Owner.loadFromJSON(data);
        owner.set({ isPrimary: true, isEditable: false });
        app.stateData.primaryOwner = owner;
      }
    }
  }

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "setupAccounts",
      "accounts": "setupAccounts",
      "owners": "setupOwners",
      "review": "setupReview",
      "sign": "setupSign",
      "funding": "setupFunding",
      "complete": "setupComplete"
    },

    navigateToSection: function(sectionName) {
      // :ASSERT: !_(this.mainActiveView).isUndefined()
      var that = this;
      this.mainActiveView.$el.fadeOut(app.config.transitionLength, function() {
        // we need to use .destroyCompletely() rather than .remove() in order to avoid zombie views.
        that.mainActiveView.destroyCompletely();
        $(".main-panel").append("<div class=\"appBody hide\"></div>");

        that.navigate(sectionName, true);
        $(".appBody").fadeIn(app.config.transitionLength);
      });
    },

    makeNavigateToSectionFn: function(sectionName) {
      return _.bind(function() { this.navigateToSection(sectionName); }, this);
    },

    initialize: function(options) {
      // setup top navigation view
      var navItems = TopNav.loadFromJSON(
          [{code: "accounts", description: "Select a Savings Account", alternateCodes: [""], isEnabled: true, isSelected: true, step: 1},
          {code: "owners", description: "Ownership Information", step: 2},
          {code: "review", description: "Review and Sign", alternateCodes: ["sign"], step: 3},
          {code: "funding", description: "Fund Accounts", alternateCodes: ["complete"], step: 4}
         
        ]);

      var topNavView = new TopNav.Views.Main({
        el: $("#topnav-holder"),
        navigateToSection: _.bind(this.navigateToSection, this),
        collection: navItems
      });

      topNavView.render();

      this.on("all", function(eventName) {
        if (eventName.substring(0, 6) === "route:") {
          var routeMethod = eventName.substring(6);
          if (routeMethod.substring(0, 5) === "setup") {
            var sectionCode = routeMethod.substring(5).toLowerCase();
            topNavView.collection.setActiveCode(sectionCode);
          }
        }
      });

      prepopulateModels();
    },

    setupAccounts: function() {
      // the only stateData member necessary to to start
      if (_.isUndefined(app.stateData.accounts)) {
        var account = new Account.Model({});
        var accounts = new Account.Collection();

        app.stateData.accounts = accounts.add(account);
      }

      var processProductsLoaded = function(productData) {
        app.stateData.allProducts = Product.loadFromJSON(productData);
        setupInitialView();
      };

      var that = this;
      function setupInitialView() {
        var prodCode = app.utils.getQueryStringVal("prod");
        if (_.isString(prodCode)) {
          var initialProduct = app.stateData.allProducts.findWhere({ code: prodCode.toUpperCase() });
          if (_.isObject(initialProduct)) {
            app.stateData.accounts.at(0).set("product", initialProduct);
          }
        }

        var accountView = new Account.Views.Setup({
          el: ".appBody",
          collection: app.stateData.accounts,
          products: app.stateData.allProducts,
          primaryOwner: app.stateData.primaryOwner,
          productSelectionView: Product.Views.SelectionList,
          navigateNext: that.makeNavigateToSectionFn("owners")
        });

        that.mainActiveView = accountView;
        accountView.render();
      }

      if (_.isUndefined(app.stateData.allProducts)) {
        app.callService(app.config.serviceKey.GET_ALL_PRODUCTS, {}, processProductsLoaded);
      }
      else {
        setupInitialView();
      }
    },

    isStep1Complete: function() {
      if (!_.isObject(app.stateData.accounts)) return false;

      var numAccounts = app.stateData.accounts.length;
      if (!_.isNumber(numAccounts)) return false;

      return (numAccounts > 0);
    },

    setupOwners: function() {
      if (!this.isStep1Complete()) {
        this.navigate("", true);
        return;
      }

      // :TODO: this shouldn't be set here: it should be set whenever accounts are set.
      // NOTE that the primary owner MUST be set before we get to the owners view!
      var associatedAccountCIDs = app.stateData.accounts.map(function (account) { return account.cid; } );
      app.stateData.primaryOwner.set({ associatedAccountCIDs: associatedAccountCIDs });

      if (_.isUndefined(app.stateData.jointOwners)) {
        app.stateData.jointOwners = new Owner.Collection();
      }

      var navigateNext = this.makeNavigateToSectionFn("review");
      if (app.config.bypassMiddleOfProcess === true) { navigateNext = this.makeNavigateToSectionFn("funding"); }

      var ownersView = new Owner.Views.Setup(
        makeUniversalViewData({
          navigateBack: this.makeNavigateToSectionFn("accounts"),
          navigateNext: navigateNext
        })
      );

      this.mainActiveView = ownersView;
      ownersView.render();
    },

    setupReview: function() {
      if (!this.isStep1Complete()) {
        this.navigate("", true);
        return;
      }

      var reviewView = new Disclosure.Views.Review(
        makeUniversalViewData({
          navigateBack: this.makeNavigateToSectionFn("owners"),
          navigateNext: this.makeNavigateToSectionFn("sign"),
          navigateToOwners: this.makeNavigateToSectionFn("owners"),
          navigateToAccounts: this.makeNavigateToSectionFn("accounts")
        })
      );

      this.mainActiveView = reviewView;
      reviewView.render();
    },

    setupSign: function() {
      if (!this.isStep1Complete()) {
        this.navigate("", true);
        return;
      }

      var verifyView = new IdVerification.Views.FullProcess(
        makeUniversalViewData({
          el: ".modalHolder",
          navigateNext: this.makeNavigateToSectionFn("funding"),
          onError: function() { console.log("GOTTA IMPL ERROR REDIRECTION!"); } // :TODO: as the message sez!
        })
      );

      var signView = new Disclosure.Views.Sign(
        makeUniversalViewData({
          navigateBack: this.makeNavigateToSectionFn("review"),
          navigateNext: _.bind(verifyView.launch, verifyView)
        })
      );

      this.mainActiveView = signView;
      signView.render();
    },

    setupFunding: function() {
      if (!this.isStep1Complete()) {
        this.navigate("", true);
        return;
      }

      if (_.isUndefined(app.stateData.fundingRules)) {
        app.stateData.fundingRules = new Funding.Collection();
        app.stateData.accounts.each(function(account) {
          var fundingModel = new Funding.Model({
            methodName: "Funds Transfer",
            account: account
          });

          app.stateData.fundingRules.add(fundingModel);
        });
      }

      var fundingView = new Funding.Views.Main(
       makeUniversalViewData({
         navigateNext: this.makeNavigateToSectionFn("complete"),
         fundingAccounts: app.stateData.primaryOwner.get("fundingAccounts"),
         fundingAccountPrototype: Funding.AccountModel
        })
      );

      this.mainActiveView = fundingView;
      fundingView.render();
    },

    setupComplete: function() {
      if (!this.isStep1Complete()) {
        this.navigate("", true);
        return;
      }

      var completeView = new Funding.Views.Complete(makeUniversalViewData());

      this.mainActiveView = completeView;
      completeView.render();
    }

  });

  return Router;

});
