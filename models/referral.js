module.exports = (sequelize, DataTypes) => {
  const Referral = sequelize.define('Referral', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    referrer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    referred_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    
    date_referred: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM('pending', 'successful'),
      defaultValue: 'pending',
    },
  }, {
    tableName: 'referrals',
    timestamps: false,
  });

  return Referral;
};
