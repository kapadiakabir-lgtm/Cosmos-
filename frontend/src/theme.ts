export const colors = {
  bg: '#0B0E14',
  surface: '#171C28',
  surfaceElevated: '#1E2536',
  gold: '#F2C94C',
  goldHover: '#E5B03C',
  nightRed: '#E03E3E',
  nebula: '#2D1B4E',
  starlight: '#3B82F6',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0E14',
  border: '#2A3241',
  borderFocus: '#F2C94C',
};

export const media = {
  milky_way: 'https://images.unsplash.com/photo-1677120111814-7d8ca1cfd902?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
  nebula: 'https://images.unsplash.com/photo-1650365449083-b3113ff48337?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
  andromeda: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
  aurora: 'https://images.unsplash.com/photo-1723458226640-69fd1b7a355d?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
  meteor_shower: 'https://images.unsplash.com/photo-1544800360-4e2e14eb7558?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
  jupiter: 'https://images.unsplash.com/photo-1711989327929-60386c8d3a66?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
  telescope: 'https://images.unsplash.com/photo-1603051740465-23dc9bc6da38?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
  lunar_eclipse: 'https://images.unsplash.com/photo-1742770264974-731ca9a7589d?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
};

export const getEventImage = (key: string): string => {
  return (media as any)[key] || media.milky_way;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fonts = {
  serif: 'serif',
  sans: 'System',
};
