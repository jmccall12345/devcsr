define(["jquery", "underscore", "app", "modules/topnav"],
  function($, _, app, TopNav) {
    var sampleTopNavJSON = [{code: "code1", description: "first item", isSelected: true, isEnabled: true},
      {code: "code2", description: "second item", isSelected: false, isEnabled: false},
      {code: "code3", description: "third item"},
      {code: "code4", description: "fourth item"}
    ];

    describe("TopNav collection tests", function() {
      var navItems = null;

      beforeEach(function() {
        navItems = TopNav.loadFromJSON(sampleTopNavJSON);
      });

      function expectedInitialState() {
        expect(navItems.length).toBe(4);
        var notCode1 = navItems.filter(function (item) { return item.get("code") !== "code1"; });
        expect(notCode1.length).toBe(3);
        _(notCode1).each(function(item) {
          expect(item.get("isSelected")).toBe(false);
          expect(item.get("isEnabled")).toBe(false);
        });

        var item0 = navItems.at(0);
        expect(item0.get("isSelected")).toBe(true);
        expect(item0.get("isEnabled")).toBe(true);
      }

      it("TopNav.loadFromJSON loads data", function() {
        expectedInitialState();
      });

      it("Selecting a non-existent element doesn't change element selection or enabling", function() {
        navItems.setActiveCode("NONEXISTENT");
        expectedInitialState();
      });

      it("Selecting a new element in in the collection deselects the old one, enables all up through it", function() {
        navItems.setActiveCode("code3");

        var selectedDivision = navItems.groupBy(function(item) { return "" + item.get("isSelected"); });
        expect(selectedDivision.false.length).toBe(3);
        expect(selectedDivision.true[0].get("code")).toBe("code3");

        selectedDivision = navItems.groupBy(function(item) { return "" + item.get("isEnabled"); });
        expect(selectedDivision.true.length).toBe(3);
        expect(selectedDivision.false[0].get("code")).toBe("code4");
      });
    });

    describe("TopNav view tests", function() {
      var topNavView = null;
      var navItems = null;

      beforeEach(function() {
        var p = $("body").append("<div id='test-fixture'></div>");
        navItems = TopNav.loadFromJSON(sampleTopNavJSON);
        topNavView = new TopNav.Views.Main({
          el: $("#test-fixture"),
          collection: navItems
        });

        var renderDone = false;
        runs(function() {
          topNavView.on("afterRender", function() { renderDone = true; });
          topNavView.render();
        });

        waitsFor(function() { return renderDone; });
      });

      afterEach(function() {
        $("#test-fixture").remove();
        topNavView = null;
        navItems = null;
      });

      it("Initial collection is rendered in template.", function() {
        _(_.range(1, 4)).each(function(i) {
          var el = topNavView.$el.find("li#navCode" + i);

          expect(el.hasClass("active")).toBe(i === 1);
          expect(el.hasClass("disabled")).toBe(i !== 1);
        });
      });

      it("Updating collection selection changes css classes on rendered elements", function() {
        navItems.setActiveCode("code3");

        _(_.range(1, 4)).each(function(i) {
          var el = topNavView.$el.find("li#navCode" + i);

          expect(el.hasClass("active")).toBe(i === 3);
          expect(el.hasClass("disabled")).toBe(i > 3);
        });
      });
    });
  });