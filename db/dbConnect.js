const { Sequelize } = require('sequelize');
require('dotenv').config({ path: `${process.cwd()}/.env` });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Required for Render Postgres
    },
  },
  logging: false,
});

module.exports = sequelize;