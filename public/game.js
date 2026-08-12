"use strict";

const board = document.getElementById("board");
const moneyElement = document.getElementById("money");
const message = document.getElementById("message");
const diceElement = document.getElementById("dice");
const rollButton = document.getElementById("roll");
const endTurnButton = document.getElementById("endTurn");
const newGameButton = document.getElementById("newGame");
const actionElement = document.getElementById("action");
const playersElement = document.getElementById("players");
const logElement = document.getElementById("log");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const closeModalButton = document.getElementById("closeModal");

const START_MONEY = 1500;
const PASS_START_BONUS = 200;
const BONUS_AMOUNT = 150;
const MOVE_STEP_DELAY = 180;
const MOVE_RESOLVE_DELAY = 350;
const PLAYER_COLORS = ["#2563eb", "#db2777", "#16a34a", "#ea580c"];
const PLAYER_TOKEN_STYLES = [
    {
        backgroundColor: "#2563eb",
        borderColor: "#bfdbfe",
        borderRadius: "50%",
        borderStyle: "solid"
    },
    {
        backgroundColor: "#db2777",
        borderColor: "#fbcfe8",
        borderRadius: "8px",
        borderStyle: "dashed"
    }
];

const players = [
    {
        name: "Joueur 1",
        emoji: "👨‍💼",
        money: START_MONEY,
        position: 0,
        properties: [],
        bankrupt: false
    },
    {
        name: "Joueur 2",
        emoji: "👩‍💼",
        money: START_MONEY,
        position: 0,
        properties: [],
        bankrupt: false
    }
];

let currentPlayer = 0;
let rolling = false;
let movementInProgress = false;
let gameOver = false;
let turnId = 0;

const cellsData = [
    {type: "start", name: "DÉPART", icon: "🚩"},
    {type: "property", name: "Rue 1", price: 100},
    {type: "property", name: "Rue 2", price: 120},
    {type: "station", name: "Gare", icon: "🚂"},
    {type: "property", name: "Rue 3", price: 140},
    {type: "jail", name: "PRISON", icon: "🚓"},

    {type: "property", name: "Rue 4", price: 160},
    {type: "bonus", name: "Bonus", icon: "🎁"},
    {type: "property", name: "Rue 5", price: 180},
    {type: "property", name: "Rue 6", price: 200},
    {type: "tax", name: "Taxe", amount: 100, icon: "💰"},
    {type: "property", name: "Rue 7", price: 220},

    {type: "property", name: "Rue 8", price: 240},
    {type: "chance", name: "Chance", icon: "🎲"},
    {type: "property", name: "Rue 9", price: 260},
    {type: "bonus", name: "Bonus", icon: "🎁"},
    {type: "property", name: "Rue 10", price: 280},
    {type: "tax", name: "Impôt", amount: 150, icon: "💸"},

    {type: "property", name: "Rue 11", price: 300},
    {type: "property", name: "Rue 12", price: 320},
    {type: "property", name: "Rue 13", price: 340},
    {type: "property", name: "Rue 14", price: 360},
    {type: "property", name: "Rue 15", price: 380},
    {type: "station", name: "Gare", icon: "🚂"},

    {type: "property", name: "Rue 16", price: 400},
    {type: "property", name: "Rue 17", price: 420},
    {type: "property", name: "Rue 18", price: 440},
    {type: "chance", name: "Chance", icon: "🎲"},
    {type: "property", name: "Rue 19", price: 460},
    {type: "property", name: "Rue 20", price: 480},

    {type: "property", name: "Rue 21", price: 500},
    {type: "chance", name: "Chance", icon: "🎲"},
    {type: "property", name: "Rue 22", price: 520},
    {type: "property", name: "Rue 23", price: 540},
    {type: "property", name: "Rue 24", price: 560},
    {type: "parking", name: "Parking", icon: "🅿️"}
];

function formatMoney(amount) {
    return `${amount.toLocaleString("fr-FR")} €`;
}

function log(text) {
    if (!logElement) return;

    const line = document.createElement("div");
    line.className = "log-line";
    line.textContent = text;
    logElement.prepend(line);

    while (logElement.children.length > 8) {
        logElement.lastChild.remove();
    }
}

function updateMoney() {
    if (!moneyElement) return;

    moneyElement.textContent = players[currentPlayer].money.toLocaleString("fr-FR");
}

