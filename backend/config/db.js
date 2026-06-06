const { Sequelize } = require('sequelize');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = process.env.DB_PORT || 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dbName = process.env.DB_NAME || 'vendorbridge';

let dialect = 'mysql';

// Auto-detect MySQL presence and create database if possible
try {
  console.log('Detecting database settings...');
  // Quick synchronous port check to verify if MySQL is running
  const checkPortCmd = `node -e "const net = require('net'); const s = net.createConnection(${dbPort}, '${dbHost}', () => { s.destroy(); process.exit(0); }); s.on('error', () => process.exit(1)); s.setTimeout(800, () => process.exit(1));"`;
  execSync(checkPortCmd, { stdio: 'ignore' });

  // If port is open, attempt to create the database if not exists
  const createDbCmd = `node -e "const mysql = require('mysql2'); const conn = mysql.createConnection({host: '${dbHost}', port: ${dbPort}, user: '${dbUser}', password: '${dbPass}'}); conn.query('CREATE DATABASE IF NOT EXISTS \\\`${dbName}\\\`', (err) => { conn.end(); process.exit(err ? 1 : 0); });"`;
  execSync(createDbCmd, { stdio: 'ignore' });

  console.log(`Auto-detected MySQL on port ${dbPort}. Selected dialect: mysql.`);
  dialect = 'mysql';
} catch (e) {
  console.log('MySQL server not accessible or authentication failed. Selected dialect: sqlite.');
  dialect = 'sqlite';
}

let sequelize;

if (dialect === 'mysql') {
  sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: false, // Set to console.log for SQL logs
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  const sqlitePath = path.join(__dirname, '..', 'vendorbridge.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: false
  });
}

// Attach custom initialization method for server lifecycle
sequelize.init = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connected successfully using ${dialect} dialect.`);
  } catch (error) {
    console.error('Database connection authentication failed:', error);
    throw error;
  }
};

module.exports = sequelize;
