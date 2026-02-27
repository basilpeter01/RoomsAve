from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_mysqldb import MySQL
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# ============================================
# MySQL Configuration (from .env file)
# ============================================
app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'hotel_admin')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD')
app.config['MYSQL_DB'] = os.getenv('MYSQL_DB', 'hotel_management')
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)


# ============================================
# SERVE FRONTEND (HTML files)
# ============================================
@app.route('/')
def serve_home():
    return send_from_directory('.', 'Home.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)


# ============================================
# USER ROUTES
# ============================================

# Register a new user
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT INTO user (name, username, email, phone, password, role) VALUES (%s, %s, %s, %s, %s, %s)",
            (data['name'], data['username'], data.get('email', ''), data.get('phone', ''), data['password'], 'guest')
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Registration successful!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    cur = mysql.connection.cursor()
    cur.execute(
        "SELECT user_id, name, username, role FROM user WHERE username = %s AND password = %s",
        (data['username'], data['password'])
    )
    user = cur.fetchone()
    cur.close()
    if user:
        return jsonify(user)
    return jsonify({"error": "Invalid username or password"}), 401


# ============================================
# ROOM ROUTES
# ============================================

# Get all rooms (with optional search & price filter)
@app.route('/rooms', methods=['GET'])
def get_rooms():
    search = request.args.get('search', '')
    max_price = request.args.get('max_price', None)

    cur = mysql.connection.cursor()

    query = "SELECT * FROM room WHERE 1=1"
    params = []

    if search:
        query += " AND (room_type LIKE %s OR room_number LIKE %s)"
        params.extend([f'%{search}%', f'%{search}%'])

    if max_price:
        query += " AND price_per_night <= %s"
        params.append(float(max_price))

    cur.execute(query, params)
    rooms = cur.fetchall()
    cur.close()

    # Convert Decimal to float for JSON serialization
    for room in rooms:
        room['price_per_night'] = float(room['price_per_night'])

    return jsonify(rooms)


# Get a single room by ID
@app.route('/rooms/<int:room_id>', methods=['GET'])
def get_room(room_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM room WHERE room_id = %s", (room_id,))
    room = cur.fetchone()
    cur.close()
    if room:
        room['price_per_night'] = float(room['price_per_night'])
        return jsonify(room)
    return jsonify({"error": "Room not found"}), 404


# ============================================
# BOOKING ROUTES
# ============================================

# Create a new booking
@app.route('/booking', methods=['POST'])
def create_booking():
    data = request.json
    try:
        cur = mysql.connection.cursor()

        # Check if room is available
        cur.execute("SELECT status FROM room WHERE room_id = %s", (data['room_id'],))
        room = cur.fetchone()
        if not room:
            return jsonify({"error": "Room not found"}), 404
        if room['status'] != 'available':
            return jsonify({"error": "Room is not available"}), 400

        # Create the booking
        cur.execute(
            "INSERT INTO booking (user_id, room_id, check_in, check_out, booking_status) VALUES (%s, %s, %s, %s, 'confirmed')",
            (data['user_id'], data['room_id'], data['check_in'], data['check_out'])
        )
        # Capture booking_id right after INSERT, before any other queries
        booking_id = cur.lastrowid

        # Update room status to 'booked'
        cur.execute("UPDATE room SET status = 'booked' WHERE room_id = %s", (data['room_id'],))

        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "Booking confirmed!", "booking_id": booking_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Get bookings for a specific user
@app.route('/bookings/<int:user_id>', methods=['GET'])
def get_bookings(user_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT b.booking_id, b.check_in, b.check_out, b.booking_status,
               r.room_number, r.room_type, r.price_per_night
        FROM booking b
        JOIN room r ON b.room_id = r.room_id
        WHERE b.user_id = %s AND b.booking_status != 'cancelled'
        ORDER BY b.check_in DESC
    """, (user_id,))
    bookings = cur.fetchall()
    cur.close()

    for b in bookings:
        b['price_per_night'] = float(b['price_per_night'])
        b['check_in'] = str(b['check_in'])
        b['check_out'] = str(b['check_out'])

    return jsonify(bookings)


# Cancel a booking
@app.route('/booking/<int:booking_id>/cancel', methods=['PUT'])
def cancel_booking(booking_id):
    try:
        cur = mysql.connection.cursor()

        # Get the room_id before cancelling
        cur.execute("SELECT room_id FROM booking WHERE booking_id = %s", (booking_id,))
        booking = cur.fetchone()
        if not booking:
            return jsonify({"error": "Booking not found"}), 404

        # Cancel the booking
        cur.execute("UPDATE booking SET booking_status = 'cancelled' WHERE booking_id = %s", (booking_id,))

        # Free up the room
        cur.execute("UPDATE room SET status = 'available' WHERE room_id = %s", (booking['room_id'],))

        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Booking cancelled successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ============================================
# PAYMENT ROUTES
# ============================================

# Record a payment
@app.route('/payment', methods=['POST'])
def make_payment():
    data = request.json
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT INTO payment (booking_id, amount, payment_method, payment_date) VALUES (%s, %s, %s, %s)",
            (data['booking_id'], data['amount'], data['payment_method'], data['payment_date'])
        )
        # Mark booking as completed after payment
        cur.execute(
            "UPDATE booking SET booking_status = 'completed' WHERE booking_id = %s",
            (data['booking_id'],)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Payment recorded successfully!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Get payments for a booking
@app.route('/payments/<int:booking_id>', methods=['GET'])
def get_payments(booking_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM payment WHERE booking_id = %s", (booking_id,))
    payments = cur.fetchall()
    cur.close()

    for p in payments:
        p['amount'] = float(p['amount'])
        p['payment_date'] = str(p['payment_date'])

    return jsonify(payments)


# ============================================
# RUN THE SERVER
# ============================================
if __name__ == '__main__':
    print("\n=== RoomsAve Hotel Management Server ===")
    print("    Running on http://localhost:5000")
    print(f"    Database: {os.getenv('MYSQL_DB', 'hotel_management')}\n")
    app.run(debug=True, port=5000)
