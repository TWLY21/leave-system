const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "leave_system",
  password: "1234Ives",
  port: 5432,
});

async function seedAdmin() {
  const username = "admin";
  const password = "Admin123!";
  const role = "admin";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length > 0) {
      console.log("Admin already exists. Updating password...");

      await pool.query(
        `UPDATE users SET password = $1, role = $2 WHERE username = $3`,
        [hashedPassword, role, username]
      );
    } else {
      console.log("Creating admin user...");

      await pool.query(
        `INSERT INTO users (username, password, role)
         VALUES ($1, $2, $3)`,
        [username, hashedPassword, role]
      );
    }

    console.log("✅ Admin ready: admin / Admin123!");
    process.exit();
  } catch (err) {
    console.error("Error seeding admin:", err);
    process.exit(1);
  }
}

seedAdmin();