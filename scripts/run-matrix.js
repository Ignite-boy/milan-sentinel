const fs = require('fs');
const path = require('path');

const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scenarios', 'test-matrix.json'), 'utf8'));
const dims = [
  ['environment', matrix.dimensions.environment],
  ['scenario', matrix.dimensions.scenario],
  ['action', matrix.dimensions.action],
  ['device', matrix.dimensions.device],
  ['state', matrix.dimensions.state],
  ['locale', matrix.dimensions.locale]
];

const product = dims.reduce((n, [, values]) => n * values.length, 1);
if (product !== matrix.caseCount) {
  throw new Error(`Matrix count mismatch: ${product} != ${matrix.caseCount}`);
}

function caseAt(oneBased) {
  if (!Number.isInteger(oneBased) || oneBased < 1 || oneBased > product) {
    throw new Error(`Case must be 1..${product}`);
  }
  let n = oneBased - 1;
  const out = {};
  for (let i = dims.length - 1; i >= 0; i--) {
    const [name, values] = dims[i];
    const index = n % values.length;
    n = Math.floor(n / values.length);
    out[name] = values[index];
  }
  out.caseId = String(oneBased).padStart(8, '0');
  return out;
}

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(v => v.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function runCase(c) {
  // Deterministic execution contract. Concrete adapters can turn each scenario
  // into a real browser/API/DWN check; enumeration itself never counts as PASS.
  return {
    ...c,
    status: 'PLANNED',
    evidenceRequired: true
  };
}

const mode = process.argv.includes('--validate') ? 'validate'
  : process.argv.includes('--smoke') ? 'smoke'
  : process.argv.includes('--list') ? 'list'
  : 'run';

if (mode === 'validate') {
  console.log(JSON.stringify({ caseCount: product, expected: matrix.caseCount, valid: product === matrix.caseCount }, null, 2));
  process.exit(0);
}

if (mode === 'list') {
  const start = Number(parseArg('start', '1'));
  const count = Number(parseArg('count', '20'));
  for (let i = start; i < start + count && i <= product; i++) console.log(JSON.stringify(caseAt(i)));
  process.exit(0);
}

if (mode === 'smoke') {
  for (let i = 1; i <= Math.min(100, product); i++) console.log(JSON.stringify(runCase(caseAt(i))));
  process.exit(0);
}

const start = Number(parseArg('start', '1'));
const count = Number(parseArg('count', '100'));
let executed = 0;
for (let i = start; i < start + count && i <= product; i++) {
  console.log(JSON.stringify(runCase(caseAt(i))));
  executed++;
}
console.error(`Generated ${executed} case definitions from a ${product}-case matrix.`);
