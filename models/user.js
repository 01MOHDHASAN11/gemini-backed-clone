const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/dbConnect');

class User extends Model {}
User.init({
  mobile: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { is: /^\d{10}$/ }
  },
  password: { type: DataTypes.STRING, allowNull: false },
  subscriptionTier: {
    type: DataTypes.ENUM('basic', 'pro'),
    defaultValue: 'basic'
  },
  dailyPromptsUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
   lastPromptDate: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
}, {
  sequelize,
  modelName: 'User'
});

module.exports = User;