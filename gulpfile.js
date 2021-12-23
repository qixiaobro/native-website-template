const {
  src, task, watch, dest, series, parallel,
} = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const changed = require('gulp-changed');
const webserver = require('gulp-webserver');
const sourcemaps = require('gulp-sourcemaps');
const clean = require('gulp-clean');
const htmlmin = require('gulp-htmlmin');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
const fs = require('fs');

const srcPath = {
  html: 'src/html',
  css: 'src/css',
  js: 'src/js',
  assets: 'src/assets',
};

const destPath = {
  html: 'dist',
  css: 'dist/css',
  js: 'dist/js',
  assets: 'dist/assets',
};

task('htmlDev', () => src(`${srcPath.html}/*.html`)
  .pipe(changed(`${destPath.html}`))
  .pipe(dest(`${destPath.html}`)));

task('cssDev', () => src(`${srcPath.css}/*.scss`)
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(changed(`${destPath.css}`))
  .pipe(sourcemaps.write())
  .pipe(src([`${srcPath.css}/plugins/*.css`]))
  .pipe(dest(`${destPath.css}`)));

task('jsDev', () => src(`${srcPath.js}/*.js`)
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(changed(`${destPath.js}`))
  .pipe(sourcemaps.write())
  .pipe(src([`${srcPath.js}/plugins/*.js`]))
  .pipe(dest(`${destPath.js}`)));

task('imgDev', () => src(`${srcPath.assets}/*`).pipe(
  changed(`${destPath.assets}`).pipe(dest(`${destPath.assets}`)),
));

task('watch', () => {
  watch(`${srcPath.html}/*.html`, { ignoreInitial: false }, series('htmlDev'));
  watch(`${srcPath.css}/*.scss`, { ignoreInitial: false }, series('cssDev'));
  watch(`${srcPath.js}/*.js`, { ignoreInitial: false }, series('jsDev'));
  watch(`${srcPath.assets}/*`, { ignoreInitial: false }, series('imgDev'));
});

task('clean', () => src('dist/*').pipe(clean({ force: true })));

task('webserver', () => {
  src(destPath.html).pipe(
    webserver({
      livereload: true,
      open: true,
      port: 8000,
    }),
  );
});

task('htmlRelease', () => src(`${srcPath.html}/*.html`)
  .pipe(
    htmlmin({
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyJS: true,
      minifyCSS: true,
    }),
  )
  .pipe(dest(destPath.html)));

task('cssRelease', () => src(`${srcPath.css}/*.scss`)
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(
    autoprefixer({
      overrideBrowserslist: ['Chrome 9', 'IE 8', 'last 2 versions'],
      cascade: false,
    }),
  )
  .pipe(
    cleanCSS({
      advanced: false,
      compatibility: 'ie8',
      keepSpecialComments: '*',
    }),
  )
  .pipe(rev())
  .pipe(dest(`${destPath.css}`))
  .pipe(rev.manifest())
  .pipe(dest(`${destPath.css}`))
  .pipe(src([`${srcPath.css}/plugins/*.css`]))
  .pipe(dest(`${destPath.css}`)));

task('jsRelease', () => src(`${srcPath.js}/*.js`)
  .pipe(
    babel({
      presets: ['@babel/env'],
    }),
  )
  .pipe(uglify())
  .pipe(rev())
  .pipe(dest(`${destPath.js}`))
  .pipe(rev.manifest())
  .pipe(dest(`${destPath.js}`))
  .pipe(src([`${srcPath.js}/plugins/*.js`]))
  .pipe(dest(`${destPath.js}`)));

task('imgRelease', () => src(`${srcPath.assets}/*`)
  .pipe(
    imagemin([
      imagemin.gifsicle({ interlaced: true }),
      imagemin.mozjpeg({ quality: 75, progressive: true }),
      imagemin.optipng({ optimizationLevel: 5 }),
      imagemin.svgo({
        plugins: [{ removeViewBox: true }, { cleanupIDs: false }],
      }),
    ]),
  )
  .pipe(rev())
  .pipe(dest(`${destPath.assets}`))
  .pipe(rev.manifest())
  .pipe(dest(`${destPath.assets}`)));

task('delete', (cb) => {
  fs.unlinkSync(`${destPath.assets}/rev-manifest.json`);
  fs.unlinkSync(`${destPath.js}/rev-manifest.json`);
  fs.unlinkSync(`${destPath.css}/rev-manifest.json`);
  return cb();
});

task('replaceJs', () => {
  const manifest = src(`${destPath.js}/rev-manifest.json`);
  return src(`${destPath.html}/*.html`)
    .pipe(revReplace({ manifest }))
    .pipe(dest(`${destPath.html}`));
});
task('replaceCss', () => {
  const manifest = src(`${destPath.css}/rev-manifest.json`);
  return src(`${destPath.html}/*.html`)
    .pipe(revReplace({ manifest }))
    .pipe(dest(`${destPath.html}`));
});
task('replaceImg', () => {
  const manifest = src(`${destPath.assets}/rev-manifest.json`);
  return src(`${destPath.html}/*.html`)
    .pipe(revReplace({ manifest }))
    .pipe(dest(`${destPath.html}`));
});

task(
  'dev',
  series(
    'clean',
    series('htmlDev', 'cssDev', 'jsDev', 'imgDev'),
    parallel('webserver', 'watch'),
  ),
);

task(
  'build',
  series(
    'clean',
    parallel('htmlRelease', 'cssRelease', 'jsRelease', 'imgRelease'),
    'replaceJs',
    'replaceCss',
    'replaceImg',
    'delete',
  ),
);
