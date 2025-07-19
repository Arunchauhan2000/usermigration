const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

async function generateTwoFactor(email) {
  const secret = speakeasy.generateSecret({
    name: `MrMintExplorer (${email})`,
  });

  const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCodeDataURL,
  };
}

module.exports = generateTwoFactor;
