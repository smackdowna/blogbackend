import express from "express";
import { createBlog, deleteBlog, getAllBlogs, singleBlog, updateBlog } from "../controllers/blogController.js";
import { isAuthenticatedAdmin } from "../middlewares/auth.js";
import singleUpload from "../middlewares/multer.js";
import { createCategoryAndSubCategory, deleteCategory, deleteSubCategory, fetchBlogsByCategory, fetchBlogsBySubCategory, getAllCategories } from "../controllers/category.controller.js";


const router = express.Router();


router.route("/blog/create").post(isAuthenticatedAdmin, singleUpload, createBlog);
router.route("/blog/:id").put(isAuthenticatedAdmin, singleUpload, updateBlog);
router.route("/blog/:id").delete(isAuthenticatedAdmin, deleteBlog);
router.route("/blog").get(getAllBlogs);
router.route("/blog/:id").get(singleBlog);
router.route("/category/create").post(isAuthenticatedAdmin, createCategoryAndSubCategory);
router.route("/category").get(getAllCategories);
router.route("/blog/category/:category").get(fetchBlogsByCategory);
router.route("/category/:category").delete(isAuthenticatedAdmin, deleteCategory);
router.route("/category/:categoryId/subcategory/:subCategoryId").delete(isAuthenticatedAdmin, deleteSubCategory);
router.get("/blogs/:category/:subCategory", fetchBlogsBySubCategory);



export default router;