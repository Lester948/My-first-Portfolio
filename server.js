const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MONGODB_URI = 'mongodb+srv://lesterhamjan_db_user:HM9slILckjdHdPt0@cluster0.ksbhys7.mongodb.net/';

// Middleware

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database setup
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('Connected to MongoDB.');
  initializeDatabase();
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err.message);
  console.error('Using local mock data instead...');
});

// Mongoose schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  description: String,
  stock: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

const cartSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1 },
  session_id: String,
  created_at: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  shipping_address: String,
  created_at: { type: Date, default: Date.now }
});

const orderItemSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }
});

// Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);
const OrderItem = mongoose.model('OrderItem', orderItemSchema);

// Initialize database with sample data
async function initializeDatabase() {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      await insertSampleProducts();
      console.log('Database initialized with sample data.');
    } else {
      console.log('Database already contains products, skipping initialization.');
    }
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}

// Insert sample products
async function insertSampleProducts() {
  const products = [
    { name: 'Wireless Headphones', price: 99.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop', category: 'Electronics', description: 'High-quality wireless headphones with noise cancellation', stock: 50 },
    { name: 'Smart Watch', price: 199.99, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop', category: 'Electronics', description: 'Feature-rich smartwatch with health tracking', stock: 30 },
    { name: 'Running Shoes', price: 79.99, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop', category: 'Sports', description: 'Comfortable running shoes for all terrains', stock: 75 },
    { name: 'Leather Jacket', price: 149.99, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop', category: 'Clothing', description: 'Premium leather jacket with modern design', stock: 25 },
    { name: 'Coffee Maker', price: 89.99, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop', category: 'Home', description: 'Automatic coffee maker with programmable timer', stock: 40 },
    { name: 'Gaming Mouse', price: 49.99, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop', category: 'Electronics', description: 'RGB gaming mouse with precision tracking', stock: 60 },
    { name: 'Yoga Mat', price: 29.99, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=300&fit=crop', category: 'Sports', description: 'Non-slip yoga mat for all your practice needs', stock: 100 },
    { name: 'Sunglasses', price: 39.99, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop', category: 'Accessories', description: 'Stylish sunglasses with UV protection', stock: 80 }
  ];

  await Product.insertMany(products, { ordered: false }).catch(err => {
    if (err.code === 11000) {
      console.log('Some products already exist, continuing...');
    } else {
      throw err;
    }
  });
  console.log('Sample products inserted.');
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'register2.html'));
});

// User registration
app.post('/api/auth/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id, email }, JWT_SECRET);
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, name, email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').exists().withMessage('Password required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Add to cart (authenticated users)
app.post('/api/cart', authenticateToken, [
  body('productId').isMongoId().withMessage('Valid product ID required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { productId, quantity } = req.body;
  const userId = req.user.id;

  try {
    // Check if product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already in cart
    const existingCart = await Cart.findOne({ user_id: userId, product_id: productId });
    if (existingCart) {
      // Update quantity
      existingCart.quantity += quantity;
      await existingCart.save();
    } else {
      // Add new item
      const cartItem = new Cart({ user_id: userId, product_id: productId, quantity });
      await cartItem.save();
    }

    res.json({ message: 'Cart updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get cart items
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItems = await Cart.find({ user_id: userId }).populate('product_id');
    const items = cartItems.map(item => ({
      id: item._id,
      quantity: item.quantity,
      product_id: item.product_id._id,
      name: item.product_id.name,
      price: item.product_id.price,
      image: item.product_id.image,
      category: item.product_id.category
    }));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update cart item quantity
app.put('/api/cart/:id', authenticateToken, [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or greater')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { quantity } = req.body;
  const userId = req.user.id;

  try {
    if (quantity === 0) {
      // Remove item
      await Cart.findOneAndDelete({ _id: id, user_id: userId });
      res.json({ message: 'Item removed from cart' });
    } else {
      // Update quantity
      await Cart.findOneAndUpdate(
        { _id: id, user_id: userId },
        { quantity },
        { new: true }
      );
      res.json({ message: 'Cart updated successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove from cart
app.delete('/api/cart/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.run('DELETE FROM cart WHERE id = ? AND user_id = ?', [id, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error removing item' });
    }
    res.json({ message: 'Item removed from cart' });
  });
});

// Create order
app.post('/api/orders', authenticateToken, [
  body('shippingAddress').trim().isLength({ min: 10 }).withMessage('Shipping address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { shippingAddress } = req.body;

  try {
    // Get cart items
    const cartItems = await Cart.find({ user_id: userId }).populate('product_id');
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate total and check stock
    let total = 0;
    for (const item of cartItems) {
      if (item.product_id.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${item.product_id.name}` });
      }
      total += item.product_id.price * item.quantity;
    }

    // Create order
    const order = new Order({ user_id: userId, total, shipping_address: shippingAddress });
    await order.save();

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order._id,
      product_id: item.product_id._id,
      quantity: item.quantity,
      price: item.product_id.price
    }));
    await OrderItem.insertMany(orderItems);

    // Update stock
    for (const item of cartItems) {
      await Product.findByIdAndUpdate(item.product_id._id, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear cart
    await Cart.deleteMany({ user_id: userId });

    res.json({
      message: 'Order created successfully',
      orderId: order._id,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ user_id: userId }).sort({ created_at: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error closing database:', err.message);
  }
  process.exit(0);
});