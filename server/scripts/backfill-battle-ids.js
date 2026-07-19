require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'petverse',
  });
  const [result] = await connection.execute(
    "UPDATE battle_sessions_v10 SET battleId=CONCAT('legacy-',id) WHERE battleId IS NULL OR battleId=''",
  );
  console.log(JSON.stringify({ updated: result.affectedRows }));
  await connection.end();
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
