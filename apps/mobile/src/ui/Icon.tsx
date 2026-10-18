// Small line-icon set drawn with react-native-svg (Feather-style, 24x24, stroke based).
// Kept in-house so the app doesn't depend on @expo/vector-icons (being deprecated by Expo).
import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { useTheme } from './theme';

type El =
  | ['p', string]
  | ['c', number, number, number]
  | ['l', number, number, number, number]
  | ['pl', string]
  | ['pg', string]
  | ['r', number, number, number, number, number];

const ICONS = {
  home: [['p', 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'], ['pl', '9 22 9 12 15 12 15 22']],
  calendar: [['r', 3, 4, 18, 18, 2], ['l', 16, 2, 16, 6], ['l', 8, 2, 8, 6], ['l', 3, 10, 21, 10]],
  list: [['l', 8, 6, 21, 6], ['l', 8, 12, 21, 12], ['l', 8, 18, 21, 18], ['l', 3, 6, 3.01, 6], ['l', 3, 12, 3.01, 12], ['l', 3, 18, 3.01, 18]],
  trending: [['pl', '23 6 13.5 15.5 8.5 10.5 1 18'], ['pl', '17 6 23 6 23 12']],
  user: [['p', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'], ['c', 12, 7, 4]],
  users: [['p', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'], ['c', 9, 7, 4], ['p', 'M23 21v-2a4 4 0 0 0-3-3.87'], ['p', 'M16 3.13a4 4 0 0 1 0 7.75']],
  clock: [['c', 12, 12, 10], ['pl', '12 6 12 12 16 14']],
  phone: [['p', 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z']],
  check: [['pl', '20 6 9 17 4 12']],
  checkCircle: [['p', 'M22 11.08V12a10 10 0 1 1-5.93-9.14'], ['pl', '22 4 12 14.01 9 11.01']],
  x: [['l', 18, 6, 6, 18], ['l', 6, 6, 18, 18]],
  chevronRight: [['pl', '9 18 15 12 9 6']],
  chevronLeft: [['pl', '15 18 9 12 15 6']],
  chevronDown: [['pl', '6 9 12 15 18 9']],
  arrowRight: [['l', 5, 12, 19, 12], ['pl', '12 5 19 12 12 19']],
  plus: [['l', 12, 5, 12, 19], ['l', 5, 12, 19, 12]],
  minus: [['l', 5, 12, 19, 12]],
  bell: [['p', 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'], ['p', 'M13.73 21a2 2 0 0 1-3.46 0']],
  upload: [['p', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'], ['pl', '17 8 12 3 7 8'], ['l', 12, 3, 12, 15]],
  file: [['p', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'], ['pl', '14 2 14 8 20 8'], ['l', 16, 13, 8, 13], ['l', 16, 17, 8, 17]],
  image: [['r', 3, 3, 18, 18, 2], ['c', 8.5, 8.5, 1.5], ['pl', '21 15 16 10 5 21']],
  trash: [['pl', '3 6 5 6 21 6'], ['p', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']],
  logout: [['p', 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'], ['pl', '16 17 21 12 16 7'], ['l', 21, 12, 9, 12]],
  sun: [['c', 12, 12, 5], ['l', 12, 1, 12, 3], ['l', 12, 21, 12, 23], ['l', 4.22, 4.22, 5.64, 5.64], ['l', 18.36, 18.36, 19.78, 19.78], ['l', 1, 12, 3, 12], ['l', 21, 12, 23, 12], ['l', 4.22, 19.78, 5.64, 18.36], ['l', 18.36, 5.64, 19.78, 4.22]],
  moon: [['p', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z']],
  card: [['r', 1, 4, 22, 16, 2], ['l', 1, 10, 23, 10]],
  star: [['pg', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2']],
  pin: [['p', 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'], ['c', 12, 10, 3]],
  wifiOff: [['l', 1, 1, 23, 23], ['p', 'M16.72 11.06A10.94 10.94 0 0 1 19 12.55'], ['p', 'M5 12.55a10.94 10.94 0 0 1 5.17-2.39'], ['p', 'M10.71 5.05A16 16 0 0 1 22.58 9'], ['p', 'M1.42 9a15.91 15.91 0 0 1 4.7-2.88'], ['p', 'M8.53 16.11a6 6 0 0 1 6.95 0'], ['l', 12, 20, 12.01, 20]],
  alert: [['c', 12, 12, 10], ['l', 12, 8, 12, 12], ['l', 12, 16, 12.01, 16]],
  refresh: [['pl', '23 4 23 10 17 10'], ['pl', '1 20 1 14 7 14'], ['p', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15']],
  lock: [['r', 3, 11, 18, 11, 2], ['p', 'M7 11V7a5 5 0 0 1 10 0v4']],
  external: [['p', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'], ['pl', '15 3 21 3 21 9'], ['l', 10, 14, 21, 3]],
  edit: [['p', 'M12 20h9'], ['p', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']],
  award: [['c', 12, 8, 7], ['pl', '8.21 13.89 7 23 12 20 17 23 15.79 13.88']],
  zap: [['pg', '13 2 3 14 12 14 11 22 21 10 12 10 13 2']],
  car: [['p', 'M3 13l2-6h14l2 6v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z'], ['l', 3, 13, 21, 13], ['c', 7.5, 15.5, 1], ['c', 16.5, 15.5, 1]],
  message: [['p', 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z']],
  slash: [['c', 12, 12, 10], ['l', 4.93, 4.93, 19.07, 19.07]],
  play: [['pg', '6 3 20 12 6 21 6 3']],
  book: [['p', 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'], ['p', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z']],
  monitor: [['r', 2, 3, 20, 14, 2], ['l', 8, 21, 16, 21], ['l', 12, 17, 12, 21]],
  hash: [['l', 4, 9, 20, 9], ['l', 4, 15, 20, 15], ['l', 10, 3, 8, 21], ['l', 16, 3, 14, 21]],
  sparkle: [['p', 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z'], ['p', 'M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z']],
  receipt: [['p', 'M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2z'], ['l', 8, 9, 16, 9], ['l', 8, 13, 14, 13]],
} satisfies Record<string, El[]>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  color,
  strokeWidth = 2,
  fill,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  const t = useTheme();
  const stroke = color ?? t.c.text;
  const els = ICONS[name] as El[];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {els.map((e, i) => {
        switch (e[0]) {
          case 'p':
            return <Path key={i} d={e[1]} fill={fill ?? 'none'} />;
          case 'c':
            return <Circle key={i} cx={e[1]} cy={e[2]} r={e[3]} fill={fill ?? 'none'} />;
          case 'l':
            return <Line key={i} x1={e[1]} y1={e[2]} x2={e[3]} y2={e[4]} />;
          case 'pl':
            return <Polyline key={i} points={e[1]} fill="none" />;
          case 'pg':
            return <Polygon key={i} points={e[1]} fill={fill ?? 'none'} />;
          case 'r':
            return <Rect key={i} x={e[1]} y={e[2]} width={e[3]} height={e[4]} rx={e[5]} fill={fill ?? 'none'} />;
          default:
            return null;
        }
      })}
    </Svg>
  );
}
