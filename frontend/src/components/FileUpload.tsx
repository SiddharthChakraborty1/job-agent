import { useCallback, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SearchIcon from '@mui/icons-material/Search';

interface FileUploadProps {
  onSubmit: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_MIME = ['application/pdf', 'text/plain'];
const ACCEPTED_EXT = ['.pdf', '.txt'];

function isValidFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_MIME.includes(file.type) || ACCEPTED_EXT.includes(ext);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ onSubmit, disabled = false }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!isValidFile(file)) {
      setFileError('Only PDF and plain text (.txt) files are accepted.');
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleSubmit = () => {
    if (selectedFile) onSubmit(selectedFile);
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto' }}>
      <Paper
        role="button"
        tabIndex={0}
        aria-label="Upload resume — drag and drop or click to browse"
        elevation={isDragging ? 8 : 2}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          cursor: 'pointer',
          border: 2,
          borderStyle: 'dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          bgcolor: isDragging ? (theme) => theme.palette.action.selected : 'background.paper',
          transition: 'all 0.25s ease',
          '&:hover': {
            borderColor: 'primary.light',
            bgcolor: (theme) => theme.palette.action.hover,
            transform: 'translateY(-2px)',
            boxShadow: 4,
          },
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'white',
            mb: 2,
            opacity: isDragging ? 1 : 0.9,
          }}
        >
          <CloudUploadOutlinedIcon sx={{ fontSize: 36 }} />
        </Box>
        <Typography variant="body1" color="text.primary" sx={{ mb: 0.5 }}>
          Drag &amp; drop your resume here, or{' '}
          <Typography component="span" color="primary" sx={{ fontWeight: 600 }}>
            click to browse
          </Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Accepted: PDF, TXT · Max 5 MB
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          style={{ display: 'none' }}
          onChange={handleInputChange}
          aria-hidden="true"
        />
      </Paper>

      {fileError && (
        <Alert severity="error" role="alert" sx={{ mt: 2 }}>
          {fileError}
        </Alert>
      )}

      {selectedFile && (
        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'background.paper',
          }}
        >
          <DescriptionOutlinedIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {selectedFile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatSize(selectedFile.size)}
            </Typography>
          </Box>
        </Paper>
      )}

      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        startIcon={<SearchIcon />}
        onClick={handleSubmit}
        disabled={!selectedFile || disabled}
        aria-disabled={!selectedFile || disabled}
        sx={{ mt: 2.5, py: 1.5 }}
      >
        Find Jobs
      </Button>
    </Box>
  );
}
