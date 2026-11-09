import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Dice5, Send, Trophy } from "lucide-react";
import { GAME_META } from "../../shared/gameEngine";
import FruitIllustration from "./FruitIllustration";
import PlayerArena from "./PlayerArena";

const COLORS = { red:"#ed5268", yellow:"#f4bf45", green:"#3bbd89", blue:"#4d8ee9", pink:"#e76ab6", teal:"#39bfc2", orange:"#f28b42", purple:"#8459d8", wild:"#17151f" };

function cardFaceCopy(card, gameId) {
  const noMercy = gameId === "uno-no-mercy";
  const map = {
    number: noMercy && card.value === "7" ? ["7", "SWAP HAND", "CHOOSE A PLAYER"]
      : noMercy && card.value === "0" ? ["0", "PASS HANDS", "EVERY PLAYER PASSES"]
      : [card.value, "NUMBER CARD", "MATCH COLOUR OR NUMBER"],
    skip: ["⊘", "SKIP", "NEXT PLAYER LOSES A TURN"],
    reverse: ["⇄", "REVERSE", "CHANGE PLAY DIRECTION"],
    draw2: ["+2", "DRAW TWO", "DRAW 2 · LOSE TURN"],
    draw4: ["+4", "DRAW FOUR", "DRAW 4 · LOSE TURN"],
    wild: ["WILD", "CHOOSE COLOUR", "PICK THE NEXT COLOUR"],
    wild4: ["+4", "WILD DRAW FOUR", "DRAW 4 · LOSE TURN"],
    draw1: ["+1", "DRAW ONE", "DRAW 1 · LOSE TURN"],
    draw5: ["+5", "DRAW FIVE", "DRAW 5 · LOSE TURN"],
    wildDraw2: ["+2", "WILD DRAW TWO", "DRAW 2 · LOSE TURN"],
    flip: ["FLIP", "SWITCH SIDES", "TURN THE DECK OVER"],
    skipAll: ["⊘", "SKIP EVERYONE", "YOU PLAY AGAIN"],
    discardAll: ["✂", "DISCARD ALL", "DISCARD CARDS OF THIS COLOUR"],
    wildReverseDraw4: ["↶ +4", "REVERSE +4", "REVERSE · DRAW 4"],
    wild6: ["+6", "WILD DRAW SIX", "DRAW 6 · LOSE TURN"],
    wild10: ["+10", "WILD DRAW TEN", "DRAW 10 · LOSE TURN"],
    wildRoulette: ["◎", "COLOUR ROULETTE", "CHOOSE A COLOUR · DRAW TO MATCH"],
    wildDrawColor: ["◉", "DRAW COLOUR", "DRAW UNTIL COLOUR"]
  };
  const result = map[card?.kind] || [String(card?.value ?? "?"), "ACTION CARD", "MATCH COLOUR OR SYMBOL"];
  if (!noMercy && card?.kind === "number") return [String(card.value), "", ""];
  if (!noMercy && card?.kind === "skipAll") return ["ALL", "SKIP ALL", "YOU PLAY AGAIN"];
  if (!noMercy && card?.kind === "discardAll") return ["ALL", "DISCARD ALL", ""];
  return result;
}

function UnoCardFace({ card, gameId, large = false }) {
  const [symbol, title] = cardFaceCopy(card, gameId);
  const noMercy = gameId === "uno-no-mercy";
  const variantClass = noMercy ? "variant-no-mercy" : gameId === "uno-flip" ? "variant-flip" : "variant-normal";
  const colorName = card?.color || "wild";
  const titleText = [colorName, title || "number", symbol].filter(Boolean).join(" ");
  return <div className={`uno-card-face ${variantClass} ${colorName === "wild" ? "card-is-wild" : ""} ${large ? "is-large" : ""}`} style={{ "--card-color": COLORS[colorName] || COLORS.wild }} role="img" aria-label={titleText}>
    <span className="uno-card-corner top"><b>{symbol}</b></span>
    <div className={`uno-card-emblem ${card?.kind === "number" ? "number-symbol" : "action-symbol"}`}><strong>{symbol}</strong></div>
    <span className="uno-card-corner bottom"><b>{symbol}</b></span>
    {colorName === "wild" && <span className="uno-wild-mark" aria-hidden="true">✦</span>}
  </div>;
}

