import bcrypt from 'bcryptjs';

// OWASP 2024 recommends minimum cost factor 12 for bcrypt
const BCRYPT_ROUNDS = 12;

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};
