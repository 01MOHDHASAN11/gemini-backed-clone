const express = require("express");
const bcrypt = require("bcryptjs");
const { User, Otp, Chatroom, Message } = require("../models");
const crypto = require("crypto");
const router = express.Router();
const jwt = require("jsonwebtoken");
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });
const { geminiQueue } = require('../queue/geminiQueue');
const authenticate = require("../middleware/authenticate");
const { title } = require("process");


require("dotenv").config({ path: `${process.cwd()}/.env` });
router.post("/auth/signup", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res
        .status(400)
        .json({ status: "error", message: "Mobile and password are required" });
    }
    const existingUser = await User.findOne({ where: { mobile } });
    if (existingUser) {
      return res
        .status(409)
        .json({ status: "error", message: "Mobile number already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      mobile,
      password: hashedPassword,
      subscriptionTier: "basic",
      dailyPromptsUsed: 0,
    });
    return res
      .status(201)
      .json({ status: "success", message: "User created", userId: user.id });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/auth/send-opt", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res
        .status(400)
        .json({ status: "error", message: "Mobile number is required" });
    }
    const user = await User.findOne({ where: { mobile } });
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await Otp.create({
      mobile,
      code: otpCode,
      expiresAt,
    });
    console.log(`OTP for ${mobile} is ${otpCode}`);
    return res
      .status(200)
      .json({
        status: "success",
        message: "OTP sent successfully",
        opt: otpCode,
        mobile,
      });
  } catch (error) {
    console.log("Error generating OTP", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { mobile, code } = req.body;
    if (!mobile || !code) {
      return res
        .status(400)
        .json({ status: "error", message: "Mobile and code are required" });
    }
    const otpRecord = await Otp.findOne({ where: { mobile, code } });
    if (!otpRecord) {
      return res.status(400).json({ status: "error", message: "Invalid OTP" });
    }
    if (otpRecord.expiresAt < new Date()) {
      otpRecord.destroy();
      return res
        .status(400)
        .json({ status: "error", message: "OTP has expired" });
    }
    const user = await User.findOne({ where: { mobile } });
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    });
    otpRecord.destroy();
    return res
      .status(200)
      .json({ status: "success", message: "OTP verified successfully", token });
  } catch (error) {
    console.log("Error verifying OTP", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    console.log("In login route");
    const { mobile, password } = req.body;
    console.log(mobile, password);
    if (!mobile || !password) {
      return res
        .status(400)
        .json({ status: "error", message: "Mobile and password are required" });
    }
    const user = await User.findOne({ where: { mobile } });
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!user || !isPasswordValid) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    });
    return res
      .status(200)
      .json({ status: "success", message: "Login successful", token });
  } catch (error) {
    console.log("Error during login", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/chatroom", authenticate, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res
        .status(400)
        .json({ status: "error", message: "Title is required" });
    }
    const chatroom = await Chatroom.create({
      title,
      userId: req.user.id,
    });
    return res
      .status(201)
      .json({
        status: "success",
        message: "Chatroom created",
        chatroomId: chatroom.id,
        title,
      });
  } catch (error) {
    console.log("Error creating chatroom", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});
 

router.get("/chatroom", authenticate, async (req, res) => {
  try {
    const cacheKey = `chatrooms_${req.user.id}`;
    let chatrooms = cache.get(cacheKey);

    if (!chatrooms) {
      chatrooms = await Chatroom.findAll({
        where: { userId: req.user.id },
        attributes: ['id', 'title', 'createdAt'], 
        order: [['createdAt', 'DESC']], 
      });
      cache.set(cacheKey, chatrooms);
    }

    return res.status(200).json({
      status: "success",
      message: "Chatrooms retrieved successfully",
      chatrooms,
    });
  } catch (error) {
    console.error("Error fetching chatrooms:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/chatroom/:id",authenticate,async(req,res)=>{
    try {
        const chatroom = await Chatroom.findOne({
            where:{
                id:req.params.id,
                userId:req.user.id
            },
            attributes:["id","title","createdAt"],
            include:[{
          model: Message,
          attributes: ['id', 'userMessage', 'aiResponse', 'createdAt'],
          order: [['createdAt', 'ASC']],
        },],
        })
        if(!chatroom){
            return res.status(404).json({status:"error",message:"Chatroom not found or access denied"})
        }
        return res.status(200).json(
            {
                status:"success",
                message:"Chatroom retrieves successfully",
                chatroom:{
                    id:chatroom.id,
                    title:chatroom.title,
                    createdAt:chatroom.createdAt,
                    message:chatroom.Messages
                }
            }
        )
    } catch (error) {
        console.log("Error fetching chatroom details",error.message)
        return res.status(500).json({status:"error",message:error.message})
    }
})



// Add this endpoint to your existing routes
router.post("/chatroom/:id/message", authenticate, async (req, res) => {
  try {
    const { id: chatroomId } = req.params;
    const { message: userMessage } = req.body;
    
    if (!userMessage) {
      return res.status(400).json({ 
        status: "error", 
        message: "Message is required" 
      });
    }

    // Check if chatroom exists and belongs to user
    const chatroom = await Chatroom.findOne({
      where: { id: chatroomId, userId: req.user.id }
    });
    
    if (!chatroom) {
      return res.status(404).json({ 
        status: "error", 
        message: "Chatroom not found" 
      });
    }

    // Check rate limiting for basic users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (req.user.subscriptionTier === 'basic') {
      // Reset daily count if it's a new day
      if (req.user.lastPromptDate < today) {
        req.user.dailyPromptsUsed = 0;
        req.user.lastPromptDate = new Date();
        await req.user.save();
      }
      
      if (req.user.dailyPromptsUsed >= 5) {
        return res.status(429).json({ 
          status: "error", 
          message: "Daily limit exceeded. Upgrade to pro for unlimited access." 
        });
      }
    }

    // Add job to queue
    await geminiQueue.add('process-message', {
      userMessage,
      chatroomId,
      userId: req.user.id
    });

    // Store user message immediately
    await Message.create({
      chatroomId,
      userMessage,
      aiResponse: null // Will be updated by worker
    });

    return res.status(202).json({ 
      status: "success", 
      message: "Message is being processed" 
    });
  } catch (error) {
    console.error("Error sending message:", error.message);
    return res.status(500).json({ 
      status: "error", 
      message: error.message 
    });
  }
});

module.exports = router;
