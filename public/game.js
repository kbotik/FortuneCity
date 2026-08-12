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
const DICE_ANIMATION_INTERVAL = 90;
const DICE_ANIMATION_STEPS = 5;
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
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

const PRISON_POSITION = cellsData.findIndex(
    cell => cell.type === "jail"
);

function createInitialPlayers() {
    return [
        {
            name: "Joueur 1",
            emoji: "👨‍💼",
            money: START_MONEY,
            position: 0,
            properties: [],
            inPrison: false,
            bankrupt: false
        },
        {
            name: "Joueur 2",
            emoji: "👩‍💼",
            money: START_MONEY,
            position: 0,
            properties: [],
            inPrison: false,
            bankrupt: false
        }
    ];
}

const gameState = {
    players: createInitialPlayers(),
    currentPlayer: 0,
    rolling: false,
    movementInProgress: false,
    gameOver: false,
    winnerIndex: null,
    lastDice: null,
    history: [],
    turnId: 0
};

let historySequence = 0;
let diceAnimationTimer = null;

function formatMoney(amount) {
    return `${amount.toLocaleString("fr-FR")} €`;
}

function appendLogEntry(entry) {
    if (!logElement) return;

    const line = document.createElement("div");
    const timestamp = document.createElement("time");
    const text = document.createElement("span");
    const date = new Date(entry.timestamp);

    line.className = "log-line";
    timestamp.dateTime = date.toISOString();
    timestamp.textContent = date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
    timestamp.style.marginRight = "8px";
    timestamp.style.opacity = "0.7";
    timestamp.title = date.toLocaleString("fr-FR");
    text.textContent = entry.text;

    line.append(timestamp, text);
    logElement.prepend(line);
}

function renderHistory() {
    if (!logElement) return;

    logElement.replaceChildren();
    [...gameState.history].reverse().forEach(appendLogEntry);
}

function log(text) {
    const entry = {
        id: `${Date.now()}-${historySequence++}`,
        timestamp: new Date().toISOString(),
        text: String(text)
    };

    gameState.history.push(entry);
    appendLogEntry(entry);
}

function updateMoney() {
    if (!moneyElement) return;

    const player = gameState.players[gameState.currentPlayer];
    if (player) {
        moneyElement.textContent = player.money.toLocaleString("fr-FR");
    }
}

