const API = '';

function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('fullName').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const pass = document.getElementById('password').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (pass !== confirmPass) {
        alert("Passwords do not match!");
        return;
    }

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, phone, password: pass })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }
            alert(data.message + ' You can now log in.');
            window.location.href = 'Home.html';
        })
        .catch(err => alert('Server error. Make sure Flask is running.'));
}
