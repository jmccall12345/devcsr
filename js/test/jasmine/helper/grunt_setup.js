require(["jquery", "underscore"],
  function($, _) {
    // when executing the jasmine specs via grunt, the test-fixture element does not exist in the markup.
    $("body").append("<div id='test-fixture'></div>");
  });
