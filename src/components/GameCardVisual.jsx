import React from "react";
import FruitIllustration from "./FruitIllustration";

export default function GameCardVisual({ kind }) {
  if (kind === "uno") return <div className="cover-art cover-uno" aria-hidden="true"><i/><i/><i/><div className="cover-uno-card"><b>UNO</b><small>WILD</small></div><span className="cover-spark spark-a">✦</span><span className="cover-spark spark-b">✧</span></div>;
  if (kind === "ludo") return <div className="cover-art cover-ludo" aria-hidden="true"><div className="mini-ludo-board"><i className="red"/><i className="green"/><i className="yellow"/><i className="blue"/><b/><b/><b/><b/><span/></div><div className="cover-dice"><i/><i/><i/><i/><i/><i/><i/></div></div>;
  if (kind === "raja-mantri") return <div className="cover-art cover-raja" aria-hidden="true"><div className="role-sigil sigil-crown">♛</div><div className="role-sigil sigil-mask">?</div><div className="role-sigil sigil-sword">⚔</div><div className="role-sigil sigil-ring">✦</div><span className="cover-orbit orbit-one"/><span className="cover-orbit orbit-two"/></div>;
  return <div className="cover-art cover-sola" aria-hidden="true"><div className="fruit-float fruit-one"><FruitIllustration fruit="apple" size={66}/></div><div className="fruit-float fruit-two"><FruitIllustration fruit="banana" size={61}/></div><div className="fruit-float fruit-three"><FruitIllustration fruit="grapes" size={60}/></div><div className="fruit-float fruit-four"><FruitIllustration fruit="orange" size={54}/></div><span className="cover-spark spark-a">✦</span><span className="cover-spark spark-b">✧</span></div>;
}
