import categoryModel from "../models/category.model.js";
import blogModel from "../models/blog.model.js";
import ErrorHandler from "../utils/errorhandler.js";

const findOrCreateCategoryAndSubCategory = async (categoryName, subCategoryName) => {
  try {
    let category = await categoryModel.findOne({
      name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
    });

    if (!category) {
      category = await categoryModel.create({
        name: categoryName,
        subCategory: [],
      });
    }

    const subCategoryExists = category.subCategory.some(
      (sub) => sub.name.toLowerCase() === subCategoryName.toLowerCase()
    );

    if (!subCategoryExists) {
      category.subCategory.push({ name: subCategoryName });
      await category.save();
    }

    return { categoryId: category._id, subCategoryName };
  } catch (error) {
    throw new ErrorHandler(
      `Error processing category: ${error.message}`,
      error.statusCode || 500
    );
  }
};

export const processCategory = async (categoryName, subCategoryName) => {
  try {
    if (!categoryName || !subCategoryName) {
      throw new ErrorHandler("Category and subcategory names are required", 400);
    }

    return await findOrCreateCategoryAndSubCategory(
      categoryName.trim(),
      subCategoryName.trim()
    );
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};

export const fetchBlogsByCategoryAndSubCategory = async (req, res, next) => {

  const category = req.params.category;
  console.log(category, "Hello")
  if (!category) {
    return res.status(400).json({ error: "Category name and Subcategory name are required" });
  }


  const categoryData = await categoryModel.findOne({ name: category });
  if (!categoryData) {
    return res.status(404).json({ error: "Category not found" });
  }


  const blogs = await blogModel.find({
    category: categoryData._id.toString(),
  }).populate("author", "name email")
    .populate("category", "name");


  if (blogs.length === 0) {
    return res.status(404).json({ message: "No blogs found for this category and subcategory" });
  }
  res.status(200).json(blogs);
}




export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

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
    const { categoryId, subCategoryName } = req.params;

    const category = await categoryModel.findById(categoryId);
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const associatedBlogs = await blogModel.find({
      category: categoryId,
      subCategory: { $regex: new RegExp(`^${subCategoryName}$`, 'i') },
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
      (sub) => sub.name.toLowerCase() === subCategoryName.toLowerCase()
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

    const categoriesWithSubCategoryNames = categories.map(category => {
      return {
        _id: category._id,
        name: category.name,
        subCategoryNames: category.subCategory.map(sub => sub.name)
      };
    });

    res.status(200).json(categoriesWithSubCategoryNames);
  } catch (error) {
    return next(new ErrorHandler(`Error fetching categories: ${error.message}`, 500));
  }
}
