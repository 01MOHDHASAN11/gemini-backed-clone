require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Queue } = require('bullmq');
const { Redis } = require('ioredis');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, 
  enableReadyCheck: false     
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const geminiQueue = new Queue('gemini-queue', { connection });

const processGeminiRequest = async (job) => {
  try {
    const { userMessage, chatroomId, userId } = job.data;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    const aiResponse = response.text();
    
    return { success: true, aiResponse, chatroomId, userId };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

module.exports = { geminiQueue, processGeminiRequest, connection };