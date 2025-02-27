const jwt = require('jsonwebtoken');
const {User} = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const authMiddleware = async (req,res,next) =>{
  const authHeader = req.headers.authorization;
  console.log(authHeader)
  if(!authHeader || !authHeader.startsWith('Bearer')){
    return res.status(401).json({error:'Unauthorized: No token provided'});
  }
  const token = authHeader.split(' ')[1];
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    req.user = user; // Attach user object to request
    next();

  }catch(error){
    return res.status(401).json({error: 'Unauthorize:Invalid token'})
  }
};


module.exports = authMiddleware;