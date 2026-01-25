import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface AppleLogoProps {
  size?: number;
  color?: string;
}

export function AppleLogo({ size = 18, color = '#000000' }: AppleLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zm-3.95-18.4c2.43 1.73 2.84 4.98.44 6.34-2.66-1.64-3.03-4.54-.44-6.34z"
        fill={color}
      />
    </Svg>
  );
}
