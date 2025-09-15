require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { processGeminiRequest } = require('./geminiQueue');
const { Message, User } = require('../models');

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
});

const worker = new Worker('gemini-queue', async (job) => {
  try {
    console.log('Processing job:', job.id, job.data);
    
    const result = await processGeminiRequest(job);
    
    if (result.success) {
      await Message.update(
        { 
          aiResponse: result.aiResponse,
          updatedAt: new Date() 
        },
        { 
          where: { id: job.data.messageId },
          returning: true 
        }
      );
      
      await User.increment('dailyPromptsUsed', {
        where: { id: result.userId }
      });
      
      console.log('Job completed successfully:', job.id, 'Message updated:', job.data.messageId);
      
      return {
        success: true,
        messageId: job.data.messageId,
        aiResponse: result.aiResponse
      };
    } else {
      await Message.update(
        { 
          aiResponse: `Error: ${result.error || 'Failed to process request'}`,
          updatedAt: new Date()
        },
        { 
          where: { id: job.data.messageId }
        }
      );
      
      console.error('Job failed:', job.id, 'Error:', result.error);
      
      return {
        success: false,
        error: result.error,
        messageId: job.data.messageId
      };
    }
    
  } catch (error) {
    console.error('Worker error processing job:', job.id, error);
    
    try {
      await Message.update(
        { 
          aiResponse: `System Error: ${error.message}`,
          updatedAt: new Date()
        },
        { 
          where: { id: job.data.messageId }
        }
      );
    } catch (updateError) {
      console.error('Failed to update message with error:', updateError);
    }
    
    throw error; 
  }
}, { 
  connection,
  removeOnComplete: { 
    count: 100, 
    age: 24 * 3600 
  }, 
  removeOnFail: { 
    count: 1000, 
    age: 7 * 24 * 3600 
  },
  concurrency: 5, 
  limiter: {
    max: 10, 
    duration: 1000
  }
});

worker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} completed successfully. Message ID: ${returnvalue.messageId}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

worker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} has stalled`);
});

worker.on('closing', () => {
  console.log('Worker is closing');
});

worker.on('closed', () => {
  console.log('Worker has closed');
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await worker.close();
  process.exit(0);
});

console.log('Worker started for gemini-queue');

module.exports = { worker };