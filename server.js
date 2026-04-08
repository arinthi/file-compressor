const express = require('express');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');

const app = express();

// ✅ ensure uploads folder exists (important for Render)
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const upload = multer({ dest: 'uploads/' });

// ✅ detect OS
const isWindows = process.platform === "win32";

// ✅ compile command
const compileCmd = isWindows
    ? "g++ compressor.cpp -o compressor.exe"
    : "g++ compressor.cpp -o compressor";

// ✅ run command
const runCmd = isWindows
    ? "compressor.exe"
    : "./compressor";

// ✅ serve frontend
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

// ✅ IMPORTANT: works for both local + Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});