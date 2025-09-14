require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Worker } = require('bullmq');
const { connection } = require('./geminiQueue');
const { processGeminiRequest } = require('./geminiQueue');
const { Message } = require('../models');

const worker = new Worker('gemini-queue', async (job) => {
  try {
    console.log('Processing job:', job.id, job.data);
    const result = await processGeminiRequest(job);
    
    if (result.success) {
      await Message.create({
        chatroomId: result.chatroomId,
        userMessage: job.data.userMessage,
        aiResponse: result.aiResponse
      });
      const { User } = require('../models');
      await User.increment('dailyPromptsUsed', {
        where: { id: result.userId }
      });
      
      console.log('Job completed successfully:', job.id);
    }
    
    return result;
  } catch (error) {
    console.error('Worker error:', error);
    throw error;
  }
}, { 
  connection,
  removeOnComplete: { count: 100 }, 
  removeOnFail: { count: 100 }      
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err.message);
});

console.log('Worker started for gemini-queue');