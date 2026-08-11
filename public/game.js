const board = document.getElementById("board");
"use strict";

const moneyElement = document.getElementById("money");
const message = document.getElementById("message");
const diceElement = document.getElementById("dice");
const rollButton = document.getElementById("roll");
const endTurnButton = document.getElementById("endTurn");
const actionElement = document.getElementById("action");
const playersElement = document.getElementById("players");
const logElement = document.getElementById("log");

const START_MONEY = 1500;
const PASS_START_BONUS = 200;

const players = [
    {
        name: "Joueur 1",
        emoji: "👨‍💼",
        money: START_MONEY,
        position: 0,
        properties: []
    },
    {
        name: "Joueur 2",
        emoji: "👩‍💼",
        money: START_MONEY,
        position: 0,
        properties: []
    }
];

let currentPlayer = 0;
let rolling = false;
let gameOver = false;
let pendingAction = null;

const cellsData = [
    {type:"start", name:"DÉPART", icon:"🚩"},
    {type:"property", name:"Rue 1", price:100},
    {type:"property", name:"Rue 2", price:120},
    {type:"station", name:"Gare", icon:"🚂"},
    {type:"property", name:"Rue 3", price:140},
    {type:"jail", name:"PRISON", icon:"🚓"},

    {type:"property", name:"Rue 4", price:160},
    {type:"bonus", name:"Bonus", icon:"🎁"},
    {type:"property", name:"Rue 5", price:180},
    {type:"property", name:"Rue 6", price:200},
    {type:"tax", name:"Taxe", amount:100, icon:"💰"},
    {type:"property", name:"Rue 7", price:220},

    {type:"property", name:"Rue 8", price:240},
    {type:"chance", name:"Chance", icon:"🎲"},
    {type:"property", name:"Rue 9", price:260},
    {type:"bonus", name:"Bonus", icon:"🎁"},
    {type:"property", name:"Rue 10", price:280},
    {type:"tax", name:"Impôt", amount:150, icon:"💸"},

    {type:"property", name:"Rue 11", price:300},
    {type:"property", name:"Rue 12", price:320},
    {type:"property", name:"Rue 13", price:340},
    {type:"property", name:"Rue 14", price:360},
    {type:"property", name:"Rue 15", price:380},
    {type:"station", name:"Gare", icon:"🚂"},

    {type:"property", name:"Rue 16", price:400},
    {type:"property", name:"Rue 17", price:420},
    {type:"property", name:"Rue 18", price:440},
    {type:"chance", name:"Chance", icon:"🎲"},
    {type:"property", name:"Rue 19", price:460},
    {type:"property", name:"Rue 20", price:480},

    {type:"property", name:"Rue 21", price:500},
    {type:"chance", name:"Chance", icon:"🎲"},
    {type:"property", name:"Rue 22", price:520},
    {type:"property", name:"Rue 23", price:540},
    {type:"property", name:"Rue 24", price:560},
    {type:"parking", name:"Parking", icon:"🅿️"}
];

function log(text) {
    if (!logElement) return;

    const line = document.createElement("div");
    line.textContent = text;

    logElement.prepend(line);

    while (logElement.children.length > 8) {
        logElement.lastChild.remove();
    }
}

function updateMoney() {
    if (!moneyElement) return;

    const player = players[currentPlayer];
    moneyElement.textContent =
        `${player.money.toLocaleString("fr-FR")} €`;
}

function updatePlayers() {
    if (!playersElement) return;

    playersElement.innerHTML = "";

    players.forEach((player, index) => {
        const box = document.createElement("div");

        box.className =
            "player-card" +
            (index === currentPlayer ? " active" : "");

        box.innerHTML = `
            <strong>${player.emoji} ${player.name}</strong>
            <div>💰 ${player.money.toLocaleString("fr-FR")} €</div>
        `;

        playersElement.appendChild(box);
    });
}

function getPlayerTokens(position) {
    return players
        .map((player, index) => {
            if (player.position !== position) return "";

            const tokenClass =
                index === 1 ? "token two" :
                index === 2 ? "token three" :
                "token";

            return `<span class="${tokenClass}">
                ${player.emoji}
            </span>`;
        })
        .join("");
}

function createBoard() {
    if (!board) return;

    board.innerHTML = "";

    /*
     * Le plateau possède EXACTEMENT 36 cases.
     * CSS Grid 6 × 6.
     */
    board.style.display = "grid";
    board.style.gridTemplateColumns = "repeat(6, minmax(0, 1fr))";
    board.style.gridTemplateRows = "repeat(6, minmax(0, 1fr))";

    cellsData.forEach((cell, index) => {
        const element = document.createElement("div");

        element.className = `cell cell-${cell.type}`;
        element.dataset.position = index;

        let content = "";

        if (cell.icon) {
            content += `<div class="cell-icon">${cell.icon}</div>`;
        }

        content += `<div class="cell-name">${cell.name}</div>`;

        if (cell.type === "property") {
            content += `<div class="cell-price">${cell.price} €</div>`;
        }

        element.innerHTML = content;

        const tokens = getPlayerTokens(index);

        if (tokens) {
            element.insertAdjacentHTML(
                "beforeend",
                `<div class="tokens">${tokens}</div>`
            );
        }

        board.appendChild(element);
    });
}

