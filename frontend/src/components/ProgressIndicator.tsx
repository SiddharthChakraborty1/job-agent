import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';

interface ProgressIndicatorProps {
  message: string;
  onCancel?: () => void;
}

export function ProgressIndicator({ message, onCancel }: ProgressIndicatorProps) {
  return (
    <Paper
      role="status"
      aria-live="polite"
      elevation={2}
      sx={{
        maxWidth: 480,
        mx: 'auto',
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        textAlign: 'center',
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress size={56} thickness={4} />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AutoAwesomeIcon color="primary" sx={{ fontSize: 24 }} />
        </Box>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
        {message || 'Processing...'}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Analyzing your resume and matching jobs...
      </Typography>
      {onCancel && (
        <Button variant="outlined" color="inherit" startIcon={<CloseIcon />} onClick={onCancel}>
          Cancel search
        </Button>
      )}
    </Paper>
  );
}
