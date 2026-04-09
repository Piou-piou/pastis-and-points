import React from 'react';
import { Svg, Circle, Path, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function Logo({ size = 180 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ff4d4d" />
          <Stop offset="100%" stopColor="#b30000" />
        </LinearGradient>
        <LinearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4da6ff" />
          <Stop offset="100%" stopColor="#0066cc" />
        </LinearGradient>
      </Defs>
      
      {/* Background Circle */}
      <Circle cx="100" cy="100" r="95" fill="#f0f0f0" stroke="#ddd" strokeWidth="2" />
      
      {/* Red Boule */}
      <G transform="translate(60, 80)">
        <Circle cx="0" cy="0" r="35" fill="url(#gradRed)" />
        <Path d="M-20,-10 Q0,-25 20,-10" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
        <Path d="M-25,0 Q0,-15 25,0" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
      </G>
      
      {/* Blue Boule */}
      <G transform="translate(130, 110)">
        <Circle cx="0" cy="0" r="35" fill="url(#gradBlue)" />
        <Path d="M-20,-10 Q0,-25 20,-10" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
        <Path d="M-25,0 Q0,-15 25,0" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
      </G>
      
      {/* Cochonnet (Yellow) */}
      <Circle cx="100" cy="125" r="12" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
      
      {/* Decorative lines */}
      <Path d="M40,160 Q100,180 160,160" stroke="#ccc" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  );
}
