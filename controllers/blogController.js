import catchAsyncErrors from "../middlewares/catchAsyncError.js";
import blogModel from "../models/blog.model.js";
import ApiFeatures from "../utils/apiFeatures.js";
import getDataUri from "../utils/dataUri.js";
import ErrorHandler from "../utils/errorhandler.js";
import { processTags } from "../utils/tags.js";
import { deleteImage, uploadImage } from "../utils/uploadImage.js";
import { processCategory } from "./category.controller.js";



export const createBlog = catchAsyncErrors(async (req, res, next) => {
  const { title, metaDescription, content, category, subcategory, tags } = req.body;

  if (!title || !metaDescription || !content || !category || !subcategory || !tags) {
    return next(new ErrorHandler("Please fill in all fields", 400));
  }

  if (!req.file) {
    return next(new ErrorHandler("Please upload a thumbnail", 400));
  }


  const thumbnail = await uploadImage(
    getDataUri(req.file).content,
    getDataUri(req.file).fileName,
    "blog-thumbnails"
  );


  const { categoryId, subCategoryName } = await processCategory(
    category.trim(),
    subcategory.trim()
  );


  const modifiedTags = processTags(tags);


  const newBlog = new blogModel({
    title,
    metaDescription,
    content,
    category: categoryId,
    subCategory: subCategoryName,
    tags: modifiedTags,
    thumbnail,
    author: res.locals.admin.id,
  });

  await newBlog.save();
  await newBlog.populate("category", "name");

  res.status(201).json({
    success: true,
    message: "Blog created successfully",
    data: newBlog,
  });
});
export const getAllBlogs = catchAsyncErrors(async (req, res, next) => {
  const resultPerPage = 15;
  const currentPage = Number(req.query.page) || 1;

  const baseQuery = blogModel
    .find()
    .populate("author", "full_name")
    .sort({ createdAt: -1 });

  const apiFeature = new ApiFeatures(baseQuery, req.query).search().filter();


  const filteredBlogsCount = await blogModel.countDocuments(apiFeature.query);


  apiFeature.pagination(resultPerPage);


  const blogs = await apiFeature.query;


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
  const blog = await blogModel
    .findById(req.params.id)
    .populate("category", "name ")
    .populate("author", "name ");

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
    });
  }
  blog.thumbnail && (await deleteImage(blog.thumbnail.fileId));
  await blog.deleteOne();
  res.status(200).json({
    success: true,
    message: `Blog deleted successfully`,
  });
});
export const updateBlog = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { title, metaDescription, content, category, subcategory, tags } = req.body;
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


  if (category || subcategory) {
    const { categoryId, subCategoryName } = await processCategory(
      category,
      subcategory
    );

    updateFields.category = categoryId;
    updateFields.subCategory = subCategoryName;
  }
  if (tags) {
    updateFields.tags = processTags(tags);
  }
  if (req.file) {
    if (blog.thumbnail) {
      await deleteImage(blog.thumbnail.fileId);
    }
    const thumbnail = await uploadImage(
      getDataUri(req.file).content,
      getDataUri(req.file).fileName,
      "blog-thumbnails"
    );
    updateFields.thumbnail = thumbnail;
  }

  if (Object.keys(updateFields).length === 0 && !req.file) {
    return next(new ErrorHandler("No fields provided for update", 400));
  }


  const updatedBlog = await blogModel.findByIdAndUpdate(id, updateFields, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Blog updated successfully",
    data: updatedBlog,
  });
});


// export const updateBlog = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;
//   const { title, metaDescription, content, category, tags } = req.body;
//   const authorId = res.locals.admin.id;


//   const blog = await blogModel.findById(id);
//   if (!blog) {
//     return next(new ErrorHandler("Blog not found", 404));
//   }


//   if (blog.author.toString() !== authorId) {
//     return next(
//       new ErrorHandler("You are not authorized to update this blog", 403)
//     );
//   }


//   const updateFields = {};


//   if (title) updateFields.title = title;
//   if (metaDescription) updateFields.metaDescription = metaDescription;
//   if (content) updateFields.content = content;


//   if (category) {
//     let categoryObj;
//     try {
//       categoryObj =
//         typeof category === "string" ? JSON.parse(category) : category;
//     } catch (error) {
//       return next(new ErrorHandler("Invalid category format", 400));
//     }

//     if (categoryObj.name && categoryObj.subCategory) {
//       updateFields.category = {
//         name: categoryObj.name,
//         ...(categoryObj.subCategory && { subCategory: categoryObj.subCategory }),
//       };
//     } else {
//       return next(new ErrorHandler("Please provide both category name and subcategory while updating!", 400));
//     }
//   }




//   if (tags) {
//     const modifiedTags = tags[0]
//       .split(",")
//       .map((str) => str.trim().replace(/(^"|"$)/g, ""));
//     updateFields.tags = modifiedTags;
//   }


//   if (req.file) {
//     const file = req.file;
//     if (blog.thumbnail) {
//       await deleteImage(blog.thumbnail.fileId);
//     }
//     const thumbnail = await uploadImage(
//       getDataUri(file).content,
//       getDataUri(file).fileName,
//       "blog-thumbnails"
//     );
//     updateFields.thumbnail = thumbnail;
//   }


//   if (Object.keys(updateFields).length === 0 && !req.file) {
//     return next(new ErrorHandler("No fields provided for update", 400));
//   }


//   const updatedBlog = await blogModel.findByIdAndUpdate(id, updateFields, {
//     new: true,
//     runValidators: true,
//   });

//   res.status(200).json({
//     success: true,
//     message: "Blog updated successfully",
//     data: updatedBlog,
//   });
// });
