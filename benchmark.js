const spawn = require('child_process').spawn;
const stripAnsi = require('strip-ansi');
const treeKill = require('tree-kill');
const fs = require('fs');

const cwd = process.cwd();
const logFile = 'benchmark.log';
const editedFile = 'app/app.module.ts';

const options = {
  iterations: 5,
  multiPromise: serialMultiPromise,
  spawn: matchSpawn,
  commands: [
    { cmd: 'npm', args: ['start', '--'], fn: buildDataFn, comment: 'build time' },
    { cmd: 'npm', args: ['start', '--', '--serve'], 
      fn: serveThirdRebuildDataFn, comment: 'third rebuild time' },
  ],
  flags: [
    '--aot',
    '--no-sourcemap',
    '--no-vendor-chunk'
  ],
}

runBenchmark(options);

// Returns an array of `length` length, filled with `undefined`
function makeArray(length) {
  return Array.apply(null, Array(length));
}

// Returns a promise with the result of calling `times` times the `fn` function with `args`
// `fn` will be called in parallel, and is expected to return a promise
function parallelMultiPromise(times, fn, ...args) {
  return Promise.all(makeArray(times).map(() => fn.apply(null, args)));
}

// Returns a promise with the result of calling `times` times the `fn` function with `args`
// `fn` will be called in serial, and is expected to return a promise
function serialMultiPromise(times, fn, ...args) {
  let results = [];
  let promise = Promise.resolve();
  makeArray(times).forEach(() => promise = promise.then(() =>
    fn.apply(null, args).then((result) => results.push(result))
  ));
  return promise.then(() => results);
}

// Spawns `cmd` with `args`, calls `dataFn` with the `stdout` output, a `result` var and the process
// `dataFn` is expected to modify `result`
function matchSpawn(dataFn, cmd, args = []) {
  // dataFn will have access to result and use it to store results
  let result = {
    // overrideErr will signal that an error code on the exit event should be ignored
    // this is useful on windows where killing a tree of processes always makes them
    // exit with an error code
    overrideErr: false
  };
  let stdout = '';
  let spawnOptions = {
    cwd: cwd,
    env: process.env
  }

  if (process.platform.startsWith('win')) {
    args = ['/c', cmd].concat(args)
    cmd = 'cmd.exe';
    spawnOptions['stdio'] = 'pipe';
  }
console.log(cmd, args)
  const childProcess = spawn(cmd, args, spawnOptions);

  childProcess.stdout.on('data', (data) => {
    // uncomment to debug
    // console.log(data.toString('utf-8'));
    stdout += data.toString('utf-8');
    dataFn(data, result, childProcess);
  });

  return new Promise((resolve, reject) =>
    childProcess.on('exit', (err) => err && !result.overrideErr
      ? resolve({ err, stdout }) : resolve(result))
  )
}

// data functions used to parse process output and process results
function buildDataFn(data, result, childProcess) {
  let localMatch = data.toString('utf-8').match(/Time: (.*)ms/);
  if (localMatch) { result.match = Number(stripAnsi(localMatch[1])) };
}

function serveInitialBuildDataFn(data, result, childProcess) {
  let localMatch = data.toString('utf-8').match(/Time: (.*)ms/);
  if (localMatch) {
    result.match = Number(stripAnsi(localMatch[1]));
    result.overrideErr = true;
    treeKill(childProcess.pid);
  };
}

function serveThirdRebuildDataFn(data, result, childProcess) {
  let localMatch = data.toString('utf-8').match(/Time: (.*)ms/);
  if (localMatch) {
    result.counter = result.counter ? result.counter + 1 : 1;
    if (result.counter < 4) {
      fs.appendFileSync(editedFile, '\'benchmark test string\';');
    } else {
      result.match = Number(stripAnsi(localMatch[1]));
      result.overrideErr = true;
      treeKill(childProcess.pid);
    }
  };
}

function average(arr) {
  return arr.reduce((prev, curr) => prev + curr, 0) / arr.length;
}

function combine(a) {
  var fn = function (n, src, got, all) {
    if (n == 0) {
      if (got.length > 0) {
        all[all.length] = got;
      }
      return;
    }
    for (var j = 0; j < src.length; j++) {
      fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
    }
    return;
  }
  var all = [];
  for (var i = 0; i < a.length; i++) {
    fn(i, a, [], all);
  }
  if (a.length > 0) { all.push(a); }
  return all;
}

function benchmarkLog(str) {
  console.log(str);
  fs.appendFileSync(logFile, str + '\n');
}


function runBenchmark(options) {
  // wipe benchmark output file
  fs.writeFileSync(logFile, '');
  // backup contents of file that is being edited for rebuilds
  const editedFileContents = fs.readFileSync(editedFile, 'utf8');
  let flagCombinations = combine(options.flags);
  // add empty flag to execute base commands
  flagCombinations.unshift([]);
  let promise = Promise.resolve();

  console.time('Benchmark execution time');
  const startTime = Date.now();
  benchmarkLog(`Angular-CLI Benchmark`);
  benchmarkLog(`Extra flags per benchmark: ${options.flags}`);
  benchmarkLog(`Iterations per benchmark: ${options.iterations}`);
  benchmarkLog('');

  options.commands.forEach((command) => {
    promise = promise.then(() => {
      benchmarkLog('=========================================');
      benchmarkLog(`Base command: ${command.cmd} ${command.args.join(' ')}`);
      benchmarkLog(`Comment: ${command.comment}`);
      benchmarkLog('');
    })
    return flagCombinations.forEach((flags) =>
      promise = promise
        .then(() => options.multiPromise(
          options.iterations,
          options.spawn,
          command.fn,
          command.cmd,
          command.args.concat(flags)
        ).then((results) => {
          const failures = results.filter(result => result.error);
          results = results.filter(result => !result.error).map((result) => result.match);
          benchmarkLog(`Full command: ${command.cmd} ${command.args.concat(flags).join(' ')}`);
          benchmarkLog(`Average time: ${average(results)}`);
          benchmarkLog(`Results: ${results.join()}`);
          if (failures.length > 0) { benchmarkLog(`Failures: ${failures.length}`); }
          benchmarkLog('');
        })
        )
    )
  })
  return promise.then(() => {
    benchmarkLog(`Benchmark execution time: ${Date.now() - startTime}ms`);
    // restore contents of file that was being edited for rebuilds 
    fs.writeFileSync(editedFile, editedFileContents, 'utf8');
  });
}
