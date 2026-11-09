import React from "react";

const fruitStyles = {
  apple: { body: "#ef5363", leaf: "#45a66b", name: "Apple" },
  banana: { body: "#ffd65a", leaf: "#8b6b32", name: "Banana" },
  grapes: { body: "#8060c9", leaf: "#4b9b62", name: "Grapes" },
  orange: { body: "#ff9a3d", leaf: "#4a9c5e", name: "Orange" },
  strawberry: { body: "#ee4f68", leaf: "#399c62", name: "Strawberry" },
  pear: { body: "#b4ce53", leaf: "#4c9b5d", name: "Pear" },
  watermelon: { body: "#4ebc83", leaf: "#2f8c60", name: "Watermelon" },
  kiwi: { body: "#a4bd54", leaf: "#6d9145", name: "Kiwi" }
};

export default function FruitIllustration({ fruit = "apple", size = 54 }) {
  const f = fruitStyles[fruit] || fruitStyles.apple;
  return <svg className={`fruit-illustration fruit-${fruit}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={f.name}>
    <defs>
      <radialGradient id={`shine-${fruit}`} cx="30%" cy="25%"><stop offset="0" stopColor="#fff" stopOpacity=".8"/><stop offset=".38" stopColor={f.body}/><stop offset="1" stopColor="#402d45" stopOpacity=".18"/></radialGradient>
      <filter id={`shadow-${fruit}`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#26344a" floodOpacity=".2"/></filter>
    </defs>
    <ellipse cx="50" cy="86" rx="27" ry="6" fill="#27344a" opacity=".12"/>
    {fruit === "banana" ? <g filter={`url(#shadow-${fruit})`}><path d="M18 60 Q37 86 76 45 Q88 33 84 21 Q75 34 65 38 Q39 55 23 42 Q14 36 18 60Z" fill={f.body} stroke="#d5a735" strokeWidth="3"/><path d="M18 60l-5-5m71-34 5-5" stroke="#765b31" strokeWidth="5" strokeLinecap="round"/><path d="M27 58q25 17 48-10" fill="none" stroke="#fff1a5" strokeWidth="4" strokeLinecap="round" opacity=".8"/></g> : fruit === "grapes" ? <g filter={`url(#shadow-${fruit})`}>{Array.from({length:10},(_,i)=><circle key={i} cx={[35,50,65,27,43,59,73,36,53,48][i]} cy={[37,31,39,52,52,54,55,68,70,84][i]} r="12" fill={f.body} stroke="#6246a8" strokeWidth="1.5"/>)}<path d="M49 23q-1-15 12-16" fill="none" stroke="#765232" strokeWidth="5" strokeLinecap="round"/><path d="M53 16q17-14 27 0-13 10-27 0Z" fill={f.leaf}/></g> : fruit === "watermelon" ? <g filter={`url(#shadow-${fruit})`}><path d="M12 57a38 38 0 0 0 76 0Z" fill={f.body} stroke="#24764f" strokeWidth="5"/><path d="M19 57a31 31 0 0 0 62 0Z" fill="#ff6672"/><path d="M28 57q-3 9 0 14m17-15q-3 9 0 14m17-14q-3 9 0 14m15-14q-3 9 0 14" stroke="#3c3945" strokeWidth="3" strokeLinecap="round"/></g> : fruit === "strawberry" ? <g filter={`url(#shadow-${fruit})`}><path d="M50 29C20 20 15 47 29 69q9 16 21 20 12-4 21-20c14-22 9-49-21-40Z" fill={f.body} stroke="#c83b54" strokeWidth="2"/><path d="M50 30q-15-18-28-5 14 2 17 12m11-7q10-19 25-10-12 5-14 15" fill={f.leaf}/>{[[39,48],[58,48],[32,61],[49,65],[65,61],[43,78],[57,78]].map(([x,y],i)=><ellipse key={i} cx={x} cy={y} rx="2" ry="4" fill="#ffe89a" transform={`rotate(18 ${x} ${y})`}/>)}</g> : fruit === "pear" ? <g filter={`url(#shadow-${fruit})`}><path d="M50 17c-5 17-2 20-12 31-22 23-9 43 12 43s34-20 12-43c-10-11-7-14-12-31Z" fill={f.body} stroke="#829b3e" strokeWidth="2"/><path d="M50 20q-2-12 7-15" stroke="#765232" strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M54 13q17-12 25 1-13 10-25-1Z" fill={f.leaf}/></g> : fruit === "kiwi" ? <g filter={`url(#shadow-${fruit})`}><ellipse cx="50" cy="54" rx="35" ry="27" fill="#8d754b"/><ellipse cx="50" cy="54" rx="29" ry="21" fill={f.body}/><ellipse cx="50" cy="54" rx="8" ry="7" fill="#f6e9b4"/>{Array.from({length:12},(_,i)=><ellipse key={i} cx={50+Math.cos(i*Math.PI/6)*17} cy={54+Math.sin(i*Math.PI/6)*13} rx="2" ry="4" fill="#463c31" transform={`rotate(${i*30} ${50+Math.cos(i*Math.PI/6)*17} ${54+Math.sin(i*Math.PI/6)*13})`}/>)}</g> : <g filter={`url(#shadow-${fruit})`}><path d="M50 23C18 9 13 44 22 67c6 16 18 20 28 13 10 7 22 3 28-13 9-23 4-58-28-44Z" fill={`url(#shine-${fruit})`} stroke="#c83d53" strokeWidth="2"/><path d="M50 25q-4-14 5-20" stroke="#765232" strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M54 13q18-13 27 0-13 12-27 0Z" fill={f.leaf}/><path d="M32 39q8-9 15-4" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".45"/></g>}
  </svg>;
}
