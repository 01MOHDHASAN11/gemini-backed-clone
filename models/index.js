const sequelize = require('../db/dbConnect');
const User = require('./user');
const Chatroom = require('./chatroom');
const Message = require('./message');

User.hasMany(Chatroom, { foreignKey: 'userId', onDelete: 'CASCADE' });
Chatroom.belongsTo(User, { foreignKey: 'userId' });
Chatroom.hasMany(Message, { foreignKey: 'chatroomId', onDelete: 'CASCADE' });
Message.belongsTo(Chatroom, { foreignKey: 'chatroomId' });

module.exports = { sequelize, User, Chatroom, Message };