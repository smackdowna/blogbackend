import express from "express";
import { createBlog, deleteBlog, getAllBlogs, singleBlog, updateBlog } from "../controllers/blogController.js";
import { isAuthenticatedAdmin } from "../middlewares/auth.js";
import singleUpload from "../middlewares/multer.js";


const router = express.Router();


router.route("/blog/create").post(isAuthenticatedAdmin, singleUpload, createBlog);
router.route("/blog/:id").put(isAuthenticatedAdmin, singleUpload, updateBlog);
router.route("/blog/:id").delete(isAuthenticatedAdmin, deleteBlog);
router.route("/blog").get(getAllBlogs);
router.route("/blog/:id").get(singleBlog);


export default router;