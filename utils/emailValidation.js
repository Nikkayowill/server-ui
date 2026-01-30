// List of disposable/temporary email domains to block
const disposableEmailDomains = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'throwaway.email',
  'mailinator.com',
  'maildrop.cc',
  'temp-mail.org',
  'yopmail.com',
  'fakeinbox.com',
  'trashmail.com',
  'getnada.com',
  'temp-mail.io',
  'mohmal.com',
  'emailondeck.com',
  'mintemail.com',
  'sharklasers.com',
  'guerrillamail.info',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'grr.la'
];

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableEmailDomains.includes(domain);
}

module.exports = {
  isDisposableEmail,
  disposableEmailDomains
};
