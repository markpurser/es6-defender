var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    gutil = require('gulp-util'),
    addsrc = require('gulp-add-src'),
    babel = require("gulp-babel"),
    sourcemaps = require("gulp-sourcemaps");

gulp.task('default', function() {
    gulp.src('src/*.js')
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['es2015']
        }))
//        .pipe(jshint())
//        .pipe(jshint.reporter('default'))
        .pipe(gutil.env.production ? uglify() : gutil.noop())
        .pipe(addsrc.prepend('header'))
        .pipe(concat('es6-defender.min.js'))
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest('dist/static/js'))
        .pipe(gulp.dest('examples/game/js'));
});

gulp.watch('src/*.js', ['default']);
