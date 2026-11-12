const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let isDisplay = false;
let gameFinished = false;
const TOTAL_LAPS = 3;

// Data Mobil Pemain
const cars = {
    p1: {
        active: false, name: 'Player 1', color: '#ef4444',
        x: 460, y: 470, angle: 0, speed: 0, nitro: 100, lap: 0, checkpoint: false,
        controls: { gas: false, brake: false, left: false, right: false, nitro: false }
    },
    p2: {
        active: false, name: 'Player 2', color: '#22c55e',
        x: 460, y: 525, angle: 0, speed: 0, nitro: 100, lap: 0, checkpoint: false,
        controls: { gas: false, brake: false, left: false, right: false, nitro: false }
    }
};

// Update status tombol di menu utama
socket.on('slotStatus', ({ p1Taken, p2Taken }) => {
    const btnP1 = document.getElementById('btn-p1');
    const btnP2 = document.getElementById('btn-p2');
    btnP1.disabled = p1Taken;
    btnP1.innerText = p1Taken ? '🔒 Stik 1 (Sudah Aktif)' : '🎮 Pakai Stik 1';
    btnP2.disabled = p2Taken;
    btnP2.innerText = p2Taken ? '🔒 Stik 2 (Sudah Aktif)' : '🎮 Pakai Stik 2';
});

// Klik Buka Display
document.getElementById('btn-display').addEventListener('click', () => {
    socket.emit('joinRole', { role: 'display' });
});

socket.on('roleAccepted', ({ role }) => {
    if (role === 'display') {
        isDisplay = true;
        document.getElementById('menu-screen').classList.remove('active');
        document.getElementById('display-screen').classList.add('active');
        requestAnimationFrame(gameLoop);
    }
});

// Update Nama & Kehadiran Pemain
socket.on('updatePlayers', ({ p1, p2 }) => {
    cars.p1.active = p1.ready;
    cars.p1.name = p1.name;
    cars.p2.active = p2.ready;
    cars.p2.name = p2.name;

    document.getElementById('p1-hud').innerText = p1.ready ? `🔴 ${p1.name} (Lap ${cars.p1.lap}/${TOTAL_LAPS})` : 'Stik 1: Kosong';
    document.getElementById('p2-hud').innerText = p2.ready ? `🟢 ${p2.name} (Lap ${cars.p2.lap}/${TOTAL_LAPS})` : 'Stik 2: Kosong';

    if (p1.ready && p2.ready) {
        document.getElementById('race-status').innerText = '🏁 BALAPAN DIMULAI!';
    } else {
        document.getElementById('race-status').innerText = 'Menunggu kedua stik terhubung...';
    }
});

// Terima Input dari Stik
socket.on('playerInput', ({ role, key, state }) => {
    if (!cars[role]) return;
    if (key === 'horn' && state) {
        playHornSound();
        return;
    }
    cars[role].controls[key] = state;
});

// Restart Balapan
document.getElementById('btn-restart').addEventListener('click', () => {
    socket.emit('restartGame');
});

socket.on('resetRace', () => {
    gameFinished = false;
    document.getElementById('winner-overlay').classList.add('hidden');
    Object.assign(cars.p1, { x: 460, y: 470, angle: 0, speed: 0, nitro: 100, lap: 0, checkpoint: false });
    Object.assign(cars.p2, { x: 460, y: 525, angle: 0, speed: 0, nitro: 100, lap: 0, checkpoint: false });
});

// Suara Klakson Sederhana (Web Audio API)
function playHornSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    osc.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

