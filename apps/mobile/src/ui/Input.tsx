import React, { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from './theme';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: IconName;
  prefix?: string;
};

export const Input = forwardRef<TextInput, Props>(function Input({ label, error, hint, icon, prefix, style, onFocus, onBlur, ...rest }, ref) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="caption" muted>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: rest.multiline ? 'flex-start' : 'center',
          gap: 10,
          minHeight: 54,
          paddingHorizontal: 16,
          paddingVertical: rest.multiline ? 12 : 0,
          borderRadius: t.radius.lg,
          backgroundColor: t.c.surfaceAlt,
          borderWidth: 1.5,
          borderColor: error ? t.c.danger : focused ? t.c.brand : 'transparent',
        }}
      >
        {icon ? <Icon name={icon} size={18} color={t.c.textMuted} /> : null}
        {prefix ? (
          <Text variant="bodyStrong" muted>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={t.c.textFaint}
          selectionColor={t.c.brand}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            { flex: 1, color: t.c.text, fontFamily: t.font.bodyMedium, fontSize: 16, paddingVertical: 12 },
            rest.multiline && { minHeight: 90, textAlignVertical: 'top' },
            style,
          ]}
          {...rest}
        />
      </View>
      {error ? (
        <Text variant="caption" color={t.c.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" faint>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
