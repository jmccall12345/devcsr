define([], function() {
  var config = {
    templateRoot: "/",
    serviceRootUrl: "http://demobank.fusebox.com/oaoservice-latest/",
    enrollUrl: "http://demobank.fusebox.com/oao/enroll.html",
    failUrl: "http://demobank.fusebox.com/oao/fail.html",
    hasTopNavigation: false,
    requireUserValidation: false,
    requireAcceptDisclosures: true,
    requireIdQuizzes: false,
    bypassMiddleOfProcess: false,
    transitionLength: 500,
    initialLoginUrl: "waiting.html",
    initialIAVUrl: "waiting.html",
    maxAccountNum: 5,
    maxJointOwnerNum: 3
  };

  return config;
});