'use strict';
// node harness: run the shared browser/node assertion suite against js/calc.js.

const Calc = require('../js/calc.js');
const selftest = require('../js/selftest.js');

const failures = selftest(Calc, (line) => console.log(line));
process.exit(failures === 0 ? 0 : 1);
