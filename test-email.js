const { Resend } = require('resend');

const resend = new Resend('re_V2KZu1rA_5PHZNxE9iPsFQMXTN4Dr6j8C');

resend.emails.send({
  from: 'Nareli Experience <onboarding@resend.dev>',
  to: ['mwaurawambui2004@gmail.com'],
  subject: 'Direct Test Email',
  html: '<strong>If you see this, your API key works perfectly!</strong>',
})
.then((data) => console.log('SUCCESS:', data))
.catch((error) => console.error('ERROR:', error));