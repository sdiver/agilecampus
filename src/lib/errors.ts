// 可预期业务错误：message 可直接展示给用户
export class AppError extends Error {}

export class ForbiddenError extends AppError {
  constructor(message = "没有权限执行此操作") {
    super(message);
  }
}
