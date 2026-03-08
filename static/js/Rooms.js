const API = '';
let allRoomData = [];

const images = {
    'Deluxe': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500',
    'Suite': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500',
    'Standard': 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=500',
    'Penthouse': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500',
    'Cabin': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500',
    'Studio': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500',
    'Heritage': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'
};

// Fetch rooms from database on page load
function loadRooms() {
    const status = document.getElementById('status-msg');
    status.textContent = 'Loading rooms from database...';

    fetch('/rooms')
        .then(res => res.json())
        .then(rooms => {
            allRoomData = rooms;
            status.textContent = 'Showing ' + rooms.length + ' rooms from the database.';
            renderRooms(rooms);
        })
        .catch(err => {
            status.textContent = 'Error: Could not connect to server. Make sure Flask is running.';
            status.style.color = '#ef4444';
        });
}

function renderRooms(data) {
    const grid = document.getElementById('allRooms');
    if (data.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">No rooms match your search criteria.</p>';
        return;
    }
    grid.innerHTML = data.map(room => {
        const img = images[room.room_type] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500';
        const statusClass = 'status-' + room.status;
        const statusText = room.status.charAt(0).toUpperCase() + room.status.slice(1);

        return `
                    <div class="room-card" style="position: relative;">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        <img src="${img}" class="room-img" alt="${room.room_type}">
                        <div class="room-info">
                            <h3>Room ${room.room_number} - ${room.room_type}</h3>
                            <p style="color: #64748b; font-size: 13px; margin: 5px 0;">Capacity: ${room.capacity} guests</p>
                            <p class="price">$${room.price_per_night} / night</p>
                            <button class="btn-book${room.status !== 'available' ? ' btn-booked' : ''}" style="width: 100%; margin-top: 10px;"
                                onclick="openBookingModal(${room.room_id}, '${room.room_type}', ${room.price_per_night})"
                                ${room.status !== 'available' ? 'disabled' : ''}>
                                ${room.status === 'available' ? 'Book Now' : room.status === 'booked' ? 'Booked' : 'Under Maintenance'}
                            </button>
                        </div>
                    </div>
                `;
    }).join('');
}

// Client-side filtering on already-fetched data
function filterRooms() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const maxPrice = parseFloat(document.getElementById('priceInput').value) || Infinity;
    const statusFilter = document.getElementById('statusFilter').value;

    const filtered = allRoomData.filter(room =>
        room.room_type.toLowerCase().includes(query) &&
        room.price_per_night <= maxPrice &&
        (statusFilter === '' || room.status === statusFilter)
    );

    document.getElementById('status-msg').textContent = 'Showing ' + filtered.length + ' of ' + allRoomData.length + ' rooms.';
    renderRooms(filtered);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('priceInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('status-msg').textContent = 'Showing ' + allRoomData.length + ' rooms from the database.';
    renderRooms(allRoomData);
}

// BOOKING MODAL
// =====================
function openBookingModal(roomId, roomType, price) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('Please log in first to book a room. Go to Home page to log in.');
        return;
    }
    // Verify session is still valid on server
    fetch('/check-session')
        .then(res => res.json())
        .then(data => {
            if (!data.logged_in) {
                localStorage.removeItem('user');
                alert('Your session has expired. Please log in again.');
                return;
            }
            _openBookingModalInner(roomId, roomType, price);
        })
        .catch(() => {
            alert('Cannot reach server. Please try again.');
        });
}

function _openBookingModalInner(roomId, roomType, price) {
    document.getElementById('selectedRoomId').value = roomId;
    document.getElementById('selectedRoomPrice').value = price;
    document.getElementById('bookingRoomInfo').textContent = roomType + ' - $' + price + '/night';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkIn').min = today;
    document.getElementById('checkOut').min = today;
    document.getElementById('bookingModal').style.display = 'flex';
}

function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

// CONFIRM BOOKING
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

    // Calculate total nights
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
            closeBookingModal();
            // Open payment modal
            openPaymentModal(data.booking_id, totalAmount, nights);
            loadRooms();
        })
        .catch(err => alert('Booking failed. Check server.'));
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

// SUBMIT PAYMENT
// =====================
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
            // Show success
            document.getElementById('successDetails').textContent =
                '$' + parseFloat(amount).toFixed(2) + ' paid via ' + method.toUpperCase() + ' for Booking #' + bookingId;
            document.getElementById('paymentSuccessModal').style.display = 'flex';
        })
        .catch(err => alert('Payment failed. Check server.'));
}

function closeSuccessModal() {
    document.getElementById('paymentSuccessModal').style.display = 'none';
}

// Load rooms on page load
loadRooms();
