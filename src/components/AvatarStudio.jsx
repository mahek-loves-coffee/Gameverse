import React, { useMemo, useState } from "react";
import { ArrowLeft, Check, RotateCcw, Save, Sparkles } from "lucide-react";
import Avatar3D from "./Avatar3D";

const SKINS = ["#f6d2b8", "#e9b99a", "#c98765", "#9b6048", "#704532", "#4b3027"];
const HAIRS = ["#211a2c", "#55352e", "#a85e35", "#d4a044", "#7b4bc4", "#e85d83", "#d7d5e4", "#162f4d"];
const OUTFITS = [
  { id: "streetwear", name: "Streetwear", detail: "Layered urban fit", outfit: "streetwear", shirt: "#765be8", secondary: "#24243b", accent: "#f1c66d" },
  { id: "armour", name: "Titan armour", detail: "Forged plated gear", outfit: "armour", shirt: "#536b89", secondary: "#202b43", accent: "#83e4ff" },
  { id: "longcoat", name: "Longcoat", detail: "Sharp silhouette", outfit: "longcoat", shirt: "#8a3e69", secondary: "#251d35", accent: "#ffc36c" },
  { id: "racer", name: "Velocity", detail: "Track-ready suit", outfit: "racer", shirt: "#d65342", secondary: "#272b3a", accent: "#f6e07b" },
  { id: "robe", name: "Arcane robe", detail: "Mystic layers", outfit: "robe", shirt: "#426b9b", secondary: "#252042", accent: "#b9a0ff" }
];
const ARCHETYPES = [
  { id: "street", name: "STREET ICON", outfit: "streetwear", aura: "none", accessory: "headphones", shirt: "#765be8", accent: "#f1c66d" },
  { id: "cyber", name: "NEON RUNNER", outfit: "racer", aura: "neon", accessory: "visor", shirt: "#d65342", accent: "#80f3ff" },
  { id: "royal", name: "CROWNBEARER", outfit: "longcoat", aura: "cosmic", accessory: "crown", shirt: "#8a3e69", accent: "#ffc76d" },
  { id: "fantasy", name: "ARCANE SOUL", outfit: "robe", aura: "frost", accessory: "horns", shirt: "#426b9b", accent: "#b9eaff" },
  { id: "rogue", name: "SHADOW ROGUE", outfit: "longcoat", aura: "ember", accessory: "mask", shirt: "#303344", accent: "#ff805d" },
  { id: "titan", name: "TITAN FORGED", outfit: "armour", aura: "neon", accessory: "halo", shirt: "#536b89", accent: "#83e4ff" },
  { id: "celestial", name: "STAR ASCENDANT", outfit: "robe", aura: "solar", accessory: "halo", backGear: "wings", shirt: "#d8d4ff", accent: "#ffd978" },
  { id: "rift", name: "RIFT WARDEN", outfit: "armour", aura: "void", accessory: "antlers", backGear: "wings", companion: "shoulder-drone", shirt: "#51406e", accent: "#a98aff" }
];
const HEAD_ACCESSORIES = ["none", "glasses", "visor", "mask", "horns", "antlers", "halo", "crown", "headphones"];
const BACK_GEARS = ["none", "wings"];
const COMPANIONS = ["none", "shoulder-drone"];
const ACCESSORY_LABELS = { none: "None", glasses: "Glasses", visor: "Cyber visor", mask: "Face mask", horns: "Demon horns", antlers: "Arc antlers", halo: "Halo", crown: "Crown", headphones: "Headphones", wings: "Energy wings", "shoulder-drone": "Shoulder drone" };
const HAIR_STYLES = ["soft", "bob", "long", "spiky", "mohawk", "afro", "curly", "undercut", "fade", "swept", "braids", "ponytail"];
const AURAS = ["none", "neon", "ember", "frost", "cosmic", "void", "storm", "solar"];
const DEFAULT = { type: "girl", skin: "#e9b99a", hair: "#34223d", shirt: "#765be8", style: "soft", hairStyle: "soft", accessory: "headphones", backGear: "none", companion: "none", archetype: "street", outfit: "streetwear", secondary: "#24243b", accent: "#f1c66d", aura: "none", eyeColor: "#342a46" };

