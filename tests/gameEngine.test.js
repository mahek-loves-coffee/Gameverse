import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, applyGameAction, publicGameState, privateGameState } from "../shared/gameEngine.js";

const players = ["p1","p2","p3","p4"].map(userId => ({userId}));

test("UNO state keeps hands private in public snapshot", () => {
  const state = createGameState("uno", players.slice(0,2));
  const pub = publicGameState(state);
  assert.equal(pub.hands, undefined);
  assert.equal(pub.deck, undefined);
  assert.equal(privateGameState(state,"p1").hand.length, 7);
});

test("Ludo dice action only works for active player", () => {
  let state = createGameState("ludo", players.slice(0,2));
  assert.throws(() => applyGameAction(state,"p2",{type:"roll"}), /turn/i);
  state = applyGameAction(state,"p1",{type:"roll"});
  assert.ok(state.dice >= 1 && state.dice <= 6);
});

test("Ludo publishes a new roll counter and allows same-face dice animation to replay", () => {
  let state = createGameState("ludo", players.slice(0,2));
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.4;
    assert.equal(state.rollCount, 0);
    state = applyGameAction(state, "p1", { type: "roll" });
    const firstFace = state.dice;
    assert.equal(state.rollCount, 1);
    state.dice = null;
    state.turn = 1;
    state = applyGameAction(state, "p2", { type: "roll" });
    assert.equal(state.dice, firstFace, "the deterministic setup should repeat the same face");
    assert.equal(state.rollCount, 2);
    assert.equal(publicGameState(state).rollCount, 2);
  } finally {
    Math.random = originalRandom;
  }
});


test("Ludo rejects invalid token indexes without corrupting state", () => {
  let state = createGameState("ludo", players.slice(0, 2));
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.99;
    state = applyGameAction(state, "p1", { type: "roll" });
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(state.dice, 6);
  for (const tokenIndex of [-1, 4, 1.5, "0", null]) {
    assert.throws(() => applyGameAction(state, "p1", { type: "move", tokenIndex }), /valid token/i);
  }
  assert.deepEqual(state.tokens[0], [-1, -1, -1, -1]);
});

test("Raja Mantri roles remain private until round finishes", () => {
  const state = createGameState("raja-mantri", players);
  assert.equal(publicGameState(state).roles, undefined);
  assert.ok(["Raja","Mantri","Sipahi","Chor"].includes(privateGameState(state,"p1").role));
});

test("Sola Parchi starts with four cards per player and passes one", () => {
  let state = createGameState("sola-parchi", players);
  assert.equal(privateGameState(state,"p1").hand.length, 4);
  state = applyGameAction(state,"p1",{type:"pass",cardIndex:0});
  assert.equal(state.hands.p1.length, 3);
  assert.equal(state.hands.p2.length, 5);
});

test("UNO Flip starts with two-sided cards and exposes the active face", () => {
  const state = createGameState("uno-flip", players.slice(0,2));
  assert.equal(state.side, "light");
  assert.ok(state.hands[0].some(card => card.faces?.dark));
  assert.ok(publicGameState(state).activeDiscard.color);
  assert.ok(privateGameState(state,"p1").hand[0].color);
});

test("UNO No Mercy deck contains special penalty cards", () => {
  const state = createGameState("uno-no-mercy", players.slice(0,2));
  const all = [...state.deck, ...state.hands.flat(), ...state.discard];
  assert.ok(all.some(card => card.kind === "wild10"));
  assert.ok(all.some(card => card.kind === "discardAll"));
  assert.equal(all.length, 168);
});

test("Raja Mantri correct Sipahi guess applies the agreed scoring", () => {
  let state = createGameState("raja-mantri", players);
  const sipahi = state.players.find(id => state.roles[id] === "Sipahi");
  const chor = state.players.find(id => state.roles[id] === "Chor");
  for (const id of state.players) state = applyGameAction(state, id, { type: "reveal" });
  state = applyGameAction(state, sipahi, { type: "guess", targetId: chor });
  const raja = state.players.find(id => state.roles[id] === "Raja");
  const mantri = state.players.find(id => state.roles[id] === "Mantri");
  assert.equal(state.scores[raja], 500);
  assert.equal(state.scores[mantri], 200);
  assert.equal(state.scores[sipahi], 100);
  assert.equal(state.scores[chor], 0);
});

