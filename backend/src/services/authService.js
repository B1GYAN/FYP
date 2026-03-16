const bcrypt = require("bcryptjs");
const db = require("../../db");
const { createAccessToken } = require("../utils/jwt");

function sanitizeUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    createdAt: row.created_at,
  };
}

function validateRegistrationInput({ fullName, email, password }) {
  if (!fullName || fullName.trim().length < 2) {
    const error = new Error("Full name must be at least 2 characters");
    error.statusCode = 400;
    throw error;
  }

  if (!email || !email.includes("@")) {
    const error = new Error("A valid email address is required");
    error.statusCode = 400;
    throw error;
  }

  if (!password || password.length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }
}

async function registerUser({ fullName, email, password }) {
  validateRegistrationInput({ fullName, email, password });

  const normalizedEmail = email.trim().toLowerCase();
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      `
        SELECT id
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rowCount > 0) {
      const error = new Error("An account with this email already exists");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `
        INSERT INTO users (full_name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, full_name, email, starting_balance, created_at
      `,
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO portfolios (user_id, cash_balance, equity_value)
        VALUES ($1, $2, $2)
      `,
      [user.id, user.starting_balance]
    );

    await client.query("COMMIT");

    return {
      user: sanitizeUser(user),
      token: createAccessToken(user),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.query(
    `
      SELECT id, full_name, email, password_hash, created_at
      FROM users
      WHERE email = $1
    `,
    [normalizedEmail]
  );

  if (result.rowCount === 0) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return {
    user: sanitizeUser(user),
    token: createAccessToken(user),
  };
}

async function getUserProfile(userId) {
  const result = await db.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.created_at,
        p.cash_balance,
        p.equity_value,
        p.realized_pl
      FROM users u
      LEFT JOIN portfolios p ON p.user_id = u.id
      WHERE u.id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("User profile not found");
    error.statusCode = 404;
    throw error;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    createdAt: row.created_at,
    portfolio: {
      cashBalance: Number(row.cash_balance || 0),
      equityValue: Number(row.equity_value || 0),
      realizedPl: Number(row.realized_pl || 0),
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
