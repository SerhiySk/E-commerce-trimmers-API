const { StatusCodes } = require('http-status-codes');
const path = require('path');
const CustomError = require('../errors');
const Product = require('../models/product');

const getAllProducts = async (req, res) => {
  const { sort, search, category, company, color, price, freeShipping, page } =
    req.query;
  const queryObject = {};

  if (search) {
    queryObject.name = { $regex: search, $options: 'i' };
  }
  if (category && category !== 'all') {
    queryObject.category = category;
  }
  if (company && company !== 'all') {
    queryObject.company = company;
  }
  if (color && color !== 'all') {
    queryObject.color = color;
  }
  if (price) {
    queryObject.price = { $lte: price };
  }
  if (freeShipping?.toLowerCase() === 'true') {
    queryObject.freeShipping = true;
  }
  const count = await Product.countDocuments(queryObject);
  const limit = 10;
  const numOfPages = Math.ceil(count / limit);
  let request = Product.find(queryObject);

  if (sort === 'lowest') {
    request = request.sort('-price');
  } else if (sort === 'highest') {
    request = request.sort('price');
  } else if (sort === 'z-a') {
    request = request.sort('-name');
  } else if (sort === 'a-z') {
    request = request.sort('name');
  }
  if (page) {
    request.skip(limit * (page - 1)).limit(limit);
  }
  console.log(request);
  // console.log(await request);

  const allProducts = await request;

  res.status(StatusCodes.OK).json({ allProducts, count, numOfPages });
};
const createProduct = async (req, res) => {
  req.body.user = req.user.userId;
  const product = await Product.create(req.body);
  res.status(StatusCodes.CREATED).json({ product });
};
const getSingleProduct = async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate('reviews');
  if (!product)
    throw new CustomError.NotFoundError(`No product with id : ${id}`);

  res.status(StatusCodes.OK).json(product);
};
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const product = await Product.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product)
    throw new CustomError.NotFoundError(`No product with id : ${id}`);

  res.status(StatusCodes.OK).json({ product });
};
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const product = await Product.findOne({ _id: id });
  if (!product)
    throw new CustomError.NotFoundError(`No product with id : ${id}`);
  await product.deleteOne();
  res.status(StatusCodes.OK).json({ product });
};
const uploadImage = async (req, res) => {
  if (!req.files) {
    throw new CustomError.BadRequestError('No File Uploaded');
  }
  const productImage = req.files.image;

  if (!productImage.mimetype.startsWith('image')) {
    throw new CustomError.BadRequestError('Please Upload Image');
  }

  const maxSize = 1024 * 1024;

  if (productImage.size > maxSize) {
    throw new CustomError.BadRequestError(
      'Please upload image smaller than 1MB'
    );
  }

  const imagePath = path.join(
    __dirname,
    '../public/uploads/' + `${productImage.name}`
  );
  await productImage.mv(imagePath);
  res.status(StatusCodes.OK).json({ image: `/uploads/${productImage.name}` });
};

module.exports = {
  getAllProducts,
  createProduct,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
};
