import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';

interface ProgressIndicatorProps {
  message: string;
  onCancel?: () => void;
}

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.55; }
  70% { transform: scale(1.6); opacity: 0; }
  100% { transform: scale(1.6); opacity: 0; }
`;

const STEPS = [
  'Reading your resume',
  'Searching job boards',
  'Scoring each role against your profile',
];

export function ProgressIndicator({ message, onCancel }: ProgressIndicatorProps) {
  return (
    <Paper
      role="status"
      aria-live="polite"
      elevation={0}
      sx={{
        maxWidth: 520,
        width: '100%',
        mx: 'auto',
        p: { xs: 3, sm: 4 },
        borderRadius: 4,
        textAlign: 'center',
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.35),
            animation: `${pulse} 2s ease-out infinite`,
          }}
        />
        <Box
          sx={{
            position: 'relative',
            width: 54,
            height: 54,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 26 }} />
        </Box>
      </Box>

      <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 0.5 }}>
        {message || 'Working on it…'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This usually takes a minute or two.
      </Typography>

      <LinearProgress
        sx={{
          mt: 2.5,
          height: 6,
          borderRadius: 999,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          '& .MuiLinearProgress-bar': { borderRadius: 999 },
        }}
      />

      <Box
        sx={{
          mt: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          textAlign: 'left',
        }}
      >
        {STEPS.map((step) => (
          <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                opacity: 0.6,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {step}
            </Typography>
          </Box>
        ))}
      </Box>

      {onCancel && (
        <Button
          variant="text"
          color="inherit"
          size="small"
          startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
          onClick={onCancel}
          sx={{ mt: 2, color: 'text.secondary' }}
        >
          Cancel search
        </Button>
      )}
    </Paper>
  );
}
