define(["jquery", "underscore", "backbone", "modules/account", "modules/owner", "helper/sample_data"],
  function($, _, Backbone, Account, Owner, SampleData) {
    function makeSampleOwner(ownerData) {
      return new Owner.Model(ownerData);
    }

    describe("Populated Owner Edit View Tests", function() {
      // :TODO: not sure we love the including accounts here, but we have to for view rendering
      var emptyAccountList = new Account.Collection();
      var owner;
      var editView;

      function makeViewForOwner(owner) {
        var newView = new Owner.Views.Edit({
          el: $("#test-fixture"),
          model: owner,
          accounts: emptyAccountList
        });

        var renderDone = false;
        runs(function() {
          newView.once("afterRender", function() {
            renderDone = true;
          });

          newView.render();
        });

        waitsFor(function() { return renderDone; });
        return newView;
      }

      afterEach(function() {
        editView = undefined;
        owner = undefined;
        $("#test-fixture").empty();
      });

      describe("setup views w/ default owner", function() {
        beforeEach(function() {
          owner = makeSampleOwner(SampleData.owner);
          editView = makeViewForOwner(owner);
        });

        it("Owner edit view element IDs are determined by the owner model's CID value.", function() {
          // before we check that the IDs are determined by CID, we need to make sure the CID exists
          expect(owner.cid.length).toBeGreaterThan(0);
          expect(editView.$("#nameLast_" + owner.cid).val()).toEqual("Smith");
        });

        it("If owner.isPrimary isn't explicitly set, hide username/pw fields", function() {
          expect(editView.$(".credentialsSection").is(":visible")).toBe(false);
        });
      });

      it("If owner.isPrimary is set, SHOW username/pw fields", function() {
        var ownerData = _(_(SampleData.owner).clone()).extend({ isPrimary: true });
        owner = makeSampleOwner(ownerData);
        editView = makeViewForOwner(owner);

        runs(function() {
          expect(editView.$(".credentialsSection").is(":visible")).toBe(true);
        });
      });
    });

  });