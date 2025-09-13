const express = require('express');
require('dotenv').config({ path: `${process.cwd()}/.env` });
const { sequelize } = require('./models'); 
const authRoutes = require("./routes/auth")
const app = express();
app.use(express.json());
app.use("/",authRoutes)
app.get('/', (req, res) => res.send('Gemini Backend Clone'));

sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Database sync error:', err));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));