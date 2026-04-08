#include <bits/stdc++.h>
using namespace std;

// ---------------- BIT WRITER ----------------
class BitWriter {
    ofstream &out;
    uint8_t buffer = 0;
    int count = 0;

public:
    BitWriter(ofstream &o) : out(o) {}

    void writeBit(int bit) {
        buffer |= (bit << (7 - count));
        count++;
        if (count == 8) {
            out.put(buffer);
            buffer = 0;
            count = 0;
        }
    }

    void writeBits(uint32_t code, int length) {
        for (int i = length - 1; i >= 0; i--) {
            writeBit((code >> i) & 1);
        }
    }

    void flush() {
        if (count) out.put(buffer);
    }
};

// ---------------- BIT READER ----------------
class BitReader {
    ifstream &in;
    uint8_t buffer = 0;
    int count = 0;

public:
    BitReader(ifstream &i) : in(i) {}

    bool readBit(int &bit) {
        if (count == 0) {
            char c;
            if (!in.get(c)) return false;
            buffer = (uint8_t)c;
            count = 8;
        }
        bit = (buffer >> (--count)) & 1;
        return true;
    }
};

// ---------------- HUFFMAN ----------------
struct Node {
    uint8_t ch;
    uint64_t freq;
    Node *l, *r;

    Node(uint8_t c, uint64_t f) : ch(c), freq(f), l(nullptr), r(nullptr) {}
    Node(Node* a, Node* b) : ch(0), freq(a->freq + b->freq), l(a), r(b) {}
    bool isLeaf() { return !l && !r; }
};

struct cmp {
    bool operator()(Node* a, Node* b) {
        return a->freq > b->freq;
    }
};

unordered_map<uint8_t, pair<uint32_t,int>> codes;

void buildCodes(Node* root, uint32_t code, int len) {
    if (!root) return;
    if (root->isLeaf()) {
        codes[root->ch] = {code, len};
        return;
    }
    buildCodes(root->l, code << 1, len + 1);
    buildCodes(root->r, (code << 1) | 1, len + 1);
}

void writeTree(Node* root, BitWriter &bw) {
    if (root->isLeaf()) {
        bw.writeBit(1);
        for (int i = 7; i >= 0; i--)
            bw.writeBit((root->ch >> i) & 1);
    } else {
        bw.writeBit(0);
        writeTree(root->l, bw);
        writeTree(root->r, bw);
    }
}

Node* readTree(BitReader &br) {
    int bit;
    if (!br.readBit(bit)) return nullptr;

    if (bit == 1) {
        uint8_t ch = 0;
        for (int i = 0; i < 8; i++) {
            int b; br.readBit(b);
            ch = (ch << 1) | b;
        }
        return new Node(ch, 0);
    }
    Node* l = readTree(br);
    Node* r = readTree(br);
    return new Node(l, r);
}

// ---------------- COMPRESS ----------------
void compress(string inFile, string outFile) {
    ifstream in(inFile, ios::binary);
    ofstream out(outFile, ios::binary);

    vector<uint64_t> freq(256, 0);
    vector<uint8_t> data;

    vector<uint8_t> buffer(8192);
    while (in.read((char*)buffer.data(), buffer.size()) || in.gcount()) {
        int n = in.gcount();
        for (int i = 0; i < n; i++) {
            freq[buffer[i]]++;
            data.push_back(buffer[i]);
        }
    }

    priority_queue<Node*, vector<Node*>, cmp> pq;
    for (int i = 0; i < 256; i++)
        if (freq[i]) pq.push(new Node(i, freq[i]));

    while (pq.size() > 1) {
        Node* a = pq.top(); pq.pop();
        Node* b = pq.top(); pq.pop();
        pq.push(new Node(a, b));
    }

    Node* root = pq.top();
    codes.clear();
    buildCodes(root, 0, 0);

    BitWriter bw(out);

    uint64_t size = data.size();
    out.write((char*)&size, sizeof(size));

    writeTree(root, bw);

    for (auto ch : data) {
        auto [code, len] = codes[ch];
        bw.writeBits(code, len);
    }

    bw.flush();
}

void decompress(string inFile, string outFile) {
    ifstream in(inFile, ios::binary);
    ofstream out(outFile, ios::binary);

    uint64_t size;
    in.read((char*)&size, sizeof(size));

    BitReader br(in);
    Node* root = readTree(br);

    Node* cur = root;
    uint64_t count = 0;

    while (count < size) {
        if (cur->isLeaf()) {
            out.put(cur->ch);
            cur = root;
            count++;
        } else {
            int bit;
            br.readBit(bit);
            cur = (bit == 0) ? cur->l : cur->r;
        }
    }
}

int main(int argc, char* argv[]) {
    if (argc < 4) {
        cout << "Usage: c/d input output\n";
        return 0;
    }

    if (string(argv[1]) == "c")
        compress(argv[2], argv[3]);
    else
        decompress(argv[2], argv[3]);

    return 0;
}