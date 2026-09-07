import { useCallback, useEffect, useRef, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { loadPreferredCities } from '../storage/lastRun';

interface FileUploadProps {
  onSubmit: (file: File, cities: string[]) => void;
  userSub: string;
  initialCities?: string[];
  disabled?: boolean;
}

const ACCEPTED_MIME = ['application/pdf', 'text/plain'];
const ACCEPTED_EXT = ['.pdf', '.txt'];

export const MAX_CITIES = 5;

export const INDIAN_CITIES = [
  'Bangalore',
  'Mumbai',
  'Hyderabad',
  'Pune',
  'Delhi',
  'Gurgaon',
  'Noida',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Remote India',
];

function isValidFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_MIME.includes(file.type) || ACCEPTED_EXT.includes(ext);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  onSubmit,
  userSub,
  initialCities = [],
  disabled = false,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cities, setCities] = useState<string[]>(initialCities);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCities(initialCities.length > 0 ? initialCities : loadPreferredCities(userSub));
    // Join so a new array with the same cities does not reset the picker.
  }, [userSub, initialCities.join('|')]);

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
    if (selectedFile) onSubmit(selectedFile, cities);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 4,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 20px 48px rgba(0,0,0,0.45)'
            : '0 20px 48px rgba(15,23,42,0.07)',
      }}
    >
      {selectedFile ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: 3,
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              flexShrink: 0,
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {selectedFile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatSize(selectedFile.size)} · ready to analyse
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label="Remove selected resume"
            onClick={() => setSelectedFile(null)}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      ) : (
        <Box
          role="button"
          tabIndex={0}
          aria-label="Upload resume — drag and drop or click to browse"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            py: { xs: 3.5, sm: 4.5 },
            px: 2,
            textAlign: 'center',
            cursor: 'pointer',
            borderRadius: 3,
            border: '1.5px dashed',
            borderColor: (theme) =>
              isDragging ? theme.palette.primary.main : theme.palette.divider,
            bgcolor: (theme) =>
              isDragging ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: '50%',
              color: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              mb: 1.5,
            }}
          >
            <CloudUploadOutlinedIcon sx={{ fontSize: 26 }} />
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Drop your resume here, or{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>
              browse
            </Box>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PDF or TXT · up to 5 MB
          </Typography>
        </Box>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        aria-hidden="true"
      />

      {fileError && (
        <Alert severity="error" role="alert" sx={{ mt: 2 }}>
          {fileError}
        </Alert>
      )}

      <Autocomplete
        multiple
        freeSolo
        filterSelectedOptions
        options={INDIAN_CITIES}
        value={cities}
        onChange={(_event, value) => {
          const next = value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
          const unique: string[] = [];
          const seen = new Set<string>();
          for (const city of next) {
            const key = city.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(city);
            if (unique.length >= MAX_CITIES) break;
          }
          setCities(unique);
        }}
        getOptionDisabled={(option) => cities.length >= MAX_CITIES && !cities.includes(option)}
        disabled={disabled}
        size="small"
        sx={{ mt: 2.5 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Preferred cities"
            placeholder={cities.length >= MAX_CITIES ? '' : 'e.g. Bangalore'}
            helperText={`Up to ${MAX_CITIES} cities · leave blank to infer from your resume`}
          />
        )}
      />

      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        startIcon={<SearchIcon />}
        onClick={handleSubmit}
        disabled={!selectedFile || disabled}
        aria-disabled={!selectedFile || disabled}
        sx={{ mt: 2 }}
      >
        Find matching jobs
      </Button>
    </Paper>
  );
}
