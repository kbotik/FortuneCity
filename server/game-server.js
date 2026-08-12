"use strict";

const crypto = require("node:crypto");

const {
    DEFAULT_MAX_PLAYERS,
    RoomManager,
    cleanName
} = require("./room-manager");

const START_MONEY = 1500;
const PASS_START_BONUS = 200;
const BONUS_AMOUNT = 150;
const MOVE_STEP_DELAY = 180;
const MOVE_RESOLVE_DELAY = 350;
const MAX_MESSAGE_BYTES = 16 * 1024;

const CELLS = [
    {type: "start", name: "DÉPART"},
    {type: "property", name: "Rue 1", price: 100},
    {type: "property", name: "Rue 2", price: 120},
    {type: "station", name: "Gare"},
    {type: "property", name: "Rue 3", price: 140},
    {type: "jail", name: "PRISON"},
    {type: "property", name: "Rue 4", price: 160},
    {type: "bonus", name: "Bonus"},
    {type: "property", name: "Rue 5", price: 180},
    {type: "property", name: "Rue 6", price: 200},
    {type: "tax", name: "Taxe", amount: 100},
    {type: "property", name: "Rue 7", price: 220},
    {type: "property", name: "Rue 8", price: 240},
    {type: "chance", name: "Chance"},
    {type: "property", name: "Rue 9", price: 260},
    {type: "bonus", name: "Bonus"},
    {type: "property", name: "Rue 10", price: 280},
    {type: "tax", name: "Impôt", amount: 150},
    {type: "property", name: "Rue 11", price: 300},
    {type: "property", name: "Rue 12", price: 320},
    {type: "property", name: "Rue 13", price: 340},
    {type: "property", name: "Rue 14", price: 360},
    {type: "property", name: "Rue 15", price: 380},
    {type: "station", name: "Gare"},
    {type: "property", name: "Rue 16", price: 400},
    {type: "property", name: "Rue 17", price: 420},
    {type: "property", name: "Rue 18", price: 440},
    {type: "chance", name: "Chance"},
    {type: "property", name: "Rue 19", price: 460},
    {type: "property", name: "Rue 20", price: 480},
    {type: "property", name: "Rue 21", price: 500},
    {type: "chance", name: "Chance"},
    {type: "property", name: "Rue 22", price: 520},
    {type: "property", name: "Rue 23", price: 540},
    {type: "property", name: "Rue 24", price: 560},
    {type: "parking", name: "Parking"}
];

const MESSAGE_TYPES = new Set([
    "CREATE_ROOM",
    "JOIN_ROOM",
    "PLAYER_READY",
    "START_GAME",
    "ROLL_DICE",
    "BUY_PROPERTY",
    "DECLINE_PROPERTY",
    "END_TURN",
    "LEAVE_ROOM"
]);

