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
const modeHome = document.getElementById("modeHome");
const playersPanel = document.getElementById("playersPanel");
const playLocalButton = document.getElementById("playLocal");
const createOnlineButton = document.getElementById("createOnline");
const homeCreateName = document.getElementById("homeCreateName");
const showJoinOnlineButton = document.getElementById("showJoinOnline");
const homeJoinForm = document.getElementById("homeJoinForm");
const homePlayerName = document.getElementById("homePlayerName");
const homeRoomCode = document.getElementById("homeRoomCode");
const joinOnlineButton = document.getElementById("joinOnline");
const cancelJoinButton = document.getElementById("cancelJoin");

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
let onlineClient = null;

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
    gameState.history.forEach(appendLogEntry);
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

        const activePlayer = gameState.players[gameState.currentPlayer];
        if (activePlayer && activePlayer.position === index) {
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

function normalizeHistoryEntry(entry) {
    if (
        !entry ||
        typeof entry.text !== "string" ||
        typeof entry.timestamp !== "string"
    ) {
        return null;
    }

    const date = new Date(entry.timestamp);
    if (Number.isNaN(date.getTime())) return null;

    return {
        id: String(entry.id || `${Date.now()}-${historySequence++}`),
        timestamp: date.toISOString(),
        text: entry.text
    };
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
            .map(normalizeHistoryEntry)
            .filter(entry => entry !== null)
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

function showGameContent() {
    if (modeHome) modeHome.classList.add("mode-content-hidden");
    if (playersPanel) {
        playersPanel.classList.remove("mode-content-hidden");
    }
    if (document.getElementById("game")) {
        document.getElementById("game").classList.remove(
            "mode-content-hidden"
        );
    }
}

function returnToModeHome() {
    if (modeHome) modeHome.classList.remove("mode-content-hidden");
    if (playersPanel) {
        playersPanel.classList.add("mode-content-hidden");
    }
    const gameSection = document.getElementById("game");
    if (gameSection) gameSection.classList.add("mode-content-hidden");
    updateAction();
}

function startOnlineMode(action, name, roomCode) {
    showGameContent();

    if (!onlineClient) {
        onlineClient = new OnlineClient();
        window.FortuneCityOnline = onlineClient;
    }

    if (action === "create") {
        onlineClient.createRoom(name || "Joueur");
    }

    if (action === "join") {
        onlineClient.joinRoom(roomCode || "", name || "Joueur");
    }
}

function createOnlinePanel(client) {
    const gameSection = document.getElementById("game");
    if (!gameSection) return null;

    const panel = document.createElement("section");
    const title = document.createElement("strong");
    const status = document.createElement("div");
    const nameInput = document.createElement("input");
    const roomInput = document.createElement("input");
    const createButton = document.createElement("button");
    const joinButton = document.createElement("button");
    const readyButton = document.createElement("button");
    const startButton = document.createElement("button");
    const roomLabel = document.createElement("div");
    const roomCodeDisplay = document.createElement("div");
    const shareRow = document.createElement("div");
    const copyCodeButton = document.createElement("button");
    const shareButton = document.createElement("button");
    const playerCount = document.createElement("div");
    const leaveButton = document.createElement("button");
    const reconnectButton = document.createElement("button");
    const playersLabel = document.createElement("div");

    panel.className = "online-panel";
    Object.assign(panel.style, {
        background: "#172944",
        borderRadius: "18px",
        color: "#ffffff",
        marginBottom: "16px",
        padding: "14px"
    });

    title.textContent = "🌐 FortuneCity en ligne";
    title.style.display = "block";
    title.style.marginBottom = "8px";

    status.textContent = "Connexion au serveur...";
    status.style.marginBottom = "8px";

    nameInput.placeholder = "Pseudo";
    nameInput.id = "onlinePlayerName";
    nameInput.name = "onlinePlayerName";
    nameInput.value = "Joueur";
    nameInput.maxLength = 24;
    roomInput.placeholder = "Code de salle";
    roomInput.id = "onlineRoomCode";
    roomInput.name = "onlineRoomCode";
    roomInput.maxLength = 6;

    [nameInput, roomInput].forEach(input => {
        Object.assign(input.style, {
            border: "0",
            borderRadius: "10px",
            margin: "3px",
            padding: "9px",
            width: "calc(50% - 10px)"
        });
    });

    createButton.textContent = "Créer une salle";
    joinButton.textContent = "Rejoindre";
    readyButton.textContent = "✅ Je suis prêt";
    startButton.textContent = "🎮 Lancer la partie";
    leaveButton.textContent = "🚪 Quitter la salle";
    reconnectButton.className = "online-reconnect-button";
    reconnectButton.textContent = "🔄 Reconnexion";
    [
        createButton,
        joinButton,
        readyButton,
        startButton,
        leaveButton
    ].forEach(button => {
        Object.assign(button.style, {
            border: "0",
            borderRadius: "10px",
            cursor: "pointer",
            margin: "3px",
            padding: "9px 12px"
        });
    });

    roomLabel.style.marginTop = "8px";
    roomCodeDisplay.className = "online-room-code";
    shareRow.className = "online-share-row";
    shareRow.style.display = "flex";
    copyCodeButton.textContent = "📋 Copier le code";
    shareButton.textContent = "📤 Partager";
    shareRow.append(copyCodeButton, shareButton);
    playerCount.className = "online-player-count";
    copyCodeButton.disabled = true;
    shareButton.disabled = true;
    leaveButton.disabled = true;
    reconnectButton.style.display = "none";
    playersLabel.style.fontSize = "13px";
    playersLabel.style.marginTop = "6px";
    playersLabel.style.whiteSpace = "pre-line";

    panel.append(
        title,
        status,
        nameInput,
        roomInput,
        document.createElement("br"),
        createButton,
        joinButton,
        readyButton,
        startButton,
        roomLabel,
        roomCodeDisplay,
        shareRow,
        playerCount,
        leaveButton,
        reconnectButton,
        playersLabel
    );
    gameSection.prepend(panel);

    const controls = {
        panel,
        status,
        nameInput,
        roomInput,
        createButton,
        joinButton,
        readyButton,
        startButton,
        roomLabel,
        roomCodeDisplay,
        copyCodeButton,
        shareButton,
        playerCount,
        leaveButton,
        reconnectButton,
        playersLabel
    };

    createButton.addEventListener(
        "click",
        () => client.createRoom(nameInput.value)
    );
    joinButton.addEventListener(
        "click",
        () => client.joinRoom(roomInput.value, nameInput.value)
    );
    readyButton.addEventListener(
        "click",
        () => client.send("PLAYER_READY", {
            ready: !client.localReady
        })
    );
    startButton.addEventListener(
        "click",
        () => client.send("START_GAME")
    );
    copyCodeButton.addEventListener(
        "click",
        () => client.copyRoomCode()
    );
    shareButton.addEventListener(
        "click",
        () => client.shareRoom()
    );
    leaveButton.addEventListener(
        "click",
        () => client.leaveRoom()
    );
    reconnectButton.addEventListener(
        "click",
        () => client.manualReconnect()
    );

    return controls;
}

function applyOnlineRoomState(roomState) {
    if (!onlineClient || !roomState) return;

    gameState.players = roomState.players.map(player => ({
        id: player.id,
        name: player.name,
        emoji: player.emoji,
        money: player.money,
        position: player.position,
        properties: [...player.properties],
        inPrison: Boolean(player.inPrison),
        bankrupt: Boolean(player.bankrupt),
        connected: Boolean(player.connected),
        ready: Boolean(player.ready)
    }));
    gameState.currentPlayer = Math.max(
        0,
        gameState.players.findIndex(
            player => player.id === roomState.currentPlayerId
        )
    );
    gameState.rolling = Boolean(roomState.movementInProgress);
    gameState.movementInProgress =
        Boolean(roomState.movementInProgress) ||
        roomState.pendingPropertyIndex !== null;
    gameState.gameOver = roomState.status === "FINISHED";
    gameState.winnerIndex = gameState.players.findIndex(
        player => player.id === roomState.winnerId
    );
    if (gameState.winnerIndex === -1) gameState.winnerIndex = null;
    gameState.lastDice = roomState.lastDice
        ? {...roomState.lastDice}
        : null;
    gameState.history = Array.isArray(roomState.history)
        ? roomState.history.map(normalizeHistoryEntry).filter(Boolean)
        : [];

    updateBoard();
    updateMoney();
    updatePlayers();
    renderHistory();
    onlineClient.renderRoom(roomState);
    onlineClient.renderPendingAction(roomState);

    if (diceElement) {
        diceElement.textContent = gameState.lastDice
            ? `${gameState.lastDice.dice1 || gameState.lastDice.die1} + ` +
              `${gameState.lastDice.dice2 || gameState.lastDice.die2} = ` +
              `${gameState.lastDice.total}`
            : "🎲 🎲";
    }
}

class OnlineClient {
    constructor() {
        this.socket = null;
        this.roomCode = null;
        this.playerId = null;
        this.reconnectToken = null;
        this.localReady = false;
        this.roomState = null;
        this.modeActive = false;
        this.connectionState = "DISCONNECTED";
        this.reconnectTimer = null;
        this.reconnectAttempt = 0;
        this.pendingMessages = [];
        this.controls = createOnlinePanel(this);
        this.wsUrl = this.getWebSocketUrl();
        this.connect();
    }

    getWebSocketUrl() {
        const params = new URLSearchParams(window.location.search);
        const meta = document.querySelector(
            'meta[name="FORTUNECITY_WS_URL"]'
        );
        const configured =
            window.FORTUNECITY_WS_URL ||
            (meta && meta.content) ||
            params.get("ws");

        return configured ? configured.trim() : "";
    }

    connect() {
        if (
            this.socket &&
            (
                this.socket.readyState === WebSocket.CONNECTING ||
                this.socket.readyState === WebSocket.OPEN
            )
        ) {
            return;
        }

        if (!this.wsUrl || typeof WebSocket === "undefined") {
            this.connectionState = "DISCONNECTED";
            this.setStatus(
                "URL du serveur non configurée : mode local actif."
            );
            return;
        }

        if (
            window.location.protocol === "https:" &&
            !this.wsUrl.startsWith("wss://")
        ) {
            this.connectionState = "DISCONNECTED";
            this.setStatus("Une URL wss:// est requise en production.");
            return;
        }

        try {
            this.socket = new WebSocket(this.wsUrl);
        } catch (error) {
            this.connectionState = "DISCONNECTED";
            this.setStatus("Connexion online impossible : mode local actif.");
            return;
        }

        const socket = this.socket;
        this.connectionState = "CONNECTING";
        this.setStatus("Connexion...");
        socket.addEventListener("open", () => {
            if (this.socket !== socket) return;
            this.reconnectAttempt = 0;
            this.connectionState = "CONNECTED";
            if (this.controls && this.controls.reconnectButton) {
                this.controls.reconnectButton.style.display = "none";
            }
            this.setStatus("Connecté au serveur.");
            const pendingMessages = this.pendingMessages.splice(0);
            pendingMessages.forEach(message => this.sendNow(
                message.type,
                message.payload
            ));
            this.tryReconnect();
        });
        socket.addEventListener(
            "message",
            event => this.handleMessage(event.data)
        );
        socket.addEventListener("close", () => {
            if (this.socket !== socket) return;
            this.connectionState = "DISCONNECTED";
            if (this.controls && this.controls.reconnectButton) {
                this.controls.reconnectButton.style.display = "block";
            }
            this.setStatus(
                this.modeActive
                    ? "Connexion perdue. Reconnexion..."
                    : "Serveur déconnecté. Le mode local reste disponible."
            );
            if (
                this.modeActive ||
                this.pendingMessages.length > 0 ||
                sessionStorage.getItem("fortunecity-online")
            ) {
                this.lockOnlineControls();
                this.scheduleReconnect();
            }
        });
        socket.addEventListener("error", () => {
            if (this.socket !== socket) return;
            this.connectionState = "DISCONNECTED";
            this.setStatus(
                this.modeActive
                    ? "Connexion perdue. Reconnexion..."
                    : "Serveur indisponible : mode local actif."
            );
        });
    }

    scheduleReconnect() {
        if (this.reconnectTimer || !this.wsUrl) return;

        const delay = Math.min(
            1000 * 2 ** this.reconnectAttempt,
            10000
        );
        this.reconnectAttempt += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.setStatus("Reconnexion...");
            this.connect();
        }, delay);
    }

    manualReconnect() {
        if (!this.wsUrl) {
            this.setStatus("URL du serveur non configurée.");
            return;
        }

        if (
            this.socket &&
            this.socket.readyState === WebSocket.OPEN
        ) {
            return;
        }

        this.reconnectAttempt = 0;
        this.setStatus("Reconnexion...");
        this.connect();
    }

    tryReconnect() {
        const saved = sessionStorage.getItem("fortunecity-online");
        if (!saved) return;

        try {
            const session = JSON.parse(saved);
            if (session.roomCode && session.playerId && session.reconnectToken) {
                this.send("JOIN_ROOM", {
                    roomCode: session.roomCode,
                    playerId: session.playerId,
                    reconnectToken: session.reconnectToken,
                    name: session.name || "Joueur"
                });
            }
        } catch (error) {
            sessionStorage.removeItem("fortunecity-online");
        }
    }

    send(type, payload = {}) {
        if (!this.wsUrl) {
            this.setStatus(
                "Connexion au serveur impossible : mode local disponible."
            );
            return false;
        }

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.pendingMessages.push({type, payload});
            this.setStatus("Connexion au serveur...");
            this.scheduleReconnect();
            return true;
        }

        return this.sendNow(type, payload);
    }

    sendNow(type, payload = {}) {
        this.socket.send(JSON.stringify({type, payload}));
        return true;
    }

    createRoom(name) {
        this.send("CREATE_ROOM", {name});
    }

    joinRoom(roomCode, name) {
        this.send("JOIN_ROOM", {
            roomCode: roomCode.toUpperCase(),
            name
        });
    }

    roll() {
        this.send("ROLL_DICE");
    }

    endTurn() {
        this.send("END_TURN");
    }

    buy(propertyIndex) {
        this.send("BUY_PROPERTY", {propertyIndex});
    }

    decline() {
        this.send("DECLINE_PROPERTY");
    }

    leaveRoom() {
        if (!this.modeActive) {
            returnToModeHome();
            return;
        }

        this.send("LEAVE_ROOM");
    }

    async copyRoomCode() {
        if (!this.roomCode) {
            this.setStatus("Aucun code de salle à copier.");
            return;
        }

        try {
            await navigator.clipboard.writeText(this.roomCode);
        } catch (error) {
            const helper = document.createElement("textarea");
            helper.value = this.roomCode;
            document.body.appendChild(helper);
            helper.select();
            document.execCommand("copy");
            helper.remove();
        }

        this.setStatus("Code de partie copié.");
    }

    async shareRoom() {
        if (!this.roomCode) {
            this.setStatus("Aucun code de salle à partager.");
            return;
        }

        const text = `Rejoins ma partie FortuneCity ! Code : ${this.roomCode}`;
        if (typeof navigator.share === "function") {
            try {
                await navigator.share({
                    title: "FortuneCity",
                    text
                });
                this.setStatus("Invitation partagée.");
                return;
            } catch (error) {
                if (error.name === "AbortError") return;
            }
        }

        await this.copyRoomCode();
    }

    saveSession(payload) {
        this.roomCode = payload.roomCode || this.roomCode;
        this.playerId = payload.playerId || this.playerId;
        this.reconnectToken =
            payload.reconnectToken || this.reconnectToken;
        sessionStorage.setItem(
            "fortunecity-online",
            JSON.stringify({
                roomCode: this.roomCode,
                playerId: this.playerId,
                reconnectToken: this.reconnectToken,
                name: this.controls.nameInput.value
            })
        );
    }

    handleMessage(rawMessage) {
        let message;
        try {
            message = JSON.parse(rawMessage);
        } catch (error) {
            this.setStatus("Réponse serveur invalide.");
            return;
        }

        const payload = message.payload || {};
        if (message.type === "ROOM_CREATED") {
            this.modeActive = true;
            this.saveSession(payload);
            this.controls.roomInput.value = payload.roomCode;
            this.setStatus(`Salle créée : ${payload.roomCode}`);
        } else if (message.type === "ROOM_JOINED") {
            this.modeActive = true;
            this.saveSession(payload);
            this.setStatus(
                payload.reconnected
                    ? "Joueur reconnecté."
                    : "Salle rejointe."
            );
        } else if (message.type === "ROOM_LEFT") {
            this.modeActive = false;
            this.roomCode = null;
            this.playerId = null;
            this.reconnectToken = null;
            this.roomState = null;
            sessionStorage.removeItem("fortunecity-online");
            returnToModeHome();
            this.setStatus("Salle quittée.");
        } else if (message.type === "ERROR") {
            const errorMessage = this.friendlyError(
                payload.code,
                payload.message
            );
            this.setStatus(errorMessage);
            showMessage(errorMessage);
        }

        if (message.state) {
            this.roomState = message.state;
            applyOnlineRoomState(message.state);
        }

        if (message.type === "DICE_RESULT") {
            showMessage(
                `🎲 Résultat serveur : ${payload.dice1} + ` +
                `${payload.dice2} = ${payload.total}`
            );
        } else if (message.type === "START_GAME") {
            showMessage("🎲 FortuneCity — La partie commence...");
        } else if (message.type === "PLAYER_DISCONNECTED") {
            showMessage(`🔴 ${payload.playerName} est déconnecté.`);
        } else if (message.type === "PLAYER_RECONNECTED") {
            showMessage(`🟢 Un joueur s'est reconnecté.`);
        } else if (message.type === "GAME_OVER") {
            showMessage(
                payload.winnerName
                    ? `🏆 ${payload.winnerName} gagne !`
                    : "🏁 Partie terminée."
            );
        }
    }

    setStatus(text) {
        if (this.controls) this.controls.status.textContent = text;
    }

    friendlyError(code, fallback) {
        const messages = {
            ROOM_NOT_FOUND: "Salle introuvable.",
            ROOM_FULL: "Salle complète.",
            ROOM_LOCKED: "Partie déjà commencée.",
            NOT_HOST: "Seul l’hôte peut lancer la partie.",
            ACTION_NOT_ALLOWED: "Action non autorisée pendant ce tour.",
            INVALID_JSON: "Message serveur invalide.",
            MESSAGE_TOO_LARGE: "Message trop volumineux.",
            NOT_IN_ROOM: "Joueur non connecté à une salle.",
            INSUFFICIENT_FUNDS: "Argent insuffisant.",
            INVALID_ROOM_CODE: "Code de salle invalide.",
            NOT_ENOUGH_PLAYERS: "Il faut au moins deux joueurs.",
            NOT_ALL_READY: "Tous les joueurs doivent être prêts.",
            PLAYER_NOT_FOUND: "Joueur introuvable."
        };

        return messages[code] || fallback || "Action refusée.";
    }

    lockOnlineControls() {
        if (rollButton) rollButton.disabled = true;
        if (endTurnButton) endTurnButton.disabled = true;
    }

    renderRoom(roomState) {
        if (!this.controls) return;

        const localPlayer = roomState.players.find(
            player => player.id === this.playerId
        );
        const hostLabel =
            localPlayer && localPlayer.id === roomState.hostId
                ? " — 👑 Hôte"
                : "";
        this.controls.roomLabel.textContent =
            roomState.code
                ? `Salle : ${roomState.code} — ${roomState.status} ` +
                  `— ${roomState.players.length} / 4${hostLabel}`
                : "";
        this.controls.roomCodeDisplay.textContent =
            roomState.code || "En attente du code de salle";
        const hasRoom = Boolean(roomState.code);
        if (this.controls.shareRow) {
            this.controls.shareRow.style.display = "flex";
        }
        if (this.controls.copyCodeButton) {
            this.controls.copyCodeButton.disabled = !hasRoom;
        }
        if (this.controls.shareButton) {
            this.controls.shareButton.disabled = !hasRoom;
        }
        if (this.controls.leaveButton) {
            this.controls.leaveButton.disabled = !hasRoom;
        }
        this.controls.playerCount.textContent =
            `${roomState.players.length} / 4 joueurs`;
        if (this.controls.leaveButton) {
            this.controls.leaveButton.style.display =
                roomState.code ? "block" : "none";
        }
        if (this.controls.reconnectButton) {
            this.controls.reconnectButton.style.display =
                this.connectionState === "CONNECTED"
                    ? "none"
                    : "block";
        }
        this.controls.playersLabel.textContent =
            roomState.players
                .map((player, index) =>
                    `${index + 1}. ` +
                    `${player.connected ? "🟢" : "⚪"} ${player.name}` +
                    `${player.id === roomState.hostId ? " — Hôte" : ""}` +
                    ` — ${player.ready ? "Prêt ✓" : "En attente"}`
                )
                .join("\n");

        this.localReady = Boolean(localPlayer && localPlayer.ready);
        this.controls.readyButton.textContent =
            this.localReady
                ? "↩️ Je ne suis plus prêt"
                : "✅ Je suis prêt";
        this.controls.startButton.disabled =
            roomState.hostId !== this.playerId ||
            roomState.players.length < 2 ||
            !roomState.players.every(player => player.ready) ||
            roomState.status === "PLAYING" ||
            roomState.status === "FINISHED";
        this.controls.readyButton.disabled =
            !localPlayer ||
            roomState.status === "PLAYING" ||
            roomState.status === "FINISHED";
    }

    renderPendingAction(roomState) {
        updateAction();
        if (roomState.status === "PLAYING") {
            const activePlayer = roomState.players.find(
                player => player.id === roomState.currentPlayerId
            );
            if (activePlayer) {
                showMessage(
                    activePlayer.id === this.playerId
                        ? "🎮 C'est ton tour !"
                        : `🎮 Tour de ${activePlayer.name}. ` +
                          "Attends ton tour..."
                );
            }
        }

        if (
            roomState.status !== "PLAYING" ||
            roomState.pendingPropertyIndex === null ||
            roomState.currentPlayerId !== this.playerId
        ) {
            this.updateOnlineButtons(roomState);
            return;
        }

        const cell = cellsData[roomState.pendingPropertyIndex];
        if (!cell || cell.type !== "property") {
            this.updateOnlineButtons(roomState);
            return;
        }

        showMessage(`${cell.name} est libre : ${formatMoney(cell.price)}`);
        addActionButton(
            `🏠 Acheter pour ${formatMoney(cell.price)}`,
            "buy-button",
            () => this.buy(roomState.pendingPropertyIndex)
        );
        addActionButton(
            "⏭️ Ne pas acheter",
            "skip-button",
            () => this.decline()
        );
        this.updateOnlineButtons(roomState);
    }

    updateOnlineButtons(roomState) {
        const myTurn = roomState.currentPlayerId === this.playerId;
        const canRoll =
            roomState.status === "PLAYING" &&
            myTurn &&
            !roomState.movementInProgress &&
            roomState.pendingPropertyIndex === null;
        const canEnd =
            roomState.status === "PLAYING" &&
            myTurn &&
            !roomState.movementInProgress &&
            roomState.pendingPropertyIndex === null;

        if (rollButton) rollButton.disabled = !canRoll;
        if (endTurnButton) endTurnButton.disabled = !canEnd;
        if (newGameButton) newGameButton.disabled = true;
    }
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
        () => onlineClient && onlineClient.modeActive
            ? onlineClient.roll()
            : applyPlayerAction(gameState.currentPlayer, "roll")
    );
}