function updatePlayers() {
    if (!playersElement) return;

    playersElement.replaceChildren();

    players.forEach((player, index) => {
        const box = document.createElement("div");
        box.className = "player-card";

        if (index === currentPlayer) {
            box.classList.add("active");
        }

        if (player.bankrupt) {
            box.classList.add("bankrupt");
        }

        const name = document.createElement("div");
        name.className = "player-name";
        name.textContent = `${player.emoji} ${player.name}`;

        const money = document.createElement("div");
        money.className = "player-money";
        money.textContent = `💰 ${formatMoney(player.money)}`;

        box.append(name, money);

        if (player.properties.length > 0) {
            const properties = document.createElement("div");
            properties.className = "player-properties";
            properties.textContent =
                `🏠 ${player.properties.join(", ")}`;
            box.appendChild(properties);
        }

        playersElement.appendChild(box);
    });
}

function getPropertyOwnerIndex(cell) {
    if (cell.type !== "property") return -1;

    return players.findIndex(player =>
        player.properties.includes(cell.name)
    );
}

function createBoard() {
    if (!board) return;

    board.replaceChildren();

    cellsData.forEach((cell, index) => {
        const element = document.createElement("div");
        element.className = `cell cell-${cell.type}`;
        element.dataset.position = index;

        if (players[currentPlayer].position === index) {
            element.classList.add("active");
        }

        const ownerIndex = getPropertyOwnerIndex(cell);
        if (ownerIndex !== -1) {
            const ownerColor =
                PLAYER_COLORS[ownerIndex % PLAYER_COLORS.length];

            element.classList.add("property-owned");
            element.style.setProperty(
                "--owner-color",
                ownerColor
            );
            element.title = `Propriété de ${players[ownerIndex].name}`;

            const ownerBadge = document.createElement("span");
            ownerBadge.className = "cell-owner";
            ownerBadge.textContent = `👤 ${players[ownerIndex].name}`;
            Object.assign(ownerBadge.style, {
                backgroundColor: ownerColor,
                borderRadius: "6px",
                color: "#ffffff",
                fontSize: "clamp(7px, 1.4vw, 11px)",
                fontWeight: "800",
                left: "3px",
                overflow: "hidden",
                padding: "2px 3px",
                position: "absolute",
                right: "3px",
                textOverflow: "ellipsis",
                top: "3px",
                whiteSpace: "nowrap",
                zIndex: "10"
            });
            element.appendChild(ownerBadge);
        }

        if (cell.icon) {
            const icon = document.createElement("div");
            icon.className = "cell-icon";
            icon.textContent = cell.icon;
            element.appendChild(icon);
        }

        const name = document.createElement("div");
        name.className = "cell-name";
        name.textContent = cell.name;
        element.appendChild(name);

        if (cell.type === "property") {
            const price = document.createElement("div");
            price.className = "cell-price";
            price.textContent = formatMoney(cell.price);
            element.appendChild(price);
        }

        const tokens = players
            .map((player, playerIndex) => ({player, playerIndex}))
            .filter(({player}) => player.position === index);

        if (tokens.length > 0) {
            const tokensElement = document.createElement("div");
            tokensElement.className = "tokens";

            tokens.forEach(({player, playerIndex}) => {
                const token = document.createElement("span");
                token.className = "token";
                if (playerIndex === 1) token.classList.add("two");
                if (playerIndex === 2) token.classList.add("three");
                stylePlayerToken(token, player, playerIndex);
                tokensElement.appendChild(token);
            });

            element.appendChild(tokensElement);
        }

        board.appendChild(element);
    });
}

function updateBoard() {
    createBoard();
}

function stylePlayerToken(token, player, playerIndex) {
    const visual = PLAYER_TOKEN_STYLES[
        playerIndex % PLAYER_TOKEN_STYLES.length
    ];

    Object.assign(token.style, {
        ...visual,
        alignItems: "center",
        bottom: "4px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, .45)",
        boxSizing: "border-box",
        color: "#ffffff",
        display: "flex",
        fontSize: "clamp(16px, 3.5vw, 28px)",
        fontWeight: "900",
        height: "clamp(28px, 7vw, 42px)",
        justifyContent: "center",
        lineHeight: "1",
        outline: "2px solid rgba(15, 23, 42, .75)",
        right: `${4 + playerIndex * 27}px`,
        textShadow: "0 1px 2px rgba(0, 0, 0, .65)",
        width: "clamp(28px, 7vw, 42px)"
    });

    token.textContent = player.emoji;
    token.title = `Pion de ${player.name}`;
    token.setAttribute("aria-label", `Pion de ${player.name}`);

    if (
        playerIndex === currentPlayer &&
        typeof token.animate === "function"
    ) {
        token.animate(
            [
                {transform: "translateY(5px) scale(.82)"},
                {transform: "translateY(-3px) scale(1.08)"},
                {transform: "translateY(0) scale(1)"}
            ],
            {
                duration: MOVE_STEP_DELAY,
                easing: "ease-out",
                fill: "both"
            }
        );
    }
}

