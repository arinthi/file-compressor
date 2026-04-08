const express = require('express');
const { execSync, exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');

const app = express();

// ensure uploads folder
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const upload = multer({ dest: 'uploads/' });

// detect OS
const isWindows = process.platform === "win32";

// compile only ONCE when server starts
try {
    console.log("Compiling compressor...");

    if (isWindows) {
        execSync("g++ compressor.cpp -o compressor.exe");
    } else {
        execSync("g++ compressor.cpp -o compressor");
    }

    console.log("Compilation done");
} catch (err) {
    console.error("Compilation failed", err);
}

// run command
const runCmd = isWindows ? "compressor.exe" : "./compressor";

app.use(express.static('public'));

// ================= COMPRESS =================
app.post('/compress', upload.single('file'), (req, res) => {
    if (!req.file) return res.send("No file uploaded");

    const input = req.file.path;
    const output = input + ".qzip";

    exec(`${runCmd} c "${input}" "${output}"`, (err) => {
        if (err) return res.send("Compression error");

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

    exec(`${runCmd} d "${input}" "${output}"`, (err) => {
        if (err) return res.send("Decompression error");

        res.download(output, "decompressed.txt", () => {
            fs.unlinkSync(input);
            fs.unlinkSync(output);
        });
    });
});

// correct port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});