'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var merge = require('merge-stream');
var path = require('path');
//var fs = require('fs');
//var glob = require('glob');
var historyApiFallback = require('connect-history-api-fallback');
//var packageJson = require('./package.json');
//var crypto = require('crypto');
var polybuild = require('polybuild');


var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var styleTask = function (stylesPath, srcs) {
  return gulp.src(srcs.map(function(src) {
    return path.join('app', stylesPath, src);
  }))
      .pipe($.changed(stylesPath, {extension: '.css'}))
      .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
      .pipe(gulp.dest('.tmp/' + stylesPath))
      .pipe($.cssmin())
      .pipe(gulp.dest('dist/' + stylesPath))
      .pipe($.size({title: stylesPath}));
};

// Clean output directory
gulp.task('clean', function (cb) {
  del(['.tmp', 'dist'], cb).then(function() {
    cb();
  });
});

// Compile and automatically prefix stylesheets
gulp.task('css', function () {
  return styleTask('css', ['**/*.css']);
});

gulp.task('elements', function () {
  return styleTask('elements', ['**/*.css']);
});

// Optimize images
gulp.task('images', function () {
  return gulp.src('app/images/**/*')
      .pipe(gulp.dest('dist/images'))
      .pipe($.size({title: 'images'}));
});

// Copy all files at the root level (app)
gulp.task('copy', function () {
  var app = gulp.src([
    'app/*',
    '!app/test',
    '!app/cache-config.json'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));

  var bower = gulp.src([
    'bower_components/**/*'
  ]).pipe(gulp.dest('dist/bower_components'));

  var elements = gulp.src(['app/elements/**/*.html'])
      .pipe(gulp.dest('dist/elements'));

  var vulcanized = gulp.src(['app/elements/elements.html'])
      .pipe($.rename('elements.vulcanized.html'))
      .pipe(gulp.dest('dist/elements'));

  return merge(app, bower, elements, vulcanized)
      .pipe($.size({title: 'copy'}));
});


// Lint JavaScript
gulp.task('jshint', function () {
  return gulp.src([
    'app/*.html',
    '!app/test/*.html',
    'app/elements/**/*.js',
    'app/elements/**/*.html',
    'gulpfile.js'
  ])
      .pipe(reload({stream: true, once: true}))
      .pipe($.jshint.extract()) // Extract JS from .html files
      .pipe($.jshint())
      .pipe($.jshint.reporter('jshint-stylish'))
      .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});


// Scan your HTML for assets & optimize them
gulp.task('html', function () {
  var assets = $.useref.assets({searchPath: ['.tmp', 'app', 'dist']});

  return gulp.src(['app/**/*.html', '!app/{elements,test}/**/*.html'])
    // Replace path for vulcanized assets
      .pipe($.if('*.html', $.replace('elements/elements.html', 'elements/elements.vulcanized.html')))
      .pipe(assets)
    // Concatenate and minify JavaScript
      .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    // Concatenate and minify styles
    // In case you are still using useref build blocks
      .pipe($.if('*.css', $.cssmin()))
      .pipe(assets.restore())
      .pipe($.useref())
    // Minify any HTML
      .pipe($.if('*.html', $.minifyHtml({
        quotes: true,
        empty: true,
        spare: true
      })))
    // Output files
      .pipe(gulp.dest('dist'))
      .pipe($.size({title: 'html'}));
});

// Rename Polybuild's index.build.html to index.html
gulp.task('rename-index', function () {
  gulp.src('dist/index.build.html')
      .pipe($.rename('index.html'))
      .pipe(gulp.dest('dist/'));
  return del(['dist/index.build.html']);
});

// Polybuild will take care of inlining HTML imports,
// scripts and CSS for you.
gulp.task('vulcanize', function () {
  return gulp.src('dist/index.html')
      .pipe(polybuild({maximumCrush: true}))
      .pipe(gulp.dest('dist/'));
});

// Watch files for changes & reload
gulp.task('serve', ['css', 'elements'], function () {
  browserSync({
    port: 5000,
    notify: false,
    logPrefix: 'PSK',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function (snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: ['.tmp', 'app'],
      middleware: [ historyApiFallback() ],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['bower_components/**/*.html'], reload);
  gulp.watch(['app/styles/**/*.css'], ['styles', reload]);
  gulp.watch(['app/elements/**/*.css'], ['elements', reload]);
  gulp.watch(['app/{scripts,elements}/**/{*.js,*.html}'], ['jshint']);
  gulp.watch(['app/images/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function () {
  browserSync({
    port: 8888,
    notify: false,
    logPrefix: 'PSK',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function (snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: 'dist',
    middleware: [ historyApiFallback() ]
  });
});

// Build production files, the default task
gulp.task('default',['clean'], function (cb) {
  runSequence(
      ['copy', 'css'],
      'elements',
      ['jshint', 'images', 'html'],
      'vulcanize', 'rename-index',
      cb);
});

// Load tasks for web-component-tester
// Adds tasks for `gulp test:local` and `gulp test:remote`
require('web-component-tester').gulp.init(gulp);

// Load custom tasks from the `tasks` directory
try { require('require-dir')('tasks'); } catch (err) {}
