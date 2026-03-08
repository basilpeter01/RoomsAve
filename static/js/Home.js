const API = '';

// Check if already logged in 
// =====================
function checkLogin() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // Verify the session is still valid on the server
        fetch('/check-session')
            .then(res => res.json())
            .then(data => {
                if (data.logged_in) {
                    showLoggedInState(user);
                } else {
                    // Server session expired (server was restarted)
                    localStorage.removeItem('user');
                }
            })
            .catch(() => {
                // Server is unreachable, clear login
                localStorage.removeItem('user');
            });
    }
}

function showLoggedInState(user) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('rooms-link').style.display = 'inline';
    document.getElementById('bookings-link').style.display = 'inline';
    document.getElementById('login-nav-link').style.display = 'none';
    document.getElementById('logout-link').style.display = 'inline';
    document.getElementById('roomSection').style.display = 'block';
    document.getElementById('welcomeMsg').textContent = 'Welcome back, ' + user.name + '!';
}

// LOGIN (calls /login)
// =====================
function handleAuth(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            localStorage.setItem('user', JSON.stringify(data));
            alert('Login Successful! Welcome, ' + data.name);
            showLoggedInState(data);
        })
        .catch(err => alert('Server error. Make sure Flask is running.'));
}

// LOGOUT
// =====================
function handleLogout() {
    fetch('/logout', { method: 'POST' })
        .finally(() => {
            localStorage.removeItem('user');
            window.location.reload();
        });
}

// FETCH ROOMS FROM DATABASE
// =====================
function loadRooms() {
    fetch('/rooms')
        .then(res => res.json())
        .then(rooms => {
            const roomGrid = document.getElementById('roomGrid');
            const badges = { 'Deluxe': 'Hot Deal', 'Suite': 'Popular', 'Penthouse': 'Luxury', 'Studio': 'New' };
            const images = {
                'Deluxe': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500',
                'Suite': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500',
                'Standard': 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=500',
                'Penthouse': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500',
                'Cabin': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500',
                'Studio': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500',
                'Heritage': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'
            };

            roomGrid.innerHTML = rooms.map(room => {
                const badge = badges[room.room_type] || '';
                const img = images[room.room_type] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500';
                const statusColor = room.status === 'available' ? '#22c55e' : '#ef4444';
                const statusText = room.status.charAt(0).toUpperCase() + room.status.slice(1);

                return `
                        <div class="room-card" style="position: relative;">
                            ${badge ? `<span style="position: absolute; top: 10px; left: 10px; background: #ef4444; color: white; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: bold;">${badge}</span>` : ''}
                            <span style="position: absolute; top: 10px; right: 10px; background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: bold;">${statusText}</span>
                            <img src="${img}" alt="${room.room_type}" class="room-img">
                            <div class="room-info">
                                <h3>Room ${room.room_number} - ${room.room_type}</h3>
                                <p class="price">$${room.price_per_night} / night (Capacity: ${room.capacity})</p>
                                <button class="btn-book" onclick="openModal(${room.room_id}, '${room.room_type}', ${room.price_per_night})" ${room.status !== 'available' ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                                    ${room.status === 'available' ? 'Book Now' : 'Unavailable'}
                                </button>
                            </div>
                        </div>
                    `;
            }).join('');
        })
        .catch(err => {
            document.getElementById('roomGrid').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444;">Could not load rooms. Make sure Flask server is running.</p>';
        });
}

// BOOKING MODAL
// =====================
const modal = document.getElementById('bookingModal');

function openModal(roomId, roomType, price) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('Please log in first to book a room.');
        document.getElementById('auth-section').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    document.getElementById('selectedRoomId').value = roomId;
    document.getElementById('selectedRoomPrice').value = price;
    document.getElementById('bookingRoomInfo').textContent = roomType + ' - $' + price + '/night';
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkIn').min = today;
    document.getElementById('checkOut').min = today;
    modal.style.display = 'flex';
}

function closeModal() { modal.style.display = 'none'; }

