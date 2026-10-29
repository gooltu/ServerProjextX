'use strict';

// Creates an admin, or resets an existing one's password and reactivates it. There is no signup
// endpoint - this is the only way admins get created.
//
//   read -s ADMIN_PASSWORD && export ADMIN_PASSWORD
//   node scripts/createAdmin.js admin@example.com "Display Name"
//
// Uses db/knex.js, so NODE_ENV picks the database (production inside the Docker image).

const bcrypt = require('bcryptjs');
const knex = require('../db/knex');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  const name = process.argv[3] || null;
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email.includes('@'))
    throw new Error('Usage: ADMIN_PASSWORD=... node scripts/createAdmin.js <email> [name]');
  if (password.length < 12)
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');

  const password_hash = await bcrypt.hash(password, 12);
  const existing = await knex('admins').where({ email }).first('id');

  if (existing) {
    const update = { password_hash, active: true };
    if (name) update.name = name;
    await knex('admins').where({ id: existing.id }).update(update);
    console.log(`Updated admin ${email} (id ${existing.id})`);
  } else {
    const [id] = await knex('admins').insert({ email, name, password_hash });
    console.log(`Created admin ${email} (id ${id})`);
  }
}

main()
  .catch(err => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
