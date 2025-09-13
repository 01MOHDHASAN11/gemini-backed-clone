const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/dbConnect');

class Message extends Model {}
Message.init({
  chatroomId: { type: DataTypes.INTEGER, allowNull: false },
  userMessage: { type: DataTypes.TEXT, allowNull: false }, 
  aiResponse: { type: DataTypes.TEXT }
}, {
  sequelize,
  modelName: 'Message'
});

module.exports = Message;