import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

interface ScoreDonutProps {
  score: number;
  size?: number;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'error';
}

/** Hollow pie (donut) with the alignment score centered. */
export function ScoreDonut({ score, size = 44 }: ScoreDonutProps) {
  const theme = useTheme();
  const value = clampScore(score);
  const tone = scoreTone(value);
  const color = theme.palette[tone].main;
  const track =
    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const stroke = Math.max(3, Math.round(size * 0.12));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <Box
      role="img"
      aria-label={`Alignment score: ${value} out of 100`}
      title={`${value}/100`}
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.45s ease' }}
        />
      </svg>
      <Typography
        component="span"
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: size >= 44 ? '0.75rem' : '0.65rem',
          lineHeight: 1,
          color,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
