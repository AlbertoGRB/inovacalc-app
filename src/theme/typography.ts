export const typography = {
  fontFamily: { primary: 'Inter_400Regular', medium: 'Inter_500Medium' },
  weights: { regular: '400' as const, medium: '500' as const },
  sizes: {
    xs: 10, sm: 11, base: 12, md: 13, lg: 14,
    xl: 16, '2xl': 18, '3xl': 22, '4xl': 28,
  },
  letterSpacing: { tight: -0.5, normal: 0, wide: 0.3, wider: 0.5 },
} as const;
