const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Status slot device
let slots = {
    display: null,
    p1: { id: null, name: 'Player 1', ready: false },
    p2: { id: null, name: 'Player 2', ready: false }
};

io.on('connection', (socket) => {
    // Kirim status slot terbaru ke device yang baru buka link
    socket.emit('slotStatus', {
        p1Taken: slots.p1.id !== null,
        p2Taken: slots.p2.id !== null
    });

    // Pilih peran: Display, Stik 1, atau Stik 2
    socket.on('joinRole', ({ role, name }) => {
        if (role === 'display') {
            slots.display = socket.id;
            socket.emit('roleAccepted', { role: 'display' });
            io.to(slots.display).emit('updatePlayers', { p1: slots.p1, p2: slots.p2 });
        } 
        else if (role === 'p1') {
            if (slots.p1.id !== null) {
                return socket.emit('roleRejected', 'Stik 1 sudah digunakan device lain!');
            }
            slots.p1 = { id: socket.id, name: name || 'Player 1', ready: true };
            socket.emit('roleAccepted', { role: 'p1', name: slots.p1.name });
            io.emit('slotStatus', { p1Taken: true, p2Taken: slots.p2.id !== null });
            if (slots.display) io.to(slots.display).emit('updatePlayers', { p1: slots.p1, p2: slots.p2 });
        } 
        else if (role === 'p2') {
            if (slots.p2.id !== null) {
                return socket.emit('roleRejected', 'Stik 2 sudah digunakan device lain!');
            }
            slots.p2 = { id: socket.id, name: name || 'Player 2', ready: true };
            socket.emit('roleAccepted', { role: 'p2', name: slots.p2.name });
            io.emit('slotStatus', { p1Taken: slots.p1.id !== null, p2Taken: true });
            if (slots.display) io.to(slots.display).emit('updatePlayers', { p1: slots.p1, p2: slots.p2 });
        }
    });

    // Menerima input tombol dari stik dan meneruskan ke Display
    socket.on('controlInput', (data) => {
        if (slots.display) {
            io.to(slots.display).emit('playerInput', data);
        }
    });

    // Reset game dari Display
    socket.on('restartGame', () => {
        if (slots.display) {
            io.to(slots.display).emit('resetRace');
        }
    });

    // Jika device terputus / menutup browser
    socket.on('disconnect', () => {
        if (slots.display === socket.id) slots.display = null;
        if (slots.p1.id === socket.id) {
            slots.p1 = { id: null, name: 'Player 1', ready: false };
            io.emit('slotStatus', { p1Taken: false, p2Taken: slots.p2.id !== null });
            if (slots.display) io.to(slots.display).emit('updatePlayers', { p1: slots.p1, p2: slots.p2 });
        }
        if (slots.p2.id === socket.id) {
            slots.p2 = { id: null, name: 'Player 2', ready: false };
            io.emit('slotStatus', { p1Taken: slots.p1.id !== null, p2Taken: false });
            if (slots.display) io.to(slots.display).emit('updatePlayers', { p1: slots.p1, p2: slots.p2 });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
