define(["jquery", "underscore", "backbone", "app", "router"],
  function($, _, Backbone, app, Router) {

    describe("Router tests", function() {
      var router;

      beforeEach(function() {
        // there's only one 'app' object, so we need to clear out the stateData every time we run a test
        app.stateData = {};
        spyOn(app, "callService").andCallFake(function() {
          //the service does NOTHING
        });

        $(".test-fixture").append('<div class="appBody"></div>');

        router = new Router();
      });

      afterEach(function() {
        $(".test-fixture").empty();
        router = null;
      });

      it("getIsSetupAccountsComplete is initially false", function () {
        expect(router.isStep1Complete()).toBeFalsy();
      });

      // :TODO: in the future, we'll want these to be COMPLETE, VALID account entries
      it("getIsSetupAccountsComplete is true if there is an account entry in the app's state", function () {
        router.setupAccounts();
        expect(router.isStep1Complete()).toBeTruthy();
      });

      it("routing events change the current active view in the router", function() {
        // setup a list of empty products so we don't need to wait for callback to render initial account view
        app.stateData.allProducts = new Backbone.Collection({});

        Backbone.history.start();
        Backbone.history.navigate("accounts", true);
        expect(router.mainActiveView.template).toEqual("account/setup");
        Backbone.history.navigate("owners", true);
        expect(router.mainActiveView.template).toEqual("owner/setup");
      });
    });

  });