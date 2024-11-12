import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter the subcategory name"],
    trim: true,
  },
});

const categoryModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter the category name"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
    },
    subCategory: [subCategorySchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Category", categoryModel);
