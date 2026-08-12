"use strict";

const crypto = require("node:crypto");

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_MAX_PLAYERS = 4;
const DEFAULT_RECONNECT_GRACE_MS = 5 * 60 * 1000;
const ROOM_CODE_PATTERN = /^[A-Z2-9]{6}$/;

function createRoomCode() {
    let code = "";

    for (let index = 0; index < 6; index += 1) {
        const position = crypto.randomInt(ROOM_CODE_ALPHABET.length);
        code += ROOM_CODE_ALPHABET[position];
    }

    return code;
}

function cleanName(name) {
    if (typeof name !== "string") return "";

    return name.trim().replace(/\s+/g, " ").slice(0, 24);
}

class RoomManager {
    constructor({
        maxPlayers = DEFAULT_MAX_PLAYERS,
        reconnectGraceMs = DEFAULT_RECONNECT_GRACE_MS
    } = {}) {
        this.maxPlayers = maxPlayers;
        this.reconnectGraceMs = reconnectGraceMs;
        this.rooms = new Map();
        this.players = new Map();
    }

    createRoom(name, socket) {
        const playerName = cleanName(name);
        if (!playerName) {
            throw new Error("INVALID_NAME");
        }

        let code;
        do {
            code = createRoomCode();
        } while (this.rooms.has(code));

        const room = {
            code,
            status: "LOBBY",
            hostId: null,
            players: [],
            currentPlayerId: null,
            lastDice: null,
            pendingPropertyIndex: null,
            movementInProgress: false,
            winnerId: null,
            history: [],
            stateVersion: 0,
            timers: new Set()
        };

        this.rooms.set(code, room);
        const player = this.addPlayer(room, playerName, socket);
        room.hostId = player.id;
        return {room, player, reconnected: false};
    }

    joinRoom(code, name, socket, playerId, reconnectToken) {
        const normalizedCode = String(code || "").trim().toUpperCase();
        if (!ROOM_CODE_PATTERN.test(normalizedCode)) {
            throw new Error("INVALID_ROOM_CODE");
        }

        const room = this.rooms.get(normalizedCode);
        if (!room) throw new Error("ROOM_NOT_FOUND");

        if (playerId && reconnectToken) {
            const existing = room.players.find(
                player =>
                    player.id === playerId &&
                    player.reconnectToken === reconnectToken
            );

            if (existing) {
                existing.socket = socket;
                existing.connected = true;
                existing.disconnectedAt = null;
                this.players.set(existing.id, room);
                return {room, player: existing, reconnected: true};
            }
        }

        if (room.status === "PLAYING" || room.status === "FINISHED") {
            throw new Error("ROOM_LOCKED");
        }

        if (room.players.length >= this.maxPlayers) {
            throw new Error("ROOM_FULL");
        }

        const playerName = cleanName(name);
        if (!playerName) throw new Error("INVALID_NAME");

        const player = this.addPlayer(room, playerName, socket);
        room.status = "WAITING";
        return {room, player, reconnected: false};
    }

    addPlayer(room, name, socket) {
        const player = {
            id: crypto.randomUUID(),
            reconnectToken: crypto.randomBytes(24).toString("hex"),
            name,
            emoji: room.players.length % 2 === 0 ? "👨‍💼" : "👩‍💼",
            money: 1500,
            position: 0,
            properties: [],
            inPrison: false,
            bankrupt: false,
            connected: true,
            ready: false,
            disconnectedAt: null,
            socket
        };

        room.players.push(player);
        this.players.set(player.id, room);
        return player;
    }

    findRoomByPlayer(playerId) {
        return this.players.get(playerId) || null;
    }

    findPlayer(room, playerId) {
        return room.players.find(player => player.id === playerId) || null;
    }

    disconnectSocket(socket) {
        for (const room of this.rooms.values()) {
            const player = room.players.find(
                candidate => candidate.socket === socket
            );
            if (!player) continue;

            player.socket = null;
            player.connected = false;
            player.disconnectedAt = Date.now();
            const newHost = this.reassignHost(room, player.id);
            return {room, player, newHost};
        }

        return null;
    }

    reassignHost(room, disconnectedPlayerId = null) {
        if (
            room.hostId &&
            room.hostId !== disconnectedPlayerId &&
            room.players.some(
                player => player.id === room.hostId && player.connected
            )
        ) {
            return null;
        }

        const nextHost = room.players.find(player => player.connected);
        if (!nextHost) return null;

        const previousHostId = room.hostId;
        room.hostId = nextHost.id;
        return previousHostId === room.hostId
            ? null
            : nextHost;
    }

    publicPlayer(player) {
        return {
            id: player.id,
            name: player.name,
            emoji: player.emoji,
            money: player.money,
            position: player.position,
            properties: [...player.properties],
            inPrison: player.inPrison,
            bankrupt: player.bankrupt,
            connected: player.connected,
            ready: player.ready
        };
    }

    serializeRoom(room) {
        return {
            code: room.code,
            status: room.status,
            hostId: room.hostId,
            players: room.players.map(player =>
                this.publicPlayer(player)
            ),
            currentPlayerId: room.currentPlayerId,
            lastDice: room.lastDice
                ? {...room.lastDice}
                : null,
            pendingPropertyIndex: room.pendingPropertyIndex,
            movementInProgress: room.movementInProgress,
            winnerId: room.winnerId,
            history: room.history.map(entry => ({...entry})),
            stateVersion: room.stateVersion
        };
    }

    bump(room) {
        room.stateVersion += 1;
    }

    schedule(room, callback, delay) {
        const timer = setTimeout(() => {
            room.timers.delete(timer);
            if (this.rooms.get(room.code) === room) callback();
        }, delay);

        room.timers.add(timer);
        return timer;
    }

    clearRoomTimers(room) {
        for (const timer of room.timers) {
            clearTimeout(timer);
        }
        room.timers.clear();
    }

    destroyRoom(room) {
        this.clearRoomTimers(room);
        this.rooms.delete(room.code);
        room.players.forEach(player => this.players.delete(player.id));
    }
}

module.exports = {
    DEFAULT_MAX_PLAYERS,
    DEFAULT_RECONNECT_GRACE_MS,
    RoomManager,
    cleanName
};
