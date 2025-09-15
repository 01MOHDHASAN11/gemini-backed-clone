const rateLimitBasic = async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (req.user.subscriptionTier === 'basic') {
    if (req.user.lastPromptDate < today) {
      await req.user.update({ dailyPromptsUsed: 0, lastPromptDate: new Date() });
    }
    if (req.user.dailyPromptsUsed >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Daily limit exceeded. Upgrade to pro for unlimited access.',
      });
    }
  }
  next();
};

module.exports=rateLimitBasic;