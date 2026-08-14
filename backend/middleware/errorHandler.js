export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let statusCode = 500;
  let message = err.message || 'Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  } else if (err.status) {
    statusCode = err.status;
  } else if (res.statusCode && res.statusCode !== 200) {
    statusCode = res.statusCode;
  }

  res.status(statusCode).json({
    error: message
  });
};
