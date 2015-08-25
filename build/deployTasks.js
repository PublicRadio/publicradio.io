import './buildTasks.js';
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import runSequence from 'run-sequence';
const $ = gulpLoadPlugins();
import {Readable} from 'stream';

const production = Boolean(process.env.PRODUCTION);
const domain = production ? 'publicradio.io' : 'nightly.publicradio.io';
const debug = Boolean(process.env.DEBUG);

for (let type of 'patch,minor,major,prerelease'.split(',')) {
    gulp.task(`deploy-${type}`, cb => {
        runSequence([`bump-${type}`], ['commit'], ['build', 'tag', 'makeCname'], ['deploy'], ['del'], cb)
    });

    gulp.task(`bump-${type}`, () =>
        gulp.src('./package.json')
            .pipe($.bump({type}))
            .pipe(gulp.dest('./'))
            .pipe(gulp.dest('./publish')));
}

gulp.task('commit', () =>
    gulp.src('./src')
        .pipe($.git.add())
        .pipe($.git.commit(`Release ${require('../publish/package.json').version}`))
        .pipe($.tagVersion({version: require('../publish/package.json').version})));

gulp.task('deploy', cb =>
    gulp.src('./publish/**/*')
        .pipe($.ghPages({
            remoteUrl: `git@github.com:PublicRadio/${domain}.git`,
            push     : !debug,
            message  : `Release ${require('../publish/package.json').version}`
        })));

gulp.task('tag', cb =>
    runSequence(['assets', 'bundle'], cb));

gulp.task('makeCname', cb =>
        Object.assign(Readable({objectMode: true}), {
            _read() {
                this.push(new $.util.File({cwd: '', base: '', path: 'CNAME', contents: new Buffer(domain)}));
                this.push(null);
            }
        })
            .pipe(gulp.dest('./publish'))
);