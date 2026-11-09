export const GAME_META = {
  uno: { title: "UNO Normal", min: 2, max: 8 },
  "uno-flip": { title: "UNO Flip", min: 2, max: 8 },
  "uno-no-mercy": { title: "UNO No Mercy", min: 2, max: 8 },
  ludo: { title: "Ludo", min: 2, max: 4 },
  "raja-mantri": { title: "Chor Ko Dhundo", min: 4, max: 4 },
  "sola-parchi": { title: "Sola Parchi", min: 4, max: 8 }
};

const COLORS = ["red", "yellow", "green", "blue"];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function activeFace(card, side = "normal") {
  if (card?.faces) return card.faces[side === "dark" ? "dark" : "light"];
  return card;
}

function makeUnoDeck(gameId) {
  const deck = [];
  if (gameId === "uno-flip") {
    const light = ["red", "yellow", "green", "blue"];
    const dark = ["pink", "teal", "orange", "purple"];
    for (let ci = 0; ci < light.length; ci++) {
      const lc = light[ci], dc = dark[ci];
      const add = (value, kind, darkValue = value, darkKind = kind, copies = 1) => {
        for (let n = 0; n < copies; n++) deck.push({
          id: `flip-${lc}-${value}-${n}-${deck.length}`,
          faces: {
            light: { color: lc, value, kind },
            dark: { color: dc, value: darkValue, kind: darkKind }
          }
        });
      };
      for (let n = 1; n <= 9; n++) add(String(n), "number", String(n), "number", 2);
      add("draw1", "draw1", "draw5", "draw5", 2);
      add("skip", "skip", "skipAll", "skipAll", 2);
      add("reverse", "reverse", "reverse", "reverse", 2);
      add("flip", "flip", "flip", "flip", 2);
    }
    for (let i = 0; i < 4; i++) deck.push({ id: `flip-wild-${i}`, faces: {
      light: { color: "wild", value: "wild", kind: "wild" },
      dark: { color: "wild", value: "wildDrawColor", kind: "wildDrawColor" }
    }});
    for (let i = 0; i < 4; i++) deck.push({ id: `flip-wild-draw2-${i}`, faces: {
      light: { color: "wild", value: "wildDraw2", kind: "wildDraw2" },
      dark: { color: "wild", value: "wildDrawColor", kind: "wildDrawColor" }
    }});
    return shuffle(deck);
  }
  if (gameId === "uno-no-mercy") {
    for (const color of COLORS) {
      deck.push({ id: `${color}-0`, color, value: "0", kind: "number" });
      for (let n = 1; n <= 9; n++) {
        deck.push({ id: `${color}-${n}-a`, color, value: String(n), kind: "number" });
        deck.push({ id: `${color}-${n}-b`, color, value: String(n), kind: "number" });
      }
      for (const [kind,value] of [["skip","skip"],["reverse","reverse"],["draw2","+2"],["draw4","+4"],["skipAll","skipAll"],["discardAll","discardAll"]]) {
        for (let n=0;n<3;n++) deck.push({id:`${color}-${kind}-${n}`,color,value,kind});
      }
    }
    for (let i=0;i<4;i++) deck.push({id:`mercy-wild-${i}`,color:"wild",value:"wild",kind:"wild"});
    for (const [kind,value] of [["wildReverseDraw4","+4 REVERSE"],["wild6","+6"],["wild10","+10"],["wildRoulette","ROULETTE"]]) {
      for(let i=0;i<4;i++) deck.push({id:`mercy-${kind}-${i}`,color:"wild",value,kind});
    }
    return shuffle(deck);
  }
  for (const color of COLORS) {
    deck.push({ id: `${color}-0`, color, value: "0", kind: "number" });
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: `${color}-${n}-a`, color, value: String(n), kind: "number" });
      deck.push({ id: `${color}-${n}-b`, color, value: String(n), kind: "number" });
    }
    for (const kind of ["skip", "reverse", "draw2"]) {
      deck.push({ id: `${color}-${kind}-a`, color, value: kind, kind });
      deck.push({ id: `${color}-${kind}-b`, color, value: kind, kind });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild-${i}`, color: "wild", value: "wild", kind: "wild" });
    deck.push({ id: `wild4-${i}`, color: "wild", value: "wild4", kind: "wild4" });
  }
  return shuffle(deck);
}

function drawCards(state, playerIndex, count) {
  for (let i = 0; i < count; i++) {
    if (!state.deck.length) {
      const top = state.discard.pop();
      state.deck = shuffle(state.discard);
      state.discard = [top];
    }
    const card = state.deck.pop();
    if (card) state.hands[playerIndex].push(card);
  }
}

function nextIndex(index, direction, total) {
  return (index + direction + total) % total;
}
function nextUnoIndex(state, fromIndex, direction = state.direction) {
  let index = fromIndex;
  for (let tries = 0; tries < state.players.length; tries++) {
    index = nextIndex(index, direction, state.players.length);
    if (!state.eliminated?.includes(state.players[index])) return index;
  }
  return fromIndex;
}

export function createGameState(gameId, players) {
  const meta = GAME_META[gameId];
  if (!meta) throw new Error("Unknown game");
  if (!Array.isArray(players) || players.length < meta.min || players.length > meta.max) throw new Error(`${meta.title} ke liye ${meta.min}${meta.min===meta.max?"":"–"+meta.max} players chahiye.`);
  if (gameId === "raja-mantri" && players.length !== 4) throw new Error("Chor Ko Dhundo mein exactly 4 players chahiye.");
  const ids = players.map(p => p.userId);
  if (new Set(ids).size !== ids.length || ids.some(id => !id)) throw new Error("Players list invalid hai.");
  const playerInfo = Object.fromEntries(players.map(p => [p.userId, { username:p.username || p.userId, avatar:p.avatar || null }]));
  if (gameId.startsWith("uno")) {
    const deck = makeUnoDeck(gameId);
    const hands = ids.map(() => deck.splice(0, 7));
    const initialSide = gameId === "uno-flip" ? "light" : "normal";
    let first = deck.pop();
    while (first && activeFace(first, initialSide).kind !== "number") {
      deck.unshift(first);
      first = deck.pop();
    }
    return {
      gameId, status: "playing", players: ids, playerInfo, deck, hands, discard: [first],
      side: initialSide,
      currentColor: activeFace(first, initialSide).color,
      turn: 0, direction: 1, drawPending: 0, pendingStackLast: 0, eliminated: [],
      pendingUnoPlayer: null, unoCalled: false,
      winner: null, message: "Game shuru! Apna card play karo."
    };
  }
  if (gameId === "ludo") {
    return {
      gameId, status: "playing", players: ids, playerInfo, turn: 0, dice: null, rollCount: 0,
      sixCount: 0, invalidRoll: false, winner: null,
      tokens: ids.map(() => [-1, -1, -1, -1]),
      message: "Dice roll karo. Six aane par token bahar niklega."
    };
  }
  if (gameId === "raja-mantri") {
    const roles = shuffle(["Raja", "Mantri", "Sipahi", "Chor"]);
    return {
      gameId, status: "playing", players: ids, playerInfo,
      roles: Object.fromEntries(ids.map((id, i) => [id, roles[i]])),
      revealed: [], scores: Object.fromEntries(ids.map(id => [id, 0])),
      phase: "reveal", guessBy: null, guessTarget: null, winner: null,
      message: "Sab apna secret role dekhein. Sipahi ko Chor guess karna hai."
    };
  }
  if (gameId === "sola-parchi") {
    const fruits = ["apple", "banana", "grapes", "orange", "strawberry", "pear", "watermelon", "kiwi"];
    const symbols = fruits.slice(0, ids.length);
    const deck = shuffle(symbols.flatMap(symbol => Array.from({ length: 4 }, (_, copy) => ({ id: `${symbol}-${copy}-${Math.random().toString(36).slice(2, 8)}`, fruit: symbol } ))));
    const hands = Object.fromEntries(ids.map(id => [id, deck.splice(0, 4)]));
    const openingWinner = ids.find(id => hands[id].every(card => card.fruit === hands[id][0].fruit));
    return {
      gameId, status: openingWinner ? "finished" : "playing", players: ids, playerInfo, hands,
      turn: 0, passDirection: 1, winner: openingWinner || null,
      message: openingWinner ? `${playerInfo[openingWinner].username} ne opening hand mein hi set bana liya!` : "Apne 4 cards mein se ek card next player ko pass karo."
    };
  }
  throw new Error("Unknown game");
}

export function publicGameState(state) {
  if (!state) return null;
  const copy = structuredClone(state);
  if (copy.hands && copy.gameId.startsWith("uno")) {
    copy.handCounts = copy.hands.map(h => h.length);
    copy.activeDiscard = activeFace(copy.discard[copy.discard.length - 1], copy.side);
    delete copy.hands;
    delete copy.deck;
  }
  if (copy.gameId === "sola-parchi") {
    copy.handCounts = Object.fromEntries(copy.players.map(id => [id, copy.hands[id]?.length || 0]));
    delete copy.hands;
  }
  if (copy.gameId === "raja-mantri" && copy.status !== "finished") delete copy.roles;
  return copy;
}

export function privateGameState(state, userId) {
  if (!state) return null;
  if (state.gameId.startsWith("uno")) return { hand: (state.hands[state.players.indexOf(userId)] || []).map(card => ({ ...activeFace(card, state.side), id: card.id })) };
  if (state.gameId === "sola-parchi") return { hand: state.hands[userId] || [] };
  if (state.gameId === "raja-mantri") return { role: state.roles[userId] || null, revealed: state.revealed.includes(userId) };
  return {};
}

export function applyGameAction(original, userId, action) {
  const state = structuredClone(original);
  const playerIndex = state.players.indexOf(userId);
  if (playerIndex < 0 || state.status !== "playing") throw new Error("Player not in active game");

  if (state.gameId.startsWith("uno")) {
    if (action.type === "callUno") {
      if (state.pendingUnoPlayer !== userId) throw new Error("Abhi tumhare liye UNO call pending nahi hai.");
      state.pendingUnoPlayer = null; state.unoCalled = true; state.message = `${state.playerInfo?.[userId]?.username || userId} ne UNO call kar diya!`;
      return state;
    }
    if (action.type === "catchUno") {
      if (!state.pendingUnoPlayer || state.pendingUnoPlayer === userId || state.unoCalled) throw new Error("Abhi kisi ko UNO catch nahi kar sakte.");
      const caught = state.pendingUnoPlayer, caughtIndex = state.players.indexOf(caught);
      drawCards(state,caughtIndex,2); state.pendingUnoPlayer=null; state.unoCalled=false;
      state.message = `${state.playerInfo?.[caught]?.username || caught} caught! 2 cards draw hue.`;
      return state;
    }
    if (playerIndex !== state.turn) throw new Error("Abhi tumhari turn nahi hai.");
    if (state.pendingUnoPlayer && state.pendingUnoPlayer !== userId) { state.pendingUnoPlayer=null; state.unoCalled=false; }
    if (action.type === "draw") {
      if (state.drawPending === -1 || state.drawPending === -2) {
        const chosenColor = state.drawPending === -1 ? action.color : state.currentColor;
        const validColors = state.side === "dark" ? ["pink","teal","orange","purple"] : COLORS;
        if (!validColors.includes(chosenColor)) throw new Error("Roulette ke liye valid colour choose karo.");
        let attempts = 0, matched = false;
        const startingHandSize = state.hands[playerIndex].length;
        while (attempts < 200 && (state.deck.length || state.discard.length > 1)) {
          drawCards(state, playerIndex, 1); attempts++;
          const hasNewCard = state.hands[playerIndex].length > startingHandSize;
          if (!hasNewCard) break;
          const drawn = activeFace(state.hands[playerIndex].at(-1), state.side);
          if (drawn.kind !== "wild" && drawn.color === chosenColor) { matched = true; break; }
        }
        if (state.drawPending === -1) state.currentColor = chosenColor;
        state.message = matched ? `${chosenColor} mila. Reveal hue cards hand mein add ho gaye.` : "Draw pile khatam ho gaya.";
      } else if (state.drawPending > 0) {
        drawCards(state, playerIndex, state.drawPending);
        state.message = `${state.drawPending} card(s) draw hue.`;
      } else if (state.gameId === "uno-no-mercy") {
        let attempts = 0;
        const startingHandSize = state.hands[playerIndex].length;
        const playable = c => { if (!c) return false; const f=activeFace(c,state.side), top=activeFace(state.discard.at(-1),state.side); return f.color==="wild" || f.color===state.currentColor || f.value===top.value; };
        let foundPlayable = false;
        while (attempts < 168 && (state.deck.length || state.discard.length > 1)) {
          drawCards(state,playerIndex,1); attempts++;
          if (state.hands[playerIndex].length === startingHandSize) break;
          if (playable(state.hands[playerIndex].at(-1))) { foundPlayable = true; break; }
        }
        const lastDrawn = state.hands[playerIndex].length > startingHandSize ? state.hands[playerIndex].at(-1) : null;
        state.drawnCardId = foundPlayable ? lastDrawn?.id || null : null;
        state.message = foundPlayable ? "Playable card mil gaya. Ab us card ko play karo." : "Deck khatam. Draw ke baad turn pass ho gayi.";
        if (state.hands[playerIndex].length >= 25) {
          state.eliminated.push(userId);
          const remaining=state.players.filter(id=>!state.eliminated.includes(id));
          if(remaining.length<=1){state.winner=remaining[0]||null;state.status="finished";state.message=`Mercy rule! ${state.winner} wins.`;return state;}
          state.drawnCardId=null;state.turn=nextUnoIndex(state,playerIndex,state.direction);state.message=`${userId} eliminated by the 25-card Mercy rule.`;return state;
        }
        if (state.drawnCardId) return state;
        state.turn = nextUnoIndex(state, playerIndex, state.direction);
        return state;
      } else {
        drawCards(state, playerIndex, 1);
        state.drawnCardId = state.hands[playerIndex].at(-1)?.id || null;
        state.message = state.drawnCardId ? "1 card draw hua. Agar playable hai toh isi turn mein play kar sakte ho." : "Draw pile empty. Turn pass ho gayi.";
        if (!state.drawnCardId) state.turn = nextUnoIndex(state, playerIndex, state.direction);
        return state;
      }
      state.drawnCardId = null;
      state.drawPending = 0; state.pendingStackLast = 0;
      if (state.gameId === "uno-no-mercy" && state.hands[playerIndex].length >= 25) {
        state.eliminated.push(userId);
        const remaining = state.players.filter(id => !state.eliminated.includes(id));
        if (remaining.length <= 1) { state.winner = remaining[0] || null; state.status = "finished"; state.message = `Mercy rule! ${state.winner} wins.`; return state; }
        state.message = `${userId} eliminated by the 25-card Mercy rule.`;
      }
      state.turn = nextUnoIndex(state, playerIndex, state.direction);
      return state;
    }
    if (action.type === "passTurn" && state.drawnCardId) {
      state.drawnCardId = null;
      state.turn = nextUnoIndex(state, playerIndex, state.direction);
      state.message = "Turn pass ho gayi.";
      return state;
    }
    if (action.type === "play") {
      const hand = state.hands[playerIndex];
      const card = hand[action.cardIndex];
      if (!card) throw new Error("Card nahi mila.");
      if (state.drawnCardId && card.id !== state.drawnCardId) throw new Error("Draw ke baad sirf naya drawn card play kar sakte ho.");
      const face = activeFace(card, state.side);
      const top = activeFace(state.discard[state.discard.length - 1], state.side);
      const playable = face.color === "wild" || face.color === state.currentColor || face.value === top.value;
      if (!playable) throw new Error("Ye card abhi play nahi ho sakta.");
      const penalties = ["draw2", "draw4", "wildReverseDraw4", "wild6", "wild10"];
      if (state.drawPending < 0) throw new Error("Colour roulette/draw-until-colour resolve karna zaroori hai.");
      if (state.drawPending > 0 && (state.gameId !== "uno-no-mercy" || !penalties.includes(face.kind))) throw new Error("Draw penalty ko draw karo; stacking sirf No Mercy mein allowed hai.");
      if (["wild4","wildDraw2"].includes(face.kind) && hand.some(c => activeFace(c, state.side).color === state.currentColor)) throw new Error("Wild draw card tabhi play karo jab current colour ka card na ho.");
      if (face.color === "wild" && face.kind !== "wildRoulette") {
        const wildOptions = state.gameId === "uno-flip" && state.side === "dark" ? ["pink","teal","orange","purple"] : COLORS;
        if (!wildOptions.includes(action.color)) throw new Error("Active side ka valid wild colour choose karo.");
      }
      if (state.drawPending > 0 && state.gameId === "uno-no-mercy" && penalties.includes(face.kind)) {
        const amount = ({draw2:2,wild4:4,draw4:4,draw6:6,draw10:10,wild6:6,wild10:10,wildReverseDraw4:4}[face.kind] || 0);
        if (amount < (state.pendingStackLast || state.drawPending)) throw new Error("Stack karne ke liye equal ya higher draw card chahiye.");
      }
      hand.splice(action.cardIndex, 1);
      state.drawnCardId = null;
      state.discard.push(card);
      if (face.kind === "flip") {
        state.side = state.side === "dark" ? "light" : "dark";
        state.currentColor = activeFace(card, state.side).color;
      } else {
        state.currentColor = face.color === "wild" ? ( ["red","yellow","green","blue","pink","teal","orange","purple"].includes(action.color) ? action.color : (state.side === "dark" ? "pink" : "red")) : face.color;
      }
      const count = state.players.length;
      const drawAmounts = { draw2:2, wild4:4, draw4:4, draw6:6, draw10:10, wild6:6, wild10:10, wildReverseDraw4:4, draw1:1, draw5:5, wildDraw2:2 };
      if (drawAmounts[face.kind]) {
        state.drawPending += drawAmounts[face.kind];
        state.pendingStackLast = drawAmounts[face.kind];
      }
      if (state.gameId === "uno-no-mercy" && face.kind === "number" && face.value === "7") {
        if (!action.targetId || !state.players.includes(action.targetId) || action.targetId === userId || state.eliminated?.includes(action.targetId)) throw new Error("7 play karne par active opponent ko hand swap ke liye choose karo.");
        const targetIndex = state.players.indexOf(action.targetId);
        [state.hands[playerIndex], state.hands[targetIndex]] = [state.hands[targetIndex], state.hands[playerIndex]];
      }
      if (state.gameId === "uno-no-mercy" && face.kind === "number" && face.value === "0") {
        // Eliminated players' hands are set aside; only active players pass hands.
        const oldHands = state.hands.map(hand => hand);
        const activeIndexes = state.players.map((id, index) => state.eliminated?.includes(id) ? -1 : index).filter(index => index >= 0);
        if (activeIndexes.length > 1) {
          activeIndexes.forEach((destinationIndex, activePosition) => {
            const sourcePosition = nextIndex(activePosition, -state.direction, activeIndexes.length);
            state.hands[destinationIndex] = oldHands[activeIndexes[sourcePosition]];
          });
        }
      }
      if (face.kind === "discardAll") {
        state.hands[playerIndex] = hand.filter(c => activeFace(c, state.side).color !== state.currentColor);
        if (!state.hands[playerIndex].length) { state.winner=userId; state.status="finished"; state.message="Discard all! Winner: "+userId; return state; }
      }
      const finalHand = state.hands[playerIndex];
      if (finalHand.length === 0) {
        state.winner = userId; state.status = "finished"; state.message = "UNO! Winner: " + userId; return state;
      }
      state.pendingUnoPlayer = finalHand.length === 1 ? userId : null;
      state.unoCalled = false;
      if (face.kind === "wildRoulette") state.drawPending = -1;
      if (face.kind === "wildDrawColor") state.drawPending = -2;
      if (face.kind === "wildReverseDraw4") state.direction *= -1;
      if (face.kind === "skipAll") state.turn = playerIndex;
      else if (face.kind === "skip") state.turn = nextUnoIndex(state, nextIndex(state.turn, state.direction, count), state.direction);
      else if (face.kind === "reverse" || face.kind === "wildReverseDraw4") {
        if (face.kind === "reverse") state.direction *= -1;
        state.turn = count === 2 ? playerIndex : nextUnoIndex(state, playerIndex, state.direction);
      } else state.turn = nextUnoIndex(state, playerIndex, state.direction);
      state.message = `${face.value} played. Current colour: ${state.currentColor}.`;
      return state;
    }
    throw new Error("Invalid UNO action");
  }

  if (state.gameId === "ludo") {
    if (playerIndex !== state.turn) throw new Error("Abhi tumhari turn nahi hai.");
    if (action.type === "roll") {
      if (state.dice !== null) throw new Error("Pehle rolled dice use karo.");
      state.dice = Math.floor(Math.random() * 6) + 1;
      state.rollCount = (state.rollCount || 0) + 1;
      state.sixCount = state.dice === 6 ? state.sixCount + 1 : 0;
      state.invalidRoll = state.sixCount >= 3;
      state.message = state.invalidRoll ? "Third consecutive six! Is roll ka move cancel ho gaya." : `${state.dice} aaya! Token select karo.`;
      return state;
    }
    if (action.type === "skip" && state.dice !== null) {
      const d=state.dice, own=state.tokens[playerIndex];
      const legal=own.some(pos => pos===-1 ? d===6 : pos<57 && pos+d<=57);
      if (!state.invalidRoll && legal) throw new Error("Legal token move available hai.");
      state.dice=null; state.invalidRoll=false; state.sixCount=0; state.turn=nextIndex(state.turn,1,state.players.length); state.message="Move cancel/pass. Next player ki turn."; return state;
    }
    if (action.type === "move") {
      if (state.dice === null) throw new Error("Pehle dice roll karo.");
      if (state.invalidRoll) throw new Error("Third consecutive six ka move cancel ho chuka hai.");
      const tokens = state.tokens[playerIndex];
      if (!Number.isInteger(action.tokenIndex) || action.tokenIndex < 0 || action.tokenIndex >= 4) throw new Error("Valid token select karo.");
      const pos = tokens[action.tokenIndex];
      const dice = state.dice;
      if (pos === -1 && dice !== 6) throw new Error("Token nikalne ke liye six chahiye.");
      if (pos >= 57) throw new Error("Token already home hai.");
      const next = pos === -1 ? 0 : pos + dice;
      if (next > 57) throw new Error("Exact number chahiye home pahunchne ke liye.");
      tokens[action.tokenIndex] = next;
      let captured = false;
      if (next < 52) {
        const startOffset = [0, 13, 26, 39][playerIndex];
        const boardIndex = (startOffset + next) % 52;
        const safe = [0, 8, 13, 21, 26, 34, 39, 47].includes(boardIndex);
        if (!safe) {
          state.tokens.forEach((other, oi) => {
            if (oi === playerIndex) return;
            other.forEach((otherPos, ti) => {
              if (otherPos >= 0 && otherPos < 52 && ( [0,13,26,39][oi] + otherPos) % 52 === boardIndex) {
                other[ti] = -1;
                captured = true;
              }
            });
          });
        }
      }
      const gotSix = dice === 6;
      const reachedHome = next === 57;
      state.dice = null; state.invalidRoll=false; if (!gotSix) state.sixCount=0;
      if (tokens.every(p => p === 57)) {
        state.status = "finished"; state.winner = userId; state.message = "Ludo winner: " + userId; return state;
      }
      if (!gotSix && !captured && !reachedHome) state.turn = nextIndex(state.turn, 1, state.players.length);
      state.message = gotSix ? "Six! Ek aur turn." : captured ? "Token capture! Bonus turn." : reachedHome ? "Token home! Bonus turn." : "Move complete.";
      return state;
    }
    throw new Error("Invalid Ludo action");
  }

  if (state.gameId === "raja-mantri") {
    if (action.type === "reveal") {
      if (!state.revealed.includes(userId)) state.revealed.push(userId);
      return state;
    }
    if (action.type === "guess") {
      if (state.phase !== "reveal") throw new Error("Guess already complete.");
      if (state.revealed.length !== state.players.length) throw new Error("Sab players pehle apna role privately reveal karein.");
      if (state.roles[userId] !== "Sipahi") throw new Error("Sirf Sipahi guess kar sakta hai.");
      const target = action.targetId;
      if (!state.players.includes(target) || state.roles[target] === "Sipahi") throw new Error("Invalid guess.");
      const correct = state.roles[target] === "Chor";
      const raja = state.players.find(id => state.roles[id] === "Raja");
      const mantri = state.players.find(id => state.roles[id] === "Mantri");
      const chor = state.players.find(id => state.roles[id] === "Chor");
      state.scores[raja] += 500;
      state.scores[mantri] += 200;
      if (correct) state.scores[userId] += 100;
      else state.scores[chor] += 100;
      state.phase = "finished"; state.status = "finished";
      state.guessBy = userId; state.guessTarget = target;
      state.winner = correct ? userId : chor;
      state.message = correct ? "Sipahi ne Chor pakad liya!" : "Sipahi ka guess galat tha. Chor ko 100 points.";
      return state;
    }
    throw new Error("Invalid Raja-Mantri action");
  }

  if (state.gameId === "sola-parchi") {
    if (playerIndex !== state.turn) throw new Error("Abhi tumhari turn nahi hai.");
    if (action.type !== "pass") throw new Error("Invalid action.");
    const hand = state.hands[userId];
    const card = hand[action.cardIndex];
    if (!card) throw new Error("Card select karo.");
    hand.splice(action.cardIndex, 1);
    const next = nextIndex(playerIndex, 1, state.players.length);
    const nextId = state.players[next];
    state.hands[nextId].push(card);
    const winner = state.players.find(id => {
      const h = state.hands[id];
      return h.length >= 4 && h.some(c => h.filter(x => x.fruit === c.fruit).length === 4);
    });
    if (winner) {
      state.winner = winner; state.status = "finished"; state.message = "Four of a kind! Winner: " + winner;
    } else {
      state.turn = next;
      state.message = "Card pass ho gaya. Next player ki turn.";
    }
    return state;
  }
  throw new Error("Unsupported game action");
}
