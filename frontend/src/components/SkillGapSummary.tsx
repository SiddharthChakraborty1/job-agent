import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
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
  // Keyed by content so a new set of gaps reappears after a dismissal.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const key = gapsKey(gaps);

  if (gaps.length === 0 || dismissedKey === key) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        flexShrink: 0,
        mb: 1.25,
        py: 0.85,
        pl: 1.25,
        pr: 0.75,
        borderRadius: 3,
        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
      }}
    >
      <SchoolOutlinedIcon color="primary" sx={{ fontSize: 18, flexShrink: 0 }} />
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
      >
        Skills to add
      </Typography>
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{ flexWrap: 'wrap', flex: 1, minWidth: 0 }}
      >
        {gaps.map((gap) => (
          <Tooltip key={gap.skill} title={`Appears in ${gap.percentage}% of matched jobs`}>
            <Chip
              label={`${gap.skill} · ${gap.percentage}%`}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Tooltip>
        ))}
      </Stack>
      <IconButton
        size="small"
        aria-label="Dismiss skill gaps"
        onClick={() => setDismissedKey(key)}
        sx={{ p: 0.5, color: 'text.disabled', flexShrink: 0 }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}