// CONFIRM BOOKING (calls /api/booking)
// =====================
function confirmBooking(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { alert('Please log in first.'); return; }

    const roomId = document.getElementById('selectedRoomId').value;
    const price = parseFloat(document.getElementById('selectedRoomPrice').value);
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;

    if (checkOut <= checkIn) {
        alert('Check-out date must be after check-in date.');
        return;
    }

    // Calculate total
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    const totalAmount = (nights * price).toFixed(2);

    fetch('/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user.user_id,
            room_id: parseInt(roomId),
            check_in: checkIn,
            check_out: checkOut
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) { alert(data.error); return; }
            closeModal();
            // Open payment modal after booking
            openPaymentModal(data.booking_id, totalAmount, nights);
            loadRooms();
        })
        .catch(err => alert('Booking failed. Check server.'));
}

// VIEW BOOKINGS (calls /api/bookings/<user_id>)
// =====================
function viewMyBookings() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    fetch('/bookings/' + user.user_id)
        .then(res => res.json())
        .then(bookings => {
            const list = document.getElementById('bookingsList');
            if (bookings.length === 0) {
                list.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">No bookings yet.</p>';
            } else {
                list.innerHTML = bookings.map(b => {
                    // Calculate total for payment
                    const d1 = new Date(b.check_in);
                    const d2 = new Date(b.check_out);
                    const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
                    const total = (nights * b.price_per_night).toFixed(2);

                    const statusColor = b.booking_status === 'confirmed' ? '#f59e0b'
                        : b.booking_status === 'completed' ? '#22c55e' : '#ef4444';
                    const statusLabel = b.booking_status === 'completed' ? 'PAID ✅' : b.booking_status.toUpperCase();

                    return `
                            <div style="border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:10px;">
                                <strong>Room ${b.room_number} (${b.room_type})</strong>
                                <p style="margin:5px 0;color:#64748b;">Check-in: ${b.check_in} | Check-out: ${b.check_out}</p>
                                <p style="margin:5px 0;">$${b.price_per_night}/night × ${nights} nights = <strong>$${total}</strong> | Status: 
                                    <span style="color:${statusColor}; font-weight:bold;">
                                        ${statusLabel}
                                    </span>
                                </p>
                                <div style="display:flex;gap:8px;margin-top:8px;">
                                    ${b.booking_status === 'confirmed' ? `
                                        <button onclick="openPaymentModal(${b.booking_id}, ${total}, ${nights})" style="background:#22c55e;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:bold;">💳 Pay Now</button>
                                        <button onclick="cancelBooking(${b.booking_id})" style="background:#ef4444;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Cancel</button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                }).join('');
            }
            document.getElementById('bookingsModal').style.display = 'flex';
        });
}

// CANCEL BOOKING
// =====================
function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    fetch('/booking/' + bookingId + '/cancel', { method: 'PUT' })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            viewMyBookings(); // Refresh list
            loadRooms();      // Refresh rooms
        });
}

// PAYMENT MODAL
// =====================
function openPaymentModal(bookingId, totalAmount, nights) {
    document.getElementById('payBookingId').value = bookingId;
    document.getElementById('payAmount').value = totalAmount;
    document.getElementById('paymentInfo').textContent =
        'Booking #' + bookingId + ' — ' + nights + ' night(s) — Total: $' + totalAmount;
    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function submitPayment(e) {
    e.preventDefault();
    const bookingId = document.getElementById('payBookingId').value;
    const amount = document.getElementById('payAmount').value;
    const method = document.querySelector('input[name="payMethod"]:checked').value;
    const today = new Date().toISOString().split('T')[0];

    fetch('/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            booking_id: parseInt(bookingId),
            amount: parseFloat(amount),
            payment_method: method,
            payment_date: today
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) { alert(data.error); return; }
            closePaymentModal();
            document.getElementById('successDetails').textContent =
                '$' + parseFloat(amount).toFixed(2) + ' paid via ' + method.toUpperCase() + ' for Booking #' + bookingId;
            document.getElementById('paymentSuccessModal').style.display = 'flex';
            viewMyBookings(); // Refresh bookings list to show payment status
        })
        .catch(err => alert('Payment failed. Check server.'));
}

function closeSuccessModal() {
    document.getElementById('paymentSuccessModal').style.display = 'none';
}

// INIT
// =====================
checkLogin();
loadRooms();
