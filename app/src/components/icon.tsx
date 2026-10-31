import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export type IconName = SymbolViewProps['name'];

type IconProps = {
  name: IconName;
  size?: number;
  color: ColorValue;
};

// iOS uses SF Symbols; Android and the web use Material Symbols.
export function Icon({ name, size = 24, color }: IconProps) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}