test("Raja Mantri wrong Sipahi guess awards Chor 100 points", () => {
  let state = createGameState("raja-mantri", players);
  const sipahi = state.players.find(id => state.roles[id] === "Sipahi");
  const nonChor = state.players.find(id => state.roles[id] !== "Chor" && state.roles[id] !== "Sipahi");
  const chor = state.players.find(id => state.roles[id] === "Chor");
  for (const id of state.players) state = applyGameAction(state, id, { type: "reveal" });
  state = applyGameAction(state, sipahi, { type: "guess", targetId: nonChor });
  assert.equal(state.scores[sipahi], 0);
  assert.equal(state.scores[chor], 100);
});

test("UNO No Mercy eliminates a player at 25 cards", () => {
  let state = createGameState("uno-no-mercy", players.slice(0,2));
  state.hands[0] = Array.from({length:24}, (_,i)=>({id:`test-${i}`,color:"red",value:"1",kind:"number"}));
  state.drawPending = 1;
  state.turn = 0;
  state = applyGameAction(state,"p1",{type:"draw"});
  assert.ok(state.eliminated.includes("p1"));
  assert.equal(state.status,"finished");
  assert.equal(state.winner,"p2");
});

test("UNO Flip flip card changes the active side", () => {
  let state = createGameState("uno-flip", players.slice(0,2));
  const color = state.currentColor;
  state.hands[0][0] = { id: "forced-flip", faces: {
    light: { color, value: "flip", kind: "flip" },
    dark: { color: "pink", value: "flip", kind: "flip" }
  }};
  state = applyGameAction(state,"p1",{type:"play",cardIndex:0,color:"red"});
  assert.equal(state.side,"dark");
  assert.equal(state.currentColor,"pink");
});

test("Player limits match the requested room sizes", async () => {
  const { GAME_META } = await import("../shared/gameEngine.js");
  assert.deepEqual([GAME_META.uno.min, GAME_META.uno.max], [2, 8]);
  assert.deepEqual([GAME_META["uno-flip"].min, GAME_META["uno-flip"].max], [2, 8]);
  assert.deepEqual([GAME_META["uno-no-mercy"].min, GAME_META["uno-no-mercy"].max], [2, 8]);
  assert.deepEqual([GAME_META.ludo.min, GAME_META.ludo.max], [2, 4]);
  assert.deepEqual([GAME_META["raja-mantri"].min, GAME_META["raja-mantri"].max], [4, 4]);
  assert.deepEqual([GAME_META["sola-parchi"].min, GAME_META["sola-parchi"].max], [4, 8]);
});

test("Sola Parchi adds one complete fruit set for every extra player", () => {
  for (let count = 4; count <= 8; count++) {
    const state = createGameState("sola-parchi", Array.from({length: count}, (_, i) => ({userId:`u${i}`})));
    const deck = [...state.players.flatMap(id => state.hands[id])];
    assert.equal(deck.length, count * 4);
    const fruitCounts = new Map();
    for (const chit of deck) fruitCounts.set(chit.fruit, (fruitCounts.get(chit.fruit) || 0) + 1);
    assert.equal(fruitCounts.size, count);
    assert.ok([...fruitCounts.values()].every(n => n === 4));
  }
});


test("UNO Flip keeps the same number on both faces", () => {
  const state = createGameState("uno-flip", players.slice(0,2));
  const card = [...state.deck, ...state.hands.flat(), ...state.discard].find(c => c.faces?.light?.kind === "number" && c.faces.light.value !== "0");
  assert.equal(card.faces.light.value, card.faces.dark.value);
});

test("UNO normal draw lets the player play the drawn card before ending turn", () => {
  let state = createGameState("uno", players.slice(0,2));
  state.hands[0] = [{id:"hold",color:"blue",value:"2",kind:"number"},{id:"hold2",color:"green",value:"8",kind:"number"}];
  state.deck = [{id:"drawn",color:state.currentColor,value:"5",kind:"number"}];
  state.turn = 0;
  state = applyGameAction(state,"p1",{type:"draw"});
  assert.equal(state.turn,0);
  assert.equal(state.drawnCardId,"drawn");
  state = applyGameAction(state,"p1",{type:"play",cardIndex:2,color:"red"});
  assert.equal(state.turn,1);
  assert.equal(state.hands[0].length,2);
  assert.equal(state.drawnCardId,null);
});

