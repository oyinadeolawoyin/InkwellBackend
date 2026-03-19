const multer = require("multer");
const path = require("path");

//file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|mp4|mp3|webp|webm/;
  const ext = path.extname(file.originalname).toLocaleLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

const upload = multer({ storage: multer.memoryStorage(), fileFilter });

module.exports = upload;