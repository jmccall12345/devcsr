define([
  "app",
  "jquery",
  "underscore",
  "backbone"
],
function(app, $, _, Backbone) {
 var Error = app.module();

  Error.Model = Backbone.Model.extend({
    // :TODO: error if three required fields aren't set??
    defaults: {
      description: "",
      formGroupElSel: "",
      textElSel: ""
    }
  });

  Error.Collection = Backbone.Collection.extend({
    model: Error.Model
  });

  Error.Validator = {
    showErrors: function(el, errors) {
      this.clearErrors(el);

      if (_.isUndefined(errors)) {
        errors = this.errors;
      }

      var that = this;
      errors.each(function(error) {
        var description = error.get("description");
        var textElSel = error.get("textElSel");
        if (that.stringHasContent(description)) {
          el.find(textElSel + " small").text(description);
        }

        el.find(error.get("formGroupElSel")).addClass("has-error");
        el.find(textElSel).removeClass("hide");
      });
    },
    clearErrors: function(el) {
      if (!_.isUndefined(this.customClearErrors)) {
        this.customClearErrors(el);
      }

      el.find(".control-label,.form-group,.form-group-set").removeClass("has-error");
      el.find(".form-group-error.has-error").addClass("hide");
    },
    addError: function(description, formGroupElSel, textElSel) {
      this.errors.add(new Error.Model({
        description: description,
        formGroupElSel: formGroupElSel,
        textElSel: textElSel
      }));
    },
    textRequired: function(obj, fieldName, formGroupElSel, textElSel) {
      if (!this.stringHasContent(obj.get(fieldName))) {
        this.addError(null, formGroupElSel, textElSel);
      }
    },
    boolRequired: function(obj, fieldName, formGroupElSel, textElSel) {
      if (!_.isBoolean(obj.get(fieldName))) {
        this.addError(null, formGroupElSel, textElSel);
      }
    },
    stringHasContent: function(val) {
      if (!_.isString(val)) {
        return false;
      }

      return (/\S/).test(val);
    }
  };

  return Error;
});