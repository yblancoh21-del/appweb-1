# Gamer's Hub - Backend Setup

## Instalación

1. **Instalar dependencias:**
```bash
pip install -r requirements.txt
```

2. **Ejecutar el servidor:**
```bash
python app.py
```

El servidor estará disponible en `http://localhost:5000`

## Inicializar la base de datos

Para poblador con los juegos de ejemplo, hacer una solicitud POST a:
```
POST http://localhost:5000/api/init-db
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión

### Productos
- `GET /api/products` - Obtener todos los productos
- `GET /api/products/<product_id>` - Obtener un producto específico

### Carrito
- `GET /api/cart/<user_id>` - Obtener carrito del usuario
- `POST /api/cart/add` - Agregar producto al carrito
- `DELETE /api/cart/remove/<cart_item_id>` - Remover producto del carrito
- `DELETE /api/cart/clear/<user_id>` - Vaciar el carrito

### Checkout
- `POST /api/checkout` - Completar la compra

### Sistema
- `GET /api/health` - Verificar estado del servidor

## Base de datos

Se usa SQLite (`gamers_hub.db`) con las siguientes tablas:
- `user` - Usuarios registrados
- `product` - Catálogo de juegos
- `cart_item` - Items en el carrito
- `order` - Órdenes completadas

## Configuración

En `app.py` cambiar:
```python
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
```

Para usar en producción, cambiar `debug=True` a `debug=False`.
