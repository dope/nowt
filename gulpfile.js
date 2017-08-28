// requirements
var gulp         = require('gulp');
var sass         = require('gulp-sass');
var browserSync  = require('browser-sync');
var prefix       = require('gulp-autoprefixer');
var rename       = require('gulp-rename');
var uglify       = require('gulp-uglify');

// create sass tasks
gulp.task('sass', function () {
    gulp.src('scss/**/*.scss')
        .pipe(sass({outputStyle: 'compressed', includePaths: ['scss']}))
        .pipe(prefix("last 2 versions", "> 1%", "ie 8", "Android 2", "Firefox ESR"))
        .pipe(gulp.dest('css'))
});

gulp.task('scripts', function() {
  gulp.src('js/main.js')
  .pipe(rename('main.min.js'))
  .pipe(uglify())
  .pipe(gulp.dest("js"));
});

// create browser sync task
gulp.task('browser-sync', function() {
    browserSync.init(["css/*.css"], {
        server: {
            baseDir: "./"
        }
    });
});

// default task (just run gulp)
gulp.task('default', ['sass', 'scripts']);


gulp.task('watch', ['default', 'browser-sync'], function () {
  gulp.watch("scss/**/*.scss", ['sass']);
  gulp.watch("js/*.js", ['scripts']);
  gulp.watch("*/**/*.html", ['sass']);
});
