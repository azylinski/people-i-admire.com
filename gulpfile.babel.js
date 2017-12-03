'use strict';

import gulp from 'gulp';
import del from 'del';
import {create as bsCreate} from 'browser-sync';
import gulpLoadPlugins from 'gulp-load-plugins';
import gulpAmpValidator from 'gulp-amphtml-validator';
import runSequence from 'run-sequence';
import babelify from 'babelify';

const plugins = gulpLoadPlugins();
const browserSync = bsCreate();
const DEFAULT_LOCALE = 'en';
const LOCALES = ['en'];

// Minifies and concatenates styles while also removing unused styles from stylesheets.
gulp.task('styles', () => {
  const AUTOPREFIXER_BROWSERS = [
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

  // For best performance, don't add Sass partials to `gulp.src`
  return gulp.src('src/css/**/*.scss')
    .pipe(plugins.newer('.tmp/css'))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass({
      precision: 10,
      includePaths: [
        './node_modules/bootstrap/scss/',
        './node_modules/froala-design-blocks/src/scss/'
      ]
    }).on('error', plugins.sass.logError))
    .pipe(plugins.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('.tmp/css'))
    // Removes unused styles
    .pipe(plugins.uncss({
      html: ['.tmp/**/*.html']
    }))
    // Concatenate and minify styles
    .pipe(plugins.if('*.css', plugins.cleanCss()))
    // Make it AMP complient
    .pipe(plugins.replaceImportant())
    .pipe(plugins.replace('@-ms-viewport{width:device-width}', ''))
    .pipe(plugins.size({title: 'css'}))
    .pipe(plugins.sourcemaps.write('./'))
    .pipe(gulp.dest('dist/css'));
});

// Minifies HTML
gulp.task('html', () => {
  return gulp.src('.tmp/**/*.html')
    .pipe(plugins.useref({
      searchPath: '{.tmp,src}',
      noAssets: true
    }))
    .pipe(plugins.inject(gulp.src(['dist/**/*.css']), {
      transform: (filePath, file) => '<style amp-custom>' + file.contents.toString('utf8') + '</style>',
    }))
    .pipe(plugins.if('*.html', plugins.htmlmin({
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      removeOptionalTags: true
    })))
    // Output files
    .pipe(plugins.if('*.html', plugins.size({title: 'html', showFiles: true})))
    .pipe(gulp.dest('dist'));
});

// copy files for build process
gulp.task('copy:tmp', () => 
  gulp.src(
    ['src/**/*.html']
  ).pipe(gulp.dest('.tmp'))
);

// copy static assets for prod
gulp.task('copy:static', () => {
  gulp.src(
    ['src/favicon.ico', 'src/manifest.json', 'src/humans.txt', 'src/robots.txt', 'src/CNAME']
  ).pipe(gulp.dest('dist'))

  gulp.src('src/img/*').pipe(gulp.dest('dist/img'))
});

// Clean output directory
gulp.task('clean', () => del(['.tmp', 'dist/**/*', '!dist/.git'], {dot: true}));

gulp.task('server', () =>
  browserSync.init({
    // customize the browserSync console logging prefix
    logprefix: 'pia',
    // run as an https by uncommenting 'https: true'
    // note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: ['dist'],
    port: 3000,
    reloaddelay: 1000
  })
);

// Watch files for changes & reload
gulp.task('dev', ['styles', 'html', 'server'], () => {
  gulp.watch('src/*.html', [browserSync.reload]);
  gulp.watch('src/css/**/*.{scss,css}', ['styles', browserSync.reload]);
});

// Build production files
gulp.task('build', ['clean'], cb =>
  runSequence(
    'copy:tmp',
    'styles',
    'html',
    'copy:static',
    cb
  )
);


gulp.task('amp', ['build'], () => {
  return gulp.src('dist/**/*.html')
    // Validate the input and attach the validation result to the "amp" property 
    // of the file object.  
    .pipe(gulpAmpValidator.validate())
    // Print the validation results to the console. 
    .pipe(gulpAmpValidator.format())
    // Exit the process with error code (1) if an AMP validation error 
    // occurred. 
    .pipe(gulpAmpValidator.failAfterError());
});

gulp.task('qa', ['build'], () => 
  runSequence(
    'amp'
  )
);