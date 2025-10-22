# Install LLM Parser Dependencies

## 🚀 Quick Fix for "LLM parser dependencies not installed"

### **Option 1: Command Prompt (Recommended)**
1. **Open Command Prompt** (not PowerShell)
2. **Navigate to project**:
   ```cmd
   cd "c:\Users\Mohsin\Downloads\Cursor 28 - CG Incognito"
   ```
3. **Install dependencies**:
   ```cmd
   npm install
   ```
4. **Restart server**:
   ```cmd
   npm run dev
   ```

### **Option 2: VS Code Terminal**
1. **Open VS Code** in your project folder
2. **Open Terminal** (Ctrl + `)
3. **Run**:
   ```bash
   npm install
   ```
4. **Restart server**:
   ```bash
   npm run dev
   ```

### **Option 3: PowerShell (If above don't work)**
1. **Run PowerShell as Administrator**
2. **Enable script execution**:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. **Navigate and install**:
   ```powershell
   cd "c:\Users\Mohsin\Downloads\Cursor 28 - CG Incognito"
   npm install
   ```

---

## 📦 What Gets Installed

The following packages will be installed:
- `pdf-parse` - For extracting text from PDFs
- `openai` - For GPT-4o-mini parsing
- `@anthropic-ai/sdk` - For Claude parsing (backup)
- `@google/generative-ai` - For Gemini parsing (backup)
- `pdf-lib` - For PDF manipulation

---

## ✅ After Installation

Once dependencies are installed:
1. **Restart your server**: `npm run dev`
2. **Try Gmail sync again**
3. **Statements will be parsed with OpenAI** (₹1.50 per statement)

---

## 🎯 Expected Results

After installation, you should see:
```json
{
  "success": true,
  "banks_found": 3,
  "banks": [
    {
      "bank_code": "hsbc",
      "parsed": {
        "success": true,
        "transaction_count": 47,
        "statement_date": "2024-10-01"
      }
    }
  ]
}
```

---

**Total time: 2-3 minutes**

**After this, your Gmail sync will fully work with LLM parsing!** 🚀



