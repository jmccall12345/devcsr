module.exports = function(grunt) {
  var localPort = 18888;

  // Project configuration.
  grunt.initConfig({
    connect: {
      server: {
        options: {
          port: localPort
        }
      }
    },
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: [
        "Gruntfile.js", "js/app/**/*.js", "js/test/ad_hoc/**/*.js",
        "js/test/jasmine/spec/**/*.js", "js/test/jasmine/helper/**/*.js"
      ]
    },
    requirejs: {
      production: {
        options: {
          mainConfigFile: "r-build.json",
          out: "build/assets/js/main.js",
          insertRequire: ["main"]
        }
      }
    },
    jasmine: {
      myTask: {
        src: "main",
        options: {
          specs: ["test_build/js/test/jasmine/spec/*.js"],
          helpers: "test_build/js/test/jasmine/helper/grunt_setup.js",
          host: "http://localhost:" + localPort + "/",
          styles: "test_build/js/test/jasmine/grunt_runner_styles.css",
          template: require('grunt-template-jasmine-requirejs'),
          templateOptions: {
            requireConfigFile: "test_build/js/test/jasmine/config-require.js"
          }
        }
      }
    },
    jst: {
      forTest: {
        options: {
          prettify: true,
          amd: true
        },
        files: {
          "test_build/js/app/compiled_templates.js": ["js/app/templates/**/*.html"]
        }
      }
    },
    copy: {
      forTest: {
        files: [
          {expand: true, src: ["assets/**", "js/**"], dest: "test_build/"}
        ]
      },
      production: {
        files: [
          { expand: true, cwd: "test_build/",
            src: ["assets/fonts/**", "assets/img/**", "assets/js/respond.min.js"],
            dest: "build/" },
          { expand: false, src: ["js/vendor/js/libs/almond.js"], dest: "build/assets/js/require.js" },
          { expand: false, src: "index_post_processing.html", dest: "build/index.html" },
          { expand: false, src: "waiting_post_processing.html", dest: "build/waiting.html" }
        ]
      }
    },
    clean: {
      testAll: { src: ["test_build/"] },
      testTemplates: { src: ["test_build/js/app/templates"] },
      production: { src: ["build"] }
    },
    less: {
      production: {
        files: { "build/assets/css/style.css": "assets/less/style.less" }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jst');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-less');

  // Default task(s).
  grunt.registerTask("default", ["jshint"]);

  grunt.registerTask("validate", [
    "jshint", "clean:testAll", "copy:forTest", "jst:forTest", "clean:testTemplates", "connect", "jasmine"
  ]);

  grunt.registerTask("production", [
    "validate", "clean:production",
    "copy:production", "less:production", "requirejs:production"
  ]);
};