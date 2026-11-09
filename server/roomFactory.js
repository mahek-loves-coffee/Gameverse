import { GAME_META } from "../shared/gameEngine.js";

export function validateRoomRequest(gameId, playerSlots) {
  const meta = GAME_META[gameId];
  if (!meta) return { error: "Game not found." };
  const slots = Number(playerSlots ?? meta.max);
  if (gameId === "raja-mantri" && slots !== 4) return { error: "Chor Ko Dhundo mein exactly 4 players chahiye." };
  if (!Number.isInteger(slots) || slots < meta.min || slots > meta.max) {
    return { error: `Player slots ${meta.min} se ${meta.max} ke beech select karo.` };
  }
  return { slots };
}

export function createWaitingRoom({ code, gameId, playerSlots, user, socketId = null }) {
  if (!code || !user?.userId || !user?.username) throw new TypeError("Room code and authenticated user are required.");
  const validation = validateRoomRequest(gameId, playerSlots);
  if (validation.error) throw new RangeError(validation.error);
  return {
    code,
    gameId,
    mode: gameId,
    maxPlayers: validation.slots,
    status: "waiting",
    hostId: user.userId,
    players: [{ ...user, socketId, ready: true, connected: Boolean(socketId) }],
    gameState: null,
    chat: []
  };
}
