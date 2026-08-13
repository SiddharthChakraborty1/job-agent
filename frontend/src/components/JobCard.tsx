import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import type { ValidatedJobResult, UnscoredJobResult } from '../types';

type JobCardProps =
  | { job: ValidatedJobResult; scored: true }
  | { job: UnscoredJobResult; scored: false };

const TIER_COLORS: Record<string, 'success' | 'info' | 'secondary'> = {
  startup: 'success',
  midlevel: 'info',
  enterprise: 'secondary',
};

function scoreColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'error';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Date unknown';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Date unknown' : d.toLocaleDateString();
}

export function JobCard(props: JobCardProps) {
  const { job, scored } = props;
  const tierColor = TIER_COLORS[job.organisation_tier] ?? 'default';

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 600 }}>
            {job.job_title}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            — {job.company_name}
          </Typography>
          <Chip
            label={job.organisation_tier}
            size="small"
            color={tierColor}
            sx={{ textTransform: 'capitalize', fontWeight: 600 }}
          />
          {scored && (
            <Chip
              label={`${(props as { job: ValidatedJobResult }).job.alignment_score}/100`}
              size="small"
              color={scoreColor((props as { job: ValidatedJobResult }).job.alignment_score)}
              aria-label={`Alignment score: ${(props as { job: ValidatedJobResult }).job.alignment_score}`}
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            {formatDate(job.posted_date)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.primary" sx={{ mb: scored ? 1 : 0 }}>
          {job.description}
        </Typography>

        {scored && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {(props as { job: ValidatedJobResult }).job.justification}
            </Typography>
          </>
        )}

        <Link
          href={job.job_url}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 1.5,
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          View Job Posting
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </Link>
      </CardContent>
    </Card>
  );
}
