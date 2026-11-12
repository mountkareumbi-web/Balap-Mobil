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
        
        // Sesuaikan ukuran canvas untuk split-screen (Lebar 1000 x Tinggi 600)
        canvas.width = 1000;
        canvas.height = 600;
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

    car.speed *= 0.96;
    if (car.speed > maxSpeed) car.speed = maxSpeed;
    if (car.speed < -2.5) car.speed = -2.5;

    if (Math.abs(car.speed) > 0.2) {
        const turnSpeed = 0.045 * (car.speed > 0 ? 1 : -1);
        if (car.controls.left) car.angle -= turnSpeed;
        if (car.controls.right) car.angle += turnSpeed;
    }

    car.x += Math.cos(car.angle) * car.speed;
    car.y += Math.sin(car.angle) * car.speed;

    car.x = Math.max(30, Math.min(1800 - 30, car.x));
    car.y = Math.max(30, Math.min(1200 - 30, car.y));

    // Sistem Checkpoint & Lap (Sirkuit diperbesar jadi 1800x1200)
    const distFromCenter = Math.hypot((car.x - 900) / 1.8, car.y - 600);
    if (distFromCenter < 250 || distFromCenter > 550) {
        car.speed *= 0.90;
    }

    if (car.y < 350 && Math.abs(car.x - 900) < 180) {
        car.checkpoint = true;
    }
    if (car.checkpoint && car.y > 850 && Math.abs(car.x - 900) < 100) {
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

// Menggambar Seluruh Sirkuit
function drawFullTrack(renderContext) {
    // Background Rumput
    renderContext.fillStyle = '#2d5a27';
    renderContext.fillRect(0, 0, 1800, 1200);

    // Aspal Oval Besar
    renderContext.beginPath();
    renderContext.ellipse(900, 600, 800, 450, 0, 0, Math.PI * 2);
    renderContext.fillStyle = '#374151';
    renderContext.fill();
    renderContext.lineWidth = 12;
    renderContext.strokeStyle = '#ffffff';
    renderContext.stroke();

    // Rumput Tengah
    renderContext.beginPath();
    renderContext.ellipse(900, 600, 400, 200, 0, 0, Math.PI * 2);
    renderContext.fillStyle = '#2d5a27';
    renderContext.fill();
    renderContext.lineWidth = 8;
    renderContext.strokeStyle = '#ef4444';
    renderContext.stroke();

    // Garis Finish
    renderContext.fillStyle = '#ffffff';
    renderContext.fillRect(890, 800, 20, 250);
    renderContext.fillStyle = '#000000';
    for (let y = 800; y < 1050; y += 25) {
        renderContext.fillRect(890, y, 20, 12);
    }
}

function drawCar(renderContext, car) {
    if (!car.active) return;
    renderContext.save();
    renderContext.translate(car.x, car.y);
    renderContext.rotate(car.angle);

    if (car.controls.nitro && car.nitro > 0 && car.controls.gas) {
        renderContext.fillStyle = '#f59e0b';
        renderContext.beginPath();
        renderContext.moveTo(-22, -6);
        renderContext.lineTo(-38 - Math.random() * 10, 0);
        renderContext.lineTo(-22, 6);
        renderContext.fill();
    }

    renderContext.fillStyle = car.color;
    renderContext.fillRect(-20, -11, 40, 22);

    renderContext.fillStyle = '#93c5fd';
    renderContext.fillRect(4, -8, 10, 16);

    renderContext.fillStyle = '#111';
    renderContext.fillRect(-15, -14, 10, 3);
    renderContext.fillRect(8, -14, 10, 3);
    renderContext.fillRect(-15, 11, 10, 3);
    renderContext.fillRect(8, 11, 10, 3);

    renderContext.restore();

    renderContext.fillStyle = 'white';
    renderContext.font = 'bold 16px sans-serif';
    renderContext.textAlign = 'center';
    renderContext.fillText(car.name, car.x, car.y - 25);
}

// Render Layar Terbelah (Split-Screen) untuk Masing-Masing Kamera Player
function drawSplitScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height;

    // --- KOTAK KIRI (Kamera Player 1) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, halfWidth, halfHeight);
    ctx.clip();

    ctx.save();
    // Geser kamera agar fokus mengikuti Player 1
    ctx.translate(halfWidth / 2 - cars.p1.x, halfHeight / 2 - cars.p1.y);
    drawFullTrack(ctx);
    drawCar(ctx, cars.p1);
    drawCar(ctx, cars.p2);
    ctx.restore();

    // Label penanda layar Player 1
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 10, 140, 35);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`🔴 ${cars.p1.name} (P1)`, 80, 32);
    ctx.restore();

    // --- PEMBATAS TENGAH ---
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(halfWidth - 3, 0, 6, halfHeight);

    // --- KOTAK KANAN (Kamera Player 2) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(halfWidth, 0, halfWidth, halfHeight);
    ctx.clip();

    ctx.save();
    // Geser kamera agar fokus mengikuti Player 2
    ctx.translate(halfWidth + halfWidth / 2 - cars.p2.x, halfHeight / 2 - cars.p2.y);
    drawFullTrack(ctx);
    drawCar(ctx, cars.p1);
    drawCar(ctx, cars.p2);
    ctx.restore();

    // Label penanda layar Player 2
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(halfWidth + 10, 10, 140, 35);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`🟢 ${cars.p2.name} (P2)`, halfWidth + 80, 32);
    ctx.restore();
}

function gameLoop() {
    if (!isDisplay) return;
    updateCar(cars.p1, 'p1');
    updateCar(cars.p2, 'p2');
    drawSplitScreen();
    requestAnimationFrame(gameLoop);
}
