document.addEventListener("DOMContentLoaded", () => {
    const menuScreen = document.getElementById("menu-screen");
    const displayScreen = document.getElementById("display-screen");
    const controllerScreen = document.getElementById("controller-screen");

    document.getElementById("btn-display").addEventListener("click", () => {
        menuScreen.classList.add("hidden");
        displayScreen.classList.remove("hidden");
        initGameDisplay();
    });

    document.getElementById("btn-controller").addEventListener("click", () => {
        menuScreen.classList.add("hidden");
        controllerScreen.classList.remove("hidden");
    });
});

function initGameDisplay() {
    const canvasP1 = document.getElementById("canvas-p1");
    const canvasP2 = document.getElementById("canvas-p2");
    const ctx1 = canvasP1.getContext("2d");
    const ctx2 = canvasP2.getContext("2d");

    function resizeCanvas() {
        canvasP1.width = canvasP1.parentElement.clientWidth;
        canvasP1.height = canvasP1.parentElement.clientHeight - 40;
        canvasP2.width = canvasP2.parentElement.clientWidth;
        canvasP2.height = canvasP2.parentElement.clientHeight - 40;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Data simulasi mobil lokal sederhana untuk demo tampilan
    let car1 = { x: 100, y: 150, speed: 0, angle: 0 };
    let car2 = { x: 100, y: 150, speed: 0, angle: 0 };

    function gameLoop() {
        // Render P1
        ctx1.clearRect(0, 0, canvasP1.width, canvasP1.height);
        ctx1.fillStyle = "#ff0055";
        ctx1.fillRect(car1.x, car1.y, 40, 20);

        // Render P2
        ctx2.clearRect(0, 0, canvasP2.width, canvasP2.height);
        ctx2.fillStyle = "#00ffcc";
        ctx2.fillRect(car2.x, car2.y, 40, 20);

        requestAnimationFrame(gameLoop);
    }
    gameLoop();
}
