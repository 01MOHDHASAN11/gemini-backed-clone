const jwt = require("jsonwebtoken");
const { User } = require("../models");
require('dotenv').config({ path: `${process.cwd()}/.env` });
const authenticate = async(req,res,next)=>{
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if(!token){
            return res.status(401).json({status:"error",message:"No token provided"});
        }
        const decoded = jwt.verify(token,process.env.JWT_SECRET_KEY)
        const user = await User.findByPk(decoded.userId)
        if(!user){
            return res.status(401).json({status:"error",message:"Invalid token"});
        }
        req.user = user
        next()
    } catch (error) {
        console.log("Authentication error",error.message)
        return res.status(401).json({status:"error",message:"Invalid token"})
    }
}

module.exports = authenticate