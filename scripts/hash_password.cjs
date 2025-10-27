const { hashPassword } = require('../dist/lib/password.js');

const password = process.argv[2];
if (!password) {
  console.error('Uso: node hash_password.cjs <senha>');
  process.exit(1);
}

console.log(hashPassword(password));
