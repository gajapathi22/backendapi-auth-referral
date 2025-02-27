const express = require('express');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const  {User, Referral } = require('../models');
const { validateEmail, validatePassword } = require('../validators.js');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

//POST /api/register
router.post('/register', async (req,res) =>{
  try{
    const { email, username, password  } = req.body;
    console.log('1', email,username,password)
    let referral = req.query.referral || req.body.referral;
    console.log("iiiiiiiiiiiiii",referral)
    //Validate emial and password strength
    if (!validateEmail(email)){
        return res.status(400).json({error:'Invalid email formate'});
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password does not meet strength requirements.' });
    }

    //Check for an existing user with same email
    const existingUser = await User.findOne({where: {email}});
    if (existingUser){
        return res.status(400).json({error:'Email already in use.'});
    }

    //Hash password
    const password_hash = await bcrypt.hash(password,10);

    // Generate a unique referral code (just the code) for the new user
    // Generate a unique referral code and referral link for the new user
    const generatedReferralCode = `REF-${username}-${Date.now()}`;
    const referral_link = `http://localhost:3000/register?referral=${generatedReferralCode}`;

    //Create a new user
    const newUser = await User.create({
        email,
        username,
        password_hash,
        referral_code:generatedReferralCode,
        referral_link,
        referred_by:null
    });

    //If a referral code was provided, validate it and create a referral record
    // If a referral is provided, process it
    if (referral) {
      // If the referral string starts with "http", extract the referral code from the URL
      let referralCodeToUse = referral;
      if (referral.startsWith("http")) {
        try {
          const referralUrl = new URL(referral);
          referralCodeToUse = referralUrl.searchParams.get("referral");
          if (!referralCodeToUse) {
            return res.status(400).json({ error: "Invalid referral link" });
          }
        } catch (err) {
          return res.status(400).json({ error: "Invalid referral link" });
        }
      }
      
      // Lookup the referrer using the referral code in the User model
      const referrer = await User.findOne({ where: { referral_code: referralCodeToUse } });
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
      
      // Associate the new user with the referrer
      newUser.referred_by = referrer.id;
      await newUser.save();
      
      // Create a referral record, storing both the referral code and the full referral link
      await Referral.create({
        referrer_id: referrer.id,
        referred_user_id: newUser.id,
        referral_code: referralCodeToUse,
        referral_link: `http://localhost:3000/register?referral=${referralCodeToUse}`,
        date_referred: new Date(),
        status: 'successful'
      });
    }
    
    // Optionally auto-login the user by generating a JWT token
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

//POST /api/login

router.post('/login',async(req,res)=>{
    try{
        const {email, username,password} = req.body;
        
         //Find user by email or username
        console.log("ppppppppppppppppp",username,email, password)
        const conditions = [];
        if (email) {
          conditions.push({ email });
        }
        if (username) {
          conditions.push({ username });
        }
        if (conditions.length === 0) {
          return res.status(400).json({ error: 'Please provide a valid email or username.' });
        }
        const user = await User.findOne({
           
            where:{
                [Op.or]: conditions
            }
         });
         if(!user){
            return res.status(400).json({error:'User not found.'});

         }
        //Check password
        const isMatch = await bcrypt.compare(password,user.password_hash);
        if(!isMatch){
            return res.status(400).json({error:'Incorrect password'});
        }

        //Generate JWT token
        const token = jwt.sign({id:user.id},JWT_SECRET,{expiresIn:'1h'});
        return res.json({message:'Logged in successfully',token})
    } catch(error){
        console.error('Login error:', error);
        return res.status(500).json({error:'Server error'})
    }
});


//POST /api/forgot-password
router.post('/forgot-password', async(req,res)=>{
    try{
     const {email} = req.body;
     //check is user exists
     const user = await User.findOne({where:{email}});
     if(!user){
        return res.status(400).json({error:'User not found.'});
    
     }

     //Generate a reset token (using JWT with a short expiry)
     const resetToken = jwt.sign({id:user.id},JWT_SECRET,{expiresIn:'15m'});
     return res.json({message:'Password reset token generated', resetToken})
    } catch(error){
        console.error('Forgot password error:', error);
        return res.status(500).json({error:'Server error'})
    }
});

// POST /api/reset-password
router.post('/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
  
      // Verify the token
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired token.' });
      }
  
      // Validate the new password
      if (!validatePassword(newPassword)) {
        return res.status(400).json({ error: 'Password does not meet strength requirements.' });
      }
  
      // Find the user and update the password
      const user = await User.findByPk(payload.id);
      if (!user) {
        return res.status(400).json({ error: 'User not found.' });
      }
      user.password_hash = await bcrypt.hash(newPassword, 10);
      await user.save();
  
      return res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });
  
  module.exports = router;