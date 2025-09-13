const {DataTypes,Model} = require("sequelize")
const sequelize = require("../db/dbConnect")
class Chatroom extends Model{}
Chatroom.init({
    title:{type:DataTypes.STRING,allowNull:false},
    userId:{type:DataTypes.INTEGER,allowNull:false}
},{
    sequelize,
    modelName:"Chatroom"
})
module.exports=Chatroom;