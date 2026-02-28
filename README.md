# RoomsAve — Hotel Room Management System

A full-stack **Database Management System (DBMS)** project for managing hotel room bookings, users, and payments. Built with **Python Flask**, **MySQL**, and **HTML/CSS/JS** frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Python Flask |
| Database | MySQL 8.0 |
| DB Connector | flask-mysqldb (mysqlclient) |

---

## Frontend

The frontend consists of 3 pages served directly by Flask:

- **Home** (`Home.html`) — Landing page with login form, featured rooms grid, booking modal, and a "My Bookings" viewer.
- **Signup** (`Signup.html`) — Registration form for new users (name, username, email, phone, password).
- **Rooms** (`Rooms.html`) — Full room listing with search by type, budget filter, and status filter.

---

## Backend (Flask)

The Flask server (`app.py`) exposes the following routes:

| Route | Method | Description |
|---|---|---|
| `/register` | POST | Register a new guest user |
| `/login` | POST | Authenticate via username & password |
| `/rooms` | GET | Fetch all rooms (supports search & price filtering) |
| `/rooms/<id>` | GET | Fetch a single room by ID |
| `/booking` | POST | Create a booking & update room status |
| `/bookings/<user_id>` | GET | Retrieve bookings for a user (JOIN with room) |
| `/booking/<id>/cancel` | PUT | Cancel a booking & free the room |
| `/payment` | POST | Record a payment against a booking |
| `/payments/<booking_id>` | GET | Retrieve payments for a booking |

- Static files (CSS) are served from `static/css/` and HTML templates from `templates/`.

---

## Database Design

### ER Model

The system is designed around **4 entities** with the following relationships:

```
USER (1) ──── books ──── (N) BOOKING
ROOM (1) ──── assigned ──── (N) BOOKING
BOOKING (M) ──── money payment ──── (N) PAYMENT
```

### Schema

#### `user`
| Column | Type | Constraints |
|---|---|---|
| `user_id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `name` | VARCHAR(100) | NOT NULL |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL |
| `email` | VARCHAR(100) | — |
| `phone` | VARCHAR(15) | — |
| `password` | VARCHAR(255) | NOT NULL |
| `role` | ENUM('guest', 'admin') | DEFAULT 'guest' |

#### `room`
| Column | Type | Constraints |
|---|---|---|
| `room_id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `room_number` | VARCHAR(10) | UNIQUE, NOT NULL |
| `room_type` | VARCHAR(50) | NOT NULL |
| `capacity` | INT | NOT NULL |
| `price_per_night` | DECIMAL(10,2) | NOT NULL |
| `status` | ENUM('available', 'booked', 'maintenance') | DEFAULT 'available' |

#### `booking`
| Column | Type | Constraints |
|---|---|---|
| `booking_id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `user_id` | INT | FOREIGN KEY → `user(user_id)`, ON DELETE CASCADE |
| `room_id` | INT | FOREIGN KEY → `room(room_id)`, ON DELETE CASCADE |
| `check_in` | DATE | NOT NULL |
| `check_out` | DATE | NOT NULL |
| `booking_status` | ENUM('confirmed', 'cancelled', 'completed') | DEFAULT 'confirmed' |

#### `payment`
| Column | Type | Constraints |
|---|---|---|
| `payment_id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `booking_id` | INT | FOREIGN KEY → `booking(booking_id)`, ON DELETE CASCADE |
| `amount` | DECIMAL(10,2) | NOT NULL |
| `payment_method` | ENUM('cash', 'card', 'upi') | NOT NULL |
| `payment_date` | DATE | NOT NULL |

### Key Constraints & Relationships

- All foreign keys use **ON DELETE CASCADE** — deleting a user removes their bookings, deleting a booking removes its payments.
- `username` is enforced as **UNIQUE** at the database level to prevent duplicates.
- Room `status` is automatically updated to `'booked'` when a booking is confirmed, and reverted to `'available'` on cancellation.

---

## Project Structure

```
├── app.py                  Flask backend
├── schema.sql              Database schema & seed data
├── requirements.txt        Python dependencies
├── .env.example            Template for .env
├── .gitignore
├── templates/
│   ├── Home.html           Landing page + Login + Booking
│   ├── Rooms.html          Room browsing & filtering
│   └── Signup.html         User registration
├── static/
│   └── css/
│       ├── Home.css
│       ├── Rooms.css
│       └── Login.css
└── README.md
```

---

## Setup

### Prerequisites
- Python 3.x
- MySQL Server

### Steps

1. **Install dependencies**
   ```
   pip install -r requirements.txt
   ```

2. **Configure credentials** — copy `.env.example` to `.env` and fill in your MySQL details.

3. **Initialize the database** — run `schema.sql` against MySQL as root:
   ```
   mysql -u root -p < schema.sql
   ```
   or create the user,database andtables manually.

4. **Start the server**
   ```
   python app.py
   ```

5. Open `http://localhost:5000` in your browser.

### Default Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
