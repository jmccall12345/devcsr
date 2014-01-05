require([
  "app",
  "router",
  "bootstrap"
],

function(app, Router) {
	
  // Define your master router on the application namespace and trigger all
  // navigation from this instance.
  app.router = new Router();
  Backbone.history.start({ pushState: false, root: app.root });
});
