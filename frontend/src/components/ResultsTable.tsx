import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import { JobCard } from './JobCard';
import type { ValidatedJobResult, UnscoredJobResult } from '../types';

interface ResultsTableProps {
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings?: string[];
}

const TIER_COLORS: Record<string, 'success' | 'info' | 'secondary'> = {
  startup: 'success',
  midlevel: 'info',
  enterprise: 'secondary',
};

const stickyHeadCellSx = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  bgcolor: 'background.paper',
  boxShadow: (theme: { palette: { divider: string } }) =>
    `inset 0 -1px 0 ${theme.palette.divider}`,
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

export function ResultsTable({ validated, unscored, warnings = [] }: ResultsTableProps) {
  const isEmpty = validated.length === 0 && unscored.length === 0;

  return (
    <Box
      sx={{
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {warnings.length > 0 && (
        <Alert severity="warning" role="status" sx={{ mb: 2, flexShrink: 0 }}>
          {warnings.map((w, i) => (
            <Typography key={i} variant="body2" sx={{ mt: i === 0 ? 0 : 0.5 }}>
              {w}
            </Typography>
          ))}
        </Alert>
      )}

      {isEmpty ? (
        <Paper
          role="status"
          elevation={0}
          sx={{
            textAlign: 'center',
            py: 6,
            px: 2,
            bgcolor: 'background.default',
            borderRadius: 3,
          }}
        >
          <SearchOffOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No matching jobs found
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Try uploading a different resume or check back later.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            pr: 0.5,
          }}
        >
          {validated.length > 0 && (
            <Box component="section" aria-labelledby="validated-heading" sx={{ mb: 4 }}>
              <Typography
                id="validated-heading"
                variant="h5"
                component="h2"
                sx={{ mb: 2, fontWeight: 600 }}
              >
                Matched Jobs
                <Chip label={validated.length} size="small" color="primary" sx={{ ml: 1.5 }} />
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={stickyHeadCellSx}>Posted Date</TableCell>
                      <TableCell sx={stickyHeadCellSx}>Job Title</TableCell>
                      <TableCell sx={stickyHeadCellSx}>Company</TableCell>
                      <TableCell sx={stickyHeadCellSx}>Tier</TableCell>
                      <TableCell align="center" sx={stickyHeadCellSx}>
                        Score
                      </TableCell>
                      <TableCell sx={{ ...stickyHeadCellSx, minWidth: 200 }}>Justification</TableCell>
                      <TableCell align="center" sx={stickyHeadCellSx}>
                        Link
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validated.map((job) => (
                      <TableRow
                        key={job.job_url}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(job.posted_date)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {job.job_title}
                          </Typography>
                        </TableCell>
                        <TableCell>{job.company_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={job.organisation_tier}
                            size="small"
                            color={TIER_COLORS[job.organisation_tier] ?? 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={job.alignment_score}
                            size="small"
                            color={scoreColor(job.alignment_score)}
                            sx={{ fontWeight: 600, minWidth: 40 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {job.justification}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Link
                            href={job.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.25,
                              fontSize: '0.875rem',
                            }}
                          >
                            Open
                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {unscored.length > 0 && (
            <Box component="section" aria-labelledby="unscored-heading">
              <Typography
                id="unscored-heading"
                variant="h5"
                component="h2"
                sx={{ mb: 0.5, fontWeight: 600 }}
              >
                Unscored Jobs
                <Chip label={unscored.length} size="small" sx={{ ml: 1.5 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These listings could not be scored against your resume.
              </Typography>
              {unscored.map((job) => (
                <JobCard key={job.job_url} job={job} scored={false} />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
