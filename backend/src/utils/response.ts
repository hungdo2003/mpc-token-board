import { Response } from "express";

export function success<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}

export function paginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  res.json({
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

export function fail(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, error: message });
}
