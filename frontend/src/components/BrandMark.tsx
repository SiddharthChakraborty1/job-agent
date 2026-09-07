import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';

interface BrandMarkProps {
  /** Hide the wordmark on narrow screens when space is tight. */
  compact?: boolean;
  size?: number;
}

export function BrandMark({ compact = false, size = 30 }: BrandMarkProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'white',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          boxShadow: (theme) => `0 4px 12px ${theme.palette.primary.main}40`,
        }}
      >
        <WorkOutlineOutlinedIcon sx={{ fontSize: size * 0.55 }} />
      </Box>
      <Typography
        component="span"
        sx={{
          fontWeight: 700,
          fontSize: size > 34 ? '1.15rem' : '0.95rem',
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
          display: compact ? { xs: 'none', md: 'block' } : 'block',
        }}
      >
        Resume Job Finder
      </Typography>
    </Box>
  );
}
