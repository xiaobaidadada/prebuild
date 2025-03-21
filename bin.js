#!/usr/bin/env node

var path = require('path')
var log = require('npmlog')
var fs = require('fs')
var eachSeries = require('each-series-async')
var napi = require('napi-build-utils')
var {glob} = require('glob')

var pkg = require(path.resolve('package.json'))
var rc = require('./rc')
var prebuild = require('./prebuild')
var upload = require('./upload')
const pack = require("./pack");

var prebuildVersion = require('./package.json').version
if (rc.version) {
    console.log(prebuildVersion)
    process.exit(0)
}
if(rc['--set-version'] && typeof rc['--set-version'] === 'string') {
    pkg.version = rc['--set-version']
}

if (rc.path) process.chdir(rc.path)

log.heading = 'prebuild'
if (rc.verbose) {
    log.level = 'verbose'
}

if (rc.help) {
    console.error(fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf-8'))
    process.exit(0)
}

log.info('begin', 'Prebuild version', prebuildVersion)

// nvm! do not mess with headers? kkthx!
delete process.env.NVM_IOJS_ORG_MIRROR
delete process.env.NVM_NODEJS_ORG_MIRROR

var buildLog = log.info.bind(log, 'build')
var opts = Object.assign({}, rc, {pkg: pkg, log: log, buildLog: buildLog, argv: process.argv})

if (napi.isNapiRuntime(rc.runtime)) napi.logMissingNapiVersions(rc.target, rc.prebuild, log)

if (opts['upload-files-gz']) {
    const files = opts['upload-files-gz'].split(',');
    glob(files, {nodir: true}).then((file_list)=>{
        (async () => {
            const allPack = [];
            for (let i = 0; i < file_list.length; i++) {
                const tarPath = file_list[i] + '.tar.gz';
                allPack.push(new Promise((resolve, reject) => {
                    pack([file_list[i]], tarPath, function (err) {
                        if (err) {
                            reject(new Error('Packing failed'));
                            return;
                        }
                        buildLog('Prebuild written to ' + tarPath);
                        resolve(tarPath);  // 返回生成的 tarPath
                    })
                }));
            }
            const result = await Promise.all(allPack);
            uploadFiles(result);
        })();
    }, onbuilderror)
} else if (opts['upload-files']) {

    const files = opts['upload-files'].split(',');
    glob(files, {nodir: true}).then(uploadFiles, onbuilderror)
    // uploadFiles(files);
} else if (opts['upload-all']) {
    glob('prebuilds/**/*', {nodir: true}).then(uploadFiles, onbuilderror)
} else {
    var files = []
    eachSeries(opts.prebuild, function (target, next) {
        prebuild(opts, target.target, target.runtime, function (err, tarGz) {
            if (err) return next(err)
            files.push(tarGz)
            next()
        })
    }, function (err) {
        if (err) return onbuilderror(err)
        if (!opts.upload) return
        uploadFiles(files)
    })
}

function uploadFiles(files) {

    // NOTE(robinwassen): Only include unique files
    // See: https://github.com/prebuild/prebuild/issues/221
    var uniqueFiles = files.filter(function (file, index) {
        return files.indexOf(file) === index
    })

    buildLog('Uploading ' + uniqueFiles.length + ' prebuilds(s) to GitHub releases')
    upload(Object.assign({}, opts, {files: uniqueFiles}), function (err, result) {
        if (err) return onbuilderror(err)
        buildLog('Found ' + result.old.length + ' prebuild(s) on Github')
        if (result.old.length) {
            result.old.forEach(function (build) {
                buildLog('-> ' + build)
            })
        }
        buildLog('Uploaded ' + result.new.length + ' new prebuild(s) to GitHub')
        if (result.new.length) {
            result.new.forEach(function (build) {
                buildLog('-> ' + build)
            })
        }
    })
}

function onbuilderror(err) {
    if (!err) return
    log.error('build', err.stack)
    process.exit(2)
}
