const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return;

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
};

export const sanitizeInput = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  next();
};