function updatePlayers() {
    if (!playersElement) return;

    playersElement.replaceChildren();

    gameState.players.forEach((player, index) => {
        const box = document.createElement("div");
        box.className = "player-card";

        if (index === gameState.currentPlayer) {
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

    return gameState.players.findIndex(player =>
        player.properties.includes(cell.name)
    );
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
        playerIndex === gameState.currentPlayer &&
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

function createBoard() {
    if (!board) return;

    board.replaceChildren();

    cellsData.forEach((cell, index) => {
        const element = document.createElement("div");
        element.className = `cell cell-${cell.type}`;
        element.dataset.position = index;

        if (gameState.players[gameState.currentPlayer].position === index) {
            element.classList.add("active");
        }

        const ownerIndex = getPropertyOwnerIndex(cell);
        if (ownerIndex !== -1) {
            const ownerColor =
                PLAYER_COLORS[ownerIndex % PLAYER_COLORS.length];

            element.classList.add("property-owned");
            element.style.setProperty("--owner-color", ownerColor);
            element.title =
                `Propriété de ${gameState.players[ownerIndex].name}`;

            const ownerBadge = document.createElement("span");
            ownerBadge.className = "cell-owner";
            ownerBadge.textContent =
                `👤 ${gameState.players[ownerIndex].name}`;
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

        const tokens = gameState.players
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

function getPlayer(playerIndex) {
    return gameState.players[playerIndex] || null;
}

function isPlayerTurn(playerIndex) {
    const player = getPlayer(playerIndex);

    return Boolean(
        player &&
        !player.bankrupt &&
        !gameState.gameOver &&
        gameState.currentPlayer === playerIndex
    );
}

function isActionAllowed(playerIndex, actionType) {
    if (!isPlayerTurn(playerIndex)) return false;

    if (actionType === "roll" || actionType === "endTurn") {
        return !gameState.rolling && !gameState.movementInProgress;
    }

    if (
        actionType === "buyProperty" ||
        actionType === "skipProperty"
    ) {
        return gameState.rolling && gameState.movementInProgress;
    }

    if (actionType === "movement" || actionType === "resolveCell") {
        return gameState.rolling && gameState.movementInProgress;
    }

    return false;
}

function isActiveTurn(playerIndex, actionTurnId) {
    return (
        isPlayerTurn(playerIndex) &&
        gameState.turnId === actionTurnId
    );
}

function creditMoney(playerIndex, amount) {
    const player = getPlayer(playerIndex);
    if (!player || !Number.isFinite(amount) || amount < 0) {
        return false;
    }

    player.money += amount;
    return true;
}

function debitMoney(playerIndex, amount) {
    const player = getPlayer(playerIndex);
    if (!player || !Number.isFinite(amount) || amount < 0) {
        return false;
    }

    player.money -= amount;
    return true;
}

function transferMoney(fromPlayerIndex, toPlayerIndex, amount) {
    const fromPlayer = getPlayer(fromPlayerIndex);
    const toPlayer = getPlayer(toPlayerIndex);

    if (
        !fromPlayer ||
        !toPlayer ||
        fromPlayerIndex === toPlayerIndex ||
        !Number.isFinite(amount) ||
        amount < 0
    ) {
        return false;
    }

    fromPlayer.money -= amount;
    toPlayer.money += amount;
    return true;
}

function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}

function clearDiceAnimation() {
    if (diceAnimationTimer !== null) {
        clearTimeout(diceAnimationTimer);
        diceAnimationTimer = null;
    }
}

function animateDice(
    playerIndex,
    actionTurnId,
    die1,
    die2,
    onComplete
) {
    let animationStep = 0;

    const animateFrame = () => {
        if (!isActiveTurn(playerIndex, actionTurnId) || !gameState.rolling) {
            clearDiceAnimation();
            return;
        }

        if (animationStep >= DICE_ANIMATION_STEPS) {
            diceAnimationTimer = null;
            if (diceElement) {
                diceElement.textContent =
                    `${die1} + ${die2} = ${die1 + die2}`;
            }
            onComplete();
            return;
        }

        if (diceElement) {
            diceElement.textContent =
                `${DICE_FACES[rollDie() - 1]} ` +
                `${DICE_FACES[rollDie() - 1]}`;
        }

        animationStep += 1;
        diceAnimationTimer = setTimeout(
            animateFrame,
            DICE_ANIMATION_INTERVAL
        );
    };

    clearDiceAnimation();
    animateFrame();
}

function passStart(playerIndex) {
    if (!creditMoney(playerIndex, PASS_START_BONUS)) return false;

    const player = getPlayer(playerIndex);
    log(
        `🚩 ${player.name} passe par le départ et reçoit ` +
        `${formatMoney(PASS_START_BONUS)}.`
    );
    return true;
}

function rollDice(playerIndex = gameState.currentPlayer) {
    if (!isActionAllowed(playerIndex, "roll")) return false;

    gameState.rolling = true;
    gameState.movementInProgress = true;
    gameState.turnId += 1;

    const actionTurnId = gameState.turnId;
    const player = getPlayer(playerIndex);
    const die1 = rollDie();
    const die2 = rollDie();
    const total = die1 + die2;

    gameState.lastDice = {die1, die2, total};

    if (rollButton) rollButton.disabled = true;
    if (endTurnButton) endTurnButton.disabled = true;
    updateAction();
    showMessage(`${player.emoji} ${player.name} lance les dés...`);

    animateDice(
        playerIndex,
        actionTurnId,
        die1,
        die2,
        () => {
            if (!isActiveTurn(playerIndex, actionTurnId)) return;

            showMessage(
                `${player.emoji} ${player.name} lance ` +
                `${die1} + ${die2} = ${total}`
            );
            log(
                `🎲 ${player.name} lance ` +
                `${die1} + ${die2} = ${total}.`
            );

            movePlayer(
                total,
                playerIndex,
                actionTurnId,
                () => resolveCell(playerIndex, actionTurnId)
            );
        }
    );

    return true;
}

function movePlayer(
    steps,
    playerIndex,
    actionTurnId,
    onComplete
) {
    if (!isActionAllowed(playerIndex, "movement")) return false;
    if (gameState.turnId !== actionTurnId) return false;

    const player = getPlayer(playerIndex);
    const totalSteps = Math.max(0, Math.floor(steps));
    let moved = 0;

    const finishMovement = () => {
        if (
            !isActiveTurn(playerIndex, actionTurnId) ||
            !gameState.movementInProgress
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
        const leavingPrison =
            player.inPrison &&
            previousPosition === PRISON_POSITION;

        player.position = (player.position + 1) % cellsData.length;

        if (player.position === 0 && previousPosition !== 0) {
            passStart(playerIndex);
        }

        moved += 1;
        if (leavingPrison) {
            player.inPrison = false;
            showMessage(
                `🚪 ${player.name} sort de la prison et ` +
                `reprend son déplacement.`
            );
            log(`🚪 ${player.name} sort de la prison.`);
        } else {
            showMessage(
                `🚶 ${player.name} avance : case ${moved}/${totalSteps}.`
            );
        }

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
    return true;
}

function resolveCell(playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return false;

    const player = getPlayer(playerIndex);
    const cell = cellsData[player.position];
    updateAction();

    if (cell.type === "property") {
        return handleProperty(cell, playerIndex, actionTurnId);
    }

    if (cell.type === "tax") {
        return payTax(cell.amount, playerIndex, actionTurnId);
    }

    if (cell.type === "bonus") {
        return receiveBonus(playerIndex, actionTurnId);
    }

    if (cell.type === "chance") {
        return drawChance(playerIndex, actionTurnId);
    }

    if (cell.type === "jail") {
        return handlePrison(playerIndex, actionTurnId);
    }

    if (cell.type === "station") {
        return handleStation(playerIndex, actionTurnId);
    }

    if (cell.type === "parking") {
        return handleParking(playerIndex, actionTurnId);
    }

    return handleStart(playerIndex, actionTurnId);
}

function handleStart(playerIndex, actionTurnId) {
    showMessage("🚩 Tu es sur le départ.");
    finishRoll(playerIndex, actionTurnId);
    return true;
}

function handleStation(playerIndex, actionTurnId) {
    showMessage("🚂 Gare ! Rien à payer.");
    finishRoll(playerIndex, actionTurnId);
    return true;
}

function handleParking(playerIndex, actionTurnId) {
    showMessage("🅿️ Parking gratuit.");
    finishRoll(playerIndex, actionTurnId);
    return true;
}

function handlePrison(playerIndex, actionTurnId) {
    const player = getPlayer(playerIndex);
    player.inPrison = true;
    showMessage(
        "🚓 Tu entres sur la case Prison. " +
        "Tu es simplement de passage et tu n'es pas bloqué."
    );
    finishRoll(playerIndex, actionTurnId);
    return true;
}

function handleProperty(cell, playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return false;

    const ownerIndex = getPropertyOwnerIndex(cell);

    if (ownerIndex === -1) {
        showMessage(`${cell.name} est libre : ${formatMoney(cell.price)}`);

        addActionButton(
            `🏠 Acheter pour ${formatMoney(cell.price)}`,
            "buy-button",
            () => applyPlayerAction(
                playerIndex,
                "buyProperty",
                {cell, actionTurnId}
            )
        );
        addActionButton(
            "⏭️ Ne pas acheter",
            "skip-button",
            () => applyPlayerAction(
                playerIndex,
                "skipProperty",
                {actionTurnId}
            )
        );
        return true;
    }

    if (ownerIndex === playerIndex) {
        showMessage(`🏠 ${cell.name} t'appartient.`);
        finishRoll(playerIndex, actionTurnId);
        return true;
    }

    return payRent(cell, playerIndex, ownerIndex, actionTurnId);
}

function buyProperty(cell, playerIndex, actionTurnId) {
    if (
        !isActiveTurn(playerIndex, actionTurnId) ||
        !isActionAllowed(playerIndex, "buyProperty")
    ) {
        return false;
    }

    const player = getPlayer(playerIndex);
    if (getPropertyOwnerIndex(cell) !== -1) {
        showMessage("❌ Cette propriété vient d'être achetée.");
        updateAction();
        finishRoll(playerIndex, actionTurnId);
        return false;
    }

    if (player.money < cell.price) {
        showMessage("❌ Tu n'as pas assez d'argent.");
        return false;
    }

    debitMoney(playerIndex, cell.price);
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
    return true;
}

function payRent(cell, playerIndex, ownerIndex, actionTurnId) {
    const player = getPlayer(playerIndex);
    const owner = getPlayer(ownerIndex);
    const rent = Math.max(25, Math.floor(cell.price * 0.25));
    const playerBalanceBefore = player.money;
    const ownerBalanceBefore = owner.money;

    if (!transferMoney(playerIndex, ownerIndex, rent)) {
        return false;
    }

    showMessage(
        `💸 ${player.name} paie ${formatMoney(rent)} à ` +
        `${owner.name}. Solde : ${formatMoney(player.money)}.`
    );
    log(
        `💸 ${player.name} : -${formatMoney(rent)} ` +
        `(${formatMoney(playerBalanceBefore)} → ${formatMoney(player.money)}) | ` +
        `${owner.name} : +${formatMoney(rent)} ` +
        `(${formatMoney(ownerBalanceBefore)} → ${formatMoney(owner.money)}).`
    );

    updateMoney();
    updatePlayers();

    if (checkBankruptcy(playerIndex)) return true;
    finishRoll(playerIndex, actionTurnId);
    return true;
}

function payTax(amount, playerIndex, actionTurnId) {
    const player = getPlayer(playerIndex);
    if (!debitMoney(playerIndex, amount)) return false;

    showMessage(`💰 Tu paies ${formatMoney(amount)} de taxe.`);
    log(`💰 ${player.name} paie ${formatMoney(amount)} de taxe.`);
    updateMoney();
    updatePlayers();

    if (checkBankruptcy(playerIndex)) return true;
    finishRoll(playerIndex, actionTurnId);
    return true;
}

function receiveBonus(playerIndex, actionTurnId) {
    const player = getPlayer(playerIndex);
    const balanceBefore = player.money;
    creditMoney(playerIndex, BONUS_AMOUNT);

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
    return true;
}

function applyChanceReward(
    playerIndex,
    actionTurnId,
    amount,
    resultText
) {
    const player = getPlayer(playerIndex);
    const balanceBefore = player.money;
    creditMoney(playerIndex, amount);

    showMessage(
        `${resultText} Nouveau solde : ${formatMoney(player.money)}.`
    );
    log(
        `🎲 ${player.name} : +${formatMoney(amount)} ` +
        `(${formatMoney(balanceBefore)} → ${formatMoney(player.money)}).`
    );
    finishChance(playerIndex, actionTurnId);
    return true;
}

function drawChance(playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return false;

    const player = getPlayer(playerIndex);
    const cards = [
        {
            text: "💰 Tu gagnes 100 €.",
            resolve: () => applyChanceReward(
                playerIndex,
                actionTurnId,
                100,
                "💰 Chance : tu gagnes 100 €."
            )
        },
        {
            text: "🎁 Bonus exceptionnel : +150 €.",
            resolve: () => applyChanceReward(
                playerIndex,
                actionTurnId,
                BONUS_AMOUNT,
                "🎁 Chance : bonus exceptionnel de 150 €."
            )
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
                    MOVE_RESOLVE_DELAY
                );
                return true;
            }
        },
        {
            text: "🏦 Tu récupères 75 €.",
            resolve: () => applyChanceReward(
                playerIndex,
                actionTurnId,
                75,
                "🏦 Chance : tu récupères 75 €."
            )
        }
    ];

    const card = cards[Math.floor(Math.random() * cards.length)];
    showMessage(card.text);
    log(`🎲 Chance : ${card.text}`);
    return card.resolve();
}

function finishChance(playerIndex, actionTurnId) {
    updateMoney();
    updatePlayers();
    if (checkBankruptcy(playerIndex)) return false;
    finishRoll(playerIndex, actionTurnId);
    return true;
}

function declareVictory(loserIndex) {
    const loser = getPlayer(loserIndex);
    const winnerIndex = gameState.players.findIndex(
        (player, index) =>
            index !== loserIndex && !player.bankrupt
    );

    gameState.winnerIndex =
        winnerIndex === -1 ? null : winnerIndex;
    gameState.gameOver = true;
    gameState.rolling = false;
    gameState.movementInProgress = false;

    if (winnerIndex !== -1) {
        const winner = getPlayer(winnerIndex);
        showMessage(
            `🏆 ${winner.name} gagne ! ` +
            `${loser.name} est en faillite.`
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
    showGameOver(
        winnerIndex === -1
            ? "Partie terminée"
            : `${getPlayer(winnerIndex).name} remporte FortuneCity !`
    );
}

function checkBankruptcy(playerIndex) {
    const player = getPlayer(playerIndex);
    if (!player || player.money >= 0) return false;

    player.bankrupt = true;
    declareVictory(playerIndex);
    return true;
}

function finishRoll(playerIndex, actionTurnId) {
    if (!isActiveTurn(playerIndex, actionTurnId)) return false;

    gameState.rolling = false;
    gameState.movementInProgress = false;
    updateAction();
    if (rollButton) rollButton.disabled = false;
    if (endTurnButton) endTurnButton.disabled = false;
    updateMoney();
    updatePlayers();
    return true;
}

function changeTurn(playerIndex = gameState.currentPlayer) {
    if (!isActionAllowed(playerIndex, "endTurn")) return false;

    gameState.turnId += 1;
    let nextPlayer =
        (gameState.currentPlayer + 1) % gameState.players.length;

    while (
        gameState.players[nextPlayer].bankrupt &&
        nextPlayer !== gameState.currentPlayer
    ) {
        nextPlayer =
            (nextPlayer + 1) % gameState.players.length;
    }

    gameState.currentPlayer = nextPlayer;
    updateAction();
    if (diceElement) diceElement.textContent = "🎲 🎲";
    showMessage(
        `🎮 À ${gameState.players[nextPlayer].name} de jouer !`
    );
    log(`🎮 Tour de ${gameState.players[nextPlayer].name}.`);
    updateBoard();
    updateMoney();
    updatePlayers();

    if (rollButton) rollButton.disabled = false;
    if (endTurnButton) endTurnButton.disabled = true;
    return true;
}

function endTurn(playerIndex = gameState.currentPlayer) {
    return changeTurn(playerIndex);
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

function resetPlayerState(player) {
    player.money = START_MONEY;
    player.position = 0;
    player.properties = [];
    player.inPrison = false;
    player.bankrupt = false;
}

function resetGame() {
    clearDiceAnimation();
    gameState.turnId += 1;
    gameState.players.forEach(resetPlayerState);

    gameState.currentPlayer = 0;
    gameState.rolling = false;
    gameState.movementInProgress = false;
    gameState.gameOver = false;
    gameState.winnerIndex = null;
    gameState.lastDice = null;

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
    if (newGameButton) newGameButton.disabled = false;
}

function getSerializableState() {
    return {
        players: gameState.players.map(player => ({
            name: player.name,
            emoji: player.emoji,
            money: player.money,
            position: player.position,
            properties: [...player.properties],
            inPrison: player.inPrison,
            bankrupt: player.bankrupt
        })),
        currentPlayer: gameState.currentPlayer,
        rolling: false,
        movementInProgress: false,
        gameOver: gameState.gameOver,
        winnerIndex: gameState.winnerIndex,
        lastDice: gameState.lastDice
            ? {...gameState.lastDice}
            : null,
        history: gameState.history.map(entry => ({...entry}))
    };
}

function exportGameState() {
    return JSON.stringify(getSerializableState());
}

function normalizeImportedPlayer(player) {
    if (
        !player ||
        typeof player.name !== "string" ||
        typeof player.emoji !== "string" ||
        !Number.isFinite(player.money) ||
        !Number.isInteger(player.position) ||
        player.position < 0 ||
        player.position >= cellsData.length ||
        !Array.isArray(player.properties)
    ) {
        return null;
    }

    return {
        name: player.name,
        emoji: player.emoji,
        money: player.money,
        position: player.position,
        properties: [...new Set(
            player.properties.filter(
                property => typeof property === "string"
            )
        )],
        inPrison: Boolean(player.inPrison),
        bankrupt: Boolean(player.bankrupt)
    };
}

function importGameState(snapshot) {
    let parsed;

    try {
        parsed = typeof snapshot === "string"
            ? JSON.parse(snapshot)
            : snapshot;
    } catch (error) {
        return false;
    }

    if (
        !parsed ||
        !Array.isArray(parsed.players) ||
        parsed.players.length < 2
    ) {
        return false;
    }

    const importedPlayers = parsed.players.map(normalizeImportedPlayer);
    if (importedPlayers.some(player => player === null)) {
        return false;
    }

    if (
        !Number.isInteger(parsed.currentPlayer) ||
        parsed.currentPlayer < 0 ||
        parsed.currentPlayer >= importedPlayers.length
    ) {
        return false;
    }

    clearDiceAnimation();
    gameState.turnId += 1;
    gameState.players = importedPlayers;
    gameState.currentPlayer = parsed.currentPlayer;
    gameState.rolling = false;
    gameState.movementInProgress = false;
    gameState.gameOver = Boolean(parsed.gameOver);
    gameState.winnerIndex =
        Number.isInteger(parsed.winnerIndex) &&
        parsed.winnerIndex >= 0 &&
        parsed.winnerIndex < importedPlayers.length
            ? parsed.winnerIndex
            : null;
    gameState.lastDice = parsed.lastDice &&
        Number.isInteger(parsed.lastDice.die1) &&
        Number.isInteger(parsed.lastDice.die2) &&
        Number.isInteger(parsed.lastDice.total)
        ? {...parsed.lastDice}
        : null;
    gameState.history = Array.isArray(parsed.history)
        ? parsed.history
            .filter(entry =>
                entry &&
                typeof entry.text === "string" &&
                typeof entry.timestamp === "string"
            )
            .map(entry => ({
                id: String(entry.id || `${Date.now()}-${historySequence++}`),
                timestamp: entry.timestamp,
                text: entry.text
            }))
        : [];

    updateAction();
    hideModal();
    updateBoard();
    updateMoney();
    updatePlayers();
    renderHistory();

    if (diceElement) {
        diceElement.textContent = gameState.lastDice
            ? `${gameState.lastDice.die1} + ` +
              `${gameState.lastDice.die2} = ` +
              `${gameState.lastDice.total}`
            : "🎲 🎲";
    }
    if (rollButton) {
        rollButton.disabled = gameState.gameOver;
    }
    if (endTurnButton) endTurnButton.disabled = true;
    showMessage("🎮 État de partie importé.");
    return true;
}

function applyPlayerAction(
    playerIndex,
    actionType,
    payload = {}
) {
    if (!isActionAllowed(playerIndex, actionType)) {
        return false;
    }

    if (actionType === "roll") {
        return rollDice(playerIndex);
    }

    if (actionType === "endTurn") {
        return endTurn(playerIndex);
    }

    if (actionType === "buyProperty") {
        return buyProperty(
            payload.cell,
            playerIndex,
            payload.actionTurnId
        );
    }

    if (actionType === "skipProperty") {
        return finishRoll(playerIndex, payload.actionTurnId);
    }

    return false;
}

const multiplayerBridge = Object.freeze({
    applyPlayerAction,
    exportGameState,
    importGameState,
    isActionAllowed
});

if (typeof window !== "undefined") {
    window.FortuneCityGame = multiplayerBridge;
}

if (rollButton) {
    rollButton.addEventListener(
        "click",
        () => applyPlayerAction(gameState.currentPlayer, "roll")
    );
}

if (endTurnButton) {
    endTurnButton.addEventListener(
        "click",
        () => applyPlayerAction(
            gameState.currentPlayer,
            "endTurn"
        )
    );
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
