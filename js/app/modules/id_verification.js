define([
  "app",
  "jquery",
  "underscore",
  "backbone",
  "modules/owner"
],
function(app, $, _, Backbone, Owner) {
  var Models = {};
  Models.Quiz = Backbone.Model.extend({
    defaults: {
      id: ""
    },
    initialize: function() {
      this.attributes.questions = new Collections.QuestionCollection();

      // :TODO: revisit
      // this is more a placeholder to indicate that we REALLY NEED AN OWNER than data of actual value.
      this.attributes.owner = new Owner.Model({});
    },
    serializeForViewTemplate: function() {
      var result = this.toJSON();
      result.cid = this.cid;
      result.owner = this.get("owner").serializeForViewTemplate();
      result.questions = this.get("questions").map(function (q) { return q.serializeForViewTemplate(); });

      return result;
    }
  });

  Models.Question = Backbone.Model.extend({
    defaults: {
      id: "",
      description: ""
    },
    initialize: function() {
      this.attributes.answers = new Collections.AnswerCollection();
    },
    serializeForViewTemplate: function() {
      var result = this.toJSON();
      result.cid = this.cid;
      result.answers = this.get("answers").map(function (a) { return _.extend(a.toJSON(), {cid: a.cid}); });
      return result;
    },
    serializeForGradeService: function()  {
      return {answerId: this.get("selectedAnswerId"), questionId: this.get("id") };
    }
  });

  Models.Answer = Backbone.Model.extend({
    defaults: {
      id: "",
      description: ""
    }
  });

  var Collections = {};
  Collections.QuestionCollection = Backbone.Collection.extend({
    model: Models.Question,
    serializeForGradeService: function() {
      return this.map(function(m) { return m.serializeForGradeService(); });
    }
  });

  Collections.AnswerCollection = Backbone.Collection.extend({
    model: Models.Answer
  });

  var Parsers = {};
  Parsers.readQuizFromJSON = function(json) {
    var quiz = new Models.Quiz({
      id: json.quizId
    });

    quiz.get("questions").add(_.map(json.questions, readQuestionFromJSON));

    return quiz;
  };

  var readQuestionFromJSON = function(json) {
    var question = new Models.Question({
      id: json.questionId,
      description: json.questionText
    });

    question.get("answers").add(_.map(json.listAuthenticationAnsInfos, function(a) {
      return new Models.Answer({ id: a.answerId, description: a.answerText });
    }));

    return question;
  };

  var Views = {};
  Views.Quiz = Backbone.View.extend({
    template: "id_verification/quiz",
    manage: true,
    events: {
      "click .submitQuiz": "submitClicked"
    },
    afterRender: function() {
      var questions = this.model.get("questions");

      var listEl = this.$(".questionList");
      this.listView = new Views.QuestionList({
        el: listEl,
        collection: questions
      });

      this.listView.render();

      if (this.pendingShowModal === true) {
        delete this.pendingShowModal;
        this.showModal();
      }

      questions.on("change", _.bind(this.onAnswerChanged, this));
    },
    serialize: function() {
      return this.model.serializeForViewTemplate();
    },
    submitClicked: function() {
      if (this.$(".submitQuiz").hasClass("disabled")) return;

      // :TODO: include proper user id w/ response
      var gradeQuizRequest = { ownerId: this.model.get("owner").cid };
      var questions = this.model.get("questions");
      gradeQuizRequest.answers = questions.serializeForGradeService();

      app.callService(app.config.serviceKey.GRADE_QUIZ, gradeQuizRequest, responseComplete);

      var that = this;
      function responseComplete(response) {
        // if the service returned a valid non-error http response, the quiz "succeeded"
        // (if it failed, we wait until POST_VERIFY to learn about it)
        that.hideModal();
        that.options.successAction();
      }
    },
    onAnswerChanged: function() {
      var quizComplete = this.model.get("questions").reduce(function(flag, q) {
        return flag && !_.isUndefined(q.get("selectedAnswerId"));
      }, true);

      this.$(".submitQuiz").addClass("disabled");
      if (quizComplete === true) {
        this.$(".submitQuiz").removeClass("disabled");
      }
    },
    showModal: function() {
      var modalEl = this.$("#identityAuth_" + this.model.cid);

      if (modalEl.length === 0) {
        this.pendingShowModal = true;
        return;
      }

      modalEl.modal("show");
      modalEl.scrollTop(0);
    },
    hideModal: function() {
      var modalEl = this.$("#identityAuth_" + this.model.cid);

      // :NOTE: we dispose the view when we hide the modal because otherwise completed quizzes could end up
      // listening to submit events for active quizzes
      var that = this;
      modalEl.on("hidden.bs.modal", function() { that.remove(); });
      modalEl.modal("hide");
    }
  });

  Views.QuestionList = Backbone.View.extend({
    manage: false,
    render: function() {
      var that = this;
      this.$el.empty();
      this.questionViews = this.collection.map(function (q) {
        var containingDiv = that.$el.append("<div></div>").find("div").last();
        return new Views.Question({
          el: containingDiv,
          model: q
        });
      });

      _(this.questionViews).each(function (v) { v.render(); });
    }
  });

  Views.Question = Backbone.View.extend({
    manage: true,
    template: "id_verification/question",
    events: {
      "change input": "selectionChanged"
    },
    serialize: function() {
      return this.model.serializeForViewTemplate();
    },
    selectionChanged: function() {
      var chosenButtonSelector = "input:radio[name=question_" + this.model.cid + "]:checked";
      var selectedAnswerId = this.$(chosenButtonSelector).val();
      this.model.set("selectedAnswerId", selectedAnswerId);
    }
  });

  function runQuizForOwners(ownerArray, containingEl, errorFn, completeFn) {
    var requireIdQuizzes = app.config.requireIdQuizzes !== false; // undefined defaults to true
    if (_.isUndefined(requireIdQuizzes)) { requireIdQuizzes = true; }

    if (!requireIdQuizzes || ownerArray.length === 0) {
      completeFn();
      return;
    }

    var owner = ownerArray.shift();
    var runNextQuiz = function() { runQuizForOwners(ownerArray, containingEl, errorFn, completeFn); };

    // if !isEditable, the owner was verified, and doesn't need to answer a quiz
    if (owner.get("isEditable")) {
      var quizArgs = { ownerId: owner.get("sequenceId") };
      app.callService(app.config.serviceKey.GET_QUIZ, quizArgs, runQuiz);
    }
    else {
      runNextQuiz();
    }

    function runQuiz(serviceResults) {
      var quiz = IdVerification.Parsers.readQuizFromJSON(serviceResults);
      quiz.set("owner", owner);

      var quizEl = containingEl.append("<div></div>").find("div").last();
      var quizView = new IdVerification.Views.Quiz({
        el: quizEl,
        model: quiz,
        successAction: runNextQuiz,
        errorAction: errorFn
      });

      quizView.render();
      quizView.showModal();
    }
  }

  Views.FullProcess = Backbone.View.extend({
    manage: false,
    launch: function() {
      this._makePreliminaryIdCheck();
    },
    _launchQuizzes: function() {
      var allOwners = this.options.jointOwners.models.slice();
      allOwners.unshift(this.options.primaryOwner);

      var that = this;
      function completeQuizzes() {
        app.callService(app.config.serviceKey.POST_VERIFY, {}, that.options.navigateNext );
      }

      runQuizForOwners(allOwners, this.$el, this.options.onError, completeQuizzes);
    },
    _makePreliminaryIdCheck: function() {
      // :TODO: determine appropriate request data
      app.callService(app.config.serviceKey.PRE_VERIFY, {}, responseComplete);

      var that = this;
      function responseComplete(response) {
        // we might want to behave differently if response.success !== true
        that._launchQuizzes();
      }
    }
  });

  var IdVerification = app.module({Models: Models, Collections: Collections, Views: Views, Parsers: Parsers});

  return IdVerification;
});