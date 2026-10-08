const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL database');

  client.on('notice', (msg) => {
    console.log(msg.message);
  });

  const sqlPath = path.join(__dirname, '../prisma/seed_studios_seats.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('Executing seed SQL...');
    await client.query(sql);
    console.log('SQL executed successfully.');

    // Query verification
    const studiosRes = await client.query(`
      SELECT s.id, s.name, s.code, s.capacity, s."layoutRows", s."layoutColumns", COUNT(st.id) as seat_count
      FROM "Studio" s
      LEFT JOIN "Seat" st ON st."studioId" = s.id
      WHERE s.code IN ('S1', 'S2', 'S3', 'S4')
      GROUP BY s.id, s.name, s.code, s.capacity, s."layoutRows", s."layoutColumns"
      ORDER BY s.code
    `);

    console.log('\n--- VERIFIKASI DATA STUDIO & KURSI ---');
    console.table(studiosRes.rows);

    const totalSeatsRes = await client.query(`
      SELECT COUNT(*) as total_seats 
      FROM "Seat" st 
      JOIN "Studio" s ON st."studioId" = s.id 
      WHERE s.code IN ('S1', 'S2', 'S3', 'S4')
    `);
    console.log('Total Kursi di Studio 1-4:', totalSeatsRes.rows[0].total_seats);

  } catch (err) {
    console.error('Error executing seed SQL:', err);
  } finally {
    await client.end();
  }
}

run();