function createHistoryEntry(text) {
    return {
        id: `${Date.now()}-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        text
    };
}

function isOpen(socket) {
    return socket && socket.readyState === 1;
}

class GameServer {
    constructor({
        maxPlayers = DEFAULT_MAX_PLAYERS,
        reconnectGraceMs,
        logger = console
    } = {}) {
        this.roomManager = new RoomManager({
            maxPlayers,
            reconnectGraceMs
        });
        this.logger = logger;
    }

    attach(socket) {
        socket.on("message", data => this.receive(socket, data));
        socket.on("close", () => {
            this.disconnect(socket);
        });
        socket.on("error", error => {
            this.logger.warn(`WebSocket error: ${error.message}`);
            this.disconnect(socket);
        });
    }

    receive(socket, data) {
        if (Buffer.byteLength(data.toString()) > MAX_MESSAGE_BYTES) {
            this.error(socket, "MESSAGE_TOO_LARGE", "Message trop volumineux.");
            return;
        }

        let message;
        try {
            message = JSON.parse(data.toString());
        } catch (error) {
            this.error(socket, "INVALID_JSON", "Message JSON invalide.");
            return;
        }

        if (
            !message ||
            typeof message.type !== "string" ||
            !MESSAGE_TYPES.has(message.type) ||
            (message.payload !== undefined &&
                (!message.payload ||
                    typeof message.payload !== "object" ||
                    Array.isArray(message.payload)))
        ) {
            this.error(socket, "INVALID_MESSAGE", "Message non reconnu.");
            return;
        }

        const payload = message.payload || {};
        const handlers = {
            CREATE_ROOM: () => this.createRoom(socket, payload),
            JOIN_ROOM: () => this.joinRoom(socket, payload),
            PLAYER_READY: () => this.playerReady(socket, payload),
            START_GAME: () => this.startGame(socket),
            ROLL_DICE: () => this.rollDice(socket),
            BUY_PROPERTY: () => this.buyProperty(socket, payload),
            DECLINE_PROPERTY: () => this.declineProperty(socket),
            END_TURN: () => this.endTurn(socket),
            LEAVE_ROOM: () => this.leaveRoom(socket)
        };

        try {
            handlers[message.type]();
        } catch (error) {
            this.logger.error(
                `Message ${message.type} failed: ${error.message}`
            );
            this.error(
                socket,
                "INTERNAL_ERROR",
                "Le serveur n'a pas pu traiter cette action."
            );
        }
    }

    createRoom(socket, payload) {
        if (socket.playerId) {
            this.error(socket, "ALREADY_IN_ROOM", "Joueur déjà connecté.");
            return;
        }

        try {
            const result = this.roomManager.createRoom(
                payload.name,
                socket
            );
            this.bindSocket(socket, result.room, result.player);
            this.logger.info(
                `Room ${result.room.code} created by ${result.player.name}.`
            );
            this.record(
                result.room,
                `🎮 ${result.player.name} crée la salle.`
            );
            this.send(socket, "ROOM_CREATED", result.room, {
                roomCode: result.room.code,
                playerId: result.player.id,
                reconnectToken: result.player.reconnectToken,
                hostId: result.room.hostId
            });
            this.broadcastState(result.room);
        } catch (error) {
            this.error(socket, error.message, "Création de salle refusée.");
        }
    }

    joinRoom(socket, payload) {
        if (socket.playerId) {
            this.error(socket, "ALREADY_IN_ROOM", "Joueur déjà connecté.");
            return;
        }

        try {
            const result = this.roomManager.joinRoom(
                payload.roomCode,
                payload.name,
                socket,
                payload.playerId,
                payload.reconnectToken
            );
            this.bindSocket(socket, result.room, result.player);
            this.logger.info(
                `${result.reconnected ? "Player reconnected" : "Player joined"} ` +
                `${result.player.name} in room ${result.room.code}.`
            );

            this.send(socket, "ROOM_JOINED", result.room, {
                roomCode: result.room.code,
                playerId: result.player.id,
                reconnectToken: result.player.reconnectToken,
                reconnected: result.reconnected
            });

            if (result.reconnected) {
                this.broadcast(result.room, "PLAYER_RECONNECTED", {
                    playerId: result.player.id
                });
            }
            this.broadcastState(result.room);
        } catch (error) {
            this.error(socket, error.message, "Connexion à la salle refusée.");
        }
    }

    bindSocket(socket, room, player) {
        socket.roomCode = room.code;
        socket.playerId = player.id;
    }

    getSession(socket) {
        if (!socket.playerId || !socket.roomCode) return null;

        const room = this.roomManager.rooms.get(socket.roomCode);
        const player = room
            ? this.roomManager.findPlayer(room, socket.playerId)
            : null;

        if (!room || !player || player.socket !== socket) return null;
        return {room, player};
    }

    requireSession(socket) {
        const session = this.getSession(socket);
        if (!session) {
            this.error(socket, "NOT_IN_ROOM", "Joueur non connecté à une salle.");
        }
        return session;
    }

    playerReady(socket, payload) {
        const session = this.requireSession(socket);
        if (!session) return;

        const {room, player} = session;
        if (room.status !== "LOBBY" && room.status !== "WAITING") {
            this.error(socket, "ROOM_LOCKED", "La salle a déjà démarré.");
            return;
        }

        player.ready = payload.ready === undefined
            ? !player.ready
            : Boolean(payload.ready);
        room.status = "WAITING";
        this.record(
            room,
            `🟢 ${player.name} est ` +
            `${player.ready ? "prêt" : "pas prêt"}.`
        );
        this.logger.info(
            `${player.name} is ${player.ready ? "ready" : "not ready"} ` +
            `in room ${room.code}.`
        );
        this.broadcast(room, "PLAYER_READY", {
            playerId: player.id,
            ready: player.ready
        });
        this.broadcastState(room);
    }

    startGame(socket) {
        const session = this.requireSession(socket);
        if (!session) return;

        const {room, player} = session;
        if (room.hostId !== player.id) {
            this.error(socket, "NOT_HOST", "Seul l’hôte peut lancer la partie.");
            return;
        }

        const connectedPlayers = room.players.filter(
            candidate => candidate.connected && !candidate.bankrupt
        );
        if (connectedPlayers.length < 2) {
            this.error(
                socket,
                "NOT_ENOUGH_PLAYERS",
                "Il faut au moins deux joueurs connectés."
            );
            return;
        }
        if (connectedPlayers.some(candidate => !candidate.ready)) {
            this.error(
                socket,
                "NOT_ALL_READY",
                "Tous les joueurs doivent être prêts."
            );
            return;
        }

        room.status = "PLAYING";
        room.currentPlayerId =
            connectedPlayers[crypto.randomInt(connectedPlayers.length)].id;
        room.pendingPropertyIndex = null;
        room.movementInProgress = false;
        room.winnerId = null;
        room.lastDice = null;
        this.logger.info(`Game started in room ${room.code}.`);
        this.record(room, "🎮 La partie commence.");
        this.broadcast(room, "START_GAME", {
            currentPlayerId: room.currentPlayerId
        });
        this.broadcastState(room);
    }

    rollDice(socket) {
        const session = this.requireSession(socket);
        if (!session) return;

        const {room, player} = session;
        if (
            room.status !== "PLAYING" ||
            room.currentPlayerId !== player.id ||
            !player.connected ||
            room.movementInProgress ||
            room.pendingPropertyIndex !== null
        ) {
            this.error(socket, "ACTION_NOT_ALLOWED", "Lancer refusé.");
            return;
        }

        const dice1 = crypto.randomInt(1, 7);
        const dice2 = crypto.randomInt(1, 7);
        const total = dice1 + dice2;
        room.lastDice = {dice1, dice2, total};
        room.movementInProgress = true;
        this.record(
            room,
            `🎲 ${player.name} lance ${dice1} + ${dice2} = ${total}.`
        );
        this.broadcast(room, "DICE_RESULT", {
            playerId: player.id,
            dice1,
            dice2,
            total
        });
        this.broadcastState(room);
        this.movePlayer(room, player, total, () =>
            this.resolveCell(room, player)
        );
    }

    movePlayer(room, player, steps, onComplete) {
        let moved = 0;

        const resolveMovement = () => {
            if (room.status !== "PLAYING") return;
            room.movementInProgress = false;
            this.broadcastState(room);
            this.roomManager.schedule(
                room,
                onComplete,
                MOVE_RESOLVE_DELAY
            );
        };

        const moveOneStep = () => {
            if (room.status !== "PLAYING") return;

            if (moved >= steps) {
                resolveMovement();
                return;
            }

            const previousPosition = player.position;
            player.position = (player.position + 1) % CELLS.length;

            if (player.position === 0 && previousPosition !== 0) {
                player.money += PASS_START_BONUS;
                this.record(
                    room,
                    `🚩 ${player.name} passe par le départ et reçoit ` +
                    `${PASS_START_BONUS} €.`
                );
                this.broadcast(room, "MONEY_CHANGED", {
                    playerId: player.id,
                    reason: "PASS_START",
                    amount: PASS_START_BONUS,
                    balance: player.money
                });
            }

            moved += 1;
            this.broadcast(room, "PLAYER_MOVED", {
                playerId: player.id,
                position: player.position,
                step: moved,
                totalSteps: steps
            });
            this.broadcastState(room);

            if (moved < steps) {
                this.roomManager.schedule(
                    room,
                    moveOneStep,
                    MOVE_STEP_DELAY
                );
            } else {
                this.roomManager.schedule(
                    room,
                    resolveMovement,
                    MOVE_RESOLVE_DELAY
                );
            }
        };

        this.roomManager.schedule(room, moveOneStep, MOVE_STEP_DELAY);
    }

    resolveCell(room, player) {
        if (room.status !== "PLAYING") return;

        const cell = CELLS[player.position];
        if (cell.type === "property") {
            this.resolveProperty(room, player, cell);
            return;
        }

        if (cell.type === "tax") {
            this.applyTax(room, player, cell.amount);
            return;
        }

        if (cell.type === "bonus") {
            this.applyBonus(room, player);
            return;
        }

        if (cell.type === "chance") {
            this.applyChance(room, player);
            return;
        }

        if (cell.type === "station") {
            this.finishCell(room, "🚂 Gare ! Rien à payer.", "STATION");
            return;
        }

        if (cell.type === "jail") {
            player.inPrison = true;
            this.finishCell(
                room,
                "🚓 Tu entres sur la case Prison. " +
                "Tu es simplement de passage.",
                "PRISON"
            );
            return;
        }

        if (cell.type === "parking") {
            this.finishCell(room, "🅿️ Parking gratuit.", "PARKING");
            return;
        }

        this.finishCell(room, "🚩 Tu es sur le départ.", "START");
    }

    resolveProperty(room, player, cell) {
        const owner = this.findPropertyOwner(room, cell.name);
        if (owner && owner.id === player.id) {
            this.finishCell(
                room,
                `🏠 ${cell.name} t'appartient.`,
                "PROPERTY_SELF"
            );
            return;
        }

        if (!owner) {
            room.pendingPropertyIndex = player.position;
            this.record(
                room,
                `🏠 ${cell.name} est libre : ${cell.price} €.`
            );
            this.broadcast(room, "PROPERTY_AVAILABLE", {
                playerId: player.id,
                propertyIndex: player.position,
                name: cell.name,
                price: cell.price
            });
            this.broadcastState(room);
            return;
        }

        this.payRent(room, player, owner, cell);
    }

    findPropertyOwner(room, propertyName) {
        return room.players.find(
            player => player.properties.includes(propertyName)
        ) || null;
    }

    buyProperty(socket, payload) {
        const session = this.requireSession(socket);
        if (!session) return;

        const {room, player} = session;
        const index = payload.propertyIndex;
        const cell = Number.isInteger(index) ? CELLS[index] : null;

        if (
            room.status !== "PLAYING" ||
            room.currentPlayerId !== player.id ||
            room.movementInProgress ||
            room.pendingPropertyIndex !== index ||
            !cell ||
            cell.type !== "property"
        ) {
            this.error(socket, "ACTION_NOT_ALLOWED", "Achat refusé.");
            return;
        }

        if (this.findPropertyOwner(room, cell.name)) {
            this.error(socket, "PROPERTY_OWNED", "Rue déjà achetée.");
            return;
        }

        if (player.money < cell.price) {
            this.error(socket, "INSUFFICIENT_FUNDS", "Argent insuffisant.");
            return;
        }

        player.money -= cell.price;
        player.properties.push(cell.name);
        room.pendingPropertyIndex = null;
        this.record(
            room,
            `🏠 ${player.name} achète ${cell.name} pour ${cell.price} €.`
        );
        this.broadcast(room, "PROPERTY_BOUGHT", {
            playerId: player.id,
            propertyIndex: index,
            price: cell.price,
            balance: player.money
        });
        this.broadcast(room, "MONEY_CHANGED", {
            playerId: player.id,
            reason: "PROPERTY_PURCHASE",
            amount: -cell.price,
            balance: player.money
        });
        this.finishAction(room);
    }

    declineProperty(socket) {
        const session = this.requireSession(socket);
        if (!session) return;

        const {room, player} = session;
        if (
            room.status !== "PLAYING" ||
            room.currentPlayerId !== player.id ||
            room.pendingPropertyIndex === null
        ) {
            this.error(socket, "ACTION_NOT_ALLOWED", "Action refusée.");
            return;
        }

        room.pendingPropertyIndex = null;
        this.record(room, `⏭️ ${player.name} n'achète pas la rue.`);
        this.finishAction(room);
    }

    payRent(room, player, owner, cell) {
        const rent = Math.max(25, Math.floor(cell.price * 0.25));
        player.money -= rent;
        owner.money += rent;
        this.record(
            room,
            `💸 ${player.name} paie ${rent} € à ${owner.name}.`
        );
        this.broadcast(room, "RENT_PAID", {
            fromPlayerId: player.id,
            toPlayerId: owner.id,
            amount: rent,
            propertyIndex: player.position
        });
        this.broadcast(room, "MONEY_CHANGED", {
            playerId: player.id,
            reason: "RENT",
            amount: -rent,
            balance: player.money
        });
        this.broadcast(room, "MONEY_CHANGED", {
            playerId: owner.id,
            reason: "RENT",
            amount: rent,
            balance: owner.money
        });
        if (this.checkBankruptcy(room, player)) return;
        this.finishAction(room);
    }

    applyTax(room, player, amount) {
        player.money -= amount;
        this.record(
            room,
            `💰 ${player.name} paie ${amount} € de taxe.`
        );
        this.broadcast(room, "TAX", {
            playerId: player.id,
            amount,
            balance: player.money
        });
        this.broadcast(room, "MONEY_CHANGED", {
            playerId: player.id,
            reason: "TAX",
            amount: -amount,
            balance: player.money
        });
        if (this.checkBankruptcy(room, player)) return;
        this.finishAction(room);
    }

    applyBonus(room, player) {
        player.money += BONUS_AMOUNT;
        this.record(
            room,
            `🎁 ${player.name} reçoit ${BONUS_AMOUNT} €.`
        );
        this.broadcast(room, "BONUS", {
            playerId: player.id,
            amount: BONUS_AMOUNT,
            balance: player.money
        });
        this.broadcast(room, "MONEY_CHANGED", {
            playerId: player.id,
            reason: "BONUS",
            amount: BONUS_AMOUNT,
            balance: player.money
        });
        this.finishAction(room);
    }

    applyChance(room, player) {
        const cardIndex = crypto.randomInt(5);
        const cards = [
            {
                text: "💰 Tu gagnes 100 €.",
                apply: () => {
                    player.money += 100;
                    this.broadcast(room, "MONEY_CHANGED", {
                        playerId: player.id,
                        reason: "CHANCE",
                        amount: 100,
                        balance: player.money
                    });
                    if (this.checkBankruptcy(room, player)) return;
                    this.finishAction(room);
                }
            },
            {
                text: "🎁 Bonus exceptionnel : +150 €.",
                apply: () => {
                    player.money += BONUS_AMOUNT;
                    this.broadcast(room, "MONEY_CHANGED", {
                        playerId: player.id,
                        reason: "CHANCE",
                        amount: BONUS_AMOUNT,
                        balance: player.money
                    });
                    this.finishAction(room);
                }
            },
            {
                text: "🚗 Avance de 3 cases.",
                apply: () => {
                    room.movementInProgress = true;
                    this.movePlayer(room, player, 3, () =>
                        this.resolveCell(room, player)
                    );
                }
            },
            {
                text: "↩️ Recule de 2 cases.",
                apply: () => {
                    player.position =
                        (player.position - 2 + CELLS.length) %
                        CELLS.length;
                    this.broadcast(room, "PLAYER_MOVED", {
                        playerId: player.id,
                        position: player.position,
                        step: 2,
                        totalSteps: 2,
                        direction: "BACKWARD"
                    });
                    roomManagerSchedule(
                        this.roomManager,
                        room,
                        () => {
                            room.movementInProgress = false;
                            this.resolveCell(room, player);
                        },
                        MOVE_RESOLVE_DELAY
                    );
                }
            }
        ];

        const card = cards[cardIndex];
        this.record(room, `🎲 Chance : ${card.text}`);
        this.broadcast(room, "CHANCE", {
            playerId: player.id,
            card: card.text,
            cardIndex
        });
        card.apply();
    }

    finishCell(room, text, eventType) {
        this.record(room, text);
        this.broadcast(room, eventType, {message: text});
        this.finishAction(room);
    }

    finishAction(room) {
        room.movementInProgress = false;
        this.broadcastState(room);
    }

    endTurn(socket) {
        const session = this.requireSession(socket);
        if (!session) return;

        const {room, player} = session;
        if (
            room.status !== "PLAYING" ||
            room.currentPlayerId !== player.id ||
            room.movementInProgress ||
            room.pendingPropertyIndex !== null
        ) {
            this.error(socket, "ACTION_NOT_ALLOWED", "Fin de tour refusée.");
            return;
        }

        const startIndex = room.players.findIndex(
            candidate => candidate.id === player.id
        );
        let nextPlayer = null;

        for (let offset = 1; offset <= room.players.length; offset += 1) {
            const candidate =
                room.players[
                    (startIndex + offset) % room.players.length
                ];
            if (candidate && !candidate.bankrupt && candidate.connected) {
                nextPlayer = candidate;
                break;
            }
        }

        if (!nextPlayer) {
            this.error(socket, "NO_NEXT_PLAYER", "Aucun joueur disponible.");
            return;
        }

        room.currentPlayerId = nextPlayer.id;
        room.lastDice = null;
        this.record(room, `🎮 Tour de ${nextPlayer.name}.`);
        this.broadcast(room, "TURN_CHANGED", {
            playerId: nextPlayer.id
        });
        this.broadcastState(room);
    }

    leaveRoom(socket) {
        const session = this.requireSession(socket);
        if (!session) return;

        const {room, player} = session;
        const wasPlaying = room.status === "PLAYING";

        if (wasPlaying) {
            player.socket = null;
            player.connected = false;
            player.disconnectedAt = Date.now();
            const newHost = this.roomManager.reassignHost(
                room,
                player.id
            );
            this.record(room, `🚪 ${player.name} quitte la salle.`);
            this.logger.info(
                `${player.name} left room ${room.code}.`
            );
            this.send(socket, "ROOM_LEFT", room, {});
            this.broadcast(room, "PLAYER_DISCONNECTED", {
                playerId: player.id,
                playerName: player.name
            });
            if (newHost) {
                this.logger.info(
                    `${newHost.name} is now host of room ${room.code}.`
                );
            }
            this.broadcastState(room);
            socket.close(1000, "Left room");
            return;
        }

        const playerIndex = room.players.indexOf(player);
        if (playerIndex !== -1) room.players.splice(playerIndex, 1);
        this.roomManager.players.delete(player.id);

        const newHost = this.roomManager.reassignHost(room, player.id);
        room.status = room.players.length > 1 ? "WAITING" : "LOBBY";
        this.record(room, `🚪 ${player.name} quitte la salle.`);
        this.send(socket, "ROOM_LEFT", room, {});
        socket.close(1000, "Left room");

        if (room.players.length === 0) {
            this.roomManager.destroyRoom(room);
            return;
        }

        if (newHost) {
            this.logger.info(
                `${newHost.name} is now host of room ${room.code}.`
            );
        }
        this.broadcast(room, "PLAYER_DISCONNECTED", {
            playerId: player.id,
            playerName: player.name
        });
        this.broadcastState(room);
    }

    checkBankruptcy(room, player) {
        if (player.money >= 0) return false;

        player.bankrupt = true;
        this.record(room, `🏁 ${player.name} est en faillite.`);
        this.broadcast(room, "BANKRUPTCY", {
            playerId: player.id,
            playerName: player.name
        });

        const remaining = room.players.filter(
            candidate => !candidate.bankrupt
        );
        if (remaining.length <= 1) {
            room.status = "FINISHED";
            room.winnerId = remaining[0] ? remaining[0].id : null;
            room.currentPlayerId = null;
            this.logger.info(
                `Game finished in room ${room.code}: ` +
                `${remaining[0] ? remaining[0].name : "no winner"}.`
            );
            this.broadcast(room, "GAME_OVER", {
                winnerId: room.winnerId,
                winnerName: remaining[0] ? remaining[0].name : null
            });
        }

        this.broadcastState(room);
        return true;
    }

    record(room, text) {
        room.history.push(createHistoryEntry(text));
        if (room.history.length > 500) room.history.shift();
        room.stateVersion += 1;
    }

    broadcastState(room) {
        this.broadcast(room, "ROOM_STATE", {});
    }

    broadcast(room, type, payload = {}, excludePlayerId = null) {
        const message = JSON.stringify({
            type,
            roomCode: room.code,
            payload,
            state: this.roomManager.serializeRoom(room)
        });

        room.players.forEach(player => {
            if (
                player.id !== excludePlayerId &&
                isOpen(player.socket)
            ) {
                player.socket.send(message);
            }
        });
    }

    send(socket, type, room, payload = {}) {
        if (!isOpen(socket)) return;

        socket.send(JSON.stringify({
            type,
            roomCode: room ? room.code : null,
            payload,
            state: room
                ? this.roomManager.serializeRoom(room)
                : null
        }));
    }

    error(socket, code, message) {
        this.logger.warn(`${code}: ${message}`);
        this.send(socket, "ERROR", null, {code, message});
    }

    disconnect(socket) {
        const result = this.roomManager.disconnectSocket(socket);
        if (!result) return;

        const {room, player, newHost} = result;
        this.logger.info(
            `${player.name} disconnected from room ${room.code}.`
        );
        if (newHost) {
            this.logger.info(
                `${newHost.name} is now host of room ${room.code}.`
            );
        }
        this.record(room, `🔴 ${player.name} est déconnecté.`);
        this.broadcast(room, "PLAYER_DISCONNECTED", {
            playerId: player.id,
            playerName: player.name
        });
        this.broadcastState(room);
    }
}

function roomManagerSchedule(manager, room, callback, delay) {
    manager.schedule(room, callback, delay);
}

module.exports = {
    CELLS,
    GameServer,
    MAX_MESSAGE_BYTES,
    MOVE_RESOLVE_DELAY,
    MOVE_STEP_DELAY
};
