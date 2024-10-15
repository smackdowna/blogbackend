import { Schema, model } from "mongoose";
import { FileSchema } from "./file.model.js";


const BlogSchema = new Schema({
    title: {
        type: String,
        required: [true, "Please Enter Your Blog Title"],
        maxLength: [100, "Title cannot exceed 100 characters"],
    },
    metaDescription: {
        type: String,
        maxLength: [150, "Meta Description cannot exceed 150 characters"],
    },
    content: {
        type: String,
        required: [true, "Please Enter Your Blog Content"],
    },
    category: {
        type: String,
        required: [true, "Please Enter Your Blog Category"],
        maxLength: [50, "Category cannot exceed 50 characters"],
    },
    tags: {
        type: [String],
        required: [true, "Please Enter Your Blog Tags"],
    },
    thumbnail: FileSchema,
    author: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
    },
}, {
    timestamps: true,
});

export default model("Blog", BlogSchema);