test("UNO No Mercy deck has the official 168-card structure", () => {
  const state = createGameState("uno-no-mercy", players.slice(0,2));
  const cards = [...state.deck,...state.hands.flat(),...state.discard];
  assert.equal(cards.length,168);
  assert.equal(cards.filter(c=>c.kind==="wildRoulette").length,4);
  assert.equal(cards.filter(c=>c.kind==="wildReverseDraw4").length,4);
});

test("UNO No Mercy stacking only allows an equal or higher draw value", () => {
  let state = createGameState("uno-no-mercy", players.slice(0,2));
  const color = state.currentColor;
  state.hands[0] = [{id:"plus4",color,value:"+4",kind:"draw4"},{id:"p1extra",color:"blue",value:"3",kind:"number"}];
  state.hands[1] = [{id:"plus2",color,value:"+2",kind:"draw2"},{id:"plus6",color:"wild",value:"+6",kind:"wild6"},{id:"p2extra",color:"green",value:"8",kind:"number"}];
  state.turn = 0;
  state = applyGameAction(state,"p1",{type:"play",cardIndex:0,color:"red"});
  assert.equal(state.drawPending,4);
  assert.throws(()=>applyGameAction(state,"p2",{type:"play",cardIndex:0,color:"red"}),/equal ya higher/i);
  state = applyGameAction(state,"p2",{type:"play",cardIndex:1,color:"red"});
  assert.equal(state.drawPending,10);
});

test("createGameState rejects invalid player counts", () => {
  assert.throws(()=>createGameState("ludo",players.slice(0,1)),/2–4/);
  assert.throws(()=>createGameState("raja-mantri",players.slice(0,3)),/4 players/);
});


test("UNO Flip uses a 112-card double-sided deck", () => {
  const state = createGameState("uno-flip", players.slice(0,2));
  assert.equal([...state.deck,...state.hands.flat(),...state.discard].length,112);
});

test("UNO call and catch actions resolve the two-card penalty", () => {
  let state=createGameState("uno",players.slice(0,2));
  state.hands[0]=[{id:"last",color:state.currentColor,value:"5",kind:"number"},{id:"spare",color:"blue",value:"2",kind:"number"}];
  state.turn=0;
  state=applyGameAction(state,"p1",{type:"play",cardIndex:0,color:"red"});
  assert.equal(state.pendingUnoPlayer,"p1");
  state=applyGameAction(state,"p2",{type:"catchUno"});
  assert.equal(state.hands[0].length,3);
  assert.equal(state.pendingUnoPlayer,null);
});


test("Ludo third consecutive six cancels the move and passes turn", () => {
  let state=createGameState("ludo",players.slice(0,2));
  state.sixCount=2; state.turn=0;
  const original=Math.random; Math.random=()=>0.999;
  try { state=applyGameAction(state,"p1",{type:"roll"}); } finally { Math.random=original; }
  assert.equal(state.dice,6);
  assert.equal(state.invalidRoll,true);
  state=applyGameAction(state,"p1",{type:"skip"});
  assert.equal(state.turn,1);
  assert.equal(state.invalidRoll,false);
});

test("Ludo capture grants a bonus turn", () => {
  let state=createGameState("ludo",players.slice(0,2));
  state.turn=0; state.dice=1;
  state.tokens[0][0]=5;
  state.tokens[1][0]=45;
  state=applyGameAction(state,"p1",{type:"move",tokenIndex:0});
  assert.equal(state.tokens[1][0],-1);
  assert.equal(state.turn,0);
  assert.match(state.message,/capture/i);
});


test("Classic UNO does not allow draw-card stacking", () => {
  let state=createGameState("uno",players.slice(0,2));
  const color=state.currentColor;
  state.hands[0]=[{id:"plus2",color,value:"draw2",kind:"draw2"},{id:"spare",color:"blue",value:"3",kind:"number"}];
  state.hands[1]=[{id:"plus2b",color,value:"draw2",kind:"draw2"},{id:"spare2",color:"green",value:"8",kind:"number"}];
  state=applyGameAction(state,"p1",{type:"play",cardIndex:0,color:"red"});
  assert.throws(()=>applyGameAction(state,"p2",{type:"play",cardIndex:0,color:"red"}),/stacking sirf No Mercy/i);
});


