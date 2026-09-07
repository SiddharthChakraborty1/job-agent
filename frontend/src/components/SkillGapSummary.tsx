import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import type { SkillGap } from '../types';

interface SkillGapSummaryProps {
  gaps: SkillGap[];
}

export function SkillGapSummary({ gaps }: SkillGapSummaryProps) {
  if (gaps.length === 0) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: { xs: 1, sm: 1.25 },
        p: { xs: 1.25, sm: 1.5 },
        flexShrink: 0,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        '@media (max-height: 900px)': { mb: 1, p: 1.25 },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ mb: { xs: 0.75, sm: 1 }, alignItems: 'center' }}>
        <SchoolOutlinedIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
          Skill gaps across matched jobs
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          display: { xs: 'none', lg: 'block' },
          mb: 1.5,
          '@media (max-height: 900px)': { display: 'none' },
        }}
      >
        Skills that show up often in these postings but look weak or missing on your resume —
        good candidates to learn or highlight.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {gaps.map((gap) => (
          <Chip
            key={gap.skill}
            label={`${gap.skill} (${gap.percentage}%)`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 500 }}
          />
        ))}
      </Box>
    </Paper>
  );
}
