const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASS, 
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres'
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user')(sequelize, Sequelize);
db.Referral = require('./referral')(sequelize, Sequelize);

// Associations
// A user can have many referrals (they referred many users)
db.User.hasMany(db.Referral, { foreignKey: 'referrer_id', as: 'referrals' });
db.Referral.belongsTo(db.User, { foreignKey: 'referrer_id', as: 'referrer' });

// A referral record connects a referrer to a referred user
db.User.hasOne(db.Referral, { foreignKey: 'referred_user_id', as: 'referred' });
db.Referral.belongsTo(db.User, { foreignKey: 'referred_user_id', as: 'referredUser' });

module.exports = db;
