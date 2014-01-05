// we had included deps here, and referenced it via data-main in the main script, but we
// now define it first, and make data-main the entry point in order to better enable ad hoc test pages
var require = {
  "baseUrl": "js/app/",
  "version": "0.2.11.fork",

  paths: {
    "underscore": "../vendor/js/libs/underscore",
    "backbone": "../vendor/js/libs/backbone",
    "backbone.layoutmanager": "../vendor/js/libs/backbone.layoutmanager",
    "jquery": "../vendor/js/libs/jquery",
    "bootstrap": "../vendor/js/libs/bootstrap.min",
    "helper": "../test/jasmine/helper"
  },

  shim: {
    "underscore": {
      "exports": "_"
    },
    "backbone": {
      "deps": [
        "jquery",
        "underscore"
      ],
      "exports": "Backbone"
    },
    "backbone.layoutmanager": {
      "deps": [
        "jquery",
        "backbone",
        "underscore"
      ],
      "exports": "Backbone.Layout"
    },
    "bootstrap": {
      "deps": ["jquery"],
      "exports": "bootstrap"
    }
  }
};

$("body").append("<div id='test-fixture'></div>");
