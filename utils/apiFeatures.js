class ApiFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }

    search() {
        const { title, category, tags } = this.queryStr;
        const searchQuery = {};

        if (title) {
            searchQuery.title = {
                $regex: title,
                $options: "i",
            };
        }

        if (category) {
            searchQuery.category = {
                $regex: category,
                $options: "i",
            };
        }

        if (tags) {
            searchQuery.tags = {
                $in: tags.split(',').map(tag => new RegExp(tag.trim(), 'i'))
            };
        }

        this.query = this.query.find(searchQuery);
        return this;
    }

    filter() {
        const queryCopy = { ...this.queryStr };
        const removeFields = ["title", "category", "tags", "page", "limit"];
        removeFields.forEach((key) => delete queryCopy[key]);

        let queryStr = JSON.stringify(queryCopy);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (key) => `$${key}`);
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    pagination(resultPerPage) {
        const currentPage = Number(this.queryStr.page) || 1;
        const skip = resultPerPage * (currentPage - 1);
        this.query = this.query.limit(resultPerPage).skip(skip);
        return this;
    }
}

export default ApiFeatures;