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
const mockPayment = require('../utils/mockPayment');
require("dotenv").config({ path: `${process.cwd()}/.env` });
const {body,validationResult} = require("express-validator")
const rateLimitBasic = require("../middleware/rateLimit")

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
 

router.get('/chatroom', authenticate, async (req, res) => {
  try {
    const cacheKey = `chatrooms_${req.user.id}`;
    let chatrooms;
    const cachedData = await connection.get(cacheKey);
    if (cachedData) {
      chatrooms = JSON.parse(cachedData);
    } else {
      chatrooms = await Chatroom.findAll({
        where: { userId: req.user.id },
        attributes: ['id', 'title', 'createdAt'],
        order: [['createdAt', 'DESC']],
      });
      await connection.setex(cacheKey, 300, JSON.stringify(chatrooms));
    }

    return res.status(200).json({
      status: 'success',
      message: 'Chatrooms retrieved successfully',
      chatrooms,
    });
  } catch (error) {
    console.error('Error fetching chatrooms:', error.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
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


router.post("/chatroom/:id/message", authenticate, rateLimitBasic, async (req, res) => {
  try {
    const { id: chatroomId } = req.params;
    const { message: userMessage } = req.body;
    
    if (!userMessage) {
      return res.status(400).json({ 
        status: "error", 
        message: "Message is required" 
      });
    }

    const chatroom = await Chatroom.findOne({
      where: { id: chatroomId, userId: req.user.id }
    });
    
    if (!chatroom) {
      return res.status(404).json({ 
        status: "error", 
        message: "Chatroom not found" 
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (req.user.subscriptionTier === 'basic') {
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

    await geminiQueue.add('process-message', {
      userMessage,
      chatroomId,
      userId: req.user.id
    });

    await Message.create({
      chatroomId,
      userMessage,
      aiResponse: null 
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


router.get("/user/me", authenticate, async (req, res) => {
  try {
    const user = {
      id: req.user.id,
      mobile: req.user.mobile,
      subscriptionTier: req.user.subscriptionTier,
      dailyPromptsUsed: req.user.dailyPromptsUsed,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt
    };
    
    return res.status(200).json({
      status: "success",
      message: "User details retrieved successfully",
      user
    });
  } catch (error) {
    console.error("Error fetching user details:", error.message);
    return res.status(500).json({ 
      status: "error", 
      message: error.message 
    });
  }
});


router.post('/subscribe/pro', authenticate, async (req, res) => {
  try {
    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await mockPayment.createCustomer(req.user.id, req.user.mobile);
      customerId = customer.id;
      await req.user.update({ stripeCustomerId: customerId });
    }
    const session = await mockPayment.createCheckoutSession(req.user.id, customerId);
    const webhookEvent = mockPayment.createWebhookEvent('checkout.session.completed', {
      id: session.id,
      mode: 'subscription',
      customer: customerId,
      subscription: session.subscription,
      metadata: { userId: req.user.id.toString() }
    });

    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.update({
        subscriptionTier: 'pro',
        stripeSubscriptionId: session.subscription
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Subscription checkout initiated',
      url: session.url 
    });
  } catch (error) {
    console.error('Subscription initiation error:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/subscription/status', authenticate, async (req, res) => {
  try {
    return res.status(200).json({
      status: 'success',
      tier: req.user.subscriptionTier
    });
  } catch (error) {
    console.error('Subscription status error:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});


router.post(
  '/webhook/stripe',
  express.raw({ type: '*/*' }), 
  async (req, res) => {
    const signature = req.headers['mock-signature'];
    let rawBody;
    let event;

    try {
      rawBody =
        req.body instanceof Buffer
          ? req.body.toString('utf8')
          : JSON.stringify(req.body);

      console.log('Webhook received raw body:', rawBody);
      if (!mockPayment.verifyWebhookSignature(rawBody, signature)) {
        console.log('Signature verification failed');
        return res
          .status(400)
          .json({ status: 'error', message: 'Invalid webhook signature' });
      }

      console.log('Signature verification successful');
      event = JSON.parse(rawBody);
    } catch (err) {
      console.error('Webhook parsing error:', err.message);
      return res
        .status(400)
        .json({ status: 'error', message: `Webhook Error: ${err.message}` });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          console.log('Processing checkout.session.completed:', session);

          if (session.mode === 'subscription') {
            const userId = session.metadata.userId;
            console.log('Upgrading user to pro:', userId);

            const user = await User.findByPk(userId);
            if (user) {
              await user.update({
                subscriptionTier: 'pro',
                stripeSubscriptionId: session.subscription,
                stripeCustomerId: session.customer,
              });
              console.log(`User ${userId} upgraded to pro`);
            } else {
              console.log(`User ${userId} not found`);
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          console.log('Processing invoice.payment_failed:', invoice);

          const subscriptionId = invoice.subscription;
          const user = await User.findOne({
            where: { stripeSubscriptionId: subscriptionId },
          });
          if (user) {
            await user.update({ subscriptionTier: 'basic' });
            console.log(
              ` User ${user.id} subscription failed, downgraded to basic`
            );
          } else {
            console.log(`User with subscription ${subscriptionId} not found`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          console.log('Processing customer.subscription.deleted:', subscription);

          const user = await User.findOne({
            where: { stripeSubscriptionId: subscription.id },
          });
          if (user) {
            await user.update({
              subscriptionTier: 'basic',
              stripeSubscriptionId: null,
            });
            console.log(
              `User ${user.id} subscription cancelled, downgraded to basic`
            );
          } else {
            console.log(`User with subscription ${subscription.id} not found`);
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully',
        received: true,
      });
    } catch (error) {
      console.error('Webhook handling error:', error.message);
      return res
        .status(500)
        .json({ status: 'error', message: error.message });
    }
  }
);


router.post(
  '/auth/forgot-password',
  [
    body('mobile').matches(/^\d{10}$/).withMessage('Mobile must be a 10-digit number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', message: errors.array()[0].msg });
      }

      const { mobile } = req.body;
      const user = await User.findOne({ where: { mobile } });
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'Mobile number not registered' });
      }
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 
      await Otp.destroy({ where: { mobile } }); 
      await Otp.create({ mobile, code: otpCode, expiresAt });
      console.log(`Reset OTP for ${mobile} is ${otpCode}`);
      return res.status(200).json({
        status: 'success',
        message: 'Password reset OTP sent successfully',
        otp: otpCode, 
        mobile,
      });
    } catch (error) {
      console.error('Forgot password error:', error.message);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
);


router.post(
  '/auth/change-password',
  authenticate,
  [
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', message: errors.array()[0].msg });
      }

      const { newPassword } = req.body;
      const user = req.user;
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      return res.status(200).json({
        status: 'success',
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error.message);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
);

module.exports = router;