test("UNO No Mercy eliminates a player at 25 during draw-until-playable", () => {
  let state=createGameState("uno-no-mercy",players.slice(0,2));
  state.turn=0;
  state.hands[0]=Array.from({length:24},(_,i)=>({id:`held-${i}`,color:"red",value:"1",kind:"number"}));
  state.currentColor="blue";
  state.discard=[{id:"top",color:"blue",value:"9",kind:"number"}];
  state.deck=[{id:"unplayable",color:"red",value:"3",kind:"number"},{id:"playable",color:"blue",value:"4",kind:"number"}];
  state=applyGameAction(state,"p1",{type:"draw"});
  assert.ok(state.eliminated.includes("p1"));
  assert.equal(state.status,"finished");
  assert.equal(state.winner,"p2");
});


test("Ludo preserves consecutive-six count across bonus moves", () => {
  let state=createGameState("ludo",players.slice(0,2));
  state.sixCount=1; state.turn=0;
  const original=Math.random; Math.random=()=>0.999;
  try { state=applyGameAction(state,"p1",{type:"roll"}); } finally { Math.random=original; }
  assert.equal(state.sixCount,2);
  state=applyGameAction(state,"p1",{type:"move",tokenIndex:0});
  assert.equal(state.sixCount,2);
  const original2=Math.random; Math.random=()=>0.999;
  try { state=applyGameAction(state,"p1",{type:"roll"}); } finally { Math.random=original2; }
  assert.equal(state.invalidRoll,true);
});

test("UNO No Mercy keeps the selected variant ID in the match state", () => {
  const state = createGameState("uno-no-mercy", players.slice(0, 3));
  assert.equal(state.gameId, "uno-no-mercy");
  assert.equal(state.deck.length + state.hands.flat().length + state.discard.length, 168);
});

test("UNO No Mercy 7 swaps hands with the chosen active opponent", () => {
  let state = createGameState("uno-no-mercy", players.slice(0, 3));
  state.turn = 0;
  state.currentColor = "red";
  state.discard = [{ id: "top", color: "red", value: "3", kind: "number" }];
  state.hands[0] = [{ id: "seven", color: "red", value: "7", kind: "number" }, { id: "stay", color: "blue", value: "4", kind: "number" }];
  state.hands[1] = [
    { id: "opponent-card", color: "green", value: "8", kind: "number" },
    { id: "opponent-card-2", color: "blue", value: "5", kind: "number" },
    { id: "opponent-card-3", color: "yellow", value: "2", kind: "number" }
  ];
  state = applyGameAction(state, "p1", { type: "play", cardIndex: 0, color: "red", targetId: "p2" });
  assert.equal(state.hands[0][0].id, "opponent-card");
  assert.equal(state.hands[0].length, 3);
  assert.equal(state.hands[1][0].id, "stay");
  assert.equal(state.pendingUnoPlayer, null, "7 swap must not leave a stale UNO call when the chosen hand has 3 cards");
});

test("UNO No Mercy 0 passes hands in the current direction", () => {
  let state = createGameState("uno-no-mercy", players);
  state.turn = 0;
  state.currentColor = "red";
  state.discard = [{ id: "top", color: "red", value: "3", kind: "number" }];
  state.hands = [
    [{ id: "zero", color: "red", value: "0", kind: "number" }, { id: "p1-kept", color: "blue", value: "1", kind: "number" }],
    [{ id: "p2-hand", color: "green", value: "2", kind: "number" }],
    [{ id: "p3-hand", color: "yellow", value: "3", kind: "number" }],
    [{ id: "p4-hand", color: "blue", value: "4", kind: "number" }]
  ];
  state = applyGameAction(state, "p1", { type: "play", cardIndex: 0, color: "red" });
  assert.equal(state.hands[0][0].id, "p4-hand");
  assert.equal(state.hands[1][0].id, "p1-kept");
  assert.equal(state.hands[2][0].id, "p2-hand");
  assert.equal(state.hands[3][0].id, "p3-hand");
  assert.equal(state.pendingUnoPlayer, "p1", "UNO call should reflect the hand received after passing");
});

test("UNO No Mercy 0 passes hands counter-clockwise when direction is reversed", () => {
  let state = createGameState("uno-no-mercy", players);
  state.turn = 0;
  state.direction = -1;
  state.currentColor = "red";
  state.discard = [{ id: "top", color: "red", value: "3", kind: "number" }];
  state.hands = [
    [{ id: "zero", color: "red", value: "0", kind: "number" }, { id: "p1-kept", color: "blue", value: "1", kind: "number" }],
    [{ id: "p2-hand", color: "green", value: "2", kind: "number" }],
    [{ id: "p3-hand", color: "yellow", value: "3", kind: "number" }],
    [{ id: "p4-hand", color: "blue", value: "4", kind: "number" }]
  ];
  state = applyGameAction(state, "p1", { type: "play", cardIndex: 0, color: "red" });
  assert.equal(state.hands[0][0].id, "p2-hand");
  assert.equal(state.hands[1][0].id, "p3-hand");
  assert.equal(state.hands[2][0].id, "p4-hand");
  assert.equal(state.hands[3][0].id, "p1-kept");
});

