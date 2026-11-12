document.addEventListener("DOMContentLoaded", () => {
    const loginContainer = document.getElementById("login-container");
    const joystickContainer = document.getElementById("joystick-container");
    const controllerTitle = document.getElementById("controller-title");
    const playerNameInput = document.getElementById("player-name");

    document.querySelectorAll(".slot-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const slot = e.target.getAttribute("data-slot");
            const name = playerNameInput.value.trim() || `Player ${slot}`;

            loginContainer.classList.add("hidden");
            joystickContainer.classList.remove("hidden");
            controllerTitle.innerText = `Stik Aktif: ${name} (P${slot})`;
        });
    });

    const bindControl = (id, action) => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.addEventListener("touchstart", () => console.log(action + " Ditekan"));
            btn.addEventListener("touchend", () => console.log(action + " Dilepas"));
            btn.addEventListener("mousedown", () => console.log(action + " Ditekan"));
            btn.addEventListener("mouseup", () => console.log(action + " Dilepas"));
        }
    };

    bindControl("btn-up", "GAS");
    bindControl("btn-down", "REM");
    bindControl("btn-left", "KIRI");
    bindControl("btn-right", "KANAN");
});
