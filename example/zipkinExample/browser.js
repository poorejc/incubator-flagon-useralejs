/* eslint-env browser */
/* eslint-disable import/newline-after-import */
// use higher-precision time than milliseconds
process.hrtime = require('browser-process-hrtime');

// setup tracer
const {recorder} = require('./recorder');
const {Tracer, ExplicitContext} = require('zipkin');

const ctxImpl = new ExplicitContext();
const localServiceName = 'browser';
const tracer = new Tracer({ctxImpl, recorder: recorder(localServiceName), localServiceName});

// instrument fetch
const wrapFetch = require('zipkin-instrumentation-fetch');
const zipkinFetch = wrapFetch(fetch, {tracer});

const logEl = document.getElementById("log");
const log = text => logEl.innerHTML = `${logEl.innerHTML}\n${text}`;

// wrap fetch call so that it is traced
//  zipkinFetch('http://localhost:8081/')
//    .then(response => (response.text()))
//    .then(text => log(text))
//    .catch(err => log(`Failed:\n${err.stack}`));

function ziptest() {
  zipkinFetch('http://localhost:8081/')
    .then(response => (response.text()))
    .then(text => log(text))
    .catch(err => log(`Failed:\n${err.stack}`));
}

//ziptest();

window.userale.filter(function (log) {
  var type_array = ['mouseup', 'mouseover', 'mousedown', 'keydown', 'dblclick', 'blur', 'focus', 'input', 'wheel'];
  var logType_array = ['interval'];
  return !type_array.includes(log.type) && !logType_array.includes(log.logType);
});

document.getElementById('theButton').addEventListener('click', () => ziptest, false);
