import catchAsyncErrors from "../middlewares/catchAsyncError.js";
import blogModel from "../models/blog.model.js";
import ApiFeatures from "../utils/apiFeatures.js";
import getDataUri from "../utils/dataUri.js";
import ErrorHandler from "../utils/errorhandler.js";
import { deleteImage, uploadImage } from "../utils/uploadImage.js";


export const createBlog = catchAsyncErrors(async (req, res, next) => {

    const { title, metaDescription, content, category, tags } = req.body;

    if (!title || !metaDescription || !content || !category || !tags) {
        return next(new ErrorHandler("Please fill in all fields", 400));
    }
    const file = req.file;
    if (!file) {
        return next(new ErrorHandler("Please upload a file for thumbnail!", 400));
    }

    const author = res.locals.admin.id;
    const thumbnail = file
        ? await uploadImage(getDataUri(file).content, getDataUri(file).fileName, "blog-thumbnails")
        : {};
    const newBlog = new blogModel({ title, metaDescription, content, category, tags, thumbnail, author });
    await newBlog.save();

    res.status(201).json({
        success: true,
        message: `Blog created successfully`,
        data: newBlog,
    });
});
export const getAllBlogs = catchAsyncErrors(async (req, res, next) => {
    const resultPerPage = 15;
    const currentPage = Number(req.query.page) || 1;

    const baseQuery = blogModel.find().populate("author", "full_name").sort({ createdAt: -1 });

    const apiFeature = new ApiFeatures(baseQuery, req.query)
        .search()
        .filter();

    // Get total count of documents matching the filter
    const filteredBlogsCount = await blogModel.countDocuments(apiFeature.query);

    // Apply pagination
    apiFeature.pagination(resultPerPage);

    // Execute the query
    const blogs = await apiFeature.query;

    // Get total count of all blogs (can be cached if it doesn't change frequently)
    const totalBlogsCount = await blogModel.estimatedDocumentCount();

    res.status(200).json({
        success: true,
        totalBlogsCount,
        filteredBlogsCount,
        resultPerPage,
        currentPage,
        totalPages: Math.ceil(filteredBlogsCount / resultPerPage),
        data: blogs,
    });
});

export const singleBlog = catchAsyncErrors(async (req, res, next) => {
    const blog = await blogModel.findById(req.params.id).populate("author", "full_name").exec();
    if (!blog) {
        return next(new ErrorHandler("Blog not found", 404));
    }
    res.status(200).json({
        success: true,
        data: blog,
    });
});

export const deleteBlog = catchAsyncErrors(async (req, res, next) => {
    const blog = await blogModel.findById(req.params.id);
    if (!blog) {
        return next(new ErrorHandler("Blog not found", 404));
    }
    if (!blog.thumbnail) {
        return next(new ErrorHandler("Blog thumbnail not found", 404));
    }
    const authorId = res.locals.admin.id;

    if (authorId !== blog.author.toString()) {
        return res.status(401).json({
            status: 401,
            message: "You are not authorized to delete this blog",
        })
    }
    blog.thumbnail && await deleteImage(blog.thumbnail.fileId);
    await blog.deleteOne();
    res.status(200).json({
        success: true,
        message: `Blog deleted successfully`,
    });
});

export const updateBlog = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    const { title, metaDescription, content, category, tags } = req.body;
    const authorId = res.locals.admin.id;

    const blog = await blogModel.findById(id);

    if (!blog) {
        return next(new ErrorHandler("Blog not found", 404));
    }

    if (blog.author.toString() !== authorId) {
        return next(new ErrorHandler("You are not authorized to update this blog", 403));
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (metaDescription) updateFields.metaDescription = metaDescription;
    if (content) updateFields.content = content;
    if (category) updateFields.category = category;
    if (tags) updateFields.tags = tags;

    if (req.file) {
        const file = req.file;
        if (blog.thumbnail) {
            await deleteImage(blog.thumbnail.fileId);
        }
        const thumbnail = await uploadImage(getDataUri(file).content, getDataUri(file).fileName, "blog-thumbnails");
        updateFields.thumbnail = thumbnail;
    }

    if (Object.keys(updateFields).length === 0 && !req.file) {
        return next(new ErrorHandler("No fields provided for update", 400));
    }

    const updatedBlog = await blogModel.findByIdAndUpdate(
        id,
        updateFields,
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: "Blog updated successfully",
        data: updatedBlog,
    });
});