const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/dbConnect');

class Otp extends Model {}
Otp.init({
  mobile: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false }
}, {
  sequelize,
  modelName: 'Otp'
});

module.exports = Otp;