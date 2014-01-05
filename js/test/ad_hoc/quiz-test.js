require([
  "app",
  "router",
  "bootstrap",
  "modules/owner",
  "modules/id_verification"
],
  function(app, Router, bootstrap, Owner, IdVerification) {
    var owner = new Owner.Model({ serviceId: "ARBITRARY", nameFirst: "Bob", nameMiddle: "Imaginary", nameLast: "Smith" });
    var quizArgs = { ownerId: owner.get("serviceId") };

    app.callService(app.config.serviceKey.GET_QUIZ, quizArgs, displayIdVerificationView);

    function displayIdVerificationView(results) {
      var quiz = IdVerification.Parsers.readQuizFromJSON(results);
      quiz.set("owner", owner);

      var quizView = new IdVerification.Views.Quiz({
        el: ".quiz-holder",
        model: quiz,
        successAction: quizSubmitted,
        errorAction: function() { console.log("error on submission"); }
      });

      quizView.render();
      quizView.showModal();
    }

    function quizSubmitted() {
      alert("quiz successfully submitted.");
    }
  }
);
