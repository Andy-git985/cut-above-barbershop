import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

const CircleProgress = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        mt: 8,
      }}
    >
      <CircularProgress sx={{ size: 200 }} />
    </Box>
  );
};

export default CircleProgress;
