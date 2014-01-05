define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/error"
],
  function (app, $, _, Backbone, Error) {
    var Validator = _.clone(Error.Validator);

    Validator.validateAll = function (owner) {
      this.errors = new Error.Collection();

      var associatedAccountCIDs = owner.get("associatedAccountCIDs");
      if (!_.isArray(associatedAccountCIDs) || associatedAccountCIDs.length < 1) {
        this.addError(null, ".accountSelectionGroup", ".accountSelectionError");
      }

      // the ONLY thing we validate if the user isn't editable is associated account settings
      if (!owner.get("isEditable")) { return this.errors; }

      // :TODO: extract the following into a separate fn for clarity
      var requiredTextKeys = [
        "nameFirst", "nameLast", "dobYear", "dobMonth", "dobDay", "ssn1", "ssn2", "ssn3",
        "phoneNumber1", "phoneNumber2", "phoneNumber3", "phoneType", "email",
        "secretWord", "secretWordHint"
      ];

      var primaryOnlyTextKeys = ["username", "password", "reenterPassword"];

      // only include uname/pw for primary user
      if (owner.get("isPrimary") === true) {
        requiredTextKeys = _.union(requiredTextKeys, primaryOnlyTextKeys);
      }

      var that = this;
      _.each(requiredTextKeys, function (key) {
        that.textRequired(owner, key, "." + key + "Group", "." + key + "Error");
      });

      _.each(["needsPreviousAddress", "needsMailingAddress"], function (key) {
        that.boolRequired(owner, key, "." + key + "Group", "." + key + "Error");
      });


      if (owner.get("email").toLowerCase() !== owner.get("emailAgain").toLowerCase()) {
        this.addError(null, ".emailAgainGroup", ".emailAgainError");
      }

      if (owner.get("secretWord") === owner.get("secretWordHint")) {
        this.addError("Secret Word and Hint cannot be the same.", ".secretWordGroup", ".secretWordHintError");
      }

      return this.errors;
    };

    return Validator;
  });