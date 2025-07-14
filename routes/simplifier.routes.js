const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const pdfParser = require("pdf-parse");
const path = require("path");
const PDFDocument = require('pdfkit');




const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("pdfFile"), async (req, res, next) => {
  const fileBuffer = fs.readFileSync(req.file.path);

  console.log("File Obj: ", req.file);

  //create /outputs directory if it doesn't exist
  if(!fs.existsSync("outputs/")){
    fs.mkdirSync("outputs/");
  }

  const outputFilePath = path.join("outputs/", req.file.filename + ".pdf");

  try{
    const data = await pdfParser(fileBuffer);

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(outputFilePath));
    doc.text(data.text);
    doc.end();

    res.json({success: true, filename: req.file.filename, text: data.text});
  } catch (err){
    res.json({success: false, result: err})
  } finally{
    fs.unlinkSync(req.file.path); 
  }
});

router.get("/download/:fileName", (req, res) => {
  const filePath = path.join("outputs", req.params.fileName + ".pdf");
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
    }
  });
});

module.exports = router;