function UnoBoard({ game, me, privateState, act, pending }) {
  const [wildColor,setWildColor]=useState("red");
  const [swapTarget,setSwapTarget]=useState("");
  const wildColors = game.gameId === "uno-flip" && game.side === "dark" ? ["pink","teal","orange","purple"] : ["red","yellow","green","blue"];
  const activeWildColor = wildColors.includes(wildColor) ? wildColor : wildColors[0];
  useEffect(()=>{if(!wildColors.includes(wildColor))setWildColor(wildColors[0]);},[game.side,game.gameId]);
  const hand=privateState?.hand||[];
  const isEliminated=game.eliminated?.includes(me.userId)||false;
  const isMyTurn=!isEliminated&&game.players[game.turn]===me.userId;
  const rawTop=game.discard?.[game.discard.length-1];
  const top=game.activeDiscard || rawTop;
  const topCardKey=rawTop?.id || `${top?.color||"wild"}-${top?.value||"card"}`;
  const isNoMercy=game.gameId==="uno-no-mercy";
  const canSwap=hand.some(card=>card.kind==="number"&&card.value==="7");
  const activeTargets=game.players.filter(id=>id!==me.userId&&!game.eliminated?.includes(id));
  useEffect(()=>{if(!activeTargets.some(id=>id===swapTarget))setSwapTarget("");},[game.players,game.eliminated,me.userId]);
  return <div className={`board-wrap uno-board ${isNoMercy?"no-mercy-board":""}`}>
    {isNoMercy&&<div className="no-mercy-rules"><span className="no-mercy-stamp">NO MERCY</span><span><b>STACK</b> +2 / +4 / +6 / +10</span><i/><span><b>7</b> swap hands</span><i/><span><b>0</b> pass hands</span><i/><span><b>25+</b> knockout</span></div>}
    {isNoMercy&&isEliminated&&<div className="mercy-eliminated-banner"><b>MERCY RULE · YOU'RE OUT</b><span>25 cards reached. Match ab continue hota rahega without your hand.</span></div>}
    <PlayerArena game={game} me={me} context="uno" />
    <div className="table-center"><div className="uno-pile"><span className="pile-label">DISCARD</span>{top&&<UnoCardFace key={topCardKey} card={top} gameId={game.gameId} large/>}<small>Current: <b>{game.currentColor}</b></small></div><div className="turn-badge">{game.players[game.turn]===me.userId?"YOUR TURN":`${game.playerInfo?.[game.players[game.turn]]?.username || game.players[game.turn]?.slice(0,7)}'s turn`}</div><p>{game.message}</p></div>
    <div className="hand-area"><div className="hand-head"><b>Your hand</b><span>{hand.length} cards{isNoMercy?" · 25 = knockout":""}</span></div><div className="uno-hand">{hand.map((card,i)=>{const needsSwapTarget=isNoMercy&&card.kind==="number"&&card.value==="7"&&!swapTarget;const copy=cardFaceCopy(card,game.gameId);return <button type="button" key={card.id} disabled={pending||!isMyTurn||needsSwapTarget} title={needsSwapTarget?"7 card ke liye pehle opponent select karo":copy.slice(1).filter(Boolean).join(" · ")} aria-label={`Play ${card.color} ${card.value}${needsSwapTarget?" — choose swap target first":""}`} className={`uno-card ${isNoMercy?"no-mercy-card":""}`} onClick={()=>act({type:"play",cardIndex:i,color:activeWildColor,targetId:swapTarget||undefined})}><UnoCardFace card={card} gameId={game.gameId}/></button>})}</div>
      <div className="uno-actions"><label>Wild colour <select value={activeWildColor} onChange={e=>setWildColor(e.target.value)}>{wildColors.map(c=><option key={c}>{c}</option>)}</select></label>{isNoMercy&&canSwap&&<label>7 · Swap hand with <select value={swapTarget} onChange={e=>setSwapTarget(e.target.value)}><option value="">Choose player</option>{activeTargets.map(id=><option key={id} value={id}>{game.playerInfo?.[id]?.username||id}</option>)}</select></label>}<button type="button" className="primary-btn" disabled={pending||!isMyTurn} onClick={()=>act({type:"draw",color:activeWildColor})}>{game.drawPending>0?`Draw ${game.drawPending} cards`:game.drawPending<0?"Resolve colour roulette":isNoMercy?"Draw until playable":"Draw card"}</button>{game.drawPending>0&&isNoMercy&&<span className="uno-stack-hint">Or stack an equal / higher penalty card.</span>}{game.drawnCardId&&<button type="button" className="outline-btn" disabled={pending||!isMyTurn} onClick={()=>act({type:"passTurn"})}>Pass turn</button>}{game.pendingUnoPlayer===me.userId&&<button type="button" className="uno-call-btn" disabled={pending} onClick={()=>act({type:"callUno"})}>UNO!</button>}{game.pendingUnoPlayer&&game.pendingUnoPlayer!==me.userId&&!game.unoCalled&&<button type="button" className="uno-catch-btn" disabled={pending} onClick={()=>act({type:"catchUno"})}>Catch UNO!</button>}</div>
    </div>

  </div>;
}

const LUDO_PATH = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
function LudoBoard({game,me,act,pending}) {
  const [selected,setSelected]=useState(0);
  const [movingToken,setMovingToken]=useState(null);
  const [tokenAnimationKey,setTokenAnimationKey]=useState(0);
  const previousTokens=useRef(game.tokens);
  useEffect(()=>{
    let changed=null;
    game.tokens?.forEach((row,pi)=>row.forEach((pos,ti)=>{if(previousTokens.current?.[pi]?.[ti]!==pos)changed=`${pi}-${ti}`;}));
    previousTokens.current=game.tokens;
    if(changed){setMovingToken(changed);setTokenAnimationKey(key=>key+1);const timer=setTimeout(()=>setMovingToken(null),520);return()=>clearTimeout(timer);}
  },[game.tokens]);
  const colours=["#ed5268","#4e8fe9","#f3bd42","#3dbb8a"];
  const current=game.players.indexOf(me.userId);
  const tokens=game.tokens||[];
  const dice=game.dice;
  return <div className="board-wrap ludo-board">
    <PlayerArena game={game} me={me} context="ludo" />
    <div className="ludo-top"><span className="turn-badge">{game.players[game.turn]===me.userId?"YOUR TURN":`${game.playerInfo?.[game.players[game.turn]]?.username || game.players[game.turn]?.slice(0,7)}'s turn`}</span><span>{game.message}</span></div>
    <div className="ludo-board-grid">
      <div className="ludo-home red-home">RED</div><div className="ludo-home green-home">GREEN</div><div className="ludo-home yellow-home">YELLOW</div><div className="ludo-home blue-home">BLUE</div>
      {LUDO_PATH.map(([x,y],i)=><div key={i} className="ludo-cell" style={{gridColumn:x+1,gridRow:y+1}}/> )}
      {tokens.map((arr,pi)=>arr.map((pos,ti)=>{
        let x,y;
        if(pos===-1){const bases=[[[1,1],[2,1],[1,2],[2,2]],[[1,12],[2,12],[1,13],[2,13]],[[12,12],[13,12],[12,13],[13,13]],[[12,1],[13,1],[12,2],[13,2]]];[x,y]=bases[pi][ti];}
        else if(pos>=52){const lane=[[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]][pi];[x,y]=lane[Math.min(5,pos-52)];}
        else {const idx=( [0,13,26,39][pi]+pos)%52;[x,y]=LUDO_PATH[idx];}
        const canMove = current===pi && game.turn===current && dice!==null && !game.invalidRoll && (pos===-1 ? dice===6 : pos<57 && pos+dice<=57);
        return <button type="button" key={`${pi}-${ti}-${movingToken===`${pi}-${ti}`?tokenAnimationKey:0}`} disabled={pending || current!==pi || dice===null || !canMove} className={`ludo-token ${canMove?"token-active":""} ${movingToken===`${pi}-${ti}`?"token-moving":""}`} style={{gridColumn:x+1,gridRow:y+1,background:colours[pi],zIndex:4+pi}} onClick={()=>{if(canMove&&!pending)act({type:"move",tokenIndex:ti});}} title={`${game.playerInfo?.[game.players[pi]]?.username||`Player ${pi+1}`} token ${ti+1}`}>{ti+1}</button>;
      }))}
      <div className="ludo-center">THE<br/>GAMEVERSE</div>
    </div>
    <div className="ludo-controls"><div key={game.rollCount ?? `${game.dice ?? "idle"}`} className={`dice-face ${dice!==null?"dice-landed":""}`}>{dice??"?"}</div><button type="button" className="primary-btn" disabled={pending||current!==game.turn||dice!==null} onClick={()=>act({type:"roll"})}><Dice5 size={17}/> Roll dice</button><span>Six aane par token bahar niklega. Exact roll se home.</span>{dice!==null&&(game.invalidRoll||!tokens[current]?.some(pos=>pos===-1?dice===6:pos<57&&pos+dice<=57))&&<button type="button" className="outline-btn" disabled={pending||current!==game.turn} onClick={()=>act({type:"skip"})}>{game.invalidRoll?"Third six · Cancel move":"No legal move · Pass turn"}</button>}</div>
  </div>;
}

function RajaBoard({game,me,privateState,act,pending}) {
  const [guess,setGuess]=useState("");
  const role=privateState?.role;
  const [shown,setShown]=useState(false);
  return <div className="board-wrap raja-board">
    <PlayerArena game={game} me={me} context="raja" />
    <div className="role-card"><span className="eyebrow">YOUR SECRET ROLE</span><div className={`role-seal ${shown?"is-revealed":""}`}>{shown?role?.[0]||"?":"?"}</div><h2>{shown?role:"Role hidden"}</h2><p>{shown?"Apna role kisi ko mat dikhana.": "Only you can reveal your role on this screen."}</p>{!shown&&<button type="button" className="primary-btn" disabled={pending} onClick={()=>{setShown(true);act({type:"reveal"});}}>Reveal my role</button>}</div>

    {role==="Sipahi"&&game.phase==="reveal"&&<div className="guess-panel"><h3>Who is the Chor?</h3><select value={guess} onChange={e=>setGuess(e.target.value)}><option value="">Choose a player</option>{game.players.filter(id=>id!==me.userId).map(id=><option key={id} value={id}>{game.playerInfo?.[id]?.username||id.slice(0,12)}</option>)}</select><button type="button" className="primary-btn" disabled={pending||!guess||game.revealed?.length!==game.players.length} onClick={()=>act({type:"guess",targetId:guess})}>Lock my guess</button></div>}
    {game.status==="finished"&&<div className="score-panel"><Trophy/><h3>{game.message}</h3>{game.players.map(id=><div key={id} className="score-row"><span>{game.playerInfo?.[id]?.username||id.slice(0,12)} {game.roles?.[id]?"("+game.roles[id]+")":""}</span><b>{game.scores[id]} pts</b></div>)}</div>}
  </div>;
}

function SolaBoard({game,me,privateState,act,pending}) {
  const [selected,setSelected]=useState(-1);
  const hand=privateState?.hand||[];
  return <div className="board-wrap sola-board"><PlayerArena game={game} me={me} context="sola"/><div className="sola-table"><span className="eyebrow">PASSING TABLE</span><h2>Collect four matching cards.</h2><p>{game.message}</p></div><div className="hand-head"><b>Your cards</b><span>Pick one to pass clockwise</span></div><div className="sola-hand">{hand.map((c,i)=><button type="button" key={c.id||`${c.fruit}-${i}`} disabled={pending||game.players[game.turn]!==me.userId} className={`sola-card ${selected===i?"selected":""}`} onClick={()=>setSelected(i)}><FruitIllustration fruit={c.fruit} size={54}/><small>{({apple:"Apple",banana:"Banana",grapes:"Grapes",orange:"Orange",strawberry:"Strawberry",pear:"Pear",watermelon:"Watermelon",kiwi:"Kiwi"})[c.fruit]||"Fruit"}</small></button>)}</div><button type="button" className="primary-btn pass-btn" disabled={pending||selected<0||game.players[game.turn]!==me.userId} onClick={()=>{act({type:"pass",cardIndex:selected});setSelected(-1);}}>Pass selected card <Send size={16}/></button></div>;
}

export default function GameBoard({game,me,privateState,onAction,onExit}) {
  const [error,setError]=useState("");
  const [pending,setPending]=useState(false);
  const actionLock=useRef(false);
  const act=async action=>{
    if(actionLock.current)return;
    actionLock.current=true;
    setPending(true);
    setError("");
    try { await onAction(action); }
    catch(e) { setError(e.message || "Action send nahi hua. Dobara try karo."); }
    finally { actionLock.current=false; setPending(false); }
  };
  return <main className={`play-page ${game.gameId} game-variant-${game.gameId}`}>
    <div className="play-top"><button type="button" className="back-link" onClick={onExit}><ArrowLeft size={16}/> Leave game</button><span className={`eyebrow play-mode-tag ${game.gameId==="uno-no-mercy"?"no-mercy-tag":""}`}>{GAME_META[game.gameId]?.title||"GAME"} · LIVE ROOM</span><span className="turn-count">{game.status==="finished"?"ROUND COMPLETE":"IN PROGRESS"}</span></div>
    <div className="play-heading"><div><h1>{GAME_META[game.gameId]?.title}</h1><p className="match-player-line">{game.players.length} PLAYERS · EACH PLAYER HAS A LIVE 3D SEAT</p></div>{game.winner&&<div className="winner-pill"><Trophy size={16}/> Winner: {game.winner===me.userId?"You":game.playerInfo?.[game.winner]?.username||game.winner.slice(0,10)}</div>}</div>
    {error&&<div className="inline-error">{error}</div>}
    {game.gameId.startsWith("uno")&&<UnoBoard game={game} me={me} privateState={privateState} act={act} pending={pending}/>}
    {game.gameId==="ludo"&&<LudoBoard game={game} me={me} act={act} pending={pending}/>}
    {game.gameId==="raja-mantri"&&<RajaBoard game={game} me={me} privateState={privateState} act={act} pending={pending}/>}
    {game.gameId==="sola-parchi"&&<SolaBoard game={game} me={me} privateState={privateState} act={act} pending={pending}/>}
    {game.status==="finished"&&<div className="finished-banner"><Trophy/> Round finished. Room ke sab players result dekh sakte hain.</div>}
  </main>;
}
