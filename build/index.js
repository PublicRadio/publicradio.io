import gulp from 'gulp';
import runSequence from 'run-sequence';
import './deployTasks';
import './watchTasks';
import './buildTasks';

gulp.task('default', ['watch']);