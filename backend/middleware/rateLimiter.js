import rateLimit from 'express-rate-limit';

const handler = (req, res, next, options) => {
  res.status(options.statusCode).json({ error: 'Too many requests, please try again later' });
};

export const createNoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 20,
  handler,
});

export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 60,
  handler,
});

export const readLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 200,
  handler,
});
