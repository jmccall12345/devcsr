define([
  "config",
  "service",
  "compiled_templates",
  "backbone.layoutmanager"
], function(config, service, CompiledTemplates) {

  // Provide a global location to place configuration settings and module
  // creation.
  var app = {
    config: {
      serviceKey: service.config.serviceKey
    },
    callService: service.callService,
    stateData: {}
  };

  _.extend(app.config, config);

  var processingDiv = $('<div class="modal hide" id="processingDialog" data-backdrop="static" data-keyboard="false"><div class="modal-dialog"><div class="modal-content"><div class="modal-body"><h3>Processing...</h3><p><img src="/assets/img/ajax-loader.gif" alt=""></p></div></div></div></div>');
  var processingIds = [];

  // For the most part, this is used to turn 'processing' mode off & on while a service is running, but we expose it so
  // that the modal views can turn processing off & on directly & not just via app.callservice.
  app.setServiceIsInProcess = function(flag, removeId) {
    var processingId;
    if (!_(flag).isBoolean()) return processingId;

    var processingComplete = false;
    if (flag) {
      processingId = _.uniqueId("processing_");
      processingIds.push(processingId);
    }
    else {
      processingIds = _(processingIds).without(removeId);
      if (!flag && processingIds.length === 0) { processingComplete = true; }
    }

    if (processingComplete) { $('body').removeClass('processing'); }
    else { $('body').addClass('processing'); }

    var modalArg = processingComplete ? "hide" : "show";
    processingDiv.modal(modalArg);
    return processingId;
  };

  service.setServiceIsInProcess = app.setServiceIsInProcess;

  // Configure LayoutManager with Backbone Boilerplate defaults.
  var templates = CompiledTemplates;
  Backbone.Layout.configure({
    // Allow LayoutManager to augment Backbone.View.prototype.
    manage: true,

    prefix: "js/app/templates/",

    fetch: function(path) {
      // Concatenate the file extension.
      path = path + ".html";

      // If cached, use the compiled template.
      if (templates[path]) {
        return templates[path];
      }

      // Put fetch into `async-mode`.
      var done = this.async();

      // Seek out the template asynchronously.
      $.get(app.config.templateRoot + path, function(contents) {
        done(templates[path] = _.template(contents));
      });
    }
  });

  _.extend(Backbone.View.prototype, {
    // all views should have this richer remove
    destroyCompletely: function() {
      if (!_.isUndefined(this.childViews)) {
        _.each(this.childViews, function(view) {
          view.destroyCompletely();
        });
      }

      this.undelegateEvents();

      this.$el.removeData().unbind();

      //Remove view from DOM
      this.remove();
      Backbone.View.prototype.remove.call(this);
    },
    showEl: function(el, flag) {
      if (_.isString(el)) {
        el = this.$(el);
      }

      if (_.isUndefined(flag)) { flag = true; }

      if (flag) { el.show(app.config.transitionLength); }
      else { el.hide(app.config.transitionLength); }
    }
  });

  var utilMethods = {
    scrollToErrorHeader: function() {
      $("html, body").animate({
        scrollTop: $(".alert.alert-danger").first().offset().top
      }, app.config.transitionLength);
    },
    writeOptions: function(list, testVal) {
      var results = "";

      _.each(list, function(item) {
        var itemVal = item;
        var itemDisplay = item;
        if (_.isArray(item)) {
          itemVal = item[0];
          itemDisplay = item[1];
        }

        var selected = (itemVal === testVal) ? "selected" : "";
        if (_.isBoolean(testVal)) {
          selected = "";
          if (testVal && (itemVal === "yes" || itemVal === "true")) {
            selected = "selected";
          }
          if (!testVal && (itemVal === "no" || itemVal === "false")) {
            selected = "selected";
          }
        }

        results += "<option value=\"" + itemVal + "\" " + selected + ">" + itemDisplay + "</option>";
      });

      return results;
    },
    formatCurrency: function(num) {
      var numCents = 2, dot = ".", comma = ",";
      var sign = num < 0 ? "-" : "";
      var intPart = parseInt(num = Math.abs(+num || 0).toFixed(numCents)) + "";
      var commaOffset = (intPart.length > 3) ? intPart.length % 3 : 0;
      return sign + (commaOffset ? intPart.substr(0, commaOffset) + comma : "") + intPart.substr(commaOffset).replace(/(\d{3})(?=\d)/g, "$1" + comma) + (numCents ? dot + Math.abs(num - intPart).toFixed(numCents).slice(2) : "");
    },
    getQueryStringVal: function(paramName) {
      var params = location.search.replace('?', '').split('&');
      var mapped = _.map(params, function(p) {
        var splitVal = p.split("=");
        return { key: splitVal[0], val: splitVal[1] };
      });

      var pair = _.find(mapped, function(p) { return p.key == paramName; });
      return _.isObject(pair) ? pair.val : undefined;
    }
  };

  app.utils = utilMethods;

  app.module = function(additionalProps) {
    return _.extend({ Views: {} }, additionalProps);
  };

  return _(app).extend(Backbone.Events);
});
