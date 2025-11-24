import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seedAdmin() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'event_planning',
    entities: ['src/entities/**/*.ts'],
  });

  await dataSource.initialize();

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await dataSource.query(`
    INSERT INTO "user" (email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
  `, ['admin@dovenue.com', hashedPassword, 'Admin', 'User', 'owner']);

  console.log('Admin user created successfully!');
  console.log('Email: admin@dovenue.com');
  console.log('Password: admin123');
  console.log('Role: owner');

  await dataSource.destroy();
}

seedAdmin().catch(console.error);