function showMessage(text) {
    if (message) {
        message.textContent = text;
    }
}

function updateAction() {
    if (actionElement) {
        actionElement.replaceChildren();
    }
}

function addActionButton(label, className, handler) {
    if (!actionElement) return;

    const button = document.createElement("button");
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler, {once: true});
    actionElement.appendChild(button);
}

function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}

function isActiveTurn(playerIndex, actionTurnId) {
    return (
        !gameOver &&
        currentPlayer === playerIndex &&
        turnId === actionTurnId
    );
}

function rollDice() {
    if (rolling || movementInProgress || gameOver) return;

    rolling = true;
    movementInProgress = true;
    turnId += 1;

    const playerIndex = currentPlayer;
    const actionTurnId = turnId;
    const player = players[playerIndex];
    const die1 = rollDie();
    const die2 = rollDie();
    const total = die1 + die2;

    if (rollButton) {
        rollButton.disabled = true;
    }
    if (endTurnButton) {
        endTurnButton.disabled = true;
    }
    updateAction();

    if (diceElement) {
        diceElement.textContent = `${die1} + ${die2} = ${total}`;
    }

    showMessage(
        `${player.emoji} ${player.name} lance ${die1} + ${die2} = ${total}`
    );
    log(`🎲 ${player.name} lance ${die1} + ${die2} = ${total}.`);

    movePlayer(
        total,
        playerIndex,
        actionTurnId,
        () => resolveCell(playerIndex, actionTurnId)
    );
}

function movePlayer(steps, playerIndex, actionTurnId, onComplete) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return;

    const player = players[playerIndex];
    const totalSteps = Math.max(0, Math.floor(steps));
    let moved = 0;

    const finishMovement = () => {
        if (
            !isActiveTurn(playerIndex, actionTurnId) ||
            !movementInProgress
        ) {
            return;
        }

        updateBoard();
        updateMoney();
        setTimeout(() => {
            if (isActiveTurn(playerIndex, actionTurnId)) {
                onComplete();
            }
        }, MOVE_RESOLVE_DELAY);
    };

    const moveOneStep = () => {
        if (!isActiveTurn(playerIndex, actionTurnId)) return;

        if (moved >= totalSteps) {
            finishMovement();
            return;
        }

        const previousPosition = player.position;
        player.position = (player.position + 1) % cellsData.length;

        if (player.position === 0 && previousPosition !== 0) {
            player.money += PASS_START_BONUS;
            log(
                `🚩 ${player.name} passe par le départ et reçoit ` +
                `${formatMoney(PASS_START_BONUS)}.`
            );
        }

        moved += 1;
        showMessage(
            `🚶 ${player.name} avance : case ${moved}/${totalSteps}.`
        );
        updateBoard();
        updateMoney();
        updatePlayers();

        if (moved < totalSteps) {
            setTimeout(moveOneStep, MOVE_STEP_DELAY);
        } else {
            setTimeout(finishMovement, MOVE_RESOLVE_DELAY);
        }
    };

    setTimeout(moveOneStep, MOVE_STEP_DELAY);
}

function resolveCell(playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return;

    const player = players[playerIndex];
    const cell = cellsData[player.position];
    updateAction();

    if (cell.type === "property") {
        handleProperty(cell, playerIndex, actionTurnId);
        return;
    }

    if (cell.type === "tax") {
        payTax(cell.amount, playerIndex, actionTurnId);
        return;
    }

    if (cell.type === "bonus") {
        receiveBonus(playerIndex, actionTurnId);
        return;
    }

    if (cell.type === "chance") {
        drawChance(playerIndex, actionTurnId);
        return;
    }

    const messages = {
        jail: "🚓 Tu es simplement de passage en prison.",
        station: "🚂 Gare ! Rien à payer.",
        parking: "🅿️ Parking gratuit.",
        start: "🚩 Tu es sur le départ."
    };

    showMessage(messages[cell.type] || "Bonne continuation !");
    finishRoll(playerIndex, actionTurnId);
}

