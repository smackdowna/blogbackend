import mongoose from "mongoose";

const categoryModel = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter the category name"],
    trim: true,
    unique: true,
  },
  subCategory: [
    {
      name: {
        type: String,
        required: [true, "Please enter the subcategory name"],
        trim: true,
      },
    },
  ],
}, {
  timestamps: true,
})

export default mongoose.model("Category", categoryModel);