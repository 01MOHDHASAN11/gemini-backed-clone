const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
});

const geminiQueue = new Queue('gemini-queue', { connection });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function processGeminiRequest(job) {
  try {
    const { userMessage, chatroomId, userId } = job.data;
    
    if (!userMessage || !chatroomId || !userId) {
      throw new Error('Missing required parameters in job data');
    }

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = userMessage;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();

    return {
      success: true,
      aiResponse,
      chatroomId,
      userId
    };
  } catch (error) {
    console.error('Error processing Gemini request:', error);
    return {
      success: false,
      error: error.message,
      chatroomId: job.data.chatroomId,
      userId: job.data.userId
    };
  }
}

module.exports = { geminiQueue, connection, processGeminiRequest };