// Usage: node encrypt_mail_password.js <password>
const crypto = require('crypto');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node encrypt_mail_password.js <password>');
  process.exit(1);
}
// Generate a random 32-byte key (hex)
const key = crypto.randomBytes(32);
const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
let encrypted = cipher.update(password, 'utf8', 'base64');
encrypted += cipher.final('base64');
console.log('MAIL_PASS_ENC=' + encrypted);
console.log('MAIL_KEY=' + key.toString('hex'));
