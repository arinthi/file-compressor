// ================= CROSS-PLATFORM SERVER =================
const express = require('express');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// detect OS (Windows or Linux)
const isWindows = process.platform === "win32";

// compile command
const compileCmd = isWindows
    ? "g++ compressor.cpp -o compressor.exe"
    : "g++ compressor.cpp -o compressor";

// run command
const runCmd = isWindows
    ? "compressor.exe"
    : "./compressor";

// serve frontend
app.use(express.static('public'));

// ================= COMPRESS =================
app.post('/compress', upload.single('file'), (req, res) => {
    if (!req.file) return res.send("No file uploaded");

    const input = req.file.path;
    const output = input + ".qzip";

    exec(`${compileCmd} && ${runCmd} c "${input}" "${output}"`, (err) => {
        if (err) {
            console.log(err);
            return res.send("Compression error");
        }

        res.download(output, "compressed.qzip", () => {
            fs.unlinkSync(input);
            fs.unlinkSync(output);
        });
    });
});

// ================= DECOMPRESS =================
app.post('/decompress', upload.single('file'), (req, res) => {
    if (!req.file) return res.send("No file uploaded");

    const input = req.file.path;
    const output = input + "_out";

    exec(`${compileCmd} && ${runCmd} d "${input}" "${output}"`, (err) => {
        if (err) {
            console.log(err);
            return res.send("Decompression error");
        }

        res.download(output, "decompressed.txt", () => {
            fs.unlinkSync(input);
            fs.unlinkSync(output);
        });
    });
});

// ================= START SERVER =================
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});