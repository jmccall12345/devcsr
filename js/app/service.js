define([
  "config",
  "jquery",
  "underscore"
], function(deploymentConfig, $, _) {
  var Service = {};

  var localConfig = {
    serviceURL: "mainHandler",
    serviceKey: {
      GET_ALL_PRODUCTS: "GET_ALL_PRODUCTS",
      GET_QUIZ: "GET_VERIFICATION_QUIZ_FOR_USER_ID",
      GRADE_QUIZ: "GRADE_QUIZ",
      PRE_VERIFY: "PRE_VERIFY_OWNERS",
      POST_VERIFY: "POST_VERIFY_OWNERS",
      REGISTER_OWNERS: "REGISTER_OWNERS",
      REGISTER_ACCOUNTS: "REGISTER_ACCOUNTS",
      CONFIRM_DISCLOSURES: "SIGN_APPLICATION",
      PREPOPULATE_PRIMARY_OWNER: "GET_VERIFIED_OWNER",
      LOOKUP_ROUTING_NUMBER: "LOOKUP_ROUTING_NUMBER",

      LAUNCH_LOGIN: "LAUNCH_LOGIN",
      IS_LOGIN_COMPLETE: "IS_LOGIN_COMPLETE",
      GET_LOGIN_RESULT: "GET_LOGIN_RESULT",

      LAUNCH_IAV: "LAUNCH_IAV",
      IS_IAV_COMPLETE: "IS_IAV_COMPLETE",
      GET_IAV_RESULT: "GET_IAV_RESULT",

      REGISTER_ACCOUNT_FOR_MICRODEPOSIT: "REGISTER_ACCOUNT_FOR_MICRODEPOSIT",
      REGISTER_FUNDING_RULES: "REGISTER_FUNDING_RULES"
    }
  };

  // Service.config.serviceKey is set in the app.js
  Service.config = localConfig;

  // :NOTE: filterServiceArgs implementation is specific to the stubbed service:
  // in the real deployment, it should simply return args unmodified.
  function filterServiceArgs(methodName, args) {
    switch (methodName) {
      case (localConfig.serviceKey.REGISTER_OWNERS):
        smallOwners = _(args.owners).map(function (o) {
          return {cid: o.cid, isPrimary: o.isPrimary, nameFirst: o.nameFirst };
        });

        args.owners = smallOwners;
        break;
    }

    return args;
  }

  Service.callService = function(methodName, serviceArgs, callbackFn, options) {
    var blocksInput = _.isUndefined(options) ? true : !!options.blocksInput;

    var realArgs = filterServiceArgs(methodName, serviceArgs);
    var argString = JSON.stringify(realArgs);
    argString = encodeURIComponent(argString);

    var requestUrl = deploymentConfig.serviceRootUrl + localConfig.serviceURL + "?callback=?&method=" + methodName + "&arguments=" + argString;
    var processingId = blocksInput ? Service.setServiceIsInProcess(true) : undefined;

    // :TODO: Service error. replace body w/ desired behavior.
    function onFail() {
  //    window.location = deploymentConfig.failUrl;
    }

    $.ajax({
      dataType: "json",
      url: requestUrl
    }).done(function(data) { Service.setServiceIsInProcess(false, processingId); callbackFn(data); })
      .fail(onFail);
  };

  // empty fn; overwrite elsewhere (app.js)
  Service.setServiceIsInProcess = function(flag, removalId) { };

  return Service;
});