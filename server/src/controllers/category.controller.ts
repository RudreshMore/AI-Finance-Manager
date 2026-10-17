import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { ApiResponse } from '../utils/ApiResponse';
import { CategoryType } from '@prisma/client';

export class CategoryController {
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = req.query.type as CategoryType | undefined;
      const categories = await CategoryService.getCategories(req.user!.id, type);
      ApiResponse.success(res, categories, 'Categories retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.getCategoryById(
        req.user!.id,
        req.params.id as string
      );
      ApiResponse.success(res, category, 'Category retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.createCategory(req.user!.id, req.body);
      ApiResponse.created(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await CategoryService.updateCategory(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      ApiResponse.success(res, updated, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CategoryService.deleteCategory(
        req.user!.id,
        req.params.id as string
      );
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }
}
