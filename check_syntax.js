const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');

const code = fs.readFileSync('src/app/profiles/ProfilesClient.js', 'utf8');

try {
  const Parser = acorn.Parser.extend(jsx());
  Parser.parse(code, { sourceType: 'module', ecmaVersion: 2022 });
  console.log('SUCCESS: No syntax errors!');
} catch (err) {
  console.error('SYNTAX ERROR:', err);
  process.exit(1);
}