function updateBoard() {
    createBoard();

    players.forEach((player, index) => {
        const cell = board.querySelector(
            `[data-position="${player.position}"]`
        );

        if (!cell) return;

        const tokens = cell.querySelector(".tokens");

        if (!tokens) {
            cell.insertAdjacentHTML(
                "beforeend",
                `<div class="tokens">
                    <span class="player-token player-${index}">
                        ${player.emoji}
                    </span>
                </div>`
            );
        } else {
            tokens.insertAdjacentHTML(
                "beforeend",
                `<span class="player-token player-${index}">
                    ${player.emoji}
                </span>`
            );
        }
    });
}

function showMessage(text) {
    if (message) {
        message.textContent = text;
    }
}

function updateAction(text = "") {
    if (actionElement) {
        actionElement.innerHTML = text;
    }
}

function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}

function rollDice() {
    if (rolling || gameOver) return;

    rolling = true;

    if (rollButton) {
        rollButton.disabled = true;
    }

    const player = players[currentPlayer];

    const die1 = rollDie();
    const die2 = rollDie();
    const total = die1 + die2;

    if (diceElement) {
        diceElement.textContent = `${die1} + ${die2} = ${total}`;
    }

    showMessage(
        `${player.emoji} ${player.name} lance ${die1} + ${die2} = ${total}`
    );

    log(`🎲 ${player.name} lance ${die1} + ${die2} = ${total}.`);

    movePlayer(total);
}

function movePlayer(steps) {
    const player = players[currentPlayer];
function movePlayer(steps) {
    const player = players[currentPlayer];

    if (steps <= 0) {
        updateBoard();
        updateMoney();
        setTimeout(resolveCell, 350);
        return;
    }

    let moved = 0;

    function moveOneStep() {
        if (moved >= steps) {
            updateBoard();
            updateMoney();
            setTimeout(resolveCell, 350);
            return;
        }

        const previousPosition = player.position;

        player.position =
            (player.position + 1) % cellsData.length;

        // Passage par DÉPART
        if (player.position === 0 && previousPosition !== 0) {
            player.money += PASS_START_BONUS;

            log(
                `🚩 ${player.name} passe par le départ et reçoit ${PASS_START_BONUS} €.`
            );
        }

        moved++;

        updateBoard();
        updateMoney();

        // Animation case par case
        setTimeout(moveOneStep, 180);
    }

    moveOneStep();
}

    const oldPosition = player.position;

    player.position =
        (player.position + steps) % cellsData.length;

    if (oldPosition + steps >= cellsData.length) {
        player.money += PASS_START_BONUS;

        log(
            `🚩 ${player.name} passe par le départ et reçoit ${PASS_START_BONUS} €.`
        );
    }

    updateBoard();
    updateMoney();
    updatePlayers();

    setTimeout(resolveCell, 350);
}

function resolveCell() {
    const player = players[currentPlayer];
    const cell = cellsData[player.position];

    updateAction("");

    if (cell.type === "property") {
        handleProperty(cell);
        return;
    }

    if (cell.type === "tax") {
        payTax(cell.amount);
        return;
    }

    if (cell.type === "bonus") {
        receiveBonus();
        return;
    }

    if (cell.type === "chance") {
        drawChance();
        return;
    }

    if (cell.type === "jail") {
        showMessage("🚓 Tu es simplement de passage en prison.");
        finishRoll();
        return;
    }

    if (cell.type === "station") {
        showMessage("🚂 Gare ! Rien à payer.");
        finishRoll();
        return;
    }

    if (cell.type === "parking") {
        showMessage("🅿️ Parking gratuit.");
        finishRoll();
        return;
    }

    if (cell.type === "start") {
        showMessage("🚩 Tu es sur le départ.");
        finishRoll();
        return;
    }

    finishRoll();
}

function handleProperty(cell) {
    const player = players[currentPlayer];

    const ownerIndex = players.findIndex(
        p => p.properties.includes(cell.name)
    );

    if (ownerIndex === -1) {
        showMessage(
            `${cell.name} est libre : ${cell.price} €`
        );

        updateAction(`
            <button class="buy-button" id="buyProperty">
                🏠 Acheter pour ${cell.price} €
            </button>
            <button class="skip-button" id="skipProperty">
                ⏭️ Ne pas acheter
            </button>
        `);

        const buy = document.getElementById("buyProperty");
        const skip = document.getElementById("skipProperty");

        if (buy) {
            buy.onclick = () => buyProperty(cell);
        }

        if (skip) {
            skip.onclick = () => {
                updateAction("");
                finishRoll();
            };
        }

        return;
    }

    if (ownerIndex === currentPlayer) {
        showMessage(`🏠 ${cell.name} t'appartient.`);
        finishRoll();
        return;
    }

    const owner = players[ownerIndex];
    const rent = Math.max(25, Math.floor(cell.price * 0.25));

    player.money -= rent;
    owner.money += rent;

    showMessage(
        `💸 ${player.name} paie ${rent} € de loyer à ${owner.name}.`
    );

    log(
        `🏠 ${player.name} paie ${rent} € à ${owner.name}.`
    );

    updateMoney();
    updatePlayers();

    checkBankruptcy();
    finishRoll();
}

