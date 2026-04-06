require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model('User', {
  username: String,
  password: String,
  balance: Number,
  role: { type: String, default: 'user' }
});

const Order = mongoose.model('Order', {
  username: String,
  service: String,
  price: Number,
  status: { type: String, default: 'Pending' }
});

function auth(req,res,next){
  const token = req.headers.authorization;
  if(!token) return res.sendStatus(401);

  try{
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  }catch{
    res.sendStatus(403);
  }
}

app.post('/register', async (req,res)=>{
  const hash = await bcrypt.hash(req.body.password,10);
  await new User({username:req.body.username,password:hash,balance:100}).save();
  res.send('Registered');
});

app.post('/login', async (req,res)=>{
  const user = await User.findOne({username:req.body.username});
  if(!user) return res.sendStatus(401);

  const ok = await bcrypt.compare(req.body.password,user.password);
  if(!ok) return res.sendStatus(401);

  const token = jwt.sign({username:user.username,role:user.role},process.env.JWT_SECRET);
  res.send({token,balance:user.balance});
});

app.post('/order', auth, async (req,res)=>{
  const user = await User.findOne({username:req.user.username});

  if(user.balance < req.body.price) return res.send('No balance');

  user.balance -= req.body.price;
  await user.save();

  await new Order({username:user.username,service:req.body.service,price:req.body.price}).save();

  res.send({balance:user.balance});
});

app.get('/orders', auth, async (req,res)=>{
  res.send(await Order.find({username:req.user.username}));
});

app.listen(3000, ()=>console.log('Server running on http://localhost:3000'));

