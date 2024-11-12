import categoryModel from "../models/category.model.js";
import blogModel from "../models/blog.model.js";
import ErrorHandler from "../utils/errorhandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncError.js";

export const createCategoryAndSubCategory = catchAsyncErrors(async (req, res, next) => {
  const { category, subCategory } = req.body;

  if (!category) {
    return next(new ErrorHandler("Please enter the category name", 400));
  }
  if (!subCategory || subCategory.length === 0) {
    return next(new ErrorHandler("Please enter at least one subcategory", 400));
  }

  let existingCategory = await categoryModel.findOne({ name: category });

  if (existingCategory) {
    // Add only new subcategories that don’t already exist in the category
    const newSubCategories = subCategory
      .filter(sub => !existingCategory.subCategory.some(existingSub => existingSub.name.toLowerCase() === sub.toLowerCase()))
      .map(sub => ({ name: sub }));

    if (newSubCategories.length === 0) {
      return next(new ErrorHandler("All subcategories already exist in this category", 400));
    }

    // Add new subcategories and save the updated category
    existingCategory.subCategory.push(...newSubCategories);
    await existingCategory.save();

    res.status(200).json({
      success: true,
      message: "Subcategories added to the existing category",
      category: existingCategory,
    });
  } else {
    // If category does not exist, create a new category
    const newCategory = new categoryModel({
      name: category,
      subCategory: subCategory.map((sub) => ({ name: sub })),
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: "Category and subcategories created successfully",
      category: newCategory,
    });
  }
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
        subCategories: category.subCategory.map(sub => ({
          _id: sub._id,
          name: sub.name
        }))
      };
    });

    res.status(200).json(categoriesWithSubCategoryIds);
  } catch (error) {
    return next(new ErrorHandler(`Error fetching categories: ${error.message}`, 500));
  }
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

