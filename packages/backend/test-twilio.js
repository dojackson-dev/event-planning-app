// Quick Twilio test script
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Twilio Configuration:');
console.log('Account SID:', accountSid ? `${accountSid.substring(0, 8)}...` : 'NOT SET');
console.log('Auth Token:', authToken ? '***configured***' : 'NOT SET');
console.log('Phone Number:', fromNumber || 'NOT SET');

if (!accountSid || !authToken || !fromNumber) {
  console.error('\n❌ Missing Twilio configuration in .env');
  process.exit(1);
}

const twilio = require('twilio');
const client = twilio(accountSid, authToken);

// Replace with your phone number to test
const testPhoneNumber = process.argv[2];

if (!testPhoneNumber) {
  console.log('\n✅ Twilio credentials are configured!');
  console.log('\nTo send a test SMS, run:');
  console.log('  node test-twilio.js +1YOURNUMBER');
  process.exit(0);
}

console.log(`\nSending test message to ${testPhoneNumber}...`);

client.messages
  .create({
    body: 'Test message from DoVenue event planning app!',
    from: fromNumber,
    to: testPhoneNumber,
  })
  .then((message) => {
    console.log('✅ Message queued!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('Error Code:', message.errorCode || 'none');
    console.log('Error Message:', message.errorMessage || 'none');
    console.log('\nFull response:', JSON.stringify(message, null, 2));
  })
  .catch((error) => {
    console.error('❌ Failed to send message:', error.message);
    console.error('Error code:', error.code);
    console.error('More info:', error.moreInfo);
    if (error.code === 21608) {
      console.log('\nNote: The "to" number may need to be verified in Twilio trial accounts.');
    }
    if (error.code === 21211) {
      console.log('\nNote: Invalid phone number format.');
    }
    if (error.code === 21614) {
      console.log('\nNote: The "to" number is not a valid mobile number.');
    }
  });
