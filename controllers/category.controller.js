import categoryModel from "../models/category.model.js";
import blogModel from "../models/blog.model.js";
import ErrorHandler from "../utils/errorhandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncError.js";
import { deleteImage, uploadImage } from "../utils/uploadImage.js";
import getDataUri from "../utils/dataUri.js";

export const createCategoryAndSubCategory = catchAsyncErrors(async (req, res, next) => {
  const { category, subCategory, description } = req.body;
  // Validate inputs
  if (!category) return next(new ErrorHandler("Please enter the category name", 400))
  if (!subCategory || subCategory.length === 0) return next(new ErrorHandler("Please enter at least one subcategory", 400));
  if (!req.file) {
    return next(new ErrorHandler("Please upload a thumbnail for the new category", 400));
  }
  if (!description) return next(new ErrorHandler("Please enter the category description", 400));
  const existingCategory = await categoryModel.findOne({ name: category });
  if (existingCategory) {
    return next(new ErrorHandler("Category already exists with the same title", 400));
  }
  const thumbnail = await uploadImage(
    getDataUri(req.file).content,
    getDataUri(req.file).fileName,
    "blog-categories-banners"
  );

  const newCategory = new categoryModel({
    name: category,
    description,
    thumbnail,
    subCategory: subCategory.map((sub) => ({ name: sub })),
  });
  await newCategory.save();
  return res.status(201).json({
    success: true,
    message: "Category and subcategories created successfully",
    category: newCategory,
  });
}
);

export const updateCategory = catchAsyncErrors(async (req, res, next) => {
  const id = req.params.category;
  const { category, subCategory, description } = req.body;

  // Find the existing category by ID
  const existingCategory = await categoryModel.findById(id);
  if (!existingCategory) {
    return next(new ErrorHandler("Category not found", 404));
  }

  let updatedFields = {};

  // Update the category name if provided
  if (category) updatedFields.name = category;

  // Merge new descriptions with existing ones, ensuring no duplicates
  if (description) {
    const existingDescriptions = existingCategory.description || [];
    const newDescriptions = Array.isArray(description) ? description : [description];

    // Combine existing descriptions with new ones, and remove duplicates
    updatedFields.description = Array.from(new Set([...existingDescriptions, ...newDescriptions]));
  }

  // Add new subcategories, ensuring no duplicates
  if (subCategory) {
    const existingSubCategoryNames = existingCategory.subCategory.map((sub) => sub.name.toLowerCase());
    const newSubCategories = Array.isArray(subCategory) ? subCategory : [subCategory];

    const filteredNewSubCategories = newSubCategories
      .map((sub) => sub.name || sub) // Adjust if `subCategory` is an array of objects
      .filter((sub) => !existingSubCategoryNames.includes(sub.toLowerCase()))
      .map((sub) => ({ name: sub }));

    updatedFields.subCategory = [...existingCategory.subCategory, ...filteredNewSubCategories];
  }

  // Handle thumbnail upload if a new file is provided
  if (req.file) {
    if (existingCategory.thumbnail) {
      await deleteImage(existingCategory.thumbnail.fileId);
    }
    updatedFields.thumbnail = await uploadImage(
      getDataUri(req.file).content,
      getDataUri(req.file).fileName,
      "blog-categories-banners"
    );
  }

  // Update the category with the new fields and return the result
  const updatedCategory = await categoryModel.findByIdAndUpdate(id, updatedFields, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    category: updatedCategory,
  });
});



export const fetchBlogsByCategory = async (req, res, next) => {
  const category = req.params.category;

  if (!category) {
    return res.status(400).json({ error: "Category name is required" });
  }

  // Find the category document by name
  const categoryData = await categoryModel.findOne({ name: category });
  if (!categoryData) {
    return res.status(404).json({ error: "Category not found" });
  }

  // Fetch the blogs that match the category
  const blogs = await blogModel.find({
    category: categoryData._id.toString(),
  })
    .populate("author", "full_name")
    .populate("category", "name subCategory");
  const processedBlogs = processBlogsWithSubCategory(blogs);

  // If no blogs are found, return a 404 response
  if (blogs.length === 0) {
    return res.status(404).json({ message: "No blogs found for this category" });
  }

  // Return the blogs in the response
  res.status(200).json(processedBlogs);
};



export const deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.category;


    const category = await categoryModel.findById(categoryId);
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const associatedBlogs = await blogModel.find({ category: categoryId });
    if (associatedBlogs.length > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete category. There are blogs associated with this category.",
          400
        )
      );
    }
    if (category.thumbnail) {
      await deleteImage(category.thumbnail.fileId);
    }
    await category.deleteOne();
    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(`Error deleting category: ${error.message}`, 500));
  }
};


export const deleteSubCategory = async (req, res, next) => {
  try {
    const { categoryId, subCategoryId } = req.params;

    const category = await categoryModel.findById(categoryId);
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const associatedBlogs = await blogModel.find({
      category: categoryId,
      subCategory: subCategoryId,
    });
    if (associatedBlogs.length > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete subcategory. There are blogs associated with this subcategory.",
          400
        )
      );
    }

    const subCategoryIndex = category.subCategory.findIndex(
      (sub) => sub._id.toString() === subCategoryId
    );
    if (subCategoryIndex === -1) {
      return next(new ErrorHandler("Subcategory not found", 404));
    }

    category.subCategory.splice(subCategoryIndex, 1);
    await category.save();

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(`Error deleting subcategory: ${error.message}`, 500));
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryModel.find();

    const categoriesWithSubCategoryIds = categories.map(category => {
      return {
        _id: category._id,
        name: category.name,
        description: category.description,
        subCategories: category.subCategory.map(sub => ({
          _id: sub._id,
          name: sub.name
        })),
        thumbnail: category.thumbnail
      };
    });

    res.status(200).json(categoriesWithSubCategoryIds);
  } catch (error) {
    return next(new ErrorHandler(`Error fetching categories: ${error.message}`, 500));
  }
};
export const fetchBlogsBySubCategory = async (req, res, next) => {
  const { category, subCategory } = req.params;
  if (!category || !subCategory) {
    return res.status(400).json({ error: "Category and subcategory names are required" });
  }

  //get single controller
export const getacategory = async(req,res,next)=>{
  try {
    const category = await categoryModel.findOne({name:req.params.name});
  if (!category) return next(new ErrorHandler("category not found", 400));

  res.status(200).json({
    success: true,
    category,
  });
  } catch (error) {
    return next(new ErrorHandler(`Error fetching categories: ${error.message}`, 500));
  }

}



  
  // Find the category document by name
  const categoryData = await categoryModel.findOne({ name: category });
  if (!categoryData) {
    return res.status(404).json({ error: "Category not found" });
  }

  // Check if the subcategory exists in the category
  const subCategoryData = categoryData.subCategory.find(
    (sub) => sub.name.toLowerCase() === subCategory.toLowerCase()
  );
  if (!subCategoryData) {
    return res.status(404).json({ error: "Subcategory not found in this category" });
  }

  // Fetch the blogs that match the category and subcategory
  const blogs = await blogModel.find({
    category: categoryData._id.toString(),
    subCategory: subCategoryData._id.toString(),
  })
    .populate("author", "full_name")
    .populate("category", "name subCategory");

  // If no blogs are found, return a 404 response
  if (blogs.length === 0) {
    return res.status(404).json({ message: "No blogs found for this subcategory" });
  }
  const modifiedBlogs = processBlogsWithSubCategory(blogs);

  // Return the blogs in the response
  res.status(200).json({
    success: true,
    blogs: modifiedBlogs,
  });
};

// ! Some utility functions
export const processBlogsWithSubCategory = (blogs) => {
  const blogsArray = Array.isArray(blogs) ? blogs : [blogs];

  return blogsArray.map((blog) => {
    const subcategoryMatch = blog.category.subCategory.find(
      (sub) => sub._id.toString() === blog.subCategory.toString()
    );

    const processedBlog = {
      ...blog.toObject(),
      subCategory: subcategoryMatch ? subcategoryMatch.name : null,
    };

    delete processedBlog.category.subCategory;
    return processedBlog;
  });
};

