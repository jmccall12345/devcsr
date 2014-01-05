define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/Account/validator",
  "modal_views"
],

  function(app, $, _, Backbone, Validator, ModalViews) {
    var Views = { };

    Views.Describe = Backbone.View.extend({
      template: "account/describe",
      manage: true,
      events: {
        "change .accountTypeSelect": "productSelectionChanged",
        "change .accountTermSelect": "termSelectionChanged",
        "click .removeAccount": "removeClicked",
        "blur .fundingAmount": "changeFundingAmount"
      },
      afterRender: function() {
        var productSelectEl = this.$(".accountTypeSelect");
        var initialProductSelection = new this.options.productSelectionView({
          el: productSelectEl,
          collection: this.options.products
        });

        initialProductSelection.render();

        var product = this.model.get("product");
        if (!_.isNull(product)) {
          this.$(".accountTypeSelect").val(product.get("code"));
          this.displayProductDetails(product);
          var term = this.model.get("term");

          if (!_.isNull(term)) {
            this.$(".accountTermSelect").val(term.length);
          }

          var fundingAmount = this.model.get("fundingAmount");
          if (fundingAmount > 0) {
            this.$(".fundingAmount").val(app.utils.formatCurrency(fundingAmount));
          }
        }

        // we call the modelChanged method once just to refresh the APR/APY/Copy text
        this.modelChanged();
        this.model.on("change", _.bind(this.modelChanged, this));
      },
      productSelectionChanged: function() {
        var productCode = this.$(".accountTypeSelect").val();
        var selectedProduct = null;
        this.options.products.each(function(product) {
          if (product.get("code") === productCode) {
            selectedProduct = product;
          }
        });

        var selectedTerm = null;
        if (!_.isNull(selectedProduct)) {
          var possibleTerms = selectedProduct.get("terms");
          if (possibleTerms.length > 0) { selectedTerm = possibleTerms[0]; }
        }

        this.model.set({"product": selectedProduct, "term": selectedTerm});
      },
      termSelectionChanged: function() {
        var termLength = this.$(".accountTermSelect").val();
        var possibleTerms = this.model.get("product").get("terms");
        var selectedTerm = null;
        _.each(possibleTerms, function(term) {
          if (term.length + "" === termLength) {
            selectedTerm = term;
          }
        });
        this.model.set({"term": selectedTerm});
      },
      modelChanged: function() {
        this.displayAPYInfo();
        this.displayProductDetails(this.model.get("product"));
      },
      displayAPYInfo: function() {
        // if it's -1 (invalid) we don't change the display, as it's fading out.
        // this is a pretty kludgy way to make the display happy; may want to reorganize
        if (this.model.getAPY() >= 0) {
          this.$(".apyValue").text(this.model.getAPY().toFixed(2));
          this.$(".aprValue").text(this.model.getAPR().toFixed(2));
          this.$(".apyDescription").text(this.model.getAPYDescription());
        }
      },
      displayProductDetails: function(product) {
        if (product !== null) {
          var accountName = product.get("accountName");
          this.$(".rateHeader").text(accountName);
          this.$(".featuresHeader").text(accountName);
          this.$(".termSelectHeader").text(accountName);

          this.displayProductFeatures(product.get("marketingFeatures"));
          this.displayTermOptions(product.get("terms"));
          this.displayUniversalProductElements(true);
        }
        else {
          this.displayTermOptions([]);
          this.displayUniversalProductElements(false);
        }
      },
      displayProductFeatures: function(features) {
        var featureUL = this.$(".featuresList");
        featureUL.empty();

        _.each(features, function(feature) {
          featureUL.append("<li>" + feature + "</li>");
        });
      },
      displayTermOptions: function(terms) {
        var activeTermLength = "";
        var activeTerm = this.model.get("term");
        if (!_.isNull(activeTerm)) {
          activeTermLength = activeTerm.length + "";
        }

        var selectEl = this.$(".accountTermSelect");
        selectEl.empty();
        _.each(terms, function(term) {
          var selected="";
          if (activeTermLength === term.length + "") {
            selected = "selected";
          }

          selectEl.append("<option value='" + term.length + "' " + selected + ">" + term.description + "</option>");
        });

        this.showEl(".accountTerm", terms.length > 0);
      },
      displayUniversalProductElements: function(show) {
        this.$(".productSelectionDiv").toggleClass("col-md-offset-4", !show);
        this.showEl(".rateSection,.featuresSection,.amount-to-fund", show);
      },
      showDeleteButton: function(show) {
        this.showEl(".removeAccount", show);
      },
      removeClicked: function() {
        this.trigger("removeView", this);
      },
      // currently, fundingAmount is set indirectly, via this method: we might be better off if
      // trying to set a value in the model (ie, via this.model.set("fundingAmount", value)) triggered
      // the validation logic, rather than vice versa.
      changeFundingAmount: function() {
        var fundingEl = this.$(".fundingAmount");
        var fundingAmountText = fundingEl.val();
        fundingAmountText = fundingAmountText.replace(/[^\d.]/g, '');
        var fundingAmount = Number(fundingAmountText);
        this.model.set("fundingAmount", fundingAmount);

        fundingAmountText = "";
        if (fundingAmount !== 0) {
          fundingAmountText = app.utils.formatCurrency(fundingAmount);
        }
        fundingEl.val(fundingAmountText);
      },
      validateAll: function() {
        this.changeFundingAmount();
        var errors = Validator.validateAll(this.model);
        Validator.showErrors(this.$el);
        return errors.length === 0;
      }
    });

    Views.SummaryList = Backbone.View.extend({
      manage: true,
      template: "account/summary_list",
      serialize: function() {
        var serializedItems = this.collection.serializeForViewTemplate();
        return { items: serializedItems };
      }
    });

    Views.List = Backbone.View.extend({
      manage: false,
      events: {
        "click .addAccountButton": "addNewAccount"
      },
      render: function() {
        this.allViews = [];
        this.childViews = this.allViews;
        this.$("#accountList").empty();

        this.collection.each(_.bind(this.registerAndRenderNewAccount, this));
        this.refreshCanAddOrRemoveAccounts();
      },
      validateAll: function() {
        var success = true;
        _.each(this.allViews, function(describeView) {
          if (!describeView.validateAll()) {
            success = false;
          }
        });

        return success;
      },
      addNewAccount: function() {
        var newAccount = new this.collection.model();
        this.collection.add(newAccount);
        this.registerAndRenderNewAccount(newAccount);

        this.refreshCanAddOrRemoveAccounts();
      },
      registerAndRenderNewAccount: function(account) {
        var listEl = this.$("#accountList");
        var containingDiv = listEl.append("<div></div>").find("div").last();
        var newDescribeView = new Views.Describe({
          el: containingDiv,
          model: account,
          products: this.options.products,
          productSelectionView: this.options.productSelectionView
        });

        newDescribeView.render();

        newDescribeView.on("removeView", this.removeChildView, this);

        this.allViews.push(newDescribeView);
      },
      refreshCanAddOrRemoveAccounts: function() {
        this.showEl(".addAccountDiv", this.collection.length < app.config.maxAccountNum);

        var canDelete = (this.allViews.length > 1);
        _.each(this.allViews, function(view) { view.showDeleteButton(canDelete); });
      },
      removeChildView: function(view) {
        this.collection.remove(view.model);
        var indexOfViewInList = 0;
        for (var i=0; i<this.allViews.length; i++) {
          if (this.allViews[i] === view) {
            indexOfViewInList = i;
          }
        }

        this.allViews.splice(indexOfViewInList, 1);
        this.refreshCanAddOrRemoveAccounts();

        view.$el.hide(app.config.transitionLength, function() {
          view.destroyCompletely();
        });
      }
    });

    Views.Setup = Backbone.View.extend({
      "manage": true,
      "template": "account/setup",
      events: {
        "click .navigateOwners": "nextClicked",
        "click .initialSignIn": "loginClicked"
      },
      afterRender: function() {
        this.listView = new Views.List({
          el: "#accountListHolder",
          collection: this.collection,
          products: this.options.products,
          productSelectionView: this.options.productSelectionView
        });

        // :NOTE: as we'd lose track of previews listView values, we can only safely render a given Setup view ONCE
        this.childViews = [ this.listView ];
        this.listView.render();
        this.refreshOwnerInfo();
      },
      refreshOwnerInfo: function() {
        var primaryOwner = this.options.primaryOwner;
        var isEditable = primaryOwner.get("isEditable");
        this.$(".actions-signin").toggleClass("hide", !isEditable);
        this.$(".welcomeLabel").text(!isEditable ? "Welcome, " + primaryOwner.getFullName() + "." : "Welcome.");
      },
      loginClicked: function() {
        var that = this;
        ModalViews.launchSignInModal(true, function(response) {
          if (_.isNull(response)) { return; }
          that.options.primaryOwner.updateFromJSON(response);
          that.options.primaryOwner.set({ isEditable: false });
          that.refreshOwnerInfo();
        });
      },
      nextClicked: function() {
        if (this.listView.validateAll()) {
          this.$(".errorsOnPage").hide(app.config.transitionLength);
          this.registerAccounts();
          return;
        }

        this.showEl(".errorsOnPage");
        app.utils.scrollToErrorHeader();
      },
      registerAccounts: function() {
        var accounts = this.collection.map(function(account) { return account.serializeForService(); });
        app.callService(app.config.serviceKey.REGISTER_ACCOUNTS, {accounts: accounts}, responseComplete);

        var that = this;
        function responseComplete(response) {
          that.options.navigateNext();
        }
      }
    });

    return Views;
  });