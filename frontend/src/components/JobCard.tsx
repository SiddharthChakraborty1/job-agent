import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '../storage/applicationStatus';
import type { ValidatedJobResult, UnscoredJobResult } from '../types';
import { ScoreDonut } from './ScoreDonut';

type JobCardProps =
  | {
      job: ValidatedJobResult;
      scored: true;
      isNew?: boolean;
      applicationStatus: ApplicationStatus;
      onStatusChange: (jobUrl: string, status: ApplicationStatus) => void;
    }
  | {
      job: UnscoredJobResult;
      scored: false;
      isNew?: boolean;
      applicationStatus: ApplicationStatus;
      onStatusChange: (jobUrl: string, status: ApplicationStatus) => void;
    };

const TIER_LABELS: Record<string, string> = {
  startup: 'Startup',
  midlevel: 'Mid-level',
  enterprise: 'Enterprise',
};

const STATUS_COLORS: Record<ApplicationStatus, 'default' | 'info' | 'warning' | 'error'> = {
  not_applied: 'default',
  applied: 'info',
  interviewing: 'warning',
  rejected: 'error',
};

/** Stable pastel hue per company so the same logo colour follows a company around. */
function companyHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Date unknown';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Date unknown';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPicker({
  value,
  onChange,
}: {
  value: ApplicationStatus;
  onChange: (status: ApplicationStatus) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const color = STATUS_COLORS[value];
  const dotColor =
    color === 'default' ? theme.palette.text.disabled : theme.palette[color].main;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        endIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
        sx={{
          borderRadius: 999,
          color: 'text.secondary',
          fontWeight: 600,
          fontSize: '0.75rem',
          py: 0.35,
        }}
      >
        <Box
          component="span"
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: dotColor,
            mr: 0.85,
            flexShrink: 0,
          }}
        />
        {APPLICATION_STATUS_LABELS[value]}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        {APPLICATION_STATUSES.map((status) => {
          const statusColor = STATUS_COLORS[status];
          return (
            <MenuItem
              key={status}
              selected={status === value}
              onClick={() => {
                onChange(status);
                setAnchorEl(null);
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  mr: 1.25,
                  bgcolor:
                    statusColor === 'default'
                      ? 'text.disabled'
                      : `${statusColor}.main`,
                }}
              />
              {APPLICATION_STATUS_LABELS[status]}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export function JobCard(props: JobCardProps) {
  const { job, scored, isNew = false, applicationStatus, onStatusChange } = props;
  const [expanded, setExpanded] = useState(false);
  const score = scored ? (props as { job: ValidatedJobResult }).job.alignment_score : null;
  const justification = scored ? (props as { job: ValidatedJobResult }).job.justification : '';
  const hue = companyHue(job.company_name);
  const longDescription = job.description.length > 180;

  return (
    <Card
      sx={{
        mb: 1.25,
        p: { xs: 1.75, sm: 2 },
        position: 'relative',
        overflow: 'visible',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        ...(isNew && {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.45),
        }),
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 6px 24px rgba(0,0,0,0.45)'
              : '0 6px 24px rgba(15,23,42,0.08)',
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 } }}>
        <Box
          aria-hidden
          sx={{
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 2.5,
            display: { xs: 'none', sm: 'inline-flex' },
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: '1px solid',
            color: (theme) =>
              theme.palette.mode === 'dark' ? `hsl(${hue} 70% 76%)` : `hsl(${hue} 60% 38%)`,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? `hsl(${hue} 42% 17%)` : `hsl(${hue} 70% 95%)`,
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? `hsl(${hue} 38% 26%)` : `hsl(${hue} 55% 88%)`,
          }}
        >
          {initials(job.company_name)}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="a"
                href={job.job_url}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtitle1"
                sx={{
                  display: 'block',
                  fontWeight: 650,
                  lineHeight: 1.3,
                  color: 'text.primary',
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                }}
              >
                {job.job_title}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 0.75,
                  mt: 0.4,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  {job.company_name}
                </Typography>
                <Box
                  component="span"
                  sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }}
                />
                <Typography variant="body2" color="text.secondary">
                  {TIER_LABELS[job.organisation_tier] ?? job.organisation_tier}
                </Typography>
                <Box
                  component="span"
                  sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }}
                />
                <Typography variant="body2" color="text.secondary">
                  {relativeDate(job.posted_date)}
                </Typography>
                {isNew && (
                  <Chip
                    label="New"
                    size="small"
                    color="primary"
                    sx={{ height: 19, fontSize: '0.68rem', ml: 0.25 }}
                  />
                )}
              </Box>
            </Box>

            {score !== null && (
              <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                <ScoreDonut score={score} />
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ display: 'block', fontSize: '0.62rem', mt: 0.25 }}
                >
                  match
                </Typography>
              </Box>
            )}
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              ...(expanded
                ? {}
                : {
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }),
            }}
          >
            {job.description}
          </Typography>

          {longDescription && (
            <Typography
              component="button"
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              variant="caption"
              sx={{
                mt: 0.5,
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </Typography>
          )}

          {scored && justification && (
            <Box
              sx={{
                mt: 1.25,
                pl: 1.25,
                borderLeft: (theme) => `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {justification}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              mt: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <StatusPicker
              value={applicationStatus}
              onChange={(status) => onStatusChange(job.job_url, status)}
            />
            <Button
              size="small"
              variant="text"
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
              sx={{ fontSize: '0.8125rem' }}
            >
              View job
            </Button>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
