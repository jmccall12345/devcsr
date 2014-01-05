define([
  "app",
  "jquery",
  "underscore",
  "backbone"
  ],
  function(app, $, _, Backbone) {
    var ModalViews = { };

    var runModal = function(opts) {
      var childWindow = window.open(opts.initialUrl, "_blank", "height=400,width=400,modal=yes,alwaysRaised=yes");

      app.callService(opts.initialServiceKey, opts.initialRequest, initializeLoginComplete);

      var processingId = app.setServiceIsInProcess(true);
      var sessionKey;
      var windowStatusTimer = setInterval(checkChild, 200);

      function initializeLoginComplete(initResponse) {
        sessionKey = initResponse[opts.sessionKeyVarName];
        if (!childWindow.closed) { childWindow.location = initResponse.launchUrl; }

        beginPolling();
      }

      function checkChild() {
        if (childWindow.closed) {
          app.setServiceIsInProcess(false, processingId);
          clearInterval(windowStatusTimer);
          if (!_.isUndefined(sessionKey)) {
            var args = {};
            args[opts.sessionKeyVarName] = sessionKey;
            app.callService(opts.getResultServiceKey, args, opts.successCallback);
          }
        }
      }

      function beginPolling() {
        var currentlyPolling = false;
        var pollingTimer = setInterval(pollModal, 500);
        function pollModal() {
          if (childWindow.closed) { clearInterval(pollingTimer); }
          if (currentlyPolling) { return; }

          currentlyPolling = true;
          var args = {};
          args[opts.sessionKeyVarName] = sessionKey;
          app.callService(opts.isCompleteServiceKey, args, pollingComplete, { blocksInput: false });

          function pollingComplete(pollResult) {
            if (pollResult.complete) { childWindow.close(); }
            currentlyPolling = false;
          }
        }
      }
    };

    ModalViews.launchSignInModal = function(isPrimary, successCallback) {
      runModal({
        initialRequest: { isPrimaryOwner: isPrimary },
        successCallback: successCallback,
        initialServiceKey: app.config.serviceKey.LAUNCH_LOGIN,
        isCompleteServiceKey: app.config.serviceKey.IS_LOGIN_COMPLETE,
        getResultServiceKey: app.config.serviceKey.GET_LOGIN_RESULT,
        initialUrl: app.config.initialLoginUrl,
        sessionKeyVarName: "loginSessionKey"
      });
    };

    ModalViews.launchIAVModal = function(accountModel, successCallback) {
      var initialRequest = {
        bankName: accountModel.get("bankName"),
        routingNumber: accountModel.get("routingNumber"),
        accountNumber: accountModel.get("accountNumber"),
        accountType: accountModel.get("type")
      };

      runModal({
        initialRequest: initialRequest,
        successCallback: successCallback,
        initialServiceKey: app.config.serviceKey.LAUNCH_IAV,
        isCompleteServiceKey: app.config.serviceKey.IS_IAV_COMPLETE,
        getResultServiceKey: app.config.serviceKey.GET_IAV_RESULT,
        initialUrl: app.config.initialIAVUrl,
        sessionKeyVarName: "sessionKey"
      });
    };

    return ModalViews;
  }
);