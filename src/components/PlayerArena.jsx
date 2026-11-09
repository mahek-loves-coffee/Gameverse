import React from "react";
import Avatar3D from "./Avatar3D";

function playerMeta(game, id, index, context) {
  if (context === "uno") {
    const count = game.handCounts?.[index] ?? 0;
    return { label: game.eliminated?.includes(id) ? "ELIMINATED" : `${count} CARDS`, count: Math.min(5, count), eliminated: game.eliminated?.includes(id) };
  }
  if (context === "ludo") {
    const tokens = game.tokens?.[index] || [];
    const active = tokens.filter((position) => position >= 0).length;
    return { label: `${active}/4 TOKENS OUT`, count: active };
  }
  if (context === "sola") {
    const count = game.handCounts?.[id] ?? 4;
    return { label: `${count} CHITS`, count: Math.min(5, count) };
  }
  return { label: game.revealed?.includes(id) ? "ROLE VIEWED" : "SECRET ROLE", count: 0 };
}

function CardBacks({ count = 0 }) {
  return <div className="seat-card-backs" aria-label={`${count} cards in hand`}>
    {Array.from({ length: Math.min(4, count) }).map((_, index) => <span className="seat-mini-card" key={index}><i>✦</i></span>)}
    <b>{count}</b>
  </div>;
}

function TokenMarkers({ count = 0, context }) {
  return <div className={`seat-token-markers ${context}`} aria-label={`${count} game pieces in play`}>
    {Array.from({ length: context === "ludo" ? 4 : Math.min(4, count) }).map((_, index) => <span key={index} className={index < count ? "in-play" : ""} />)}
  </div>;
}

export default function PlayerArena({ game, me, context = "uno" }) {
  const players = (game.players || []).map((id, index) => {
    const info = game.playerInfo?.[id] || {};
    const isMe = id === me.userId;
    return {
      id,
      index,
      username: isMe ? me.username : info.username || id.slice(0, 10),
      avatar: info.avatar || (isMe ? me.avatar : {}),
      isMe,
      isTurn: game.players?.[game.turn] === id,
      isWinner: game.status === "finished" && game.winner === id,
      isFinished: game.status === "finished",
      ...playerMeta(game, id, index, context)
    };
  }).sort((a, b) => Number(a.isMe) - Number(b.isMe));

  return <section className={`player-arena player-arena-${context}`} aria-label="Players around the game table">
    <div className="player-arena-heading"><span className="arena-kicker">THE TABLE</span><span>{players.length} PLAYERS CONNECTED</span></div>
    <div className="player-arena-grid">
      {players.map((player) => <article key={player.id} style={{ "--seat-color": ["#ed5268", "#4e8fe9", "#f3bd42", "#3dbb8a"][player.index % 4] }} className={`player-seat ${player.isTurn ? "is-active-turn" : ""} ${player.isMe ? "is-local-player" : ""} ${player.eliminated ? "is-out" : ""} ${player.isWinner ? "is-winner" : ""} ${player.isFinished && !player.isWinner ? "is-finished" : ""}`}>

        <div className="seat-nameplate"><span className={`seat-online-dot ${player.eliminated ? "out" : ""}`} /><strong>{player.username}</strong>{player.isMe && <em>YOU</em>}</div>
        <div className="seat-character-wrap">
          <span className="seat-character-aura" />
          <Avatar3D avatar={player.avatar} compact className="seat-avatar-3d" mood={player.isFinished ? (player.isWinner ? "victory" : "defeat") : player.isTurn ? "focused" : "idle"} />
          {player.isTurn && <span className="seat-turn-orbit" aria-hidden="true" />}
        </div>
        <div className="seat-game-indicator">
          {context === "uno" || context === "sola" ? <CardBacks count={player.count} /> : <TokenMarkers count={player.count} context={context} />}
          <span>{player.label}</span>
        </div>
        <div className="seat-state-label">{player.eliminated ? "OUT OF ROUND" : player.isWinner ? "✦ WINNER" : player.isFinished ? "ROUND FINISHED" : player.isTurn ? "● ACTIVE TURN" : player.isMe ? "YOUR SEAT" : "IN THE MATCH"}</div>
      </article>)}
    </div>
  </section>;
}
