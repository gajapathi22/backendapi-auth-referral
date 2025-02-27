const express = require('express');
const {Referral, User} = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router()

// GET /api/referrals: Fetch list of users referred by the logged-in user
router.get('/referrals', authMiddleware, async(req,res) =>{
    try{
        const referrals = await Referral.findAll({
            where: { referrer_id: req.user.id},
            include:[{
                model:User,
                as:'referredUser',
                attributes:['id','username','email','created_at']
            }]
        });
        return res.json({ referrals });
    }catch(error){
        console.error('Error fetching referrals:', error);
        return res.status(500).json({error:'Server error'})
    }
});

// GET /api/referral-stats: Retrieve referral statistics for the logged-in user
router.get('/referral-stats', authMiddleware, async (req, res) => {
    try {
      const totalReferrals = await Referral.count({
        where: { referrer_id: req.user.id }
      });
      // You can expand this to include more detailed stats if needed
      return res.json({ totalReferrals });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });
  
  module.exports = router;
