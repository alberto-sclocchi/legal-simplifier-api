const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const pdfParser = require("pdf-parse");
const path = require("path");
const PDFDocument = require('pdfkit');
const OpenAI = require("openai");




const upload = multer({ dest: "uploads/" });
const client = new OpenAI({apiKey: process.env.OPEN_AI_API_KEY});

async function extractTextFromPdf(path){
  const fileBuffer = fs.readFileSync(path);
  const data = await pdfParser(fileBuffer)

  return data.text;
}

router.post("/", upload.single("pdfFile"), async (req, res, next) => {

  // if(!fs.existsSync("outputs/")){
  //   fs.mkdirSync("outputs/");
  // }

  console.log("File Obj: ", req.file);
  // const outputFilePath = path.join("outputs/", req.file.filename + ".pdf");

  try{
    const fileText = await extractTextFromPdf(req.file.path);
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: `Please simplify the following legal text:\n\n${fileText}`
        },
        {
          role: "developer",
          content: "You are a legal expert specialized in simplifying complex legal documents. First, verify if the provided text is a legal document. This includes—but is not limited to—contracts, terms of service, privacy policies, ADA compliance statements, waivers, liability disclaimers, legal notices, or regulatory agreements. If it is not, only reply: '🚫 This file is not a legal document.'. Divide it in sections and provide a clear, concise summary of each section. Use simple language and avoid legal terms. Add emojis to make it more engaging. The output should be a structured summary with headings for each section, and the text should be easy to read and understand (possibly in bullet points). Do not ask for any clarifications or additional information. Begin your response directly with the simplified summary."
        }
      ]
    });

    // const doc = new PDFDocument();
    // doc.pipe(fs.createWriteStream(outputFilePath));
    // doc.text(response.output_text);
    // doc.end();

    let outputFileName = req.file.originalname;
    
    if (outputFileName.lastIndexOf(".") !== -1) outputFileName = outputFileName.substring(0, outputFileName.lastIndexOf("."));

    res.json({success: true, filename: req.file.filename, fileOriginalName: outputFileName, text: response.output_text});
  } catch (err){
    res.json({success: false, result: err})
  } finally{
    fs.unlinkSync(req.file.path); 
  }
});

//NOT USED
router.get("/download/:fileName", (req, res) => {
  const filePath = path.join("outputs", req.params.fileName + ".pdf");
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
    }
  });
});

router.post("/question", upload.single("pdfFile"), async (req, res, next) => {
   console.log("File Obj: ", req.file);

  const { question } = req.body;
  // const outputFilePath = path.join("outputs/", req.file.filename + ".pdf");

  try{
    const fileText = await extractTextFromPdf(req.file.path);
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: `Please answer this question:\n\n${question}\n Base the answer on the following legal text:\n\n${fileText}`
        },
        {
          role: "developer",
          content: "You are a legal expert specializing in simplifying complex legal documents. Begin with a bold heading that correlates to the question, then answer the user's question using only the uploaded text. Do not include any headings or introductions. Provide a direct, concise answer. If the question has multiple parts, clearly number your responses and label them. Verify if the provided text is a legal document. This includes—but is not limited to—contracts, terms of service, privacy policies, ADA compliance statements, waivers, liability disclaimers, legal notices, or regulatory agreements. If it is not, only reply: '🚫 This file is not a legal document.'. "
        }
      ]
    });


    res.json({success: true, answer: response.output_text});
  } catch (err){
    res.json({success: false, result: err})
  } finally{
    fs.unlinkSync(req.file.path); 
  }
});

module.exports = router;