test("UNO No Mercy Wild Reverse Draw 4 sends a two-player penalty back to its player", () => {
  let state = createGameState("uno-no-mercy", players.slice(0, 2));
  state.turn = 0;
  state.currentColor = "red";
  state.discard = [{ id: "top", color: "red", value: "3", kind: "number" }];
  state.hands[0] = [
    { id: "wild-reverse-four", color: "wild", value: "+4 REVERSE", kind: "wildReverseDraw4" },
    { id: "spare", color: "blue", value: "2", kind: "number" }
  ];
  state = applyGameAction(state, "p1", { type: "play", cardIndex: 0, color: "yellow" });
  assert.equal(state.direction, -1);
  assert.equal(state.turn, 0);
  assert.equal(state.drawPending, 4);
  const before = state.hands[0].length;
  state = applyGameAction(state, "p1", { type: "draw" });
  assert.equal(state.hands[0].length, before + 4);
  assert.equal(state.turn, 1);
});

test("UNO No Mercy 0 does not pass an eliminated player's set back into play", () => {
  let state = createGameState("uno-no-mercy", players);
  state.turn = 0;
  state.currentColor = "red";
  state.discard = [{ id: "top", color: "red", value: "3", kind: "number" }];
  state.eliminated = ["p4"];
  state.hands = [
    [{ id: "zero", color: "red", value: "0", kind: "number" }, { id: "p1-kept", color: "blue", value: "1", kind: "number" }],
    [{ id: "p2-hand", color: "green", value: "2", kind: "number" }],
    [{ id: "p3-hand", color: "yellow", value: "3", kind: "number" }],
    Array.from({ length: 25 }, (_, i) => ({ id: `out-${i}`, color: "blue", value: "4", kind: "number" }))
  ];
  const eliminatedHand = state.hands[3];
  state = applyGameAction(state, "p1", { type: "play", cardIndex: 0, color: "red" });
  assert.equal(state.hands[0][0].id, "p3-hand");
  assert.equal(state.hands[1][0].id, "p1-kept");
  assert.equal(state.hands[2][0].id, "p2-hand");
  assert.deepEqual(state.hands[3], eliminatedHand);
  assert.equal(state.hands[3].length, 25);
});

test("UNO No Mercy Colour Roulette applies the 25-card Mercy knockout", () => {
  let state = createGameState("uno-no-mercy", players.slice(0, 2));
  state.turn = 0;
  state.currentColor = "red";
  state.discard = [{ id: "top", color: "red", value: "3", kind: "number" }];
  state.hands[0] = [{ id: "roulette", color: "wild", value: "ROULETTE", kind: "wildRoulette" }, { id: "spare", color: "blue", value: "2", kind: "number" }];
  state.hands[1] = Array.from({ length: 24 }, (_, i) => ({ id: `holder-${i}`, color: "green", value: "5", kind: "number" }));
  state.deck = [{ id: "roulette-match", color: "blue", value: "8", kind: "number" }];
  state = applyGameAction(state, "p1", { type: "play", cardIndex: 0, color: "red" });
  state = applyGameAction(state, "p2", { type: "draw", color: "blue" });
  assert.ok(state.eliminated.includes("p2"));
  assert.equal(state.status, "finished");
  assert.equal(state.winner, "p1");
});


test("UNO No Mercy empty draw pile never marks an old hand card as newly drawn", () => {
  let state = createGameState("uno-no-mercy", players.slice(0, 2));
  state.turn = 0;
  state.currentColor = "red";
  state.discard = [{ id: "only-top", color: "red", value: "3", kind: "number" }];
  state.hands[0] = [{ id: "old-card", color: "blue", value: "8", kind: "number" }];
  state.deck = [];
  state = applyGameAction(state, "p1", { type: "draw" });
  assert.equal(state.hands[0].length, 1);
  assert.equal(state.drawnCardId, null);
  assert.equal(state.turn, 1);
});
