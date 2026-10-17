import { Response } from 'express';

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200
  ) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data,
    });
  }

  static created<T>(res: Response, data: T, message = 'Resource created') {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}
