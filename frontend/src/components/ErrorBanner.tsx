import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

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
      sx={{ mb: 3, maxWidth: 720, mx: 'auto' }}
    >
      <AlertTitle>Something went wrong</AlertTitle>
      {message}
    </Alert>
  );
}