function handleProperty(cell, playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return;

    const player = players[playerIndex];
    const ownerIndex = getPropertyOwnerIndex(cell);

    if (ownerIndex === -1) {
        showMessage(`${cell.name} est libre : ${formatMoney(cell.price)}`);

        addActionButton(
            `🏠 Acheter pour ${formatMoney(cell.price)}`,
            "buy-button",
            () => buyProperty(cell, playerIndex, actionTurnId)
        );
        addActionButton(
            "⏭️ Ne pas acheter",
            "skip-button",
            () => finishRoll(playerIndex, actionTurnId)
        );
        return;
    }

    if (ownerIndex === playerIndex) {
        showMessage(`🏠 ${cell.name} t'appartient.`);
        finishRoll(playerIndex, actionTurnId);
        return;
    }

    const owner = players[ownerIndex];
    const rent = Math.max(25, Math.floor(cell.price * 0.25));
    const playerBalanceBefore = player.money;
    const ownerBalanceBefore = owner.money;

    player.money -= rent;
    owner.money += rent;

    showMessage(
        `💸 ${player.name} paie ${formatMoney(rent)} à ${owner.name}. ` +
        `Solde : ${formatMoney(player.money)}.`
    );
    log(
        `💸 ${player.name} : -${formatMoney(rent)} ` +
        `(${formatMoney(playerBalanceBefore)} → ${formatMoney(player.money)}) | ` +
        `${owner.name} : +${formatMoney(rent)} ` +
        `(${formatMoney(ownerBalanceBefore)} → ${formatMoney(owner.money)}).`
    );

    updateMoney();
    updatePlayers();

    if (checkBankruptcy(playerIndex)) return;
    finishRoll(playerIndex, actionTurnId);
}

function buyProperty(cell, playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return;

    const player = players[playerIndex];
    if (getPropertyOwnerIndex(cell) !== -1) {
        showMessage("❌ Cette propriété vient d'être achetée.");
        updateAction();
        finishRoll(playerIndex, actionTurnId);
        return;
    }

    if (player.money < cell.price) {
        showMessage("❌ Tu n'as pas assez d'argent.");
        return;
    }

    player.money -= cell.price;
    player.properties.push(cell.name);

    showMessage(
        `🏠 ${player.name} achète ${cell.name} pour ` +
        `${formatMoney(cell.price)}.`
    );
    log(
        `🏠 ${player.name} achète ${cell.name} pour ` +
        `${formatMoney(cell.price)}.`
    );

    updateAction();
    updateBoard();
    updateMoney();
    updatePlayers();
    finishRoll(playerIndex, actionTurnId);
}

function payTax(amount, playerIndex, actionTurnId) {
    const player = players[playerIndex];
    player.money -= amount;

    showMessage(`💰 Tu paies ${formatMoney(amount)} de taxe.`);
    log(`💰 ${player.name} paie ${formatMoney(amount)} de taxe.`);
    updateMoney();
    updatePlayers();

    if (checkBankruptcy(playerIndex)) return;
    finishRoll(playerIndex, actionTurnId);
}

function receiveBonus(playerIndex, actionTurnId) {
    const player = players[playerIndex];
    const balanceBefore = player.money;
    player.money += BONUS_AMOUNT;

    showMessage(
        `🎁 Bonus : +${formatMoney(BONUS_AMOUNT)}. ` +
        `Nouveau solde : ${formatMoney(player.money)}.`
    );
    log(
        `🎁 ${player.name} : +${formatMoney(BONUS_AMOUNT)} ` +
        `(${formatMoney(balanceBefore)} → ${formatMoney(player.money)}).`
    );
    updateMoney();
    updatePlayers();
    finishRoll(playerIndex, actionTurnId);
}

function applyChanceReward(
    playerIndex,
    actionTurnId,
    amount,
    resultText
) {
    const player = players[playerIndex];
    const balanceBefore = player.money;
    player.money += amount;

    showMessage(
        `${resultText} Nouveau solde : ${formatMoney(player.money)}.`
    );
    log(
        `🎲 ${player.name} : +${formatMoney(amount)} ` +
        `(${formatMoney(balanceBefore)} → ${formatMoney(player.money)}).`
    );
    finishChance(playerIndex, actionTurnId);
}

