let selectedRole = null;
let myRole = null;

// Pilih Stik 1 atau Stik 2
document.getElementById('btn-p1').addEventListener('click', () => openNameSetup('p1', 'Stik 1 (Merah)'));
document.getElementById('btn-p2').addEventListener('click', () => openNameSetup('p2', 'Stik 2 (Hijau)'));

function openNameSetup(role, label) {
    selectedRole = role;
    document.getElementById('selected-stick-title').innerText = `Nama Pemain - ${label}`;
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('name-screen').classList.add('active');
}

// Konfirmasi Nama & Masuk ke Mode Stik
document.getElementById('btn-confirm-name').addEventListener('click', () => {
    const playerName = document.getElementById('player-name-input').value.trim() || (selectedRole === 'p1' ? 'Player 1' : 'Player 2');
    socket.emit('joinRole', { role: selectedRole, name: playerName });
});

// Jika ditolak karena slot baru saja direbut device lain
socket.on('roleRejected', (msg) => {
    alert(msg);
    document.getElementById('name-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
});

// Jika diterima masuk sebagai Stik
socket.on('roleAccepted', ({ role, name }) => {
    if (role === 'p1' || role === 'p2') {
        myRole = role;
        document.getElementById('name-screen').classList.remove('active');
        document.getElementById('controller-screen').classList.add('active');
        document.getElementById('ctrl-player-info').innerText = `${role.toUpperCase()} - ${name}`;

        // Coba kunci layar ke mode landscape otomatis (jika didukung browser HP)
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
    }
});

// Kontrol Sentuh Multi-Touch & Mouse
const buttons = document.querySelectorAll('.ctrl-btn');
buttons.forEach(btn => {
    const key = btn.getAttribute('data-key');

    const press = (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        if (myRole) socket.emit('controlInput', { role: myRole, key, state: true });
    };

    const release = (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        if (myRole) socket.emit('controlInput', { role: myRole, key, state: false });
    };

    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
});
