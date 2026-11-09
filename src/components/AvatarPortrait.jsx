import React, { useId } from "react";

export default function AvatarPortrait({ avatar = {}, size = 34 }) {
  const id = `portrait-${useId().replace(/:/g, "")}`;
  const boy = avatar.type === "boy";
  const skin = avatar.skin || "#e9b99a";
  const hair = avatar.hair || (boy ? "#2b2430" : "#34223d");
  const shirt = avatar.shirt || "#8a68ed";
  const accessory = avatar.accessory || "none";
  const longHair = avatar.style === "long" && !boy;
  const bobHair = avatar.style === "bob" && !boy;
  return <svg className={`avatar-portrait ${boy ? "boy" : "girl"}`} width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={boy ? "Boy avatar" : "Girl avatar"}>
    <defs>
      <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f5edff"/><stop offset="1" stopColor="#cfe9ff"/></linearGradient>
      <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={shirt}/><stop offset="1" stopColor="#282342" stopOpacity=".2"/></linearGradient>
      <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={hair}/><stop offset="1" stopColor="#171522" stopOpacity=".45"/></linearGradient>
      <radialGradient id={`${id}-skin`} cx="34%" cy="28%"><stop stopColor="#fff" stopOpacity=".2"/><stop offset="1" stopColor={skin}/></radialGradient>
    </defs>
    <rect x="1" y="1" width="78" height="78" rx="24" fill={`url(#${id}-bg)`}/>
    <circle cx="64" cy="15" r="9" fill="#fff" opacity=".42"/>
    {longHair && <path d="M15 43Q10 10 40 8Q70 10 65 43L66 76H14Z" fill={`url(#${id}-hair)`}/>}
    {bobHair && <path d="M13 43Q9 9 40 8Q71 9 67 43L62 67H18Z" fill={`url(#${id}-hair)`}/>}
    <path d="M8 80Q12 52 40 52Q68 52 72 80Z" fill={`url(#${id}-shirt)`}/>
    <path d="M30 52L40 64L50 52" fill="none" stroke="#fff" strokeOpacity=".72" strokeWidth="3" strokeLinecap="round"/>
    <rect x="34" y="44" width="12" height="14" rx="5" fill={skin}/>
    {!boy && <path d="M17 39Q13 7 40 7Q68 7 63 41L60 59Q54 55 55 37Q42 39 31 27Q26 39 20 43L21 60Z" fill={`url(#${id}-hair)`}/>}
    {boy && <path d="M16 40Q13 8 40 8Q68 8 64 42L58 49Q58 26 48 21Q36 32 20 31Z" fill={`url(#${id}-hair)`}/>}
    <path d="M21 34Q21 18 40 17Q59 18 59 34V42Q59 58 40 59Q21 58 21 42Z" fill={`url(#${id}-skin)`}/>
    {!boy && <path d="M20 32Q17 13 38 11Q57 12 61 31Q49 31 43 20Q37 31 20 34Z" fill={`url(#${id}-hair)`}/>}
    {longHair && <><path d="M17 35Q13 51 17 68" fill="none" stroke={hair} strokeWidth="7" strokeLinecap="round"/><path d="M63 35Q67 52 63 68" fill="none" stroke={hair} strokeWidth="7" strokeLinecap="round"/></>}
    <ellipse cx="32" cy="39" rx="2.8" ry="3.4" fill="#fff"/><ellipse cx="48" cy="39" rx="2.8" ry="3.4" fill="#fff"/>
    <ellipse cx="33" cy="40" rx="1.65" ry="2.35" fill="#2a2638"/><ellipse cx="49" cy="40" rx="1.65" ry="2.35" fill="#2a2638"/>
    <path d="M28 33Q32 30 36 33M44 33Q48 30 52 33" fill="none" stroke={hair} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M38 45Q40 47 42 45" fill="none" stroke="#bb806f" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M34 51Q40 56 46 51" fill="none" stroke="#9e5366" strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="26" cy="46" rx="4" ry="2" fill="#ee9b9c" opacity=".32"/><ellipse cx="54" cy="46" rx="4" ry="2" fill="#ee9b9c" opacity=".32"/>
    {accessory === "glasses" && <g fill="none" stroke="#322b47" strokeWidth="2"><circle cx="32" cy="39" r="7"/><circle cx="48" cy="39" r="7"/><path d="M39 39H41"/></g>}
    {accessory === "crown" && <path d="M27 18L25 7L34 13L40 4L46 13L55 7L53 19Z" fill="#f4c54e" stroke="#a77b24" strokeWidth="1.2"/>}
    {accessory === "headphones" && <g fill="none" stroke="#29243d" strokeWidth="4"><path d="M20 39V31Q20 12 40 12Q60 12 60 31V39"/><rect x="16" y="34" width="8" height="15" rx="3" fill="#9575ed" stroke="none"/><rect x="56" y="34" width="8" height="15" rx="3" fill="#9575ed" stroke="none"/></g>}
  </svg>;
}
