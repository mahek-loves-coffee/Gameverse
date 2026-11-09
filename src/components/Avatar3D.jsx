import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, Sparkles as DreiSparkles } from "@react-three/drei";

const MAT = { skinRoughness: 0.68, fabricRoughness: 0.82 };

function Character({ avatar = {}, idle = true, mood = "idle" }) {
  const characterRef = useRef(null);
  const headRef = useRef(null);
  const eyesRef = useRef(null);
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const auraRef = useRef(null);
  const droneRef = useRef(null);
  useFrame((state) => {
    if (!characterRef.current || !idle) return;
    const t = state.clock.elapsedTime;
    if (auraRef.current) {
      auraRef.current.rotation.y = Math.sin(t * 0.42) * 0.16;
      auraRef.current.rotation.z = Math.sin(t * 0.58) * 0.035;
      const pulse = 1 + Math.sin(t * 2.1) * 0.018;
      auraRef.current.scale.set(pulse, pulse, pulse);
    }
    if (droneRef.current) {
      droneRef.current.position.y = -0.82 + Math.sin(t * 1.8) * 0.045;
      droneRef.current.rotation.y = t * 0.9;
      droneRef.current.rotation.z = Math.sin(t * 1.3) * 0.08;
    }
    const celebrating = mood === "victory";
    const focused = mood === "focused";
    const defeated = mood === "defeat";
    characterRef.current.position.y = -0.98 + Math.sin(t * (celebrating ? 4.2 : 1.55)) * (celebrating ? 0.075 : 0.028);
    characterRef.current.rotation.y = Math.sin(t * 0.42) * (focused ? 0.025 : 0.045);
    characterRef.current.rotation.z = Math.sin(t * 0.9) * 0.008;
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(t * 0.78) * (focused ? 0.03 : 0.018);
      headRef.current.rotation.x = (focused ? -0.055 : defeated ? 0.17 : celebrating ? -0.12 : 0) + Math.sin(t * 0.55) * 0.012;
    }
    if (leftArmRef.current && rightArmRef.current) {
      const celebration = celebrating ? Math.sin(t * 5.2) * 0.12 : 0;
      leftArmRef.current.rotation.z = celebrating ? -0.9 - celebration : focused ? -0.18 : defeated ? -0.12 : -0.32;
      rightArmRef.current.rotation.z = celebrating ? 0.9 + celebration : focused ? 0.18 : defeated ? 0.12 : 0.32;
    }
    if (eyesRef.current) {
      const blinkPhase = t % 4.8;
      const blink = (blinkPhase > 0.09 && blinkPhase < 0.19) || (blinkPhase > 0.24 && blinkPhase < 0.31);
      eyesRef.current.scale.y = blink ? 0.12 : 1;
    }
  });

  const isBoy = avatar.type === "boy";
  const archetype = avatar.archetype || "street";
  const skin = avatar.skin || "#e9b99a";
  const hair = avatar.hair || "#34223d";
  const shirt = avatar.shirt || "#8a68ed";
  const style = avatar.hairStyle || avatar.style || "soft";
  const accessory = avatar.accessory || "none";
  const backGear = avatar.backGear || (accessory === "wings" ? "wings" : "none");
  const companion = avatar.companion || (accessory === "shoulder-drone" ? "shoulder-drone" : "none");
  const headAccessory = accessory === "wings" || accessory === "shoulder-drone" ? "none" : accessory;
  const outfit = avatar.outfit || "streetwear";
  const accent = avatar.accent || "#f1c66d";
  const aura = avatar.aura || "none";
  const eyeColor = avatar.eyeColor || "#342a46";
  const trousers = avatar.trousers || "#2d3150";
  const shoe = "#f7f4ff";
  const dark = "#292238";
  const masculineShortCut = isBoy && !["afro", "curly", "braids", "ponytail"].includes(style);
  // Pronounced base proportions: these are separate silhouettes, not palette swaps.
  const torsoScale = isBoy ? [1.34, 1.02, 1.16] : [0.88, 1.12, 0.96];
  const hipScale = isBoy ? [0.33, 0.25, 0.23] : [0.53, 0.36, 0.31];
  const legSpread = isBoy ? 0.17 : 0.25;
  const armRadius = isBoy ? 0.135 : 0.096;
  const headScale = isBoy ? [0.86, 0.78, 0.77] : [0.73, 0.95, 0.72];
  const auraColor = ({ neon: "#69efff", ember: "#ff704c", frost: "#a9eaff", cosmic: "#bd91ff", void: "#8a65ff", storm: "#aabaff", solar: "#ffd978" })[aura] || accent;

  return (
    <group ref={characterRef} position={[0, -0.98, 0]}>
      {aura !== "none" && <group ref={auraRef} position={[0, 1.22, -0.48]}>
        <DreiSparkles count={aura === "cosmic" || aura === "storm" ? 52 : 34} scale={[1.25, 2.28, 0.72]} size={aura === "solar" ? 4.4 : 3.1} speed={aura === "storm" ? 1.65 : aura === "ember" ? 1.2 : 0.62} opacity={0.88} color={auraColor} noise={0.38}/>
        {(aura === "neon" || aura === "cosmic" || aura === "void" || aura === "storm" || aura === "solar") && <mesh scale={[1.12, 1.88, 0.3]} rotation={[0, 0, aura === "storm" ? 0.24 : 0]}><torusGeometry args={[0.66, aura === "solar" ? 0.028 : 0.014, 10, 88]} /><meshStandardMaterial color={auraColor} emissive={auraColor} emissiveIntensity={aura === "void" ? 1.3 : 1.05} metalness={0.52} roughness={0.22} transparent opacity={0.82}/></mesh>}
        {(aura === "neon" || aura === "cosmic" || aura === "storm") && <mesh rotation={[0.35, 0.72, 0.58]} scale={[0.92, 1.72, 0.34]}><torusGeometry args={[0.66, 0.009, 8, 80]}/><meshStandardMaterial color={auraColor} emissive={auraColor} emissiveIntensity={1.25} transparent opacity={0.58}/></mesh>}
        {Array.from({ length: aura === "cosmic" || aura === "storm" ? 16 : 12 }, (_, i) => {
          const total = aura === "cosmic" || aura === "storm" ? 16 : 12;
          const angle = (i / total) * Math.PI * 2;
          const y = -1.02 + ((i * 0.37) % 2.08);
          const x = Math.cos(angle * (aura === "cosmic" ? 1.35 : 1)) * (0.62 + (i % 3) * 0.075);
          const z = Math.sin(angle * 1.8) * 0.18;
          const common = { color: auraColor, emissive: auraColor, emissiveIntensity: aura === "void" ? 1.25 : 0.92, metalness: 0.48, roughness: 0.2 };
          return <mesh key={i} position={[x, y, z]} rotation={[angle * 0.4, angle, angle * 0.7]}>
            {aura === "frost" ? <octahedronGeometry args={[0.12 + (i % 2) * 0.055, 0]}/> : aura === "ember" ? <coneGeometry args={[0.075 + (i % 2) * 0.026, 0.25 + (i % 3) * 0.06, 5]}/> : aura === "void" ? <dodecahedronGeometry args={[0.095 + (i % 3) * 0.022, 0]}/> : aura === "solar" ? <sphereGeometry args={[0.09 + (i % 2) * 0.03, 16, 12]}/> : aura === "storm" ? <tetrahedronGeometry args={[0.13 + (i % 2) * 0.045, 0]}/> : <icosahedronGeometry args={[0.09 + (i % 2) * 0.03, 1]}/>}
            <meshStandardMaterial {...common} transparent opacity={aura === "void" ? 0.92 : 0.98}/>
          </mesh>;
        })}
        {aura === "frost" && <group>{[-0.56,0.56].map((x,i)=><mesh key={i} position={[x,0.1,0.12]} rotation={[0,0,i?0.22:-0.22]}><octahedronGeometry args={[0.2,0]}/><meshStandardMaterial color="#e1f8ff" emissive={auraColor} emissiveIntensity={1.15} metalness={0.4} roughness={0.16}/></mesh>)}</group>}
        {aura === "ember" && <pointLight position={[0,0.2,0.45]} color={auraColor} intensity={1.15} distance={2.8}/>}
        {aura === "void" && <mesh position={[0,0,0.25]}><dodecahedronGeometry args={[0.18,1]}/><meshStandardMaterial color="#170c2e" emissive={auraColor} emissiveIntensity={1.6} metalness={0.8} roughness={0.18}/></mesh>}
        {aura === "solar" && <pointLight position={[0,0.15,0.7]} color={auraColor} intensity={1.8} distance={3.8}/>}
      </group>}
      {backGear === "wings" && <group position={[0, 0.92, -0.36]}>
        {[-1, 1].map((side) => <group key={side} position={[side * 0.28, 0, 0]}>
          {Array.from({length:5}, (_, i) => <mesh key={i} position={[side * (0.12 + i * 0.075), 0.02 + i * 0.085, -0.035 - i * 0.012]} rotation={[0, 0, -side * (0.38 + i * 0.13)]} scale={[1 - i * 0.07, 1, 0.72]} castShadow>
            <capsuleGeometry args={[0.075, 0.43 - i * 0.035, 6, 12]}/><meshStandardMaterial color={i < 2 ? accent : avatar.secondary || "#d8e4ff"} emissive={i < 2 ? accent : "#000000"} emissiveIntensity={i < 2 ? 0.22 : 0} metalness={0.26} roughness={0.44}/>
          </mesh>)}
          <mesh position={[side * 0.18, 0.14, 0.03]} rotation={[0, 0, -side * 0.5]}><capsuleGeometry args={[0.11, 0.4, 7, 14]}/><meshStandardMaterial color={avatar.secondary || "#e9edff"} metalness={0.35} roughness={0.42}/></mesh>
        </group>)}
      </group>}
      {companion === "shoulder-drone" && <group ref={droneRef} position={[0.67, 0.82, 0.05]}>
        <mesh><icosahedronGeometry args={[0.16, 1]}/><meshStandardMaterial color={avatar.secondary || "#25243b"} metalness={0.78} roughness={0.2} emissive={accent} emissiveIntensity={0.28}/></mesh>
        <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.22,0.025,8,32]}/><meshStandardMaterial color={accent} metalness={0.72} emissive={accent} emissiveIntensity={0.42}/></mesh>
        <mesh position={[0,0,0.15]}><sphereGeometry args={[0.045,16,12]}/><meshStandardMaterial color={shirt} emissive={shirt} emissiveIntensity={1.2}/></mesh>
        {[-1,1].map(side=><mesh key={side} position={[side*0.2,0,0]}><boxGeometry args={[0.13,0.035,0.055]}/><meshStandardMaterial color={accent} metalness={0.55}/></mesh>)}
        <pointLight color={accent} intensity={0.8} distance={1.4}/>
      </group>}
      <group position={[0, 0.05, 0]}>
        {/* Sneakers and legs */}
        <mesh position={[-legSpread, 0.27, 0]} castShadow><capsuleGeometry args={[0.105, 0.36, 7, 16]} /><meshStandardMaterial color={trousers} roughness={MAT.fabricRoughness} /></mesh>
        <mesh position={[legSpread, 0.27, 0]} castShadow><capsuleGeometry args={[0.105, 0.36, 7, 16]} /><meshStandardMaterial color={trousers} roughness={MAT.fabricRoughness} /></mesh>
        <mesh position={[-legSpread, 0.055, 0.105]} castShadow><capsuleGeometry args={[0.125, 0.12, 5, 16]} /><meshStandardMaterial color={shoe} roughness={0.58} /></mesh>
        <mesh position={[legSpread, 0.055, 0.105]} castShadow><capsuleGeometry args={[0.125, 0.12, 5, 16]} /><meshStandardMaterial color={shoe} roughness={0.58} /></mesh>
        <mesh position={[-legSpread, 0.025, 0.13]}><boxGeometry args={[0.19, 0.025, 0.19]} /><meshStandardMaterial color={shirt} roughness={0.65} /></mesh>
        <mesh position={[legSpread, 0.025, 0.13]}><boxGeometry args={[0.19, 0.025, 0.19]} /><meshStandardMaterial color={shirt} roughness={0.65} /></mesh>
        <mesh position={[-legSpread, 0.13, 0.22]}><boxGeometry args={[0.08, 0.018, 0.012]} /><meshStandardMaterial color="#c5bfd8" /></mesh>
        <mesh position={[legSpread, 0.13, 0.22]}><boxGeometry args={[0.08, 0.018, 0.012]} /><meshStandardMaterial color="#c5bfd8" /></mesh>

        {/* Tailored top, collar and small fabric details */}
        <mesh position={[0, 0.88, 0]} scale={torsoScale} castShadow><capsuleGeometry args={[isBoy ? 0.33 : 0.295, 0.46, 9, 28]} /><meshStandardMaterial color={shirt} roughness={MAT.fabricRoughness} /></mesh>
        <mesh position={[0, 0.53, -0.015]} scale={hipScale} castShadow><sphereGeometry args={[1, 28, 22]} /><meshStandardMaterial color={outfit === "armour" ? "#667a9c" : trousers} roughness={MAT.fabricRoughness} /></mesh>
        {isBoy && <group>
          <mesh position={[0, 1.08, 0.24]} scale={[0.36, 0.15, 0.08]}><sphereGeometry args={[1, 28, 22]}/><meshStandardMaterial color={avatar.secondary || shirt} roughness={MAT.fabricRoughness}/></mesh>
          <mesh position={[0, 0.55, 0.18]} scale={[0.3, 0.14, 0.06]}><sphereGeometry args={[1, 24, 18]}/><meshStandardMaterial color={avatar.secondary || shirt} roughness={MAT.fabricRoughness}/></mesh>
        </group>}
        {/* Tailored shoulder silhouette and utility belt give each base a stronger read. */}
        <group>
          {[-1, 1].map((side) => <group key={side} position={[side * (isBoy ? 0.43 : 0.36), 1.03, 0]} rotation={[0, 0, side * -0.12]}>
            <mesh scale={isBoy ? [1.2, 0.92, 1.08] : [0.9, 0.84, 0.92]} castShadow>
              <icosahedronGeometry args={[0.19, 1]} />
              <meshStandardMaterial color={outfit === "armour" ? "#8196b5" : avatar.secondary || shirt} metalness={outfit === "armour" ? 0.62 : 0.2} roughness={0.42} />
            </mesh>
            <mesh position={[0, -0.11, 0.025]} scale={[0.65, 0.42, 0.78]}>
              <sphereGeometry args={[0.16, 18, 14]} />
              <meshStandardMaterial color={shirt} roughness={0.74} />
            </mesh>
          </group>)}
          <mesh position={[0, 0.49, 0.19]} scale={[0.37, 0.075, 0.075]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={avatar.secondary || dark} metalness={0.35} roughness={0.48} />
          </mesh>
          <mesh position={[0, 0.49, 0.27]} scale={[0.075, 0.075, 0.035]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={accent} metalness={0.75} roughness={0.22} emissive={accent} emissiveIntensity={0.12} />
          </mesh>
        </group>
        {outfit === "armour" && <group>
          <mesh position={[0, 0.96, 0.285]} scale={[0.34, 0.27, 0.075]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color="#a7b6d0" metalness={0.78} roughness={0.24} /></mesh>
          <mesh position={[0, 0.99, 0.365]} scale={[0.12, 0.18, 0.025]}><octahedronGeometry args={[1, 1]} /><meshStandardMaterial color={accent} metalness={0.7} roughness={0.22} emissive={accent} emissiveIntensity={0.18} /></mesh>
          {[-1, 1].map(side => <mesh key={side} position={[side * 0.39, 1.01, 0]} rotation={[0, 0, side * -0.12]}><boxGeometry args={[0.25, 0.2, 0.28]} /><meshStandardMaterial color="#667a9c" metalness={0.65} roughness={0.3} /></mesh>)}
        </group>}
        {outfit === "longcoat" && <group>
          <mesh position={[0, 0.5, -0.08]} scale={[0.39, 0.62, 0.12]} castShadow><capsuleGeometry args={[0.34, 0.7, 7, 20]} /><meshStandardMaterial color={avatar.secondary || "#20243b"} roughness={0.72} /></mesh>
          <mesh position={[0, 0.88, 0.31]} rotation={[0, 0, 0.06]}><boxGeometry args={[0.055, 0.55, 0.02]} /><meshStandardMaterial color={accent} metalness={0.45} roughness={0.38} /></mesh>
        </group>}
        {outfit === "racer" && <group>
          {[-0.17, 0.17].map(x => <mesh key={x} position={[x, 0.91, 0.303]} rotation={[0, 0, x * 0.3]}><boxGeometry args={[0.045, 0.58, 0.018]} /><meshStandardMaterial color={accent} metalness={0.28} roughness={0.42} /></mesh>)}
          <mesh position={[0, 0.66, 0.3]}><boxGeometry args={[0.34, 0.05, 0.02]} /><meshStandardMaterial color="#e8edf8" roughness={0.5} /></mesh>
        </group>}
        {outfit === "robe" && <group>
          <mesh position={[0, 0.52, -0.17]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.48, 1.25, 5, 1, true]} /><meshStandardMaterial color={avatar.secondary || "#28213f"} side={2} roughness={0.8} /></mesh>
          <mesh position={[0, 0.88, 0.31]}><torusGeometry args={[0.14, 0.025, 8, 28]} /><meshStandardMaterial color={accent} metalness={0.75} roughness={0.22} /></mesh>
        </group>}
        {outfit === "streetwear" && <group>
          <mesh position={[0, 0.58, 0.305]}><boxGeometry args={[0.22, 0.12, 0.035]} /><meshStandardMaterial color={avatar.secondary || "#25253a"} roughness={0.8} /></mesh>
          <mesh position={[0, 1.12, -0.02]} rotation={[0.12, 0, 0]}><torusGeometry args={[0.17, 0.035, 8, 28]} /><meshStandardMaterial color={accent} metalness={0.48} roughness={0.32} /></mesh>
        </group>}
        {archetype === "cyber" && <group>
          <mesh position={[0, 0.96, 0.342]} scale={[0.23, 0.27, 0.035]}><octahedronGeometry args={[1, 1]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.65} metalness={0.45} roughness={0.22} /></mesh>
          {[-0.25, 0.25].map(x => <mesh key={x} position={[x, 0.82, 0.31]}><boxGeometry args={[0.045, 0.32, 0.025]} /><meshStandardMaterial color="#d6fbff" emissive="#50dfff" emissiveIntensity={0.45} /></mesh>)}
        </group>}
        {archetype === "royal" && <group>
          <mesh position={[0, 1.13, -0.12]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.5, 0.9, 5, 1, true]} /><meshStandardMaterial color={avatar.secondary || "#251d35"} side={2} roughness={0.8} /></mesh>
          {[-1, 1].map(side => <mesh key={side} position={[side * 0.38, 1.08, 0]} rotation={[0, 0, side * -0.2]}><sphereGeometry args={[0.17, 20, 16]} /><meshStandardMaterial color={accent} metalness={0.7} roughness={0.24} /></mesh>)}
        </group>}
        {archetype === "rogue" && <group>
          <mesh position={[0, 1.22, 0.2]} rotation={[0.18, 0, 0]} scale={[0.42, 0.13, 0.18]}><sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color={avatar.secondary || "#171a29"} roughness={0.8} /></mesh>
          <mesh position={[0, 0.7, 0.335]} rotation={[0, 0, 0.08]}><torusGeometry args={[0.25, 0.045, 8, 32, Math.PI]} /><meshStandardMaterial color={accent} roughness={0.5} /></mesh>
        </group>}
        {archetype === "titan" && <group>
          {[-1, 1].map(side => <mesh key={side} position={[side * 0.39, 1.1, 0.015]} rotation={[0, 0, side * -0.15]} scale={[1.35, 1.05, 1.1]}><dodecahedronGeometry args={[0.19, 1]} /><meshStandardMaterial color={avatar.secondary || "#202b43"} metalness={0.68} roughness={0.28} /></mesh>)}
          <mesh position={[0, 0.57, 0.29]}><torusGeometry args={[0.16, 0.024, 8, 32]} /><meshStandardMaterial color={accent} metalness={0.7} emissive={accent} emissiveIntensity={0.2} /></mesh>
        </group>}
        {archetype === "fantasy" && <group>
          <mesh position={[0, 0.92, 0.335]} scale={[0.26, 0.26, 0.035]}><octahedronGeometry args={[1, 1]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} metalness={0.45} /></mesh>
          {[-0.32, 0.32].map(x => <mesh key={x} position={[x, 0.72, 0.31]} rotation={[0, 0, x]}><torusGeometry args={[0.08, 0.012, 6, 20]} /><meshStandardMaterial color={accent} metalness={0.55} /></mesh>)}
        </group>}
        <mesh position={[0, 0.91, 0.315]} scale={[0.115, 0.16, 0.055]} rotation={[0,0,Math.PI/4]}><octahedronGeometry args={[1,1]} /><meshStandardMaterial color={accent} metalness={0.62} roughness={0.22} emissive={accent} emissiveIntensity={0.22} /></mesh>
        <mesh position={[0, 0.91, 0.295]} scale={[0.035, 0.19, 0.018]}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color={avatar.secondary || dark} metalness={0.42} roughness={0.38}/></mesh>
        {[-1,1].map(side=><group key={side} position={[side*(isBoy?0.48:0.4),0.63,0.03]} rotation={[0,0,side*0.12]}>
          <mesh scale={[0.11,0.19,0.12]}><capsuleGeometry args={[0.5,0.36,6,12]}/><meshStandardMaterial color={avatar.secondary || dark} metalness={outfit==="armour"?0.66:0.25} roughness={0.38}/></mesh>
          <mesh position={[0,0,0.095]} scale={[0.7,0.42,0.35]}><sphereGeometry args={[0.12,18,14]}/><meshStandardMaterial color={accent} metalness={0.55} roughness={0.28}/></mesh>
        </group>)}
        <mesh ref={leftArmRef} position={[isBoy ? -0.47 : -0.36, 0.82, 0]} rotation={[0, 0, -0.32]} castShadow><capsuleGeometry args={[armRadius, 0.39, 7, 16]} /><meshStandardMaterial color={shirt} roughness={MAT.fabricRoughness} /></mesh>
        <mesh ref={rightArmRef} position={[isBoy ? 0.47 : 0.36, 0.82, 0]} rotation={[0, 0, 0.32]} castShadow><capsuleGeometry args={[armRadius, 0.39, 7, 16]} /><meshStandardMaterial color={shirt} roughness={MAT.fabricRoughness} /></mesh>
        <mesh position={[isBoy ? -0.47 : -0.41, 0.55, 0.025]} castShadow><sphereGeometry args={[0.11, 24, 20]} /><meshStandardMaterial color={skin} roughness={MAT.skinRoughness} /></mesh>
        <mesh position={[isBoy ? 0.47 : 0.41, 0.55, 0.025]} castShadow><sphereGeometry args={[0.11, 24, 20]} /><meshStandardMaterial color={skin} roughness={MAT.skinRoughness} /></mesh>
        <mesh position={[0, 1.18, 0]}><cylinderGeometry args={[0.105, 0.13, 0.2, 24]} /><meshStandardMaterial color={skin} roughness={MAT.skinRoughness} /></mesh>
        <mesh position={[0, 1.13, 0.22]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.14, 0.18, 3]} /><meshStandardMaterial color="#f4f0ff" side={2} /></mesh>
        <mesh position={[0, 0.82, 0.305]}><sphereGeometry args={[0.035, 16, 12]} /><meshStandardMaterial color="#f8d77b" metalness={0.35} roughness={0.38} /></mesh>

        {/* Face: rounded but with separate features for expression */}
        <group ref={headRef} position={[0, 1.61, 0]}>
          <mesh scale={headScale} castShadow><sphereGeometry args={[0.55, 48, 40]} /><meshStandardMaterial color={skin} roughness={MAT.skinRoughness} /></mesh>
          {isBoy ? <mesh position={[0, -0.21, 0.13]} scale={[0.48, 0.32, 0.49]}><sphereGeometry args={[0.55, 32, 24]} /><meshStandardMaterial color={skin} roughness={MAT.skinRoughness} /></mesh> : <mesh position={[0, -0.23, 0.14]} scale={[0.32, 0.26, 0.42]}><sphereGeometry args={[0.55, 32, 24]} /><meshStandardMaterial color={skin} roughness={MAT.skinRoughness} /></mesh>}
          <mesh position={[-0.39, -0.02, 0]} scale={[0.17, 0.23, 0.14]}><sphereGeometry args={[0.5, 24, 20]} /><meshStandardMaterial color={skin} roughness={MAT.skinRoughness} /></mesh>
          <mesh position={[0.39, -0.02, 0]} scale={[0.17, 0.23, 0.14]}><sphereGeometry args={[0.5, 24, 20]} /><meshStandardMaterial color={skin} roughness={MAT.skinRoughness} /></mesh>
          <mesh position={[-0.2, -0.08, 0.365]} scale={[0.095, 0.035, 0.012]}><sphereGeometry args={[1, 20, 16]} /><meshBasicMaterial color="#ee9a9b" transparent opacity={0.42} /></mesh>
          <mesh position={[0.2, -0.08, 0.365]} scale={[0.095, 0.035, 0.012]}><sphereGeometry args={[1, 20, 16]} /><meshBasicMaterial color="#ee9a9b" transparent opacity={0.42} /></mesh>
          {/* Eye whites, irises, highlights and eyebrows */}
          <group ref={eyesRef} position={[0, 0.055, 0.397]} scale={isBoy ? [0.92,0.95,1] : [1.12,1.08,1]}>
            {[-1, 1].map((side) => <group key={side} position={[side * 0.155, 0, 0]}>
              <mesh scale={[0.075, 0.105, 0.035]}><sphereGeometry args={[1, 24, 20]} /><meshStandardMaterial color="#fffdfb" roughness={0.4} /></mesh>
              <mesh position={[0, -0.006, 0.027]} scale={[0.041, 0.061, 0.024]}><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={eyeColor} roughness={0.36} /></mesh>
              <mesh position={[-0.012, 0.02, 0.047]} scale={[0.012, 0.017, 0.009]}><sphereGeometry args={[1, 12, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
              <mesh position={[0, isBoy ? 0.15 : 0.145, -0.002]} rotation={[0, 0, side * (isBoy ? -0.16 : -0.08)]}><capsuleGeometry args={[isBoy ? 0.026 : 0.014, isBoy ? 0.105 : 0.09, 4, 10]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>
            </group>)}
          </group>
          <mesh position={[0, -0.065, 0.415]} scale={[0.045, 0.06, 0.045]}><sphereGeometry args={[1, 18, 14]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
          <mesh position={[0, -0.22, 0.398]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.066, 0.012, 8, 24, Math.PI]} /><meshStandardMaterial color="#a84f68" roughness={0.6} /></mesh>

          {/* Hair is deliberately silhouette-led: short cuts are clipped for masculine bases,
              while feminine bases keep their own fringe, length and braid/ponytail shapes. */}
          <mesh position={[0, masculineShortCut ? 0.34 : 0.31, -0.015]} scale={masculineShortCut ? [0.8, 0.43, 0.73] : [0.79, 0.54, 0.72]} castShadow><sphereGeometry args={[0.55, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.62]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>
          {masculineShortCut ? <group>
            <mesh position={[-0.12, 0.24, 0.35]} rotation={[0, 0, style === "swept" ? -0.38 : -0.12]} scale={[0.39, 0.15, 0.12]}><sphereGeometry args={[0.5, 28, 20]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>
            <mesh position={[0.18, 0.2, 0.35]} rotation={[0, 0, style === "swept" ? 0.42 : 0.14]} scale={[0.28, 0.12, 0.11]}><sphereGeometry args={[0.5, 28, 20]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>
            {style === "fade" && <group>{[-1, 1].map(side => <mesh key={side} position={[side * 0.43, 0.03, 0.02]} scale={[0.1, 0.22, 0.17]}><sphereGeometry args={[0.5, 20, 18]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>)}</group>}
            {style === "swept" && <mesh position={[0.16, 0.49, 0.12]} rotation={[0, 0, -0.42]}><coneGeometry args={[0.15, 0.36, 12]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>}
            {style === "mohawk" && <mesh position={[0, 0.55, 0.02]}><coneGeometry args={[0.1, 0.5, 10]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>}
            {(style === "spiky" || style === "undercut") && [-0.25, -0.06, 0.14, 0.32].map((x, i) => <mesh key={x} position={[x, 0.52 + (i % 2) * 0.045, 0.02]} rotation={[0, 0, (i - 1.5) * -0.22]}><coneGeometry args={[0.11, 0.3, 12]} /><meshStandardMaterial color={hair} roughness={0.92} /></mesh>)}
            <mesh position={[-0.46, 0.02, 0.03]} scale={[0.12, 0.31, 0.14]}><sphereGeometry args={[0.5, 20, 20]} /><meshStandardMaterial color={hair} /></mesh>
            <mesh position={[0.46, 0.02, 0.03]} scale={[0.12, 0.31, 0.14]}><sphereGeometry args={[0.5, 20, 20]} /><meshStandardMaterial color={hair} /></mesh>
          </group> : <group>
            {!(style === "afro" || style === "curly") && <>
              <mesh position={[-0.45, -0.12, -0.015]} scale={[0.17, style === "long" || style === "ponytail" || style === "braids" || style === "soft" ? 0.85 : 0.5, 0.2]}><sphereGeometry args={[0.5, 22, 22]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>
              <mesh position={[0.45, -0.12, -0.015]} scale={[0.17, style === "long" || style === "ponytail" || style === "braids" || style === "soft" ? 0.85 : 0.5, 0.2]}><sphereGeometry args={[0.5, 22, 22]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>
            </>}
            {style === "long" && <mesh position={[0, -0.2, -0.2]} scale={[0.58, 0.75, 0.22]}><sphereGeometry args={[0.5, 24, 24]} /><meshStandardMaterial color={hair} roughness={0.92} /></mesh>}
            {style === "bob" && <mesh position={[0, -0.25, -0.17]} scale={[0.66, 0.5, 0.28]}><sphereGeometry args={[0.5, 24, 24]} /><meshStandardMaterial color={hair} roughness={0.92} /></mesh>}
            {style === "soft" && <group>
              <mesh position={[0,-0.28,-0.18]} scale={[0.62,0.56,0.25]}><sphereGeometry args={[0.5,24,24]}/><meshStandardMaterial color={hair} roughness={0.92}/></mesh>
              <mesh position={[-0.16,0.23,0.33]} rotation={[0,0,-0.16]} scale={[0.31,0.16,0.12]}><sphereGeometry args={[0.5,24,20]}/><meshStandardMaterial color={hair} roughness={0.9}/></mesh>
              <mesh position={[0.17,0.2,0.34]} rotation={[0,0,0.18]} scale={[0.29,0.15,0.12]}><sphereGeometry args={[0.5,24,20]}/><meshStandardMaterial color={hair} roughness={0.9}/></mesh>
            </group>}
            {style === "ponytail" && <group><mesh position={[0.03, -0.16, -0.43]} rotation={[0.2, 0, -0.08]}><capsuleGeometry args={[0.13, 0.62, 8, 16]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh><mesh position={[0, 0.05, -0.22]}><torusGeometry args={[0.13, 0.025, 8, 24]} /><meshStandardMaterial color={accent} metalness={0.5} /></mesh></group>}
            {style === "braids" && <group>{[-1, 1].map(side => <group key={side} position={[side * 0.43, -0.12, -0.015]}>{Array.from({length:5}, (_, i) => <mesh key={i} position={[0, -i * 0.13, 0.03]} scale={[0.12 - i * 0.008, 0.12, 0.14]}><sphereGeometry args={[0.5, 18, 16]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>)}</group>)}</group>}
            {style === "afro" || style === "curly" ? <group>{Array.from({length:17}, (_, i) => { const a = i * Math.PI * 2 / 17; return <mesh key={i} position={[Math.cos(a)*0.34, 0.35 + (i%3)*0.035, Math.sin(a)*0.29]} scale={[0.22,0.22,0.22]}><sphereGeometry args={[0.5,18,16]} /><meshStandardMaterial color={hair} roughness={0.92} /></mesh>; })}</group> : null}
          </group>}


          {headAccessory === "antlers" && <group position={[0, 0.42, -0.035]}>
            {[-1, 1].map((side) => <group key={side} position={[side * 0.27, 0, 0]}>
              <mesh position={[side * 0.025, 0.13, 0]} rotation={[0, 0, -side * 0.18]}><coneGeometry args={[0.07, 0.38, 9]}/><meshStandardMaterial color={accent} metalness={0.54} roughness={0.28}/></mesh>
              <mesh position={[side * 0.14, 0.26, -0.015]} rotation={[0, 0, -side * 0.72]}><coneGeometry args={[0.052, 0.27, 8]}/><meshStandardMaterial color={accent} metalness={0.54} roughness={0.28}/></mesh>
              <mesh position={[side * 0.22, 0.39, -0.025]} rotation={[0, 0, -side * 0.9]}><coneGeometry args={[0.038, 0.2, 8]}/><meshStandardMaterial color={accent} metalness={0.54} roughness={0.28}/></mesh>
            </group>)}
          </group>}
          
          {headAccessory === "glasses" && <group position={[0, 0.055, 0.45]}>
            <mesh position={[-0.155, 0, 0]}><torusGeometry args={[0.105, 0.014, 8, 28]} /><meshStandardMaterial color="#332b46" metalness={0.5} roughness={0.3} /></mesh>
            <mesh position={[0.155, 0, 0]}><torusGeometry args={[0.105, 0.014, 8, 28]} /><meshStandardMaterial color="#332b46" metalness={0.5} roughness={0.3} /></mesh>
            <mesh><boxGeometry args={[0.1, 0.018, 0.018]} /><meshStandardMaterial color="#332b46" /></mesh>
          </group>}
          {headAccessory === "halo" && <group position={[0,0.73,-0.2]}><mesh rotation={[0.2,0,0]}><torusGeometry args={[0.3,0.025,10,36]} /><meshStandardMaterial color={accent} metalness={0.65} roughness={0.2} emissive={accent} emissiveIntensity={0.2} /></mesh></group>}
          {headAccessory === "crown" && <group position={[0, 0.64, -0.035]}>
            <mesh position={[0, 0.015, 0]}><cylinderGeometry args={[0.22, 0.245, 0.095, 16]} /><meshStandardMaterial color="#a96e20" metalness={0.84} roughness={0.2} /></mesh>
            <mesh position={[0, -0.025, 0]}><torusGeometry args={[0.231, 0.025, 10, 48]} /><meshStandardMaterial color="#ffe6a0" metalness={0.78} roughness={0.18} /></mesh>
            {[-0.19, -0.095, 0, 0.095, 0.19].map((x, i) => <group key={x} position={[x, 0.095, 0]}>
              <mesh position={[0, 0.055 + (i === 2 ? 0.055 : i % 2 ? 0.025 : 0), 0]}><coneGeometry args={[0.055, i === 2 ? 0.24 : 0.17, 5]} /><meshStandardMaterial color="#f4c54e" metalness={0.78} roughness={0.2} /></mesh>
              <mesh position={[0, 0.02, 0.055]}><sphereGeometry args={[0.026, 12, 10]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} metalness={0.38} roughness={0.2} /></mesh>
            </group>)}
            <mesh position={[0, 0.03, 0.245]}><octahedronGeometry args={[0.072, 0]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} metalness={0.4} roughness={0.18} /></mesh>
          </group>}
          {headAccessory === "visor" && <group position={[0, 0.08, 0.43]}><mesh scale={[0.42,0.13,0.045]}><sphereGeometry args={[1,24,18]} /><meshStandardMaterial color={accent} metalness={0.72} roughness={0.18} transparent opacity={0.88} emissive={accent} emissiveIntensity={0.24} /></mesh><mesh position={[0,-0.12,0]}><boxGeometry args={[0.52,0.04,0.06]} /><meshStandardMaterial color={dark} metalness={0.6} roughness={0.3} /></mesh></group>}
          {headAccessory === "mask" && <mesh position={[0,-0.17,0.39]} scale={[0.37,0.18,0.1]}><sphereGeometry args={[1,24,18]} /><meshStandardMaterial color={avatar.secondary || "#242235"} roughness={0.45} /></mesh>}
          {headAccessory === "horns" && <group position={[0,0.43,-0.02]}>{[-1,1].map(side=><mesh key={side} position={[side*0.31,0.1,-0.01]} rotation={[0,0,side*0.28]}><coneGeometry args={[0.1,0.38,12]} /><meshStandardMaterial color={accent} metalness={0.25} roughness={0.42} /></mesh>)}</group>}
          {headAccessory === "headphones" && <group position={[0, 0.17, -0.09]}>
            {/* Headband clears the top hair silhouette; ear cups sit outside both temples. */}
            <mesh position={[0, 0.015, 0]}><torusGeometry args={[0.455, 0.045, 14, 64, Math.PI]} /><meshStandardMaterial color={avatar.secondary || "#29243d"} roughness={0.3} metalness={0.48} /></mesh>
            <mesh position={[0, 0.02, -0.012]}><torusGeometry args={[0.405, 0.014, 10, 56, Math.PI]} /><meshStandardMaterial color={accent} metalness={0.72} roughness={0.2} /></mesh>
            {[-1, 1].map((side) => <group key={side} position={[side * 0.49, -0.11, 0.13]}>
              <mesh scale={[0.15, 0.18, 0.12]}><capsuleGeometry args={[0.5, 0.42, 8, 16]} /><meshStandardMaterial color={avatar.secondary || "#29243d"} metalness={0.48} roughness={0.26} /></mesh>
              <mesh position={[0, 0, 0.086]} scale={[0.84, 0.84, 0.42]}><cylinderGeometry args={[0.102, 0.102, 0.035, 32]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.38} metalness={0.62} roughness={0.2} /></mesh>
              <mesh position={[0, 0, 0.112]}><circleGeometry args={[0.032, 24]} /><meshBasicMaterial color={shirt} /></mesh>
            </group>)}
          </group>}
        </group>
      </group>
    </group>
  );
}

const typeLabel = (avatar = {}) => avatar.type === "boy" ? "Boy" : "Girl";

export default function Avatar3D({ avatar, compact = false, className = "", mood = "idle" }) {
  return (
    <div className={`avatar3d ${compact ? "compact" : ""} ${className}`.trim()}>
      <Canvas fallback={<div className="avatar3d-fallback" role="img" aria-label={`${typeLabel(avatar)} avatar preview`}>3D preview unavailable</div>} camera={{ position: [0, compact ? 1.2 : 1.16, compact ? 4.8 : 4.65], fov: 34 }} dpr={compact ? [1, 1.25] : [1, 1.7]} shadows={!compact} gl={{ antialias: !compact, alpha: true, powerPreference: compact ? "high-performance" : "high-performance" }}>
        {!compact && <color attach="background" args={["#f1edff"]} />}
        <ambientLight intensity={1.05} />
        <directionalLight position={[3, 5, 4]} intensity={2.15} castShadow={!compact} shadow-mapSize-width={768} shadow-mapSize-height={768} />
        <directionalLight position={[-3, 2, -2]} intensity={0.7} color="#a58aff" />
        <pointLight position={[0, 2.5, 2]} intensity={0.35} color="#fff0d5" />
        <Suspense fallback={null}>
          <Character avatar={avatar} idle mood={mood} />
          {!compact && <ContactShadows position={[0, -0.94, 0]} opacity={0.24} scale={3.4} blur={2.2} far={3} />}
        </Suspense>
        {!compact && <OrbitControls enablePan={false} minDistance={3.7} maxDistance={5.3} minPolarAngle={Math.PI / 3.2} maxPolarAngle={Math.PI / 1.85} />}
      </Canvas>
    </div>
  );
}