export default function AvatarStudio({ initialAvatar, onSave, onBack }) {
  const [avatar, setAvatar] = useState(() => ({ ...DEFAULT, ...(initialAvatar || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setAvatar((current) => ({ ...current, [key]: value }));
  const selectedArchetype = useMemo(() => ARCHETYPES.find((item) => item.id === avatar.archetype), [avatar.archetype]);

  function chooseArchetype(item) {
    setAvatar((current) => ({ ...current, archetype: item.id, outfit: item.outfit, aura: item.aura, accessory: item.accessory, backGear: item.backGear || "none", companion: item.companion || "none", shirt: item.shirt, accent: item.accent }));
  }
  function chooseOutfit(item) {
    setAvatar((current) => ({ ...current, outfit: item.outfit, shirt: item.shirt, secondary: item.secondary, accent: item.accent }));
  }
  async function save() {
    setSaving(true); setError("");
    try { await onSave(avatar); }
    catch (e) { setError(e.message || "Avatar save nahi hua."); }
    finally { setSaving(false); }
  }

  return <main className="studio-page studio-page-premium">
    <div className="studio-top"><button type="button" className="back-link" onClick={onBack}><ArrowLeft size={17}/> Back to world</button><span className="eyebrow">PLAYER IDENTITY LAB · 3D CHARACTER CREATOR</span></div>
    <div className="studio-layout studio-layout-premium">
      <section className="studio-preview studio-preview-premium">
        <div className="preview-heading"><div><span className="eyebrow">LIVE CHARACTER PREVIEW</span><h1>Build your <em>legend.</em></h1><p>Drag to rotate. Mix silhouettes, gear and energy until it feels like your character.</p></div><span className="preview-spark"><Sparkles/></span></div>
        <div className="avatar-stage-backdrop"><div className="avatar-stage-grid"/><div className="avatar-stage-ring ring-one"/><div className="avatar-stage-ring ring-two"/><Avatar3D avatar={avatar}/><div className="avatar-stage-signature"><span className="live-dot"/> LIVE PREVIEW <b>{(selectedArchetype?.name || "CUSTOM BUILD")}</b></div></div>
        <div className="avatar-preview-tags"><span>{avatar.outfit?.toUpperCase() || "STREETWEAR"}</span><span>{avatar.aura?.toUpperCase() || "NO AURA"}</span><span>{avatar.accessory?.toUpperCase() || "NO ACCESSORY"}</span></div>
      </section>
      <section className="studio-controls studio-controls-premium">
        <div className="control-block"><div className="control-heading"><span>01</span><div><h3>Choose your character base</h3><p>Masculine/feminine silhouettes, face proportions and hair shapes</p></div></div><div className="choice-row">
          <button type="button" aria-pressed={avatar.type === "girl"} className={`choice-pill ${avatar.type === "girl" ? "active" : ""}`} onClick={() => update("type", "girl")}>Feminine base</button>
          <button type="button" aria-pressed={avatar.type === "boy"} className={`choice-pill ${avatar.type === "boy" ? "active" : ""}`} onClick={() => update("type", "boy")}>Masculine base</button>
        </div></div>
        <div className="control-block"><div className="control-heading"><span>02</span><div><h3>Character archetype</h3><p>Fast-start identity presets — customise every piece after</p></div></div><div className="archetype-grid">{ARCHETYPES.map((item) => <button type="button" key={item.id} aria-pressed={avatar.archetype === item.id} className={`archetype-option archetype-${item.id} ${avatar.archetype === item.id ? "active" : ""}`} onClick={() => chooseArchetype(item)}><i/><b>{item.name}</b><small>{item.outfit.replace("wear", " fit")}</small></button>)}</div></div>
        <div className="control-block"><div className="control-heading"><span>03</span><div><h3>Face & details</h3><p>Give your character a recognisable face</p></div></div><label>Skin tone</label><div className="swatches">{SKINS.map((color) => <button type="button" key={color} aria-label={`Skin ${color}`} className={`swatch ${avatar.skin === color ? "selected" : ""}`} style={{ background: color }} onClick={() => update("skin", color)}/>)}</div><label>Hair colour</label><div className="swatches">{HAIRS.map((color) => <button type="button" key={color} aria-label={`Hair ${color}`} className={`swatch ${avatar.hair === color ? "selected" : ""}`} style={{ background: color }} onClick={() => update("hair", color)}/>)}</div><label>Eye colour</label><div className="swatches">{["#342a46", "#397b85", "#3b5da8", "#8b6338", "#9d4f74", "#111318"].map((color) => <button type="button" key={color} aria-label={`Eye ${color}`} className={`swatch ${avatar.eyeColor === color ? "selected" : ""}`} style={{ background: color }} onClick={() => update("eyeColor", color)}/>)}</div><label>Hair silhouette</label><div className="choice-row wrap">{HAIR_STYLES.map((style) => <button type="button" key={style} aria-pressed={(avatar.hairStyle || avatar.style) === style} className={`choice-pill hair-${style} ${(avatar.hairStyle || avatar.style) === style ? "active" : ""}`} onClick={() => { update("style", style); update("hairStyle", style); }}>{style}</button>)}</div></div>
        <div className="control-block"><div className="control-heading"><span>04</span><div><h3>Outfit & equipment</h3><p>Silhouette-changing gear instead of recolours alone</p></div></div><div className="outfit-grid">{OUTFITS.map((item) => <button type="button" key={item.id} className={`outfit-option ${avatar.outfit === item.outfit ? "active" : ""}`} aria-pressed={avatar.outfit === item.outfit} onClick={() => chooseOutfit(item)}><i style={{ "--swatch": item.shirt, "--accent": item.accent }}/><b>{item.name}</b><small>{item.detail}</small></button>)}</div><label>Head / face equipment</label><div className="choice-row wrap">{HEAD_ACCESSORIES.map((item) => <button type="button" key={item} aria-pressed={avatar.accessory === item} className={`choice-pill ${avatar.accessory === item ? "active" : ""}`} onClick={() => update("accessory", item)}>{ACCESSORY_LABELS[item]}</button>)}</div><label>Back gear</label><div className="choice-row wrap">{BACK_GEARS.map((item) => <button type="button" key={item} aria-pressed={(avatar.backGear || "none") === item} className={`choice-pill ${avatar.backGear === item ? "active" : ""}`} onClick={() => update("backGear", item)}>{item === "wings" ? "Energy wings" : "No back gear"}</button>)}</div><label>Companion</label><div className="choice-row wrap">{COMPANIONS.map((item) => <button type="button" key={item} aria-pressed={(avatar.companion || "none") === item} className={`choice-pill ${avatar.companion === item ? "active" : ""}`} onClick={() => update("companion", item)}>{item === "shoulder-drone" ? "Shoulder drone" : "No companion"}</button>)}</div><label>Energy aura</label><div className="aura-options">{AURAS.map((item) => <button type="button" key={item} aria-pressed={avatar.aura === item} className={`aura-option aura-${item} ${avatar.aura === item ? "active" : ""}`} onClick={() => update("aura", item)}><i/>{item}</button>)}</div><p className="aura-hint">Auras are 3D energy effects around your full character — not a flat ring under the feet.</p></div>
        {error && <p className="inline-error">{error}</p>}
        <div className="studio-actions"><button type="button" className="outline-btn" onClick={() => setAvatar({ ...DEFAULT, type: avatar.type })}><RotateCcw size={16}/> Reset build</button><button type="button" className="primary-btn" onClick={save} disabled={saving}><Save size={16}/> {saving ? "Saving..." : "Save character"} <Check size={16}/></button></div>
      </section>
    </div>
  </main>;
}