// Fisika & Pergerakan Mobil
function updateCar(car, roleKey) {
    if (!car.active || gameFinished) return;

    const maxSpeed = car.controls.nitro && car.nitro > 0 ? 8.5 : 5.5;
    if (car.controls.nitro && car.nitro > 0 && car.controls.gas) {
        car.nitro = Math.max(0, car.nitro - 0.6);
    } else {
        car.nitro = Math.min(100, car.nitro + 0.15);
    }

    if (car.controls.gas) car.speed += 0.18;
    if (car.controls.brake) car.speed -= 0.25;

    // Gesekan aspal
    car.speed *= 0.96;
    if (car.speed > maxSpeed) car.speed = maxSpeed;
    if (car.speed < -2.5) car.speed = -2.5;

    // Belok hanya jika mobil bergerak
    if (Math.abs(car.speed) > 0.2) {
        const turnSpeed = 0.045 * (car.speed > 0 ? 1 : -1);
        if (car.controls.left) car.angle -= turnSpeed;
        if (car.controls.right) car.angle += turnSpeed;
    }

    car.x += Math.cos(car.angle) * car.speed;
    car.y += Math.sin(car.angle) * car.speed;

    // Batas luar layar
    car.x = Math.max(30, Math.min(canvas.width - 30, car.x));
    car.y = Math.max(30, Math.min(canvas.height - 30, car.y));

    // Perlambatan jika keluar aspal (rumput tengah / pinggir)
    const distFromCenter = Math.hypot((car.x - 500) / 1.8, car.y - 300);
    if (distFromCenter < 110 || distFromCenter > 265) {
        car.speed *= 0.90;
    }

    // Sistem Checkpoint & Lap (Garis Finish di x = 500, y > 420)
    if (car.y < 180 && Math.abs(car.x - 500) < 80) {
        car.checkpoint = true;
    }
    if (car.checkpoint && car.y > 420 && Math.abs(car.x - 500) < 40) {
        car.lap++;
        car.checkpoint = false;
        const icon = roleKey === 'p1' ? '🔴' : '🟢';
        document.getElementById(`${roleKey}-hud`).innerText = `${icon} ${car.name} (Lap ${car.lap}/${TOTAL_LAPS})`;

        if (car.lap >= TOTAL_LAPS) {
            gameFinished = true;
            document.getElementById('winner-text').innerText = `🏆 ${car.name.toUpperCase()} MENANG!`;
            document.getElementById('winner-overlay').classList.remove('hidden');
        }
    }
}

// Menggambar Sirkuit & Mobil
function drawTrack() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Aspal Oval
    ctx.beginPath();
    ctx.ellipse(500, 300, 430, 240, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#374151';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Rumput Tengah
    ctx.beginPath();
    ctx.ellipse(500, 300, 220, 100, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2d5a27';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    // Garis Finish (Kotak-kotak)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(495, 400, 10, 140);
    ctx.fillStyle = '#000000';
    for (let y = 400; y < 540; y += 20) {
        ctx.fillRect(495, y, 10, 10);
    }
}

function drawCar(car) {
    if (!car.active) return;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Efek Api Nitro
    if (car.controls.nitro && car.nitro > 0 && car.controls.gas) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-22, -6);
        ctx.lineTo(-38 - Math.random() * 10, 0);
        ctx.lineTo(-22, 6);
        ctx.fill();
    }

    // Bodi Mobil
    ctx.fillStyle = car.color;
    ctx.fillRect(-20, -11, 40, 22);

    // Kaca Depan
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(4, -8, 10, 16);

    // Roda
    ctx.fillStyle = '#111';
    ctx.fillRect(-15, -14, 10, 3);
    ctx.fillRect(8, -14, 10, 3);
    ctx.fillRect(-15, 11, 10, 3);
    ctx.fillRect(8, 11, 10, 3);

    ctx.restore();

    // Nama Pemain di atas mobil
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(car.name, car.x, car.y - 20);
}

function gameLoop() {
    if (!isDisplay) return;
    updateCar(cars.p1, 'p1');
    updateCar(cars.p2, 'p2');
    drawTrack();
    drawCar(cars.p1);
    drawCar(cars.p2);
    requestAnimationFrame(gameLoop);
}
