import Alert from '@mui/material/Alert';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <Alert
      role="alert"
      severity="error"
      onClose={onDismiss}
      sx={{ mb: 2, maxWidth: 720, mx: 'auto', width: '100%' }}
    >
      {message}
    </Alert>
  );
}