if (endTurnButton) {
    endTurnButton.addEventListener(
        "click",
        () => onlineClient && onlineClient.modeActive
            ? onlineClient.endTurn()
            : applyPlayerAction(gameState.currentPlayer, "endTurn")
    );
}

if (newGameButton) {
    newGameButton.addEventListener("click", () => {
        if (onlineClient && onlineClient.modeActive) {
            onlineClient.setStatus(
                "En mode online, seule une nouvelle salle " +
                "réinitialise la partie."
            );
            return;
        }
        resetGame();
    });
}

if (closeModalButton) {
    closeModalButton.addEventListener("click", hideModal);
}

if (modal) {
    modal.addEventListener("click", event => {
        if (event.target === modal) hideModal();
    });
}

if (playLocalButton) {
    playLocalButton.addEventListener("click", () => {
        showGameContent();
        if (onlineClient && onlineClient.modeActive) {
            onlineClient.setStatus("Mode local sélectionné.");
        }
    });
}

if (createOnlineButton) {
    createOnlineButton.addEventListener("click", () => {
        startOnlineMode(
            "create",
            homeCreateName ? homeCreateName.value : "Joueur"
        );
    });
}

if (showJoinOnlineButton && homeJoinForm) {
    showJoinOnlineButton.addEventListener("click", () => {
        homeJoinForm.classList.remove("hidden");
        showJoinOnlineButton.classList.add("mode-content-hidden");
        if (homePlayerName) homePlayerName.focus();
    });
}

if (cancelJoinButton && homeJoinForm) {
    cancelJoinButton.addEventListener("click", () => {
        homeJoinForm.classList.add("hidden");
        if (showJoinOnlineButton) {
            showJoinOnlineButton.classList.remove("mode-content-hidden");
        }
    });
}

if (joinOnlineButton) {
    joinOnlineButton.addEventListener("click", () => {
        const name = homePlayerName
            ? homePlayerName.value.trim()
            : "";
        const code = homeRoomCode
            ? homeRoomCode.value.replace(/\s+/g, "").toUpperCase()
            : "";

        if (!name) {
            homePlayerName.setCustomValidity("Entre un pseudo.");
            homePlayerName.reportValidity();
            return;
        }
        if (!/^[A-Z2-9]{6}$/.test(code)) {
            homeRoomCode.setCustomValidity(
                "Le code doit contenir 6 caractères."
            );
            homeRoomCode.reportValidity();
            return;
        }

        homePlayerName.setCustomValidity("");
        homeRoomCode.setCustomValidity("");
        startOnlineMode("join", name, code);
    });
}

resetGame();

if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "online"
) {
    startOnlineMode("connect");
}