function buyProperty(cell) {
    const player = players[currentPlayer];

    if (player.money < cell.price) {
        showMessage("❌ Tu n'as pas assez d'argent.");
        return;
    }

    player.money -= cell.price;
    player.properties.push(cell.name);

    showMessage(
        `🏠 ${player.name} achète ${cell.name} pour ${cell.price} €.`
    );

    log(
        `🏠 ${player.name} achète ${cell.name} pour ${cell.price} €.`
    );

    updateAction("");
    updateMoney();
    updatePlayers();

    finishRoll();
}

function payTax(amount) {
    const player = players[currentPlayer];

    player.money -= amount;

    showMessage(
        `💰 Tu paies ${amount} € de taxe.`
    );

    log(
        `💰 ${player.name} paie ${amount} € de taxe.`
    );

    updateMoney();
    updatePlayers();

    checkBankruptcy();
    finishRoll();
}

function receiveBonus() {
    const player = players[currentPlayer];

    const amount = 150;

    player.money += amount;

    showMessage(
        `🎁 Bonus : tu reçois ${amount} €.`
    );

    log(
        `🎁 ${player.name} reçoit ${amount} €.`
    );

    updateMoney();
    updatePlayers();

    finishRoll();
}

function drawChance() {
    const player = players[currentPlayer];

    const cards = [
        {
            text: "💰 Tu gagnes 100 €.",
            action: () => {
                player.money += 100;
            }
        },
        {
            text: "🎁 Bonus exceptionnel : +150 €.",
            action: () => {
                player.money += 150;
            }
        },
        {
            text: "🚗 Avance de 3 cases.",
            action: () => {
                movePlayer(3);
            }
        },
        {
            text: "↩️ Recule de 2 cases.",
            action: () => {
                player.position =
                    (player.position - 2 + cellsData.length)
                    % cellsData.length;

                updateBoard();
                resolveCell();
            }
        },
        {
            text: "🏦 Tu récupères 75 €.",
            action: () => {
                player.money += 75;
            }
        }
    ];

    const card =
        cards[Math.floor(Math.random() * cards.length)];

    showMessage(card.text);

    log(`🎲 Chance : ${card.text}`);

    card.action();

    updateMoney();
    updatePlayers();

    if (!gameOver) {
        finishRoll();
    }
}

function checkBankruptcy() {
    players.forEach((player, index) => {
        if (player.money < 0) {
            gameOver = true;

            const winner =
                players[index === 0 ? 1 : 0];

            showMessage(
                `🏆 ${winner.name} gagne ! ${player.name} est en faillite.`
            );

            log(
                `🏆 ${winner.name} remporte la partie !`
            );

            if (rollButton) {
                rollButton.disabled = true;
            }

            if (endTurnButton) {
                endTurnButton.disabled = true;
            }
        }
    });
}

function finishRoll() {
    if (gameOver) return;

    rolling = false;

    if (rollButton) {
        rollButton.disabled = false;
    }

    if (endTurnButton) {
        endTurnButton.disabled = false;
    }

    updateMoney();
    updatePlayers();
}

function endTurn() {
    if (rolling || gameOver) return;

    currentPlayer =
        (currentPlayer + 1) % players.length;

    showMessage(
        `🎮 À ${players[currentPlayer].name} de jouer !`
    );

    log(
        `🎮 Tour de ${players[currentPlayer].name}.`
    );

    updateMoney();
    updatePlayers();

    if (rollButton) {
        rollButton.disabled = false;
    }

    if (endTurnButton) {
        endTurnButton.disabled = true;
    }
}

function resetGame() {
    players.forEach(player => {
        player.money = START_MONEY;
        player.position = 0;
        player.properties = [];
    });

    currentPlayer = 0;
    rolling = false;
    gameOver = false;

    updateBoard();
    updateMoney();
    updatePlayers();

    showMessage("🎮 FortuneCity démarre !");

    log("🎮 Nouvelle partie FortuneCity.");

    if (rollButton) {
        rollButton.disabled = false;
    }
}

if (rollButton) {
    rollButton.addEventListener("click", rollDice);
}

if (endTurnButton) {
    endTurnButton.addEventListener("click", endTurn);
}

createBoard();
updateBoard();
updateMoney();
updatePlayers();

showMessage("🎮 À toi de jouer !");

log("🎮 FortuneCity démarre !");
log("💰 Chaque joueur commence avec 1 500 €.");