function drawChance(playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return;

    const player = players[playerIndex];
    const cards = [
        {
            text: "💰 Tu gagnes 100 €.",
            resolve: () => {
                applyChanceReward(
                    playerIndex,
                    actionTurnId,
                    100,
                    "💰 Chance : tu gagnes 100 €."
                );
            }
        },
        {
            text: "🎁 Bonus exceptionnel : +150 €.",
            resolve: () => {
                applyChanceReward(
                    playerIndex,
                    actionTurnId,
                    BONUS_AMOUNT,
                    "🎁 Chance : bonus exceptionnel de 150 €."
                );
            }
        },
        {
            text: "🚗 Avance de 3 cases.",
            resolve: () => movePlayer(
                3,
                playerIndex,
                actionTurnId,
                () => resolveCell(playerIndex, actionTurnId)
            )
        },
        {
            text: "↩️ Recule de 2 cases.",
            resolve: () => {
                player.position =
                    (player.position - 2 + cellsData.length) %
                    cellsData.length;
                updateBoard();
                updatePlayers();
                setTimeout(
                    () => resolveCell(playerIndex, actionTurnId),
                    350
                );
            }
        },
        {
            text: "🏦 Tu récupères 75 €.",
            resolve: () => {
                applyChanceReward(
                    playerIndex,
                    actionTurnId,
                    75,
                    "🏦 Chance : tu récupères 75 €."
                );
            }
        }
    ];

    const card = cards[Math.floor(Math.random() * cards.length)];
    showMessage(card.text);
    log(`🎲 Chance : ${card.text}`);
    card.resolve();
}

function finishChance(playerIndex, actionTurnId) {
    updateMoney();
    updatePlayers();
    if (checkBankruptcy(playerIndex)) return;
    finishRoll(playerIndex, actionTurnId);
}

function checkBankruptcy(playerIndex) {
    const player = players[playerIndex];
    if (player.money >= 0) return false;

    player.bankrupt = true;
    gameOver = true;
    rolling = false;
    movementInProgress = false;

    const winner = players.find(
        (candidate, index) =>
            index !== playerIndex && !candidate.bankrupt
    );

    if (winner) {
        showMessage(
            `🏆 ${winner.name} gagne ! ` +
            `${player.name} est en faillite.`
        );
        log(`🏆 ${winner.name} remporte la partie !`);
    } else {
        showMessage("🏁 La partie est terminée.");
        log("🏁 La partie est terminée.");
    }

    if (rollButton) rollButton.disabled = true;
    if (endTurnButton) endTurnButton.disabled = true;
    updateAction();
    updatePlayers();
    updateBoard();
    showGameOver(winner ? `${winner.name} remporte FortuneCity !` : "Partie terminée");
    return true;
}

function finishRoll(playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return;

    rolling = false;
    movementInProgress = false;
    updateAction();
    if (rollButton) rollButton.disabled = false;
    if (endTurnButton) endTurnButton.disabled = false;
    updateMoney();
    updatePlayers();
}

function endTurn() {
    if (rolling || movementInProgress || gameOver) return;

    turnId += 1;
    let nextPlayer = (currentPlayer + 1) % players.length;
    while (players[nextPlayer].bankrupt && nextPlayer !== currentPlayer) {
        nextPlayer = (nextPlayer + 1) % players.length;
    }

    currentPlayer = nextPlayer;
    updateAction();
    if (diceElement) diceElement.textContent = "🎲 🎲";
    showMessage(`🎮 À ${players[currentPlayer].name} de jouer !`);
    log(`🎮 Tour de ${players[currentPlayer].name}.`);
    updateBoard();
    updateMoney();
    updatePlayers();

    if (rollButton) rollButton.disabled = false;
    if (endTurnButton) endTurnButton.disabled = true;
}

function showGameOver(text) {
    if (!modal || !modalContent) return;

    modalContent.textContent = text;
    modal.classList.remove("hidden");
}

function hideModal() {
    if (modal) {
        modal.classList.add("hidden");
    }
}

function resetGame() {
    turnId += 1;
    players.forEach(player => {
        player.money = START_MONEY;
        player.position = 0;
        player.properties = [];
        player.bankrupt = false;
    });

    currentPlayer = 0;
    rolling = false;
    movementInProgress = false;
    gameOver = false;
    updateAction();
    hideModal();
    updateBoard();
    updateMoney();
    updatePlayers();
    showMessage("🎮 FortuneCity démarre !");
    log("🎮 Nouvelle partie FortuneCity.");

    if (diceElement) diceElement.textContent = "🎲 🎲";
    if (rollButton) rollButton.disabled = false;
    if (endTurnButton) endTurnButton.disabled = true;
}

if (rollButton) {
    rollButton.addEventListener("click", rollDice);
}

if (endTurnButton) {
    endTurnButton.addEventListener("click", endTurn);
}

if (newGameButton) {
    newGameButton.addEventListener("click", resetGame);
}

if (closeModalButton) {
    closeModalButton.addEventListener("click", hideModal);
}

if (modal) {
    modal.addEventListener("click", event => {
        if (event.target === modal) hideModal();
    });
}

resetGame();
