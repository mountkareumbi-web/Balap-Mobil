document.addEventListener("DOMContentLoaded", () => {
    const menuScreen = document.getElementById("menu-screen");
    const displayScreen = document.getElementById("display-screen");
    const controllerScreen = document.getElementById("controller-screen");

    document.getElementById("btn-display").addEventListener("click", () => {
        menuScreen.classList.add("hidden");
        displayScreen.classList.remove("hidden");
        initGameEngine();
    });

    document.getElementById("btn-display").addEventListener("click", () => {
        // Fallback tombol display
    });
});

function initGameEngine() {
    const canvasP1 = document.getElementById("canvas-p1");
    const canvasP2 = document.getElementById("canvas-p2");
    const ctx1 = canvasP1.getContext("2d");
    const ctx2 = canvasP2.getContext("2d");

    function resize() {
        canvasP1.width = canvasP1.parentElement.clientWidth;
        canvasP1.height = canvasP1.parentElement.clientHeight - 35;
        canvasP2.width = canvasP2.parentElement.clientWidth;
        canvasP2.height = canvasP2.parentElement.clientHeight - 35;
    }
    window.addEventListener("resize", resize);
    resize();

    // Arena / Sirkuit Balap (Lintasan Melingkar Besar)
    const track = {
        cx: 1000,
        cy: 1000,
        radiusX: 750,
        radiusY: 550,
        width: 140
    };

    // Data Mobil P1 & P2 dalam satu arena
    let p1 = { x: 1000, y: 350, angle: 0, speed: 0, maxSpeed: 6, acceleration: 0.15, friction: 0.98, steerSpeed: 0.04, color: "#ff0055" };
    let p2 = { x: 1000, y: 410, angle: 0, speed: 0, maxSpeed: 6, acceleration: 0.15, friction: 0.98, steerSpeed: 0.04, color: "#00ffcc" };

    // Input keyboard lokal (jika dimainkan langsung di PC untuk testing)
    const keys = {};
    window.addEventListener("keydown", e => keys[e.key] = true);
    window.addEventListener("keyup", e => keys[e.key] = false);

    function updateCar(car, isP1) {
        if (isP1) {
            if (keys["ArrowUp"] || keys["w"]) car.speed += car.acceleration;
            if (keys["ArrowDown"] || keys["s"]) car.speed -= car.acceleration;
            if (keys["ArrowLeft"] || keys["a"]) car.angle -= car.steerSpeed * (car.speed / car.maxSpeed);
            if (keys["ArrowRight"] || keys["d"]) car.angle += car.steerSpeed * (car.speed / car.maxSpeed);
        }

        car.speed *= car.friction;
        if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
        if (car.speed < -car.maxSpeed / 2) car.speed = -car.maxSpeed / 2;

        car.x += Math.sin(car.angle) * car.speed;
        car.y -= Math.cos(car.angle) * car.speed;
    }

    function drawScene(ctx, targetCar, otherCar, playerName) {
        ctx.save();
        // Kamera mengikuti mobil masing-masing pemain (Split Screen Viewport)
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
        ctx.rotate(-targetCar.angle);
        ctx.translate(-targetCar.x, -targetCar.y);

        // Gambar Arena / Sirkuit Rumput & Jalan
        ctx.fillStyle = "#1e4620";
        ctx.fillRect(-500, -500, 3000, 3000);

        // Lintasan Aspal Oval
        ctx.beginPath();
        ctx.ellipse(track.cx, track.cy, track.radiusX, track.radiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#333";
        ctx.fill();
        ctx.lineWidth = track.width;
        ctx.strokeStyle = "#444";
        ctx.stroke();

        // Garis pinggir sirkuit
        ctx.beginPath();
        ctx.ellipse(track.cx, track.cy, track.radiusX - track.width/2, track.radiusY - track.width/2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(track.cx, track.cy, track.radiusX + track.width/2, track.radiusY + track.width/2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Garis Start/Finish
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(track.cx - 20, track.cy - track.radiusY - track.width/2, 40, track.width);

        // Gambar Mobil Lawan (Other Car) - Bisa kelihatan karena satu arena!
        drawCarBody(ctx, otherCar);

        // Gambar Mobil Sendiri (Target Car)
        drawCarBody(ctx, targetCar);

        ctx.restore();
    }

    function drawCarBody(ctx, car) {
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);
        ctx.fillStyle = car.color;
        ctx.fillRect(-15, -25, 30, 50);
        // Kaca depan mobil
        ctx.fillStyle = "#111";
        ctx.fillRect(-12, -18, 24, 15);
        ctx.restore();
    }

    function loop() {
        updateCar(p1, true);
        // Simulasi pergerakan sementar untuk p2
        updateCar(p2, false);

        drawScene(ctx1, p1, p2, "Player 1");
        drawScene(ctx2, p2, p1, "Player 2");

        requestAnimationFrame(loop);
    }
    loop();
}
