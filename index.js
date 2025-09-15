const express = require('express');
require('dotenv').config({ path: `${process.cwd()}/.env` });
const { sequelize } = require('./models'); 
const authRoutes = require("./routes/auth");
// const geminiRoutes = require("./routes/gemini"); // If you have gemini routes

const app = express();
app.use(express.json());

// Routes
app.use("/", authRoutes);
// If you have gemini routes, add them here
// app.use("/api/gemini", geminiRoutes);

app.get('/', (req, res) => res.send('Gemini Backend Clone'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Database connection
sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Database sync error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});