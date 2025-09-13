const { Sequelize } = require('sequelize');
require('dotenv').config({ path: `${process.cwd()}/.env` });

const sequelize = new Sequelize(process.env.DATABASE_URL || `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  logging: false 
});

module.exports = sequelize;