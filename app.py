from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
import re

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gamers_hub.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'

db = SQLAlchemy(app)
CORS(app)

# Password validation function
def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, 'La contraseña debe tener al menos 8 caracteres'
    if not re.search(r'[A-Z]', password):
        return False, 'La contraseña debe contener al menos una mayúscula'
    if not re.search(r'[a-z]', password):
        return False, 'La contraseña debe contener al menos una minúscula'
    if not re.search(r'[0-9]', password):
        return False, 'La contraseña debe contener al menos un número'
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, 'La contraseña debe contener al menos un carácter especial (!@#$%^&*(),.?":{}|<>)'
    return True, 'Valid'

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    cart = db.relationship('CartItem', backref='user', lazy=True, cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(50), unique=True, nullable=False)
    title = db.Column(db.String(120), nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(255))
    category = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    cart_items = db.relationship('CartItem', backref='product', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'title': self.title,
            'price': self.price,
            'description': self.description,
            'image_url': self.image_url,
            'category': self.category
        }

class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'product': self.product.to_dict(),
            'quantity': self.quantity
        }

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'total_price': self.total_price,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

# API Routes

# Auth endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate password strength
    valid, message = validate_password(data['password'])
    if not valid:
        return jsonify({'error': message}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    user = User(
        username=data['username'],
        email=data['email'],
        password=generate_password_hash(data['password'])
    )
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing credentials'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    return jsonify({'message': 'Login successful', 'user': user.to_dict(), 'user_id': user.id}), 200

@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products]), 200

@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.filter_by(product_id=product_id).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify(product.to_dict()), 200

@app.route('/api/products/add', methods=['POST'])
def add_product():
    data = request.get_json()
    
    if not data.get('product_id') or not data.get('title') or not data.get('price'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if Product.query.filter_by(product_id=data['product_id']).first():
        return jsonify({'error': 'Product ID already exists'}), 409
    
    product = Product(
        product_id=data['product_id'],
        title=data['title'],
        price=float(data['price']),
        description=data.get('description', ''),
        image_url=data.get('image_url', ''),
        category=data.get('category', 'General')
    )
    db.session.add(product)
    db.session.commit()
    
    return jsonify({'message': 'Product added successfully', 'product': product.to_dict()}), 201

# Cart endpoints
@app.route('/api/cart/<int:user_id>', methods=['GET'])
def get_cart(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    return jsonify([item.to_dict() for item in cart_items]), 200

@app.route('/api/cart/add', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    
    if not data.get('user_id') or not data.get('product_id'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    product = Product.query.filter_by(product_id=data['product_id']).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    # Check if item already in cart
    cart_item = CartItem.query.filter_by(user_id=data['user_id'], product_id=product.id).first()
    if cart_item:
        cart_item.quantity += data.get('quantity', 1)
    else:
        cart_item = CartItem(
            user_id=data['user_id'],
            product_id=product.id,
            quantity=data.get('quantity', 1)
        )
        db.session.add(cart_item)
    
    db.session.commit()
    return jsonify({'message': 'Item added to cart', 'cart_item': cart_item.to_dict()}), 201

@app.route('/api/cart/remove/<int:cart_item_id>', methods=['DELETE'])
def remove_from_cart(cart_item_id):
    cart_item = CartItem.query.get(cart_item_id)
    if not cart_item:
        return jsonify({'error': 'Cart item not found'}), 404
    
    db.session.delete(cart_item)
    db.session.commit()
    return jsonify({'message': 'Item removed from cart'}), 200

@app.route('/api/cart/clear/<int:user_id>', methods=['DELETE'])
def clear_cart(user_id):
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'Cart cleared'}), 200

# Checkout endpoint
@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.get_json()
    
    if not data.get('user_id'):
        return jsonify({'error': 'User not found'}), 400
    
    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    cart_items = CartItem.query.filter_by(user_id=data['user_id']).all()
    if not cart_items:
        return jsonify({'error': 'Cart is empty'}), 400
    
    # Calculate total
    total = sum(item.product.price * item.quantity for item in cart_items)
    
    # Create order
    order = Order(user_id=data['user_id'], total_price=total, status='completed')
    db.session.add(order)
    
    # Clear cart
    CartItem.query.filter_by(user_id=data['user_id']).delete()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Order completed successfully',
        'order': order.to_dict(),
        'total': total
    }), 201

# Admin endpoints
@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@app.route('/api/admin/products', methods=['GET'])
def get_all_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products]), 200

@app.route('/api/admin/carts', methods=['GET'])
def get_all_carts():
    cart_items = CartItem.query.all()
    result = []
    for item in cart_items:
        result.append({
            'id': item.id,
            'user_id': item.user_id,
            'product_title': item.product.title,
            'quantity': item.quantity,
            'added_at': item.added_at.isoformat()
        })
    return jsonify(result), 200

@app.route('/api/admin/orders', methods=['GET'])
def get_all_orders():
    orders = Order.query.all()
    return jsonify([o.to_dict() for o in orders]), 200

# Health check
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

# Initialize database with sample products
@app.route('/api/init-db', methods=['POST'])
def init_db():
    db.create_all()
    
    # Check if products already exist
    if Product.query.first():
        return jsonify({'message': 'Database already initialized'}), 200
    
    products_data = [
        ('baldurs', "BALDUR'S GATE 3", 59.99, "RPG de mundo abierto con decisiones épicas", "images/baldurs-gate-3-product.jpg", "RPG"),
        ('elden-ring', 'ELDEN RING', 59.99, "Action RPG con un mundo abierto desafiante", "images/elden-ring.jpg", "RPG"),
        ('starfield', 'STARFIELD', 69.99, "Exploración espacial y aventura sci-fi", "images/starfield.jpg", "Aventura"),
        ('cyberpunk', 'CYBERPUNK 2077', 39.99, "RPG futurista en un mundo distópico", "images/cyberpunk-2077.jpg", "RPG"),
        ('hogwarts', 'HOGWARTS LEGACY', 49.99, "Aventura mágica en el universo de Harry Potter", "images/hogwarts-legacy.jpg", "Aventura"),
        ('dragon', "DRAGON'S DOGMA 2", 49.99, "Action RPG épico con batallas intensas", "images/dragons-dogma-2.jpg", "Acción"),
    ]
    
    for product_id, title, price, desc, image, category in products_data:
        product = Product(
            product_id=product_id,
            title=title,
            price=price,
            description=desc,
            image_url=image,
            category=category
        )
        db.session.add(product)
    
    db.session.commit()
    return jsonify({'message': 'Database initialized with products'}), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
