export const API_ENDPOINTS = {
  USERS: '/users',
  AUTH: '/auth',
  HEALTH: '/health',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;
