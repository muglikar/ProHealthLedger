const https = require('https');

const url = 'https://archive.is/submit/?url=https://example.com';
https.get(url, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', d => process.stdout.write(d.toString().slice(0, 100)));
});
