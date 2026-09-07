import { useEffect, useState } from 'react';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import type { SkillGap } from '../types';

interface SkillGapSummaryProps {
  gaps: SkillGap[];
}

function gapsKey(gaps: SkillGap[]): string {
  return gaps.map((g) => `${g.skill}:${g.percentage}`).join('|');
}

export function SkillGapSummary({ gaps }: SkillGapSummaryProps) {
  const [dismissed, setDismissed] = useState(false);
  const key = gapsKey(gaps);

  useEffect(() => {
    setDismissed(false);
  }, [key]);

  if (gaps.length === 0 || dismissed) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        flexWrap: 'wrap',
        alignItems: 'center',
        flexShrink: 0,
        mb: 1,
        py: 0.5,
        pl: 1,
        pr: 0.5,
        borderRadius: 2,
        border: (theme) =>
          `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      }}
    >
      <SchoolOutlinedIcon color="primary" sx={{ fontSize: 18 }} />
      <Typography variant="body2" sx={{ fontWeight: 600, mr: 0.5 }}>
        Skill gaps
      </Typography>
      {gaps.map((gap) => (
        <Chip
          key={gap.skill}
          label={`${gap.skill} (${gap.percentage}%)`}
          color="primary"
          variant="outlined"
          size="small"
          sx={{ fontWeight: 500, height: 24 }}
        />
      ))}
      <IconButton
        size="small"
        aria-label="Dismiss skill gaps"
        onClick={() => setDismissed(true)}
        sx={{ ml: 'auto', p: 0.5 }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Stack>
  );
}
