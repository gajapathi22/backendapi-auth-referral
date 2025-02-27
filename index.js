const app = require('./app');
const { sequelize } = require('./models');
const PORT = process.env.PORT || 3000;

// Sync database and start server
sequelize.sync().then(() => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
