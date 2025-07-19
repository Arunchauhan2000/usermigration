function generateUsername(email) {
  return email.split('@')[0];
}
module.exports = { generateUsername };